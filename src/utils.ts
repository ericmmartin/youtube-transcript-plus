import { DEFAULT_USER_AGENT, RE_YOUTUBE } from './constants';
import { YoutubeTranscriptInvalidVideoIdError } from './errors';
import { FetchParams } from './types';

export function retrieveVideoId(videoId: string): string {
  if (videoId.length === 11) {
    return videoId;
  }
  const matchId = videoId.match(RE_YOUTUBE);
  if (matchId && matchId.length) {
    return matchId[1];
  }
  throw new YoutubeTranscriptInvalidVideoIdError();
}

export async function defaultFetch(params: FetchParams): Promise<Response> {
  const { url, lang, userAgent, method = 'GET', body, headers = {} } = params;

  const fetchHeaders: Record<string, string> = {
    'User-Agent': userAgent || DEFAULT_USER_AGENT,
    ...(lang && { 'Accept-Language': lang }),
    ...headers,
  };

  const fetchOptions: RequestInit = {
    method,
    headers: fetchHeaders,
  };

  if (body && method === 'POST') {
    fetchOptions.body = body;
  }

  return fetch(url, fetchOptions);
}
