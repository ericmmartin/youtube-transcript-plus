import { DEFAULT_USER_AGENT, RE_XML_TRANSCRIPT } from './constants';
import {
  retrieveVideoId,
  defaultFetch,
  decodeXmlEntities,
  validateLang,
  fetchWithRetry,
} from './utils';
import {
  YoutubeTranscriptVideoUnavailableError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
} from './errors';
import {
  TranscriptConfig,
  TranscriptSegment,
  TranscriptResult,
  VideoDetails,
  FetchParams,
  InnertubePlayerResponse,
  CaptionTrack,
  CaptionTrackInfo,
} from './types';

/**
 * Fetches YouTube video transcripts and caption metadata using the Innertube API.
 *
 * Can be used as an instance (with shared config) or via static/convenience methods.
 *
 * @example
 * ```typescript
 * // Instance usage with shared config
 * const yt = new YoutubeTranscript({ lang: 'en' });
 * const transcript = await yt.fetchTranscript('dQw4w9WgXcQ');
 * const languages = await yt.listLanguages('dQw4w9WgXcQ');
 *
 * // Static method
 * const transcript = await YoutubeTranscript.fetchTranscript('dQw4w9WgXcQ', { lang: 'en' });
 *
 * // Opt-in to video details
 * const { videoDetails, segments } = await YoutubeTranscript.fetchTranscript('dQw4w9WgXcQ', {
 *   videoDetails: true,
 * });
 *
 * // Convenience export
 * const transcript = await fetchTranscript('dQw4w9WgXcQ');
 * const languages = await listLanguages('dQw4w9WgXcQ');
 * ```
 */
export class YoutubeTranscript {
  constructor(private config?: TranscriptConfig) {}

  /**
   * Fetch caption tracks and the player response from the Innertube player API.
   * Shared logic used by both fetchTranscript and listLanguages.
   */
  private async _fetchCaptionTracks(
    identifier: string,
    lang?: string,
  ): Promise<{ tracks: CaptionTrack[]; playerJson: InnertubePlayerResponse }> {
    const userAgent = this.config?.userAgent ?? DEFAULT_USER_AGENT;
    const protocol = this.config?.disableHttps ? 'http' : 'https';
    const retries = this.config?.retries ?? 0;
    const retryDelay = this.config?.retryDelay ?? 1000;
    const signal = this.config?.signal;

    // 1) Fetch the watch page to extract an Innertube API key
    const watchUrl = `${protocol}://www.youtube.com/watch?v=${identifier}`;
    const watchFetchParams: FetchParams = { url: watchUrl, lang, userAgent, signal };
    const videoPageResponse = await fetchWithRetry(
      () =>
        this.config?.videoFetch
          ? this.config.videoFetch(watchFetchParams)
          : defaultFetch(watchFetchParams),
      retries,
      retryDelay,
      signal,
    );

    if (!videoPageResponse.ok) {
      throw new YoutubeTranscriptVideoUnavailableError(identifier);
    }

    const videoPageBody = await videoPageResponse.text();

    // Basic bot/recaptcha detection preserves old error behavior
    if (videoPageBody.includes('class="g-recaptcha"')) {
      throw new YoutubeTranscriptTooManyRequestError();
    }

    // 2) Extract Innertube API key from the page
    const apiKeyMatch =
      videoPageBody.match(/"INNERTUBE_API_KEY":"([^"]+)"/) ||
      videoPageBody.match(/INNERTUBE_API_KEY\\":\\"([^\\"]+)\\"/);

    if (!apiKeyMatch) {
      throw new YoutubeTranscriptNotAvailableError(identifier);
    }
    const apiKey = apiKeyMatch[1];

    // 3) Call Innertube player as ANDROID client to retrieve captionTracks
    const playerEndpoint = `${protocol}://www.youtube.com/youtubei/v1/player?key=${apiKey}`;
    const playerBody = {
      context: {
        client: {
          clientName: 'ANDROID',
          clientVersion: '20.10.38',
        },
      },
      videoId: identifier,
    };

    const playerFetchParams: FetchParams = {
      url: playerEndpoint,
      method: 'POST',
      lang,
      userAgent,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playerBody),
      signal,
    };
    const playerRes = await fetchWithRetry(
      () =>
        this.config?.playerFetch
          ? this.config.playerFetch(playerFetchParams)
          : defaultFetch(playerFetchParams),
      retries,
      retryDelay,
      signal,
    );

    if (!playerRes.ok) {
      throw new YoutubeTranscriptVideoUnavailableError(identifier);
    }

    const playerJson = (await playerRes.json()) as InnertubePlayerResponse;

    const tracklist =
      playerJson.captions?.playerCaptionsTracklistRenderer ??
      playerJson.playerCaptionsTracklistRenderer;

    const tracks = tracklist?.captionTracks;

    const isPlayableOk = playerJson.playabilityStatus?.status === 'OK';

    // If `captions` is entirely missing, treat as "not available"
    if (!playerJson.captions || !tracklist) {
      // If video is playable but captions aren't provided, treat as "disabled"
      if (isPlayableOk) {
        throw new YoutubeTranscriptDisabledError(identifier);
      }
      // Otherwise we can't assert they're disabled; treat as "not available"
      throw new YoutubeTranscriptNotAvailableError(identifier);
    }

    // If `captions` exists but there are zero tracks, treat as "disabled"
    if (!Array.isArray(tracks) || tracks.length === 0) {
      throw new YoutubeTranscriptDisabledError(identifier);
    }

    return { tracks, playerJson };
  }

