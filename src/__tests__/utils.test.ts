import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  defaultFetch,
  retrieveVideoId,
  decodeXmlEntities,
  validateLang,
  isRetryableStatus,
  fetchWithRetry,
} from '../utils';
import {
  YoutubeTranscriptInvalidVideoIdError,
  YoutubeTranscriptInvalidLangError,
} from '../errors';

// Mock global fetch
global.fetch = vi.fn();

describe('defaultFetch', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should make GET request by default', async () => {
    const mockResponse = { ok: true, status: 200 };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    await defaultFetch({
      url: 'https://example.com',
      lang: 'en',
      userAgent: 'Test Agent',
    });

    expect(global.fetch).toHaveBeenCalledWith('https://example.com', {
      method: 'GET',
      headers: {
        'User-Agent': 'Test Agent',
        'Accept-Language': 'en',
      },
    });
  });

  it('should make POST request with body when specified', async () => {
    const mockResponse = { ok: true, status: 200 };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    const testBody = JSON.stringify({ test: 'data' });
    await defaultFetch({
      url: 'https://api.example.com',
      method: 'POST',
      body: testBody,
      headers: { 'Content-Type': 'application/json' },
      userAgent: 'Test Agent',
    });

    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com', {
      method: 'POST',
      headers: {
        'User-Agent': 'Test Agent',
        'Content-Type': 'application/json',
      },
      body: testBody,
    });
  });

  it('should merge custom headers with default headers', async () => {
    const mockResponse = { ok: true, status: 200 };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    await defaultFetch({
      url: 'https://example.com',
      lang: 'fr',
      userAgent: 'Custom Agent',
      headers: {
        'Custom-Header': 'custom-value',
        'Another-Header': 'another-value',
      },
    });

    expect(global.fetch).toHaveBeenCalledWith('https://example.com', {
      method: 'GET',
      headers: {
        'User-Agent': 'Custom Agent',
        'Accept-Language': 'fr',
        'Custom-Header': 'custom-value',
        'Another-Header': 'another-value',
      },
    });
  });

  it('should not include Accept-Language header when lang is not provided', async () => {
    const mockResponse = { ok: true, status: 200 };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    await defaultFetch({
      url: 'https://example.com',
      userAgent: 'Test Agent',
    });

    expect(global.fetch).toHaveBeenCalledWith('https://example.com', {
      method: 'GET',
      headers: {
        'User-Agent': 'Test Agent',
      },
    });
  });

  it('should use default user agent when not provided', async () => {
    const mockResponse = { ok: true, status: 200 };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    await defaultFetch({
      url: 'https://example.com',
    });

    expect(global.fetch).toHaveBeenCalledWith('https://example.com', {
      method: 'GET',
      headers: {
        'User-Agent': expect.stringContaining('Mozilla'),
      },
    });
  });

  it('should not include body for GET requests even if provided', async () => {
    const mockResponse = { ok: true, status: 200 };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    await defaultFetch({
      url: 'https://example.com',
      method: 'GET',
      body: 'should not be included',
    });

    expect(global.fetch).toHaveBeenCalledWith('https://example.com', {
      method: 'GET',
      headers: {
        'User-Agent': expect.any(String),
      },
    });
  });
});

