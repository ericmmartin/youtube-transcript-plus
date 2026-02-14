import { DEFAULT_USER_AGENT, RE_YOUTUBE } from './constants';
import { YoutubeTranscriptInvalidVideoIdError, YoutubeTranscriptInvalidLangError } from './errors';
import { FetchParams } from './types';

const RE_VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;
const RE_BCP47_LANG = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/;

const XML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

const RE_XML_ENTITY = /&(?:amp|lt|gt|quot|apos|#39);/g;

export function decodeXmlEntities(text: string): string {
  return text.replace(RE_XML_ENTITY, (match) => XML_ENTITIES[match] ?? match);
}

export function retrieveVideoId(videoId: string): string {
  if (RE_VIDEO_ID.test(videoId)) {
    return videoId;
  }
  const matchId = videoId.match(RE_YOUTUBE);
  if (matchId && matchId.length) {
    return matchId[1];
  }
  throw new YoutubeTranscriptInvalidVideoIdError();
}

/**
 * Validate that a language code matches a BCP 47-like pattern.
 * @throws {@link YoutubeTranscriptInvalidLangError} if the language code is invalid.
 */
export function validateLang(lang: string): void {
  if (!RE_BCP47_LANG.test(lang)) {
    throw new YoutubeTranscriptInvalidLangError(lang);
  }
}

export async function defaultFetch(params: FetchParams): Promise<Response> {
  const { url, lang, userAgent, method = 'GET', body, headers = {}, signal } = params;

  const fetchHeaders: Record<string, string> = {
    'User-Agent': userAgent || DEFAULT_USER_AGENT,
    ...(lang && { 'Accept-Language': lang }),
    ...headers,
  };

  const fetchOptions: RequestInit = {
    method,
    headers: fetchHeaders,
    signal,
  };

  if (body && method === 'POST') {
    fetchOptions.body = body;
  }

  return fetch(url, fetchOptions);
}

/** Returns true if the HTTP status code is retryable (429 or 5xx). */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

/**
 * Wait for the given number of milliseconds, aborting early if the signal fires.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    signal?.throwIfAborted();
    const timer = setTimeout(resolve, ms);
    if (signal) {
      const onAbort = () => {
        clearTimeout(timer);
        reject(signal.reason);
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

/**
 * Wrap a fetch call with retry logic using exponential backoff.
 *
 * Retries on 429 (Too Many Requests) and 5xx (Server Errors).
 * Client errors (4xx other than 429) are returned immediately.
 *
 * @param fetchFn - Function that performs the fetch call.
 * @param retries - Maximum number of retry attempts (0 = no retries).
 * @param retryDelay - Base delay in milliseconds for exponential backoff.
 * @param signal - Optional AbortSignal to cancel the operation.
 * @returns The fetch Response.
 */
export async function fetchWithRetry(
  fetchFn: () => Promise<Response>,
  retries: number,
  retryDelay: number,
  signal?: AbortSignal,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    signal?.throwIfAborted();

    const response = await fetchFn();

    if (!isRetryableStatus(response.status) || attempt === retries) {
      return response;
    }

    // Wait with exponential backoff: delay * 2^attempt
    const delay = retryDelay * Math.pow(2, attempt);
    await sleep(delay, signal);
  }

  // Unreachable — the loop always returns — but TypeScript requires it
  throw new Error('Unexpected: retry loop exited without returning');
}
