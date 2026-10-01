import { fetchTranscript } from 'youtube-transcript-plus';
import { fetch, ProxyAgent } from 'undici';

// npm install undici youtube-transcript-plus
// (on Node 20.18.1+, install undici@7 — undici 8 requires Node >= 22.19)
// Enter a valid proxy URL below
const proxyUrl = 'YOUR_PROXY_URL';

async function main() {
  try {
    // Node's built-in fetch ignores `agent`; use undici's fetch with a dispatcher instead.
    const dispatcher = new ProxyAgent(proxyUrl);
    const videoId = 'dQw4w9WgXcQ';
    const transcript = await fetchTranscript(videoId, {
      videoFetch: async ({ url, lang, userAgent }) => {
        return fetch(url, {
          headers: {
            ...(lang && { 'Accept-Language': lang }),
            'User-Agent': userAgent,
          },
          dispatcher,
        });
      },
      playerFetch: async ({ url, method, body, headers, lang, userAgent }) => {
        return fetch(url, {
          method,
          headers: {
            'User-Agent': userAgent,
            ...(lang && { 'Accept-Language': lang }),
            ...headers,
          },
          body,
          dispatcher,
        });
      },
      transcriptFetch: async ({ url, lang, userAgent }) => {
        return fetch(url, {
          headers: {
            ...(lang && { 'Accept-Language': lang }),
            'User-Agent': userAgent,
          },
          dispatcher,
        });
      },
    });

    console.log('Transcript fetched successfully using proxy:');
    console.log(transcript);
  } catch (error) {
    console.error('Error fetching transcript:', error.message);
  }
}

main();
