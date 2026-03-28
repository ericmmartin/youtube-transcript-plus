import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FsCache } from '../../cache/fs-cache';
import fs from 'node:fs/promises';
import path from 'node:path';

describe('FsCache', () => {
  const cacheDir = './test-cache';
  let cache: FsCache;

  beforeEach(async () => {
    await fs.mkdir(cacheDir, { recursive: true });
    cache = new FsCache(cacheDir);
  });

  afterEach(async () => {
    await fs.rm(cacheDir, { recursive: true, force: true });
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

  it('should handle invalid or missing cache files', async () => {
    const invalidFilePath = path.join(cacheDir, 'invalid-key');
    await fs.writeFile(invalidFilePath, 'invalid-data', 'utf-8');
    expect(await cache.get('invalid-key')).toBeNull();
  });
});

describe('FsCache Expiry', () => {
  const cacheDir = './test-cache';
  let cache: FsCache;

  beforeEach(async () => {
    await fs.mkdir(cacheDir, { recursive: true });
    cache = new FsCache(cacheDir, 1000); // 1 second TTL
  });

  afterEach(async () => {
    await fs.rm(cacheDir, { recursive: true, force: true });
  });

  it('should return null after the TTL has expired', async () => {
    await cache.set('key1', 'value1');
    expect(await cache.get('key1')).toBe('value1');
    await new Promise((resolve) => setTimeout(resolve, 1100)); // Wait for TTL to expire
    expect(await cache.get('key1')).toBeNull();
  });
});
