export interface CacheStrategy {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
}

export interface FetchParams {
  url: string;
  lang?: string;
  userAgent?: string;
  method?: 'GET' | 'POST';
  body?: string;
  headers?: Record<string, string>;
}

export interface TranscriptConfig {
  lang?: string;
  userAgent?: string;
  cache?: CacheStrategy;
  cacheTTL?: number;
  disableHttps?: boolean;
  videoFetch?: (params: FetchParams) => Promise<Response>;
  transcriptFetch?: (params: FetchParams) => Promise<Response>;
  playerFetch?: (params: FetchParams) => Promise<Response>;
}

export interface TranscriptResponse {
  text: string;
  duration: number;
  offset: number;
  lang?: string;
}