  /**
   * Extract VideoDetails from the Innertube player response.
   */
  private _extractVideoDetails(
    playerJson: InnertubePlayerResponse,
    identifier: string,
  ): VideoDetails {
    const raw = playerJson.videoDetails;
    return {
      videoId: raw?.videoId ?? identifier,
      title: raw?.title ?? '',
      author: raw?.author ?? '',
      channelId: raw?.channelId ?? '',
      lengthSeconds: parseInt(raw?.lengthSeconds ?? '0', 10),
      viewCount: parseInt(raw?.viewCount ?? '0', 10),
      description: raw?.shortDescription ?? '',
      keywords: raw?.keywords ?? [],
      thumbnails: raw?.thumbnail?.thumbnails ?? [],
      isLiveContent: raw?.isLiveContent ?? false,
    };
  }

  /**
   * Fetch the transcript for a YouTube video.
   *
   * When `videoDetails` is set to `true` in the config, returns a {@link TranscriptResult}
   * containing both video metadata and transcript segments. Otherwise returns an array of
   * {@link TranscriptSegment} objects.
   *
   * @param videoId - A YouTube video ID (11 characters) or full YouTube URL.
   * @returns An array of transcript segments, or a TranscriptResult if `videoDetails` is enabled.
   * @throws {@link YoutubeTranscriptInvalidVideoIdError} if the video ID/URL is invalid.
   * @throws {@link YoutubeTranscriptVideoUnavailableError} if the video is unavailable.
   * @throws {@link YoutubeTranscriptDisabledError} if transcripts are disabled.
   * @throws {@link YoutubeTranscriptNotAvailableError} if no transcript is available.
   * @throws {@link YoutubeTranscriptNotAvailableLanguageError} if the requested language is unavailable.
   * @throws {@link YoutubeTranscriptTooManyRequestError} if rate-limited by YouTube.
   */
  async fetchTranscript(videoId: string): Promise<TranscriptSegment[] | TranscriptResult> {
    const identifier = retrieveVideoId(videoId);

    const lang = this.config?.lang;
    if (lang) {
      validateLang(lang);
    }
    const userAgent = this.config?.userAgent ?? DEFAULT_USER_AGENT;
    const includeDetails = this.config?.videoDetails === true;

    // Cache lookup (if provided)
    const cache = this.config?.cache;
    const cacheTTL = this.config?.cacheTTL;
    const cacheKey = includeDetails
      ? `yt:transcript+details:${identifier}:${lang ?? ''}`
      : `yt:transcript:${identifier}:${lang ?? ''}`;
    if (cache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached) as TranscriptSegment[] | TranscriptResult;
        } catch {
          // ignore parse errors and continue
        }
      }
    }

    const { tracks, playerJson } = await this._fetchCaptionTracks(identifier, lang);

    // Respect requested language or fallback to first track
    const selectedTrack: CaptionTrack | undefined = lang
      ? tracks.find((t) => t.languageCode === lang)
      : tracks[0];

    if (!selectedTrack) {
      const available = tracks.map((t) => t.languageCode).filter(Boolean);
      throw new YoutubeTranscriptNotAvailableLanguageError(lang!, available, identifier);
    }

    // Build transcript URL; prefer XML by stripping fmt if present
    const transcriptBaseURL = selectedTrack.baseUrl ?? selectedTrack.url;
    if (!transcriptBaseURL) {
      throw new YoutubeTranscriptNotAvailableError(identifier);
    }
    let transcriptURL = transcriptBaseURL;
    transcriptURL = transcriptURL.replace(/&fmt=[^&]+/, '');

    if (this.config?.disableHttps) {
      transcriptURL = transcriptURL.replace(/^https:\/\//, 'http://');
    }

    // Fetch transcript XML using the same hook surface as before
    const retries = this.config?.retries ?? 0;
    const retryDelay = this.config?.retryDelay ?? 1000;
    const signal = this.config?.signal;
    const transcriptFetchParams: FetchParams = { url: transcriptURL, lang, userAgent, signal };
    const transcriptResponse = await fetchWithRetry(
      () =>
        this.config?.transcriptFetch
          ? this.config.transcriptFetch(transcriptFetchParams)
          : defaultFetch(transcriptFetchParams),
      retries,
      retryDelay,
      signal,
    );

    if (!transcriptResponse.ok) {
      // Preserve legacy behavior
      if (transcriptResponse.status === 429) {
        throw new YoutubeTranscriptTooManyRequestError();
      }
      throw new YoutubeTranscriptNotAvailableError(identifier);
    }

    const transcriptBody = await transcriptResponse.text();

    // Parse XML into TranscriptSegment objects
    const results = [...transcriptBody.matchAll(RE_XML_TRANSCRIPT)];
    const segments: TranscriptSegment[] = results.map((m) => ({
      text: decodeXmlEntities(m[3]),
      duration: parseFloat(m[2]),
      offset: parseFloat(m[1]),
      lang: lang ?? selectedTrack.languageCode,
    }));

    if (segments.length === 0) {
      throw new YoutubeTranscriptNotAvailableError(identifier);
    }

    // Build the result based on whether videoDetails was requested
    const result: TranscriptSegment[] | TranscriptResult = includeDetails
      ? { videoDetails: this._extractVideoDetails(playerJson, identifier), segments }
      : segments;

    // Cache store
    if (cache) {
      try {
        await cache.set(cacheKey, JSON.stringify(result), cacheTTL);
      } catch {
        // non-fatal
      }
    }

    return result;
  }

  /**
   * List available caption languages for a YouTube video.
   *
   * Queries the Innertube player API to discover what caption tracks exist,
   * without downloading any transcript data.
   *
   * @param videoId - A YouTube video ID (11 characters) or full YouTube URL.
   * @returns An array of available caption track info objects.
   * @throws {@link YoutubeTranscriptInvalidVideoIdError} if the video ID/URL is invalid.
   * @throws {@link YoutubeTranscriptVideoUnavailableError} if the video is unavailable.
   * @throws {@link YoutubeTranscriptDisabledError} if transcripts are disabled.
   * @throws {@link YoutubeTranscriptNotAvailableError} if no captions are available.
   * @throws {@link YoutubeTranscriptTooManyRequestError} if rate-limited by YouTube.
   *
   * @example
   * ```typescript
   * const yt = new YoutubeTranscript();
   * const languages = await yt.listLanguages('dQw4w9WgXcQ');
   * // [
   * //   { languageCode: 'en', languageName: 'English', isAutoGenerated: false },
   * //   { languageCode: 'es', languageName: 'Spanish (auto-generated)', isAutoGenerated: true },
   * // ]
   * ```
   */
  async listLanguages(videoId: string): Promise<CaptionTrackInfo[]> {
    const identifier = retrieveVideoId(videoId);
    const { tracks } = await this._fetchCaptionTracks(identifier);

    return tracks.map((track) => ({
      languageCode: track.languageCode,
      languageName: track.name?.simpleText ?? track.languageCode,
      isAutoGenerated: track.kind === 'asr',
    }));
  }

  /**
   * Static convenience method to fetch a transcript without creating an instance.
   *
   * @param videoId - A YouTube video ID (11 characters) or full YouTube URL.
   * @param config - Optional configuration options.
   * @returns An array of transcript segments, or a {@link TranscriptResult} when `videoDetails: true`.
   */
  static fetchTranscript(videoId: string): Promise<TranscriptSegment[]>;
  static fetchTranscript(
    videoId: string,
    config: TranscriptConfig & { videoDetails: true },
  ): Promise<TranscriptResult>;
  static fetchTranscript(
    videoId: string,
    config: TranscriptConfig,
  ): Promise<TranscriptSegment[]>;
  static async fetchTranscript(
    videoId: string,
    config?: TranscriptConfig,
  ): Promise<TranscriptSegment[] | TranscriptResult> {
    const instance = new YoutubeTranscript(config);
    return instance.fetchTranscript(videoId);
  }

  /**
   * Static convenience method to list available caption languages without creating an instance.
   *
   * @param videoId - A YouTube video ID (11 characters) or full YouTube URL.
   * @param config - Optional configuration options.
   * @returns An array of available caption track info objects.
   */
  static async listLanguages(
    videoId: string,
    config?: TranscriptConfig,
  ): Promise<CaptionTrackInfo[]> {
    const instance = new YoutubeTranscript(config);
    return instance.listLanguages(videoId);
  }
}

