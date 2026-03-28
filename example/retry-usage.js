import { fetchTranscript } from 'youtube-transcript-plus';

async function main() {
  try {
    const videoId = 'dQw4w9WgXcQ';
    const transcript = await fetchTranscript(videoId, {
      retries: 3, // Retry up to 3 times on 429/5xx errors
      retryDelay: 1000, // Start with 1 second delay (doubles each retry)
    });

    console.log('Transcript fetched successfully with retry support:');
    console.log(`Found ${transcript.length} segments`);
  } catch (error) {
    console.error('Error fetching transcript after retries:', error.message);
  }
}

main();
