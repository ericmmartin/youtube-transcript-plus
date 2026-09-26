import { TranscriptSegment } from './types';

/**
 * Format seconds as `HH:MM:SS<sep>mmm`. Rounds to whole milliseconds before
 * splitting into fields, so e.g. 1.9996s becomes `00:00:02,000` rather than
 * carrying a 4-digit `1000` millisecond field.
 */
function formatTimestamp(seconds: number, separator: string): string {
  const totalMs = Math.round(seconds * 1000);
  const h = Math.floor(totalMs / 3600000);
  const m = Math.floor((totalMs % 3600000) / 60000);
  const s = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return (
    String(h).padStart(2, '0') +
    ':' +
    String(m).padStart(2, '0') +
    ':' +
    String(s).padStart(2, '0') +
    separator +
    String(ms).padStart(3, '0')
  );
}

/** SRT uses comma as the decimal separator per specification. */
function formatSrtTimestamp(seconds: number): string {
  return formatTimestamp(seconds, ',');
}

/** VTT uses period as the decimal separator per specification. */
function formatVttTimestamp(seconds: number): string {
  return formatTimestamp(seconds, '.');
}

/**
 * Convert transcript segments to SubRip (SRT) format.
 *
 * @param segments - Array of transcript segments from {@link fetchTranscript}.
 * @returns A string in SRT format with sequence numbers and `HH:MM:SS,mmm` timestamps.
 *
 * @example
 * ```typescript
 * import { fetchTranscript, toSRT } from 'youtube-transcript-plus';
 * const transcript = await fetchTranscript('dQw4w9WgXcQ');
 * const srt = toSRT(transcript);
 *
 * // With videoDetails enabled, use result.segments:
 * const result = await fetchTranscript('dQw4w9WgXcQ', { videoDetails: true });
 * const srt2 = toSRT(result.segments);
 * ```
 */
export function toSRT(segments: TranscriptSegment[]): string {
  return segments
    .map((segment, index) => {
      const start = formatSrtTimestamp(segment.offset);
      const end = formatSrtTimestamp(segment.offset + segment.duration);
      return `${index + 1}\n${start} --> ${end}\n${segment.text}`;
    })
    .join('\n\n');
}

/**
 * Convert transcript segments to WebVTT (VTT) format.
 *
 * @param segments - Array of transcript segments from {@link fetchTranscript}.
 * @returns A string in VTT format with `WEBVTT` header and `HH:MM:SS.mmm` timestamps.
 *
 * @example
 * ```typescript
 * import { fetchTranscript, toVTT } from 'youtube-transcript-plus';
 * const transcript = await fetchTranscript('dQw4w9WgXcQ');
 * const vtt = toVTT(transcript);
 *
 * // With videoDetails enabled, use result.segments:
 * const result = await fetchTranscript('dQw4w9WgXcQ', { videoDetails: true });
 * const vtt2 = toVTT(result.segments);
 * ```
 */
export function toVTT(segments: TranscriptSegment[]): string {
  const cues = segments
    .map((segment) => {
      const start = formatVttTimestamp(segment.offset);
      const end = formatVttTimestamp(segment.offset + segment.duration);
      return `${start} --> ${end}\n${segment.text}`;
    })
    .join('\n\n');
  return `WEBVTT\n\n${cues}`;
}

/**
 * Convert transcript segments to plain text.
 *
 * @param segments - Array of transcript segments from {@link fetchTranscript}.
 * @param separator - String to join segments with. Defaults to `'\n'`.
 * @returns A plain text string with segments joined by the separator.
 *
 * @example
 * ```typescript
 * import { fetchTranscript, toPlainText } from 'youtube-transcript-plus';
 * const transcript = await fetchTranscript('dQw4w9WgXcQ');
 * const text = toPlainText(transcript);
 * const paragraph = toPlainText(transcript, ' ');
 *
 * // With videoDetails enabled, use result.segments:
 * const result = await fetchTranscript('dQw4w9WgXcQ', { videoDetails: true });
 * const text2 = toPlainText(result.segments);
 * ```
 */
export function toPlainText(segments: TranscriptSegment[], separator = '\n'): string {
  return segments.map((segment) => segment.text).join(separator);
}
