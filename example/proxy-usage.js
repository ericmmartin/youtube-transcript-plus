import { fetchTranscript } from 'youtube-transcript-plus';
import { HttpsProxyAgent } from 'https-proxy-agent';

// npm install https-proxy-agent youtube-transcript-plus
// Enter a valid proxy URL below
const proxyUrl = 'YOUR_PROXY_URL';

async function main() {
  try {
    const videoId = 'dQw4w9WgXcQ';
    const transcript = await fetchTranscript(videoId, {
      videoFetch: async ({ url, lang, userAgent }) => {
        return fetch(url, {
          headers: {
            ...(lang && { 'Accept-Language': lang }),
            'User-Agent': userAgent,
          },
          agent: new HttpsProxyAgent(proxyUrl),
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
          agent: new HttpsProxyAgent(proxyUrl),
        });
      },
      transcriptFetch: async ({ url, lang, userAgent }) => {
        return fetch(url, {
          headers: {
            ...(lang && { 'Accept-Language': lang }),
            'User-Agent': userAgent,
          },
          agent: new HttpsProxyAgent(proxyUrl),
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
