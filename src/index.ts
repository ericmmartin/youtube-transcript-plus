import { DEFAULT_USER_AGENT, RE_XML_TRANSCRIPT } from './constants';
import { retrieveVideoId, defaultFetch, decodeXmlEntities, validateLang } from './utils';
import {
  YoutubeTranscriptVideoUnavailableError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
} from './errors';
import {
  TranscriptConfig,
  TranscriptResponse,
  FetchParams,
  InnertubePlayerResponse,
  CaptionTrack,
} from './types';

/**
 * Fetches YouTube video transcripts using the Innertube API.
 *
 * Can be used as an instance (with shared config) or via static/convenience methods.
 *
 * @example
 * ```typescript
 * // Instance usage with shared config
 * const yt = new YoutubeTranscript({ lang: 'en' });
 * const transcript = await yt.fetchTranscript('dQw4w9WgXcQ');
 *
 * // Static method
 * const transcript = await YoutubeTranscript.fetchTranscript('dQw4w9WgXcQ', { lang: 'en' });
 *
 * // Convenience export
 * const transcript = await fetchTranscript('dQw4w9WgXcQ');
 * ```
 */
export class YoutubeTranscript {
  constructor(private config?: TranscriptConfig) {}

  /**
   * Fetch the transcript for a YouTube video.
   *
   * @param videoId - A YouTube video ID (11 characters) or full YouTube URL.
   * @returns An array of transcript segments.
   * @throws {@link YoutubeTranscriptInvalidVideoIdError} if the video ID/URL is invalid.
   * @throws {@link YoutubeTranscriptVideoUnavailableError} if the video is unavailable.
   * @throws {@link YoutubeTranscriptDisabledError} if transcripts are disabled.
   * @throws {@link YoutubeTranscriptNotAvailableError} if no transcript is available.
   * @throws {@link YoutubeTranscriptNotAvailableLanguageError} if the requested language is unavailable.
   * @throws {@link YoutubeTranscriptTooManyRequestError} if rate-limited by YouTube.
   */
  async fetchTranscript(videoId: string): Promise<TranscriptResponse[]> {
    const identifier = retrieveVideoId(videoId);

    const lang = this.config?.lang;
    if (lang) {
      validateLang(lang);
    }
    const userAgent = this.config?.userAgent ?? DEFAULT_USER_AGENT;

    // Cache lookup (if provided)
    const cache = this.config?.cache;
    const cacheTTL = this.config?.cacheTTL;
    const cacheKey = `yt:transcript:${identifier}:${lang ?? ''}`;
    if (cache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached) as TranscriptResponse[];
        } catch {
          // ignore parse errors and continue
        }
      }
    }

    // 1) Fetch the watch page to extract an Innertube API key (no interface change)
    // Decide protocol once and reuse
    const protocol = this.config?.disableHttps ? 'http' : 'https';
    const watchUrl = `${protocol}://www.youtube.com/watch?v=${identifier}`;
    const videoPageResponse = this.config?.videoFetch
      ? await this.config.videoFetch({ url: watchUrl, lang, userAgent })
      : await defaultFetch({ url: watchUrl, lang, userAgent });

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
      // If captions JSON wasn't present previously and we also can't find an API key,
      // retain the disabled semantics for compatibility.
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

    // Use configurable playerFetch for the POST to allow custom fetch logic.
    const playerFetchParams: FetchParams = {
      url: playerEndpoint,
      method: 'POST',
      lang,
      userAgent,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playerBody),
    };
    const playerRes = this.config?.playerFetch
      ? await this.config.playerFetch(playerFetchParams)
      : await defaultFetch(playerFetchParams);

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

    // Respect requested language or fallback to first track
    const selectedTrack: CaptionTrack | undefined = lang
      ? tracks.find((t) => t.languageCode === lang)
      : tracks[0];

    if (!selectedTrack) {
      const available = tracks.map((t) => t.languageCode).filter(Boolean);
      throw new YoutubeTranscriptNotAvailableLanguageError(lang!, available, identifier);
    }

    // 4) Build transcript URL; prefer XML by stripping fmt if present
    const transcriptBaseURL = selectedTrack.baseUrl ?? selectedTrack.url;
    if (!transcriptBaseURL) {
      throw new YoutubeTranscriptNotAvailableError(identifier);
    }
    let transcriptURL = transcriptBaseURL;
    transcriptURL = transcriptURL.replace(/&fmt=[^&]+/, '');

    if (this.config?.disableHttps) {
      transcriptURL = transcriptURL.replace(/^https:\/\//, 'http://');
    }

    // 5) Fetch transcript XML using the same hook surface as before
    const transcriptResponse = this.config?.transcriptFetch
      ? await this.config.transcriptFetch({ url: transcriptURL, lang, userAgent })
      : await defaultFetch({ url: transcriptURL, lang, userAgent });

    if (!transcriptResponse.ok) {
      // Preserve legacy behavior
      if (transcriptResponse.status === 429) {
        throw new YoutubeTranscriptTooManyRequestError();
      }
      throw new YoutubeTranscriptNotAvailableError(identifier);
    }

    const transcriptBody = await transcriptResponse.text();

    // 6) Parse XML into the existing TranscriptResponse shape
    const results = [...transcriptBody.matchAll(RE_XML_TRANSCRIPT)];
    const transcript: TranscriptResponse[] = results.map((m) => ({
      text: decodeXmlEntities(m[3]),
      duration: parseFloat(m[2]),
      offset: parseFloat(m[1]),
      lang: lang ?? selectedTrack.languageCode,
    }));

    if (transcript.length === 0) {
      throw new YoutubeTranscriptNotAvailableError(identifier);
    }

    // Cache store
    if (cache) {
      try {
        await cache.set(cacheKey, JSON.stringify(transcript), cacheTTL);
      } catch {
        // non-fatal
      }
    }

    return transcript;
  }

  /**
   * Static convenience method to fetch a transcript without creating an instance.
   *
   * @param videoId - A YouTube video ID (11 characters) or full YouTube URL.
   * @param config - Optional configuration options.
   * @returns An array of transcript segments.
   */
  static async fetchTranscript(
    videoId: string,
    config?: TranscriptConfig,
  ): Promise<TranscriptResponse[]> {
    const instance = new YoutubeTranscript(config);
    return instance.fetchTranscript(videoId);
  }
}

export type { CacheStrategy, TranscriptConfig, TranscriptResponse, FetchParams } from './types';
export { InMemoryCache, FsCache } from './cache';

export * from './errors';

/**
 * Convenience function to fetch a YouTube video transcript.
 *
 * @param videoId - A YouTube video ID (11 characters) or full YouTube URL.
 * @param config - Optional configuration options.
 * @returns An array of transcript segments.
 *
 * @example
 * ```typescript
 * import { fetchTranscript } from 'youtube-transcript-plus';
 * const transcript = await fetchTranscript('dQw4w9WgXcQ');
 * ```
 */
export const fetchTranscript = YoutubeTranscript.fetchTranscript;
