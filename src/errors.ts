/** Thrown when YouTube is rate-limiting requests from your IP address. */
export class YoutubeTranscriptTooManyRequestError extends Error {
  constructor() {
    super(
      'YouTube is receiving too many requests from your IP address. Please try again later or use a proxy. If the issue persists, consider reducing the frequency of requests.',
    );
    this.name = 'YoutubeTranscriptTooManyRequestError';
  }
}

/** Thrown when the requested video is unavailable or has been removed. */
export class YoutubeTranscriptVideoUnavailableError extends Error {
  public readonly videoId: string;

  constructor(videoId: string) {
    super(
      `The video with ID "${videoId}" is no longer available or has been removed. Please check the video URL or ID and try again.`,
    );
    this.name = 'YoutubeTranscriptVideoUnavailableError';
    this.videoId = videoId;
  }
}

/** Thrown when transcripts are disabled for the video by its owner. */
export class YoutubeTranscriptDisabledError extends Error {
  public readonly videoId: string;

  constructor(videoId: string) {
    super(
      `Transcripts are disabled for the video with ID "${videoId}". This may be due to the video owner disabling captions or the video not supporting transcripts.`,
    );
    this.name = 'YoutubeTranscriptDisabledError';
    this.videoId = videoId;
  }
}

/** Thrown when no transcripts are available for the video. */
export class YoutubeTranscriptNotAvailableError extends Error {
  public readonly videoId: string;

  constructor(videoId: string) {
    super(
      `No transcripts are available for the video with ID "${videoId}". This may be because the video does not have captions or the captions are not accessible.`,
    );
    this.name = 'YoutubeTranscriptNotAvailableError';
    this.videoId = videoId;
  }
}

/** Thrown when the transcript is not available in the requested language. */
export class YoutubeTranscriptNotAvailableLanguageError extends Error {
  public readonly videoId: string;
  /** The requested language code that was not available. */
  public readonly lang: string;
  /** The language codes that are available for this video. */
  public readonly availableLangs: string[];

  constructor(lang: string, availableLangs: string[], videoId: string) {
    super(
      `No transcripts are available in "${lang}" for the video with ID "${videoId}". Available languages: ${availableLangs.join(
        ', ',
      )}. Please try a different language.`,
    );
    this.name = 'YoutubeTranscriptNotAvailableLanguageError';
    this.videoId = videoId;
    this.lang = lang;
    this.availableLangs = availableLangs;
  }
}

/** Thrown when the provided `lang` option is not a valid BCP 47 language code. */
export class YoutubeTranscriptInvalidLangError extends Error {
  /** The invalid language code that was provided. */
  public readonly lang: string;

  constructor(lang: string) {
    super(
      `Invalid language code "${lang}". Please provide a valid BCP 47 language code (e.g., "en", "fr", "pt-BR").`,
    );
    this.name = 'YoutubeTranscriptInvalidLangError';
    this.lang = lang;
  }
}

/** Thrown when the provided video ID or URL is invalid. */
export class YoutubeTranscriptInvalidVideoIdError extends Error {
  constructor() {
    super(
      'Invalid YouTube video ID or URL. Please provide a valid video ID or URL. Example: "dQw4w9WgXcQ" or "https://www.youtube.com/watch?v=dQw4w9WgXcQ".',
    );
    this.name = 'YoutubeTranscriptInvalidVideoIdError';
  }
}
