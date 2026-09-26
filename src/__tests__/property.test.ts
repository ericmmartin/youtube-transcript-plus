import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { retrieveVideoId, decodeXmlEntities, validateLang } from '../utils';
import { toSRT, toVTT, toPlainText } from '../formatters';
import { YoutubeTranscriptInvalidVideoIdError, YoutubeTranscriptInvalidLangError } from '../errors';
import { TranscriptSegment } from '../types';

// Property-based tests: fast-check generates many random inputs per property
// and shrinks any failure down to a minimal counterexample.

const videoIdChar = fc.constantFrom(
  ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'.split(''),
);
const videoId = fc.string({ unit: videoIdChar, minLength: 11, maxLength: 11 });

const segment: fc.Arbitrary<TranscriptSegment> = fc.record({
  text: fc.string(),
  duration: fc.double({ min: 0, max: 36000, noNaN: true }),
  offset: fc.double({ min: 0, max: 360000, noNaN: true }),
  lang: fc.constant('en'),
});

describe('retrieveVideoId (property)', () => {
  it('returns any valid 11-character ID unchanged', () => {
    fc.assert(
      fc.property(videoId, (id) => {
        expect(retrieveVideoId(id)).toBe(id);
      }),
    );
  });

  it('extracts the ID from common URL shapes', () => {
    const urlOf = fc.constantFrom(
      (id: string) => `https://www.youtube.com/watch?v=${id}`,
      (id: string) => `https://youtu.be/${id}`,
      (id: string) => `https://www.youtube.com/embed/${id}`,
      (id: string) => `https://www.youtube.com/watch?feature=share&v=${id}`,
    );
    fc.assert(
      fc.property(videoId, urlOf, (id, toUrl) => {
        expect(retrieveVideoId(toUrl(id))).toBe(id);
      }),
    );
  });

  it('either returns an 11-character ID or throws the typed error', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        try {
          expect(retrieveVideoId(input)).toMatch(/^[a-zA-Z0-9_-]{11}$/);
        } catch (error) {
          expect(error).toBeInstanceOf(YoutubeTranscriptInvalidVideoIdError);
        }
      }),
    );
  });
});

describe('decodeXmlEntities (property)', () => {
  it('leaves text without ampersands unchanged', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !s.includes('&')),
        (text) => {
          expect(decodeXmlEntities(text)).toBe(text);
        },
      ),
    );
  });

  it('inverts XML escaping', () => {
    const escape = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    fc.assert(
      fc.property(fc.string(), (text) => {
        expect(decodeXmlEntities(escape(text))).toBe(text);
      }),
    );
  });
});

describe('validateLang (property)', () => {
  it('only ever throws the typed error', () => {
    fc.assert(
      fc.property(fc.string(), (lang) => {
        try {
          validateLang(lang);
        } catch (error) {
          expect(error).toBeInstanceOf(YoutubeTranscriptInvalidLangError);
        }
      }),
    );
  });
});

describe('formatters (property)', () => {
  it('toSRT emits well-formed timestamps for every cue', () => {
    fc.assert(
      fc.property(fc.array(segment, { maxLength: 20 }), (segments) => {
        const matches = toSRT(segments).match(/^\d{2,}:\d{2}:\d{2},\d{3} --> .*$/gm) ?? [];
        expect(matches).toHaveLength(segments.length);
        for (const line of matches) {
          expect(line).toMatch(/^\d{2,}:[0-5]\d:[0-5]\d,\d{3} --> \d{2,}:[0-5]\d:[0-5]\d,\d{3}$/);
        }
      }),
    );
  });

  it('toVTT emits well-formed timestamps for every cue', () => {
    fc.assert(
      fc.property(fc.array(segment, { maxLength: 20 }), (segments) => {
        const vtt = toVTT(segments);
        expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
        const matches = vtt.match(/^\d{2,}:\d{2}:\d{2}\.\d{3} --> .*$/gm) ?? [];
        expect(matches).toHaveLength(segments.length);
        for (const line of matches) {
          expect(line).toMatch(/^\d{2,}:[0-5]\d:[0-5]\d\.\d{3} --> \d{2,}:[0-5]\d:[0-5]\d\.\d{3}$/);
        }
      }),
    );
  });

  it('toPlainText joins exactly the segment texts', () => {
    fc.assert(
      fc.property(fc.array(segment), fc.string(), (segments, separator) => {
        expect(toPlainText(segments, separator)).toBe(segments.map((s) => s.text).join(separator));
      }),
    );
  });
});
