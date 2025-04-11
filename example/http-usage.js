import { fetchTranscript } from 'youtube-transcript-plus';

async function main() {
  try {
    const videoId = 'dQw4w9WgXcQ';
    const transcript = await fetchTranscript(videoId, {
      disableHttps: true, // Use HTTP instead of HTTPS
    });

    console.log('Transcript fetched successfully using HTTP:');
    console.log(transcript);
  } catch (error) {
    console.error('Error fetching transcript:', error.message);
  }
}

main();
