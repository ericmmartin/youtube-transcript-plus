export interface CacheStrategy {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
}

export interface TranscriptConfig {
  lang?: string;
  userAgent?: string;
  cache?: CacheStrategy;
  cacheTTL?: number;
  disableHttps?: boolean;
  videoFetch?: (params: { url: string; lang?: string; userAgent?: string }) => Promise<Response>;
  transcriptFetch?: (params: {
    url: string;
    lang?: string;
    userAgent?: string;
  }) => Promise<Response>;
}

export interface TranscriptResponse {
  text: string;
  duration: number;
  offset: number;
  lang?: string;
}
