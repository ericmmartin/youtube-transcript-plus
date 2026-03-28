import { fetchTranscript } from 'youtube-transcript-plus';

async function main() {
  const controller = new AbortController();

  // Cancel the request after 5 seconds
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const videoId = 'dQw4w9WgXcQ';
    const transcript = await fetchTranscript(videoId, {
      signal: controller.signal,
    });

    console.log('Transcript fetched successfully:');
    console.log(`Found ${transcript.length} segments`);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Request was aborted due to timeout');
    } else {
      console.error('Error fetching transcript:', error.message);
    }
  } finally {
    clearTimeout(timeout);
  }
}

main();
