import { DEFAULT_USER_AGENT, RE_YOUTUBE } from './constants';
import { YoutubeTranscriptInvalidVideoIdError } from './errors';
import { FetchParams } from './types';

const RE_VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;

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
