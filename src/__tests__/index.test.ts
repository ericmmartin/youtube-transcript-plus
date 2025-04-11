import { YoutubeTranscript } from '../index';
import {
  YoutubeTranscriptInvalidVideoIdError,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptNotAvailableError,
} from '../errors';
import { retrieveVideoId } from '../utils';

describe('YoutubeTranscript', () => {
  it('should fetch transcript successfully', async () => {
    const transcriptFetcher = new YoutubeTranscript();
    const videoId = 'dQw4w9WgXcQ';
    const transcript = await transcriptFetcher.fetchTranscript(videoId);
    expect(transcript).toBeDefined();
    expect(transcript.length).toBeGreaterThan(0);
  });

  it('should throw YoutubeTranscriptInvalidVideoIdError when video is invalid', async () => {
    const transcriptFetcher = new YoutubeTranscript();
    const videoId = 'invalidVideoId';
    await expect(transcriptFetcher.fetchTranscript(videoId)).rejects.toThrow(
      YoutubeTranscriptInvalidVideoIdError,
    );
  });

  it('should throw YoutubeTranscriptDisabledError when transcript is disabled', async () => {
    const transcriptFetcher = new YoutubeTranscript();
    const videoId = 'UE03iN4QG1E';
    await expect(transcriptFetcher.fetchTranscript(videoId)).rejects.toThrow(
      YoutubeTranscriptDisabledError,
    );
  });

  it('should throw YoutubeTranscriptNotAvailableLanguageError when transcript is not available in the specified language', async () => {
    const transcriptFetcher = new YoutubeTranscript({ lang: 'fr' });
    const videoId = 'dQw4w9WgXcQ';
    await expect(transcriptFetcher.fetchTranscript(videoId)).rejects.toThrow(
      YoutubeTranscriptNotAvailableLanguageError,
    );
  });

  it('should construct URLs with HTTP when disableHttps is true', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          '<div id="player">{"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[{"baseUrl":"https://example.com/transcript","languageCode":"en"}]}}}</div>',
        ),
    });

    global.fetch = mockFetch;

    const transcriptFetcher = new YoutubeTranscript({ disableHttps: true });
    const videoId = 'dQw4w9WgXcQ';

    try {
      await transcriptFetcher.fetchTranscript(videoId);
    } catch (e) {}

    // Check that the URL used HTTP protocol
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/^http:\/\/www\.youtube\.com/),
      expect.anything(),
    );

    // Restore the original fetch
    jest.restoreAllMocks();
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
    const transcriptFetcher = new YoutubeTranscript();
    const videoId = 'dQw4w9WgXcQ';
    // Mock a response that indicates too many requests
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('<div class="g-recaptcha"></div>'),
    } as Response);

    await expect(transcriptFetcher.fetchTranscript(videoId)).rejects.toThrow(
      YoutubeTranscriptTooManyRequestError,
    );
  });

  it('should throw YoutubeTranscriptNotAvailableError when no transcript is available', async () => {
    const transcriptFetcher = new YoutubeTranscript();
    const videoId = 'dQw4w9WgXcQ';
    // Mock a response that indicates no transcript is available
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 404,
      text: () =>
        Promise.resolve(
          '  <div id="player">{"captions":{"playerCaptionsTracklistRenderer":{"visibility":"UNKNOWN"}},"videoDetails"</div>',
        ),
    } as Response);

    await expect(transcriptFetcher.fetchTranscript(videoId)).rejects.toThrow(
      YoutubeTranscriptNotAvailableError,
    );
  });
});
