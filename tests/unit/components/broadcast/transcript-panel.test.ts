import { describe, expect, it } from 'vitest';

import { activeTranscriptLineIndex } from '@/components/broadcast/transcript-panel';
import { parseTranscriptLines } from '@/lib/timestamps';

describe('parseTranscriptLines', () => {
  it('returns timestamped rows with remaining text', () => {
    const lines = parseTranscriptLines('00:00 Lead opens.\n00:15 Protest footage.');

    expect(lines).toEqual([
      { timestamp: '00:00', seconds: 0, text: 'Lead opens.' },
      { timestamp: '00:15', seconds: 15, text: 'Protest footage.' },
    ]);
  });

  it('keeps untimestamped lines without a seek target', () => {
    const lines = parseTranscriptLines('00:00 Hello\ncontinuation');

    expect(lines[1]).toEqual({ timestamp: null, seconds: null, text: 'continuation' });
  });
});

describe('activeTranscriptLineIndex', () => {
  const lines = parseTranscriptLines('00:00 A\n00:10 B\n00:20 C');

  it('returns null when playback time is unknown', () => {
    expect(activeTranscriptLineIndex(lines, null)).toBeNull();
  });

  it('returns the latest line that has started', () => {
    expect(activeTranscriptLineIndex(lines, 0)).toBe(0);
    expect(activeTranscriptLineIndex(lines, 10)).toBe(1);
    expect(activeTranscriptLineIndex(lines, 19.9)).toBe(1);
    expect(activeTranscriptLineIndex(lines, 20)).toBe(2);
  });
});
