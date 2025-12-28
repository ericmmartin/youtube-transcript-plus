import fs from 'node:fs';
import path from 'node:path';
import nock from 'nock';

import { YoutubeTranscript } from '../index';
import {
  YoutubeTranscriptInvalidVideoIdError,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptNotAvailableError,
} from '../errors';
import { retrieveVideoId } from '../utils';

const fixturesDir = path.join(process.cwd(), 'src', '__tests__', 'fixtures');

const VIDEO_ID = 'TESTVIDEOID';
const API_KEY = 'test-key';

const loadFixture = (name: string): string =>
  fs.readFileSync(path.join(fixturesDir, name), 'utf8');
const loadJsonFixture = (name: string): unknown => JSON.parse(loadFixture(name));

const mockWatchPage = (protocol = 'https', body?: string) =>
  nock(`${protocol}://www.youtube.com`)
    .get('/watch')
    .query({ v: VIDEO_ID })
    .reply(200, body ?? loadFixture('watch.html'));

const mockPlayer = (body: unknown) =>
  nock('https://www.youtube.com')
    .post('/youtubei/v1/player')
    .query({ key: API_KEY })
    .reply(200, body);

const mockTranscript = (protocol = 'https') =>
  nock(`${protocol}://www.youtube.com`)
    .get('/api/timedtext')
    .query({ lang: 'en', v: VIDEO_ID })
    .reply(200, loadFixture('transcript.xml'));

const originalFetch = global.fetch;

beforeAll(() => {
  if (!global.fetch) {
    throw new Error('global fetch is not available in this test environment');
  }
  nock.disableNetConnect();
});

afterEach(() => {
  nock.cleanAll();
  jest.restoreAllMocks();
});

afterAll(() => {
  nock.enableNetConnect();
  global.fetch = originalFetch;
});

describe('YoutubeTranscript', () => {
  it('should fetch transcript successfully', async () => {
    mockWatchPage();
    mockPlayer(loadJsonFixture('player-success.json'));
    mockTranscript();

    const transcriptFetcher = new YoutubeTranscript();
    const transcript = await transcriptFetcher.fetchTranscript(VIDEO_ID);

    expect(transcript).toEqual([
      { text: 'Hello world', duration: 1.5, offset: 0, lang: 'en' },
      { text: 'Second line', duration: 2.0, offset: 1.5, lang: 'en' },
    ]);
  });

  it('should throw YoutubeTranscriptInvalidVideoIdError when video is invalid', async () => {
    const transcriptFetcher = new YoutubeTranscript();
    const videoId = 'invalidVideoId';
    await expect(transcriptFetcher.fetchTranscript(videoId)).rejects.toThrow(
      YoutubeTranscriptInvalidVideoIdError,
    );
  });

  it('should throw YoutubeTranscriptDisabledError when transcript is disabled', async () => {
    mockWatchPage();
    mockPlayer(loadJsonFixture('player-disabled.json'));

    const transcriptFetcher = new YoutubeTranscript();
    await expect(transcriptFetcher.fetchTranscript(VIDEO_ID)).rejects.toThrow(
      YoutubeTranscriptDisabledError,
    );
  });

  it('should throw YoutubeTranscriptNotAvailableLanguageError when transcript is not available in the specified language', async () => {
    mockWatchPage();
    mockPlayer(loadJsonFixture('player-success.json'));

    const transcriptFetcher = new YoutubeTranscript({ lang: 'fr' });
    await expect(transcriptFetcher.fetchTranscript(VIDEO_ID)).rejects.toThrow(
      YoutubeTranscriptNotAvailableLanguageError,
    );
  });

  it('should construct URLs with HTTP when disableHttps is true', async () => {
    mockWatchPage('http');
    mockPlayer(loadJsonFixture('player-success.json'));
    mockTranscript('http');

    const transcriptFetcher = new YoutubeTranscript({ disableHttps: true });
    const transcript = await transcriptFetcher.fetchTranscript(VIDEO_ID);

    expect(transcript.length).toBeGreaterThan(0);
    expect(nock.isDone()).toBe(true);
  });

  it('should use custom playerFetch when provided', async () => {
    const mockPlayerFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          captions: {
            playerCaptionsTracklistRenderer: {
              captionTracks: [{ baseUrl: 'https://example.com/transcript', languageCode: 'en' }],
            },
          },
          playabilityStatus: { status: 'OK' },
        }),
    });

    const mockVideoFetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{"INNERTUBE_API_KEY":"test-key"}'),
    });

    const mockTranscriptFetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<text start="0" dur="1.5">Hello world</text>'),
    });

    const transcriptFetcher = new YoutubeTranscript({
      playerFetch: mockPlayerFetch,
      videoFetch: mockVideoFetch,
      transcriptFetch: mockTranscriptFetch,
    });

    const result = await transcriptFetcher.fetchTranscript('dQw4w9WgXcQ');

    expect(mockPlayerFetch).toHaveBeenCalledWith({
      url: expect.stringContaining('youtubei/v1/player'),
      method: 'POST',
      lang: undefined,
      userAgent: expect.any(String),
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"videoId":"dQw4w9WgXcQ"'),
    });
    expect(result).toEqual([{ text: 'Hello world', duration: 1.5, offset: 0, lang: 'en' }]);
  });

  it('should use custom videoFetch and transcriptFetch when provided', async () => {
    const mockVideoFetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{"INNERTUBE_API_KEY":"custom-key"}'),
    });

    const mockTranscriptFetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<text start="0" dur="2.0">Custom transcript</text>'),
    });

    nock('https://www.youtube.com')
      .post('/youtubei/v1/player')
      .query({ key: 'custom-key' })
      .reply(200, {
        captions: {
          playerCaptionsTracklistRenderer: {
            captionTracks: [{ baseUrl: 'https://example.com/transcript', languageCode: 'fr' }],
          },
        },
        playabilityStatus: { status: 'OK' },
      });

    const transcriptFetcher = new YoutubeTranscript({
      videoFetch: mockVideoFetch,
      transcriptFetch: mockTranscriptFetch,
      lang: 'fr',
      userAgent: 'CustomAgent/1.0',
    });

    const result = await transcriptFetcher.fetchTranscript('dQw4w9WgXcQ');

    expect(mockVideoFetch).toHaveBeenCalledWith({
      url: expect.stringContaining('youtube.com/watch'),
      lang: 'fr',
      userAgent: 'CustomAgent/1.0',
    });
    expect(mockTranscriptFetch).toHaveBeenCalledWith({
      url: expect.stringContaining('example.com/transcript'),
      lang: 'fr',
      userAgent: 'CustomAgent/1.0',
    });
    expect(result).toEqual([{ text: 'Custom transcript', duration: 2.0, offset: 0, lang: 'fr' }]);
  });
});

