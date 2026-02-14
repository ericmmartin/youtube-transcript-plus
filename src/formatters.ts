import { TranscriptResponse } from './types';

/**
 * Format seconds as an SRT timestamp: `HH:MM:SS,mmm`
 * SRT uses comma as the decimal separator per specification.
 */
function formatSrtTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return (
    String(h).padStart(2, '0') +
    ':' +
    String(m).padStart(2, '0') +
    ':' +
    String(s).padStart(2, '0') +
    ',' +
    String(ms).padStart(3, '0')
  );
}

/**
 * Format seconds as a VTT timestamp: `HH:MM:SS.mmm`
 * VTT uses period as the decimal separator per specification.
 */
function formatVttTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return (
    String(h).padStart(2, '0') +
    ':' +
    String(m).padStart(2, '0') +
    ':' +
    String(s).padStart(2, '0') +
    '.' +
    String(ms).padStart(3, '0')
  );
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
 * ```
 */
export function toSRT(segments: TranscriptResponse[]): string {
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
 * ```
 */
export function toVTT(segments: TranscriptResponse[]): string {
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
 * ```
 */
export function toPlainText(segments: TranscriptResponse[], separator = '\n'): string {
  return segments.map((segment) => segment.text).join(separator);
}