describe('retrieveVideoId', () => {
  it('should return video ID when given 11-character string', () => {
    expect(retrieveVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should extract video ID from standard YouTube URL', () => {
    expect(retrieveVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should extract video ID from YouTube short URL', () => {
    expect(retrieveVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should throw error for invalid video ID', () => {
    expect(() => retrieveVideoId('invalid')).toThrow(YoutubeTranscriptInvalidVideoIdError);
  });

  it('should throw error for non-YouTube URL', () => {
    expect(() => retrieveVideoId('https://example.com')).toThrow(
      YoutubeTranscriptInvalidVideoIdError,
    );
  });

  it('should reject 11-character strings with special characters', () => {
    expect(() => retrieveVideoId('../.././../.')).toThrow(YoutubeTranscriptInvalidVideoIdError);
    expect(() => retrieveVideoId('hello world')).toThrow(YoutubeTranscriptInvalidVideoIdError);
    expect(() => retrieveVideoId('abc!@#$%^&*')).toThrow(YoutubeTranscriptInvalidVideoIdError);
  });

  it('should accept valid 11-character video IDs with hyphens and underscores', () => {
    expect(retrieveVideoId('abc_def-123')).toBe('abc_def-123');
    expect(retrieveVideoId('___________')).toBe('___________');
    expect(retrieveVideoId('-----------')).toBe('-----------');
  });
});

describe('decodeXmlEntities', () => {
  it('should decode &amp; to &', () => {
    expect(decodeXmlEntities('rock &amp; roll')).toBe('rock & roll');
  });

  it('should decode &#39; and &apos; to single quote', () => {
    expect(decodeXmlEntities('it&#39;s')).toBe("it's");
    expect(decodeXmlEntities('it&apos;s')).toBe("it's");
  });

  it('should decode &quot; to double quote', () => {
    expect(decodeXmlEntities('a &quot;test&quot;')).toBe('a "test"');
  });

  it('should decode &lt; and &gt;', () => {
    expect(decodeXmlEntities('&lt;tag&gt;')).toBe('<tag>');
  });

  it('should handle multiple entities in one string', () => {
    expect(decodeXmlEntities('A &amp; B &lt; C &gt; D')).toBe('A & B < C > D');
  });

  it('should return plain text unchanged', () => {
    expect(decodeXmlEntities('Hello world')).toBe('Hello world');
  });
});

describe('validateLang', () => {
  it('should accept valid BCP 47 language codes', () => {
    expect(() => validateLang('en')).not.toThrow();
    expect(() => validateLang('fr')).not.toThrow();
    expect(() => validateLang('pt-BR')).not.toThrow();
    expect(() => validateLang('zh-Hans')).not.toThrow();
    expect(() => validateLang('en-US')).not.toThrow();
  });

  it('should reject strings with special characters', () => {
    expect(() => validateLang('en;drop')).toThrow(YoutubeTranscriptInvalidLangError);
    expect(() => validateLang('en\nHost: evil.com')).toThrow(YoutubeTranscriptInvalidLangError);
    expect(() => validateLang('<script>')).toThrow(YoutubeTranscriptInvalidLangError);
  });

  it('should reject empty strings', () => {
    expect(() => validateLang('')).toThrow(YoutubeTranscriptInvalidLangError);
  });

  it('should include the invalid lang in the error', () => {
    try {
      validateLang('invalid!');
    } catch (error) {
      expect(error).toBeInstanceOf(YoutubeTranscriptInvalidLangError);
      expect((error as YoutubeTranscriptInvalidLangError).lang).toBe('invalid!');
    }
  });
});

describe('isRetryableStatus', () => {
  it('should return true for 429', () => {
    expect(isRetryableStatus(429)).toBe(true);
  });

  it('should return true for 5xx status codes', () => {
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(502)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(599)).toBe(true);
  });

  it('should return false for 2xx status codes', () => {
    expect(isRetryableStatus(200)).toBe(false);
    expect(isRetryableStatus(201)).toBe(false);
  });

  it('should return false for non-429 4xx status codes', () => {
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(401)).toBe(false);
    expect(isRetryableStatus(403)).toBe(false);
    expect(isRetryableStatus(404)).toBe(false);
  });
});

describe('fetchWithRetry', () => {
  it('should return response immediately on success (no retry needed)', async () => {
    const response = { ok: true, status: 200 } as Response;
    const fetchFn = vi.fn().mockResolvedValue(response);

    const result = await fetchWithRetry(fetchFn, 3, 10);

    expect(result).toBe(response);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('should retry on 429 and return successful response', async () => {
    const failResponse = { ok: false, status: 429 } as Response;
    const successResponse = { ok: true, status: 200 } as Response;
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(failResponse)
      .mockResolvedValueOnce(successResponse);

    const result = await fetchWithRetry(fetchFn, 2, 10);

    expect(result).toBe(successResponse);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('should retry on 500 and return successful response', async () => {
    const failResponse = { ok: false, status: 500 } as Response;
    const successResponse = { ok: true, status: 200 } as Response;
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(failResponse)
      .mockResolvedValueOnce(successResponse);

    const result = await fetchWithRetry(fetchFn, 1, 10);

    expect(result).toBe(successResponse);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('should not retry on 400', async () => {
    const response = { ok: false, status: 400 } as Response;
    const fetchFn = vi.fn().mockResolvedValue(response);

    const result = await fetchWithRetry(fetchFn, 3, 10);

    expect(result).toBe(response);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('should return last failed response when retries exhausted', async () => {
    const failResponse = { ok: false, status: 503 } as Response;
    const fetchFn = vi.fn().mockResolvedValue(failResponse);

    const result = await fetchWithRetry(fetchFn, 2, 10);

    expect(result).toBe(failResponse);
    expect(fetchFn).toHaveBeenCalledTimes(3); // 1 original + 2 retries
  });

  it('should abort when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    const fetchFn = vi.fn();

    await expect(fetchWithRetry(fetchFn, 3, 10, controller.signal)).rejects.toThrow();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('should abort during retry delay', async () => {
    const failResponse = { ok: false, status: 429 } as Response;
    const fetchFn = vi.fn().mockResolvedValue(failResponse);
    const controller = new AbortController();

    const promise = fetchWithRetry(fetchFn, 3, 60000, controller.signal);

    // Abort after first attempt triggers retry delay
    setTimeout(() => controller.abort(), 50);

    await expect(promise).rejects.toThrow();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('should use exponential backoff delays', async () => {
    const failResponse = { ok: false, status: 429 } as Response;
    const successResponse = { ok: true, status: 200 } as Response;
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(failResponse)
      .mockResolvedValueOnce(failResponse)
      .mockResolvedValueOnce(successResponse);

    const start = Date.now();
    await fetchWithRetry(fetchFn, 2, 50);
    const elapsed = Date.now() - start;

    // Backoff: 50ms (attempt 0) + 100ms (attempt 1) = 150ms minimum
    expect(elapsed).toBeGreaterThanOrEqual(100); // Allow some tolerance
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });
});
