# youtube-transcript-plus

[![npm version](https://badge.fury.io/js/youtube-transcript-plus.svg)](https://badge.fury.io/js/youtube-transcript-plus)

A Node.js library to fetch transcripts from YouTube videos. This package uses YouTube's unofficial API, so it may break if YouTube changes its internal structure.

**Note:** This project was originally forked from [https://github.com/Kakulukian/youtube-transcript](https://github.com/Kakulukian/youtube-transcript).

## Installation

```bash
$ npm install youtube-transcript-plus
```

or

```bash
$ yarn add youtube-transcript-plus
```

## Usage

### Basic Usage

```javascript
import { fetchTranscript } from 'youtube-transcript-plus';

// Fetch transcript using default settings
fetchTranscript('videoId_or_URL').then(console.log).catch(console.error);
```

### Custom User-Agent

You can pass a custom `userAgent` string to mimic different browsers or devices.

```javascript
fetchTranscript('videoId_or_URL', {
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
})
  .then(console.log)
  .catch(console.error);
```

### HTTP Support

You can disable HTTPS and use HTTP instead for YouTube requests by setting the `disableHttps` option to `true`. This might be necessary in certain environments where HTTPS connections are restricted.

```javascript
fetchTranscript('videoId_or_URL', {
  disableHttps: true, // Use HTTP instead of HTTPS
})
  .then(console.log)
  .catch(console.error);
```

**Security Warning:** Using HTTP instead of HTTPS removes transport layer security and is not recommended for production environments. Only use this option when absolutely necessary.

### Custom Fetch Functions

You can inject custom `videoFetch`, `playerFetch`, and `transcriptFetch` functions to modify the fetch behavior, such as using a proxy or custom headers. The library makes three types of HTTP requests:

1. **`videoFetch`**: Fetches the YouTube video page (GET request)
2. **`playerFetch`**: Calls YouTube's Innertube API to get caption tracks (POST request)
3. **`transcriptFetch`**: Downloads the actual transcript data (GET request)

```javascript
fetchTranscript('videoId_or_URL', {
  videoFetch: async ({ url, lang, userAgent }) => {
    // Custom logic for video page fetch (GET)
    return fetch(`https://my-proxy-server.com/?url=${encodeURIComponent(url)}`, {
      headers: {
        ...(lang && { 'Accept-Language': lang }),
        'User-Agent': userAgent,
      },
    });
  },
  playerFetch: async ({ url, method, body, headers, lang, userAgent }) => {
    // Custom logic for Innertube API call (POST)
    return fetch(`https://my-proxy-server.com/?url=${encodeURIComponent(url)}`, {
      method,
      headers: {
        ...(lang && { 'Accept-Language': lang }),
        'User-Agent': userAgent,
        ...headers,
      },
      body,
    });
  },
  transcriptFetch: async ({ url, lang, userAgent }) => {
    // Custom logic for transcript data fetch (GET)
    return fetch(`https://my-proxy-server.com/?url=${encodeURIComponent(url)}`, {
      headers: {
        ...(lang && { 'Accept-Language': lang }),
        'User-Agent': userAgent,
      },
    });
  },
})
  .then(console.log)
  .catch(console.error);
```

### Language Support

You can specify the language for the transcript using the `lang` option.

```javascript
fetchTranscript('videoId_or_URL', {
  lang: 'fr', // Fetch transcript in French
})
  .then(console.log)
  .catch(console.error);
```

### Caching

You can provide a custom caching strategy by implementing the `CacheStrategy` interface. The library also provides default implementations for in-memory and file system caching.

#### In-Memory Cache

```typescript
import { fetchTranscript, InMemoryCache } from 'youtube-transcript-plus';

fetchTranscript('videoId_or_URL', {
  lang: 'en',
  userAgent: 'FOO',
  cache: new InMemoryCache(1800000), // 30 minutes TTL
})
  .then(console.log)
  .catch(console.error);
```

#### File System Cache

```typescript
import { fetchTranscript, FsCache } from 'youtube-transcript-plus';

fetchTranscript('videoId_or_URL', {
  cache: new FsCache('./my-cache-dir', 86400000), // 1 day TTL
})
  .then(console.log)
  .catch(console.error);
