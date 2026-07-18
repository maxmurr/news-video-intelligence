import { describe, expect, it } from 'vitest';

import { isValidBroadcastId, requestedBroadcastId } from '@/lib/artifacts';

describe('isValidBroadcastId', () => {
  it('accepts nanoid-shaped ids', () => {
    expect(isValidBroadcastId('V1StGXR8_Z5jdHi6B-myT')).toBe(true);
    expect(isValidBroadcastId('abcdefghij')).toBe(true);
  });

  it('rejects legacy filenames and traversal attempts', () => {
    expect(isValidBroadcastId('b3cd8eaf-c5b1-4918-8082-0f32e868c7d6.mp4')).toBe(false);
    expect(isValidBroadcastId('../etc/passwd')).toBe(false);
    expect(isValidBroadcastId('a/b')).toBe(false);
  });

  it('rejects non-strings and out-of-bounds lengths', () => {
    expect(isValidBroadcastId(42)).toBe(false);
    expect(isValidBroadcastId(null)).toBe(false);
    expect(isValidBroadcastId('short')).toBe(false);
    expect(isValidBroadcastId('x'.repeat(41))).toBe(false);
  });
});

describe('requestedBroadcastId', () => {
  function request(body: string): Request {
    return new Request('http://test.local/api/pipeline', { method: 'POST', body });
  }

  it('returns the id from a valid body', async () => {
    await expect(requestedBroadcastId(request(JSON.stringify({ id: 'V1StGXR8_Z5jdHi6B-myT' })))).resolves.toBe(
      'V1StGXR8_Z5jdHi6B-myT',
    );
  });

  it('returns null for malformed JSON or invalid ids', async () => {
    await expect(requestedBroadcastId(request('not json'))).resolves.toBeNull();
    await expect(requestedBroadcastId(request(JSON.stringify({ id: 'a.mp4' })))).resolves.toBeNull();
    await expect(requestedBroadcastId(request(JSON.stringify({})))).resolves.toBeNull();
  });
});
