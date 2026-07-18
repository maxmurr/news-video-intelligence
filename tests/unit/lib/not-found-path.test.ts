import { describe, expect, it } from 'vitest';

import { broadcastPathSegmentFromPathname } from '@/lib/not-found-path';

describe('broadcastPathSegmentFromPathname', () => {
  it('returns the segment from a broadcast path', () => {
    expect(broadcastPathSegmentFromPathname('/v/V1StGXR8_Z5jdHi6B-myT')).toBe('V1StGXR8_Z5jdHi6B-myT');
  });

  it('decodes percent-encoded segments', () => {
    expect(broadcastPathSegmentFromPathname('/v/clip%20name')).toBe('clip name');
  });

  it('ignores query and hash', () => {
    expect(broadcastPathSegmentFromPathname('/v/abc123?x=1#y')).toBe('abc123');
  });

  it('returns null for non-broadcast paths', () => {
    expect(broadcastPathSegmentFromPathname('/')).toBeNull();
    expect(broadcastPathSegmentFromPathname('/this-does-not-exist')).toBeNull();
    expect(broadcastPathSegmentFromPathname('/v/')).toBeNull();
  });
});
