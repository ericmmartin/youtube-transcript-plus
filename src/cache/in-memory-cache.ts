import { CacheStrategy } from '../types';
import { DEFAULT_CACHE_TTL } from '../constants';

/**
 * In-memory cache implementation using a `Map`.
 *
 * Entries are automatically cleaned up when accessed after expiration.
 *
 * @example
 * ```typescript
 * import { fetchTranscript, InMemoryCache } from 'youtube-transcript-plus';
 * const transcript = await fetchTranscript('dQw4w9WgXcQ', {
 *   cache: new InMemoryCache(1800000), // 30 minutes TTL
 * });
 * ```
 */
export class InMemoryCache implements CacheStrategy {
  private cache = new Map<string, { value: string; expires: number }>();
  private defaultTTL: number;

  /** @param defaultTTL - Default time-to-live in milliseconds. Defaults to 1 hour. */
  constructor(defaultTTL = DEFAULT_CACHE_TTL) {
    this.defaultTTL = defaultTTL;
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (entry && entry.expires > Date.now()) {
      return entry.value;
    }
    this.cache.delete(key); // Clean up expired entries
    return null;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const expires = Date.now() + (ttl ?? this.defaultTTL);
    this.cache.set(key, { value, expires });
  }
}
