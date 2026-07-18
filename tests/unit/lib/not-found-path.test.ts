import { describe, expect, it } from 'vitest';

import { broadcastFilenameFromPathname } from '@/lib/not-found-path';

describe('broadcastFilenameFromPathname', () => {
  it('returns the filename from a broadcast path', () => {
    expect(broadcastFilenameFromPathname('/v/abc-123.mp4')).toBe('abc-123.mp4');
  });

  it('decodes percent-encoded segments', () => {
    expect(broadcastFilenameFromPathname('/v/clip%20name.mp4')).toBe('clip name.mp4');
  });

  it('ignores query and hash', () => {
    expect(broadcastFilenameFromPathname('/v/abc.mp4?x=1#y')).toBe('abc.mp4');
  });

  it('returns null for non-broadcast paths', () => {
    expect(broadcastFilenameFromPathname('/')).toBeNull();
    expect(broadcastFilenameFromPathname('/this-does-not-exist')).toBeNull();
    expect(broadcastFilenameFromPathname('/v/')).toBeNull();
  });
});