describe('retrieveVideoId', () => {
  it('should return the video ID from a valid YouTube URL', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    expect(retrieveVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  it('should return the video ID from a short YouTube URL', () => {
    const url = 'https://youtu.be/dQw4w9WgXcQ';
    expect(retrieveVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  it('should return the video ID from an embedded YouTube URL', () => {
    const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    expect(retrieveVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  it('should return the video ID from a live YouTube URL', () => {
    const url = 'https://www.youtube.com/live/dQw4w9WgXcQ';
    expect(retrieveVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  it('should return the video ID from a YouTube Shorts URL', () => {
    const url = 'https://youtube.com/shorts/dQw4w9WgXcQ';
    expect(retrieveVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  it('should throw an error for an invalid YouTube URL', () => {
    const url = 'https://www.youtube.com/watch?v=invalid';
    expect(() => retrieveVideoId(url)).toThrow(YoutubeTranscriptInvalidVideoIdError);
  });

  it('should throw an error for a non-YouTube URL', () => {
    const url = 'https://www.google.com';
    expect(() => retrieveVideoId(url)).toThrow(YoutubeTranscriptInvalidVideoIdError);
  });
});

describe('YoutubeTranscript Error Handling', () => {
  it('should throw YoutubeTranscriptTooManyRequestError when too many requests are made', async () => {
    mockWatchPage('https', loadFixture('watch-recaptcha.html'));

    const transcriptFetcher = new YoutubeTranscript();
    await expect(transcriptFetcher.fetchTranscript(VIDEO_ID)).rejects.toThrow(
      YoutubeTranscriptTooManyRequestError,
    );
  });

  it('should throw YoutubeTranscriptNotAvailableError when no transcript is available', async () => {
    mockWatchPage();
    mockPlayer(loadJsonFixture('player-not-available.json'));

    const transcriptFetcher = new YoutubeTranscript();
    await expect(transcriptFetcher.fetchTranscript(VIDEO_ID)).rejects.toThrow(
      YoutubeTranscriptNotAvailableError,
    );
  });
});
