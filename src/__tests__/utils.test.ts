import { defaultFetch, retrieveVideoId } from '../utils';
import { YoutubeTranscriptInvalidVideoIdError } from '../errors';

// Mock global fetch
global.fetch = jest.fn();

describe('defaultFetch', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should make GET request by default', async () => {
    const mockResponse = { ok: true, status: 200 };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

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
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

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
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

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
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

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
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

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
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

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
});
