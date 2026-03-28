import { fetchTranscript, InMemoryCache } from 'youtube-transcript-plus';

async function main() {
  try {
    const videoId = 'dQw4w9WgXcQ';
    const cache = new InMemoryCache(1800000); // 30 minutes TTL

    const start1 = performance.now();
    const transcript1 = await fetchTranscript(videoId, { cache });
    const time1 = (performance.now() - start1).toFixed(0);

    const start2 = performance.now();
    const transcript2 = await fetchTranscript(videoId, { cache });
    const time2 = (performance.now() - start2).toFixed(0);

    console.log(`First fetch (network):  ${time1}ms — ${transcript1.length} segments`);
    console.log(`Second fetch (cached):  ${time2}ms — ${transcript2.length} segments`);
  } catch (error) {
    console.error('Error fetching transcript:', error.message);
  }
}

main();
