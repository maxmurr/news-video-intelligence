import { describe, expect, it } from 'vitest';

import { clampTranscriptToDuration } from '@/lib/timestamps';

const transcript = ['00:00 Intro.', '05:00 Middle.', '10:00 Near the end.', '20:00 Hallucinated tail.'].join('\n');

describe('clampTranscriptToDuration', () => {
  it('drops lines that start past the media duration', () => {
    const clamped = clampTranscriptToDuration(transcript, 867);
    expect(clamped).toBe(['00:00 Intro.', '05:00 Middle.', '10:00 Near the end.'].join('\n'));
  });

  it('keeps a line starting exactly at the floored duration', () => {
    const clamped = clampTranscriptToDuration(transcript, 600.9);
    expect(clamped.endsWith('10:00 Near the end.')).toBe(true);
    expect(clamped).not.toContain('20:00');
  });

  it('drops every line once timestamps run past the end, including trailing continuations', () => {
    const drifted = ['00:00 Intro.', '20:00 Hallucinated.', 'orphaned continuation with no timestamp'].join('\n');
    expect(clampTranscriptToDuration(drifted, 300)).toBe('00:00 Intro.');
  });

  it('leaves the transcript untouched when the duration probe is unusable', () => {
    expect(clampTranscriptToDuration(transcript, 0)).toBe(transcript);
    expect(clampTranscriptToDuration(transcript, Number.NaN)).toBe(transcript);
  });

  it('is a no-op when every line is within the duration', () => {
    expect(clampTranscriptToDuration(transcript, 2000)).toBe(transcript);
  });
});
