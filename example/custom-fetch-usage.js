import { YoutubeTranscript } from 'youtube-transcript-plus';

// Example showing how to use custom fetch functions for all three API calls
// This is useful for proxy support, custom headers, or logging

const customVideoFetch = async ({ url, lang, userAgent }) => {
  console.log(`Fetching YouTube video page: ${url}`);
  return fetch(url, {
    headers: {
      'User-Agent': userAgent,
      ...(lang && { 'Accept-Language': lang }),
    },
  });
};

const customPlayerFetch = async ({ url, method, body, headers, userAgent, lang }) => {
  console.log(`Fetching YouTube Innertube API: ${url}`);
  return fetch(url, {
    method,
    headers: {
      'User-Agent': userAgent,
      ...(lang && { 'Accept-Language': lang }),
      ...headers,
    },
    body,
  });
};

const customTranscriptFetch = async ({ url, lang, userAgent }) => {
  console.log(`Fetching transcript data: ${url}`);
  return fetch(url, {
    headers: {
      'User-Agent': userAgent,
      ...(lang && { 'Accept-Language': lang }),
    },
  });
};

async function main() {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript('dQw4w9WgXcQ', {
      videoFetch: customVideoFetch,
      playerFetch: customPlayerFetch,
      transcriptFetch: customTranscriptFetch,
      lang: 'en',
    });

    console.log('Transcript fetched successfully!');
    console.log(`Found ${transcript.length} segments`);

    // Show first few segments
    transcript.slice(0, 3).forEach((segment, index) => {
      console.log(`${index + 1}. [${segment.offset}s] ${segment.text}`);
    });
  } catch (error) {
    console.error('Error fetching transcript:', error.message);
  }
}

main();
