import { DEFAULT_USER_AGENT, RE_XML_TRANSCRIPT } from './constants';
import { retrieveVideoId, defaultFetch } from './utils';
import {
  YoutubeTranscriptVideoUnavailableError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
} from './errors';
import { TranscriptConfig, TranscriptResponse } from './types';

export class YoutubeTranscript {
  constructor(private config?: TranscriptConfig & { cacheTTL?: number }) {}

  async fetchTranscript(videoId: string): Promise<TranscriptResponse[]> {
    const identifier = retrieveVideoId(videoId);
    const userAgent = this.config?.userAgent || DEFAULT_USER_AGENT;

    // Use custom fetch functions if provided, otherwise use defaultFetch
    const videoFetch = this.config?.videoFetch || defaultFetch;
    const transcriptFetch = this.config?.transcriptFetch || defaultFetch;

    // Cache key based on video ID and language
    const cacheKey = `transcript:${identifier}:${this.config?.lang || 'default'}`;

    // Check cache first
    if (this.config?.cache) {
      const cachedTranscript = await this.config.cache.get(cacheKey);
      if (cachedTranscript) {
        return JSON.parse(cachedTranscript);
      }
    }

    // Fetch the video page
    const videoPageResponse = await videoFetch({
      url: `https://www.youtube.com/watch?v=${identifier}`,
      lang: this.config?.lang,
      userAgent,
    });

    if (!videoPageResponse.ok) {
      throw new YoutubeTranscriptVideoUnavailableError(identifier);
    }

    const videoPageBody = await videoPageResponse.text();

    // Parse the video page to extract captions
    const splittedHTML = videoPageBody.split('"captions":');

    if (splittedHTML.length <= 1) {
      if (videoPageBody.includes('class="g-recaptcha"')) {
        throw new YoutubeTranscriptTooManyRequestError();
      }
      if (!videoPageBody.includes('"playabilityStatus":')) {
        throw new YoutubeTranscriptVideoUnavailableError(identifier);
      }
      throw new YoutubeTranscriptDisabledError(identifier);
    }

    const captions = (() => {
      try {
        return JSON.parse(splittedHTML[1].split(',"videoDetails')[0].replace('\n', ''));
      } catch (e) {
        return undefined;
      }
    })()?.['playerCaptionsTracklistRenderer'];

    if (!captions) {
      throw new YoutubeTranscriptDisabledError(identifier);
    }

    if (!('captionTracks' in captions)) {
      throw new YoutubeTranscriptNotAvailableError(identifier);
    }

    if (
      this.config?.lang &&
      !captions.captionTracks.some((track) => track.languageCode === this.config?.lang)
    ) {
      throw new YoutubeTranscriptNotAvailableLanguageError(
        this.config?.lang,
        captions.captionTracks.map((track) => track.languageCode),
        identifier,
      );
    }

    const transcriptURL = (
      this.config?.lang
        ? captions.captionTracks.find((track) => track.languageCode === this.config?.lang)
        : captions.captionTracks[0]
    ).baseUrl;

    // Fetch the transcript
    const transcriptResponse = await transcriptFetch({
      url: transcriptURL,
      lang: this.config?.lang,
      userAgent,
    });

    if (!transcriptResponse.ok) {
      throw new YoutubeTranscriptNotAvailableError(identifier);
    }

    const transcriptBody = await transcriptResponse.text();
    const results = [...transcriptBody.matchAll(RE_XML_TRANSCRIPT)];
    const transcript = results.map((result) => ({
      text: result[3],
      duration: parseFloat(result[2]),
      offset: parseFloat(result[1]),
      lang: this.config?.lang ?? captions.captionTracks[0].languageCode,
    }));

    // Store in cache if a strategy is provided
    if (this.config?.cache) {
      await this.config.cache.set(cacheKey, JSON.stringify(transcript), this.config.cacheTTL);
    }

    return transcript;
  }

  // Add static method for new usage pattern
  static async fetchTranscript(
    videoId: string,
    config?: TranscriptConfig,
  ): Promise<TranscriptResponse[]> {
    const instance = new YoutubeTranscript(config);
    return instance.fetchTranscript(videoId);
  }
}

export type { CacheStrategy } from './types';
export { InMemoryCache, FsCache } from './cache';

export * from './errors';

// Export the static method directly for convenience
export const fetchTranscript = YoutubeTranscript.fetchTranscript;
