import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryCache } from '../../cache/in-memory-cache';

describe('InMemoryCache', () => {
  let cache: InMemoryCache;

  beforeEach(() => {
    cache = new InMemoryCache();
  });

  it('should store and retrieve a value', async () => {
    await cache.set('key1', 'value1');
    expect(await cache.get('key1')).toBe('value1');
  });

  it('should return null for expired entries', async () => {
    await cache.set('key1', 'value1', -1000); // Expired TTL
    expect(await cache.get('key1')).toBeNull();
  });

  it('should clean up expired entries', async () => {
    await cache.set('key1', 'value1', -1000); // Expired TTL
    await cache.get('key1'); // Trigger cleanup
    expect(await cache.get('key1')).toBeNull();
  });

  it('should respect TTL', async () => {
    await cache.set('key1', 'value1', 1000); // 1 second TTL
    expect(await cache.get('key1')).toBe('value1');
    await new Promise((resolve) => setTimeout(resolve, 1100)); // Wait for TTL to expire
    expect(await cache.get('key1')).toBeNull();
  });
});

describe('InMemoryCache Expiry', () => {
  let cache: InMemoryCache;

  beforeEach(() => {
    cache = new InMemoryCache(1000); // 1 second TTL
  });

  it('should return null after the TTL has expired', async () => {
    await cache.set('key1', 'value1');
    expect(await cache.get('key1')).toBe('value1');
    await new Promise((resolve) => setTimeout(resolve, 1100)); // Wait for TTL to expire
    expect(await cache.get('key1')).toBeNull();
  });
});
