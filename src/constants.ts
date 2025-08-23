export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export const RE_YOUTUBE =
  /(?:v=|\/|v\/|embed\/|watch\?.*v=|youtu\.be\/|\/v\/|e\/|watch\?.*vi?=|\/embed\/|\/v\/|vi?\/|watch\?.*vi?=|youtu\.be\/|\/vi?\/|\/e\/)([a-zA-Z0-9_-]{11})/i;

export const RE_XML_TRANSCRIPT = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;

export const DEFAULT_CACHE_TTL = 3600000; // 1 hour in milliseconds
