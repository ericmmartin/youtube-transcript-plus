import { fetchTranscript, toSRT, toVTT, toPlainText } from 'youtube-transcript-plus';

async function main() {
  try {
    const videoId = 'dQw4w9WgXcQ';
    const transcript = await fetchTranscript(videoId);

    // Convert to SRT format (for subtitle files)
    const srt = toSRT(transcript);
    console.log('=== SRT Format ===');
    console.log(srt.slice(0, 500));

    // Convert to WebVTT format (for HTML5 video)
    const vtt = toVTT(transcript);
    console.log('\n=== VTT Format ===');
    console.log(vtt.slice(0, 500));

    // Convert to plain text
    const text = toPlainText(transcript);
    console.log('\n=== Plain Text ===');
    console.log(text.slice(0, 500));

    // Plain text with custom separator (e.g., single space for a paragraph)
    const paragraph = toPlainText(transcript, ' ');
    console.log('\n=== Plain Text (paragraph) ===');
    console.log(paragraph.slice(0, 500));
  } catch (error) {
    console.error('Error fetching transcript:', error.message);
  }
}

main();
