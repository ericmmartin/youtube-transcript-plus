import { describe, it, expect } from 'vitest';
import { toSRT, toVTT, toPlainText } from '../formatters';
import { TranscriptSegment } from '../types';

const segments: TranscriptSegment[] = [
  { text: 'Hello world', duration: 1.5, offset: 0, lang: 'en' },
  { text: 'Second line', duration: 2.0, offset: 1.5, lang: 'en' },
  { text: 'Third line', duration: 3.5, offset: 3.5, lang: 'en' },
];

describe('toSRT', () => {
  it('should format segments as SRT with sequence numbers', () => {
    const srt = toSRT(segments);
    const lines = srt.split('\n');

    // First segment
    expect(lines[0]).toBe('1');
    expect(lines[1]).toBe('00:00:00,000 --> 00:00:01,500');
    expect(lines[2]).toBe('Hello world');

    // Blank line separator
    expect(lines[3]).toBe('');

    // Second segment
    expect(lines[4]).toBe('2');
    expect(lines[5]).toBe('00:00:01,500 --> 00:00:03,500');
    expect(lines[6]).toBe('Second line');
  });

  it('should use comma as decimal separator (SRT spec)', () => {
    const srt = toSRT(segments);
    expect(srt).toContain(',');
    expect(srt).not.toMatch(/\d\.\d{3} -->/);
  });

  it('should handle timestamps over an hour', () => {
    const longSegments: TranscriptResponse[] = [
      { text: 'Late segment', duration: 5.0, offset: 3723.456, lang: 'en' },
    ];
    const srt = toSRT(longSegments);
    expect(srt).toContain('01:02:03,456');
    expect(srt).toContain('01:02:08,456');
  });

  it('should return empty string for empty array', () => {
    expect(toSRT([])).toBe('');
  });
});

describe('toVTT', () => {
  it('should start with WEBVTT header', () => {
    const vtt = toVTT(segments);
    expect(vtt).toMatch(/^WEBVTT\n/);
  });

  it('should format segments without sequence numbers', () => {
    const vtt = toVTT(segments);
    const parts = vtt.split('\n\n');

    // First part is "WEBVTT" header
    expect(parts[0]).toBe('WEBVTT');

    // Second part is first cue
    expect(parts[1]).toBe('00:00:00.000 --> 00:00:01.500\nHello world');
  });

  it('should use period as decimal separator (VTT spec)', () => {
    const vtt = toVTT(segments);
    // Remove the WEBVTT header for cue checking
    const cues = vtt.replace('WEBVTT\n\n', '');
    expect(cues).toMatch(/\d\.\d{3} -->/);
    expect(cues).not.toMatch(/\d,\d{3} -->/);
  });

  it('should handle timestamps over an hour', () => {
    const longSegments: TranscriptResponse[] = [
      { text: 'Late segment', duration: 5.0, offset: 3723.456, lang: 'en' },
    ];
    const vtt = toVTT(longSegments);
    expect(vtt).toContain('01:02:03.456');
    expect(vtt).toContain('01:02:08.456');
  });

  it('should return header only for empty array', () => {
    expect(toVTT([])).toBe('WEBVTT\n\n');
  });
});

describe('toPlainText', () => {
  it('should join segments with newline by default', () => {
    const text = toPlainText(segments);
    expect(text).toBe('Hello world\nSecond line\nThird line');
  });

  it('should accept custom separator', () => {
    const text = toPlainText(segments, ' ');
    expect(text).toBe('Hello world Second line Third line');
  });

  it('should accept empty string separator', () => {
    const text = toPlainText(segments, '');
    expect(text).toBe('Hello worldSecond lineThird line');
  });

  it('should return empty string for empty array', () => {
    expect(toPlainText([])).toBe('');
  });
});
