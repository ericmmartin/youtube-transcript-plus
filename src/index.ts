import { DEFAULT_USER_AGENT, RE_XML_TRANSCRIPT } from './constants';
import { retrieveVideoId, defaultFetch } from './utils';
import {
  YoutubeTranscriptVideoUnavailableError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
} from './errors';
import { TranscriptConfig, TranscriptResponse, FetchParams } from './types';

/**
 * Implementation notes:
 * - Keeps the public surface identical.
 * - Internals now use YouTube Innertube `player` to discover captionTracks instead of scraping the watch HTML.
 * - Honors `lang`, custom fetch hooks (`videoFetch`, `transcriptFetch`), and optional cache strategy.
 */
export class YoutubeTranscript {
  constructor(private config?: TranscriptConfig) {}

  async fetchTranscript(videoId: string): Promise<TranscriptResponse[]> {
    const identifier = retrieveVideoId(videoId);

    const lang = this.config?.lang;
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
    const playerEndpoint = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`;
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

    const playerJson: any = await playerRes.json();

    const tracklist =
      playerJson?.captions?.playerCaptionsTracklistRenderer ??
      playerJson?.playerCaptionsTracklistRenderer;

    const tracks = tracklist?.captionTracks;

    const isPlayableOk = playerJson?.playabilityStatus?.status === 'OK';

    // If `captions` is entirely missing, treat as "not available"
    if (!playerJson?.captions || !tracklist) {
      // If video is playable but captions aren’t provided, treat as "disabled"
      if (isPlayableOk) {
        throw new YoutubeTranscriptDisabledError(identifier);
      }
      // Otherwise we can’t assert they’re disabled; treat as "not available"
      throw new YoutubeTranscriptNotAvailableError(identifier);
    }

    // If `captions` exists but there are zero tracks, treat as "disabled"
    if (!Array.isArray(tracks) || tracks.length === 0) {
      throw new YoutubeTranscriptDisabledError(identifier);
    }

    // Respect requested language or fallback to first track
    const selectedTrack = lang ? tracks.find((t: any) => t.languageCode === lang) : tracks[0];

    if (!selectedTrack) {
      const available = tracks.map((t: any) => t.languageCode).filter(Boolean);
      throw new YoutubeTranscriptNotAvailableLanguageError(lang!, available, identifier);
    }

    // 4) Build transcript URL; prefer XML by stripping fmt if present
    let transcriptURL: string = selectedTrack.baseUrl || selectedTrack.url;
    if (!transcriptURL) {
      throw new YoutubeTranscriptNotAvailableError(identifier);
    }
    transcriptURL = transcriptURL.replace(/&fmt=[^&]+$/, '');

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
      text: m[3],
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

  static async fetchTranscript(
    videoId: string,
    config?: TranscriptConfig,
  ): Promise<TranscriptResponse[]> {
    const instance = new YoutubeTranscript(config);
    return instance.fetchTranscript(videoId);
  }
}

export type { 
  TranscriptConfig, 
  TranscriptResponse, 
  FetchParams, 
  CacheStrategy 
} from './types';
export { InMemoryCache, FsCache } from './cache';

export * from './errors';

// Export the static method directly for convenience
export const fetchTranscript = YoutubeTranscript.fetchTranscript;
