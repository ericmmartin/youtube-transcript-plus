import { fetchTranscript } from 'youtube-transcript-plus';

async function main() {
  try {
    const videoId = 'dQw4w9WgXcQ';
    const result = await fetchTranscript(videoId, {
      videoDetails: true, // Returns video metadata alongside transcript
    });

    console.log('Video Details:');
    console.log(`  Title: ${result.videoDetails.title}`);
    console.log(`  Author: ${result.videoDetails.author}`);
    console.log(`  Duration: ${result.videoDetails.lengthSeconds}s`);
    console.log(`  Views: ${result.videoDetails.viewCount}`);
    console.log(`  Keywords: ${result.videoDetails.keywords.join(', ')}`);
    console.log(`  Live: ${result.videoDetails.isLiveContent}`);

    console.log(`\nTranscript Segments: ${result.segments.length}`);
    result.segments.slice(0, 3).forEach((segment, index) => {
      console.log(`  ${index + 1}. [${segment.offset}s] ${segment.text}`);
    });
  } catch (error) {
    console.error('Error fetching transcript:', error.message);
  }
}

main();
