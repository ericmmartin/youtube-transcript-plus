export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Longest video ID or URL that retrieveVideoId() will match against RE_YOUTUBE.
// RE_YOUTUBE is unanchored and its `watch\?.*` alternatives backtrack, so
// matching time grows with the square of the input length; capping the length
// keeps a hostile input from blocking the event loop. Real YouTube URLs are far
// shorter than this.
export const MAX_VIDEO_INPUT_LENGTH = 2048;

export const RE_YOUTUBE =
  /(?:v=|\/|v\/|embed\/|watch\?.*v=|youtu\.be\/|\/v\/|e\/|watch\?.*vi?=|\/embed\/|\/v\/|vi?\/|watch\?.*vi?=|youtu\.be\/|\/vi?\/|\/e\/)([a-zA-Z0-9_-]{11})/i;

export const RE_XML_TRANSCRIPT = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;

export const DEFAULT_CACHE_TTL = 3600000; // 1 hour in milliseconds
