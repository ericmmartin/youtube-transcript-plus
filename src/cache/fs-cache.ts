import fs from 'fs/promises';
import path from 'path';
import { CacheStrategy } from '../types';
import { DEFAULT_CACHE_TTL } from '../constants';

function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export class FsCache implements CacheStrategy {
  private cacheDir: string;
  private defaultTTL: number;
  private ready: Promise<void>;

  constructor(cacheDir = './cache', defaultTTL = DEFAULT_CACHE_TTL) {
    this.cacheDir = cacheDir;
    this.defaultTTL = defaultTTL;
    this.ready = fs.mkdir(cacheDir, { recursive: true }).then(() => {});
  }

  async get(key: string): Promise<string | null> {
    await this.ready;
    const filePath = path.join(this.cacheDir, sanitizeKey(key));
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const { value, expires } = JSON.parse(data);
      if (expires > Date.now()) {
        return value;
      }
      await fs.unlink(filePath);
    } catch (_error) {}
    return null;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    await this.ready;
    const filePath = path.join(this.cacheDir, sanitizeKey(key));
    const expires = Date.now() + (ttl ?? this.defaultTTL);
    await fs.writeFile(filePath, JSON.stringify({ value, expires }), 'utf-8');
  }
}