export type {
  CacheStrategy,
  CaptionTrackInfo,
  Thumbnail,
  TranscriptConfig,
  TranscriptResponse,
  TranscriptResult,
  TranscriptSegment,
  VideoDetails,
  FetchParams,
} from './types';
export { InMemoryCache, FsCache } from './cache';
export { toSRT, toVTT, toPlainText } from './formatters';

export * from './errors';

/**
 * Convenience function to fetch a YouTube video transcript.
 *
 * @param videoId - A YouTube video ID (11 characters) or full YouTube URL.
 * @param config - Optional configuration options.
 * @returns An array of transcript segments, or a {@link TranscriptResult} when `videoDetails: true`.
 *
 * @example
 * ```typescript
 * import { fetchTranscript } from 'youtube-transcript-plus';
 *
 * // Returns TranscriptSegment[]
 * const transcript = await fetchTranscript('dQw4w9WgXcQ');
 *
 * // Returns TranscriptResult with video details
 * const { videoDetails, segments } = await fetchTranscript('dQw4w9WgXcQ', {
 *   videoDetails: true,
 * });
 * ```
 */
export function fetchTranscript(videoId: string): Promise<TranscriptSegment[]>;
export function fetchTranscript(
  videoId: string,
  config: TranscriptConfig & { videoDetails: true },
): Promise<TranscriptResult>;
export function fetchTranscript(
  videoId: string,
  config: TranscriptConfig,
): Promise<TranscriptSegment[]>;
export function fetchTranscript(
  videoId: string,
  config?: TranscriptConfig,
): Promise<TranscriptSegment[] | TranscriptResult> {
  return YoutubeTranscript.fetchTranscript(videoId, config as TranscriptConfig);
}

/**
 * Convenience function to list available caption languages for a YouTube video.
 *
 * @param videoId - A YouTube video ID (11 characters) or full YouTube URL.
 * @param config - Optional configuration options.
 * @returns An array of available caption track info objects.
 *
 * @example
 * ```typescript
 * import { listLanguages } from 'youtube-transcript-plus';
 * const languages = await listLanguages('dQw4w9WgXcQ');
 * ```
 */
export const listLanguages = YoutubeTranscript.listLanguages;