```

### Custom Caching

If the default implementations don’t meet your needs, you can implement your own caching strategy:

```typescript
import { fetchTranscript, CacheStrategy } from 'youtube-transcript-plus';

class CustomCache implements CacheStrategy {
  async get(key: string): Promise<string | null> {
    // Custom logic
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    // Custom logic
  }
}

fetchTranscript('videoId_or_URL', {
  cache: new CustomCache(),
})
  .then(console.log)
  .catch(console.error);
```

### Error Handling

The library throws specific errors for different failure scenarios. Make sure to handle them appropriately.

```javascript
import {
  YoutubeTranscriptVideoUnavailableError,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
} from 'youtube-transcript-plus';

fetchTranscript('videoId_or_URL')
  .then(console.log)
  .catch((error) => {
    if (error instanceof YoutubeTranscriptVideoUnavailableError) {
      console.error('Video is unavailable:', error.message);
    } else if (error instanceof YoutubeTranscriptDisabledError) {
      console.error('Transcripts are disabled for this video:', error.message);
    } else if (error instanceof YoutubeTranscriptNotAvailableError) {
      console.error('No transcript available:', error.message);
    } else if (error instanceof YoutubeTranscriptNotAvailableLanguageError) {
      console.error('Transcript not available in the specified language:', error.message);
    } else {
      console.error('An unexpected error occurred:', error.message);
    }
  });
```

### Example Usage Files

The repository includes several example files in the `example/` directory to demonstrate different use cases of the library:

1. **`basic-usage.js`**: Demonstrates the simplest way to fetch a transcript using the default settings.
2. **`caching-usage.js`**: Shows how to use the `InMemoryCache` to cache transcripts with a 30-minute TTL.
3. **`fs-caching-usage.js`**: Demonstrates how to use the `FsCache` to cache transcripts on the file system with a 1-day TTL.
4. **`language-usage.js`**: Shows how to fetch a transcript in a specific language (e.g., French).
5. **`proxy-usage.js`**: Demonstrates how to use a proxy server to fetch transcripts, which can be useful for bypassing rate limits or accessing restricted content.
6. **`custom-fetch-usage.js`**: Shows how to use all three custom fetch functions (`videoFetch`, `playerFetch`, `transcriptFetch`) with logging and custom headers.

These examples can be found in the `example/` directory of the repository.

### API

### `fetchTranscript(videoId: string, config?: TranscriptConfig)`

Fetches the transcript for a YouTube video.

- **`videoId`**: The YouTube video ID or URL.
- **`config`**: Optional configuration object with the following properties:
  - **`lang`**: Language code (e.g., `'en'`, `'fr'`) for the transcript.
  - **`userAgent`**: Custom User-Agent string.
  - **`cache`**: Custom caching strategy.
  - **`cacheTTL`**: Time-to-live for cache entries in milliseconds.
  - **`disableHttps`**: Set to `true` to use HTTP instead of HTTPS for YouTube requests.
  - **`videoFetch`**: Custom fetch function for the video page request (GET).
  - **`playerFetch`**: Custom fetch function for the YouTube Innertube API request (POST).
  - **`transcriptFetch`**: Custom fetch function for the transcript data request (GET).

Returns a `Promise<TranscriptResponse[]>` where each item in the array represents a transcript segment with the following properties:

- **`text`**: The text of the transcript segment.
- **`duration`**: The duration of the segment in seconds.
- **`offset`**: The start time of the segment in seconds.
- **`lang`**: The language of the transcript.

## Errors

The library throws the following errors:

- **`YoutubeTranscriptVideoUnavailableError`**: The video is unavailable or has been removed.
- **`YoutubeTranscriptDisabledError`**: Transcripts are disabled for the video.
- **`YoutubeTranscriptNotAvailableError`**: No transcript is available for the video.
- **`YoutubeTranscriptNotAvailableLanguageError`**: The transcript is not available in the specified language.
- **`YoutubeTranscriptInvalidVideoIdError`**: The provided video ID or URL is invalid.

## License

**[MIT](LICENSE)** Licensed
