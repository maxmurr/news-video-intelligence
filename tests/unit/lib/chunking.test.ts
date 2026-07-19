import { describe, expect, it } from 'vitest';

import { CHUNKING, chunkTranscript, estimateTokens } from '@/lib/chunking';
import { secondsToTimestamp, TIMESTAMP_PATTERN } from '@/lib/timestamps';

function transcriptOf(words: string[], interval = 10): string {
  return words.map((word, i) => `${secondsToTimestamp(i * interval)} ${word}`).join('\n');
}

describe('chunkTranscript', () => {
  it('groups lines into ~target-second windows with sequential idx', () => {
    const words = ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7'];
    const chunks = chunkTranscript(transcriptOf(words, 10));

    expect(chunks.map(c => c.idx)).toEqual([0, 1, 2]);
    expect(chunks[0]).toMatchObject({ startTime: '00:00', endTime: '00:30' });
    expect(chunks[1]).toMatchObject({ startTime: '00:30', endTime: '01:00' });
    expect(chunks.at(-1)?.endTime).toBe('01:10');
  });

  it('overlaps consecutive chunks so a boundary line survives in both', () => {
    const chunks = chunkTranscript(transcriptOf(['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7'], 10));

    expect(chunks[0].content).toContain('w3');
    expect(chunks[1].content).toContain('w3');
  });

  it('strips leading timestamps from content', () => {
    const chunks = chunkTranscript(transcriptOf(['alpha', 'bravo', 'charlie'], 10));

    for (const chunk of chunks) {
      for (const token of chunk.content.split(/\s+/)) {
        expect(TIMESTAMP_PATTERN.test(token)).toBe(false);
      }
    }
  });

  it('force-closes a window at the token cap before the time window fills', () => {
    const heavy = 'x'.repeat(700); // ~175 tokens/line; three lines exceed the 512 cap
    const chunks = chunkTranscript(transcriptOf([heavy, heavy, heavy, heavy, heavy, heavy], 10));

    expect(chunks[0].endTime).toBe('00:10'); // only two lines fit, not the four a 35s window allows
    for (const chunk of chunks) {
      expect(chunk.tokenCount).toBeLessThanOrEqual(CHUNKING.maxTokens);
    }
  });

  it('lets continuation lines inherit the last timestamp', () => {
    const transcript = ['00:00 hello', 'world continues', '00:10 next'].join('\n');
    const chunks = chunkTranscript(transcript);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ startTime: '00:00', endTime: '00:10' });
    expect(chunks[0].content).toContain('world continues');
  });

  it('handles empty and single-line transcripts', () => {
    expect(chunkTranscript('')).toEqual([]);
    expect(chunkTranscript('   ')).toEqual([]);

    const one = chunkTranscript('00:05 lonely line');
    expect(one).toHaveLength(1);
    expect(one[0]).toMatchObject({ startTime: '00:05', endTime: '00:05', content: 'lonely line' });
  });
});

describe('estimateTokens', () => {
  it('is a monotonic char-based upper bound', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('a'.repeat(400))).toBe(100);
  });
});
