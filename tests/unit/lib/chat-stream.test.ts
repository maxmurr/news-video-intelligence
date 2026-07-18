import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';

import { shouldShowLoadingShimmer } from '@/lib/chat-stream';

function message(role: UIMessage['role'], parts: UIMessage['parts'], id: string = role): UIMessage {
  return { id, role, parts };
}

describe('shouldShowLoadingShimmer', () => {
  it('returns true while the request is submitted', () => {
    expect(shouldShowLoadingShimmer('submitted', [])).toBe(true);
  });

  it('returns true while streaming before an assistant message exists', () => {
    expect(shouldShowLoadingShimmer('streaming', [message('user', [{ type: 'text', text: 'Hello' }])])).toBe(true);
  });

  it('returns true while streaming until the assistant has text', () => {
    expect(
      shouldShowLoadingShimmer('streaming', [
        message('user', [{ type: 'text', text: 'Hello' }], 'u1'),
        message('assistant', [{ type: 'text', text: '' }], 'a1'),
      ]),
    ).toBe(true);
  });

  it('returns false once the assistant streams text', () => {
    expect(
      shouldShowLoadingShimmer('streaming', [
        message('user', [{ type: 'text', text: 'Hello' }], 'u1'),
        message('assistant', [{ type: 'text', text: 'Hi' }], 'a1'),
      ]),
    ).toBe(false);
  });

  it('returns false once the assistant streams reasoning', () => {
    expect(
      shouldShowLoadingShimmer('streaming', [message('assistant', [{ type: 'reasoning', text: 'Thinking…' }])]),
    ).toBe(false);
  });

  it('returns false when the chat is idle or ready', () => {
    expect(shouldShowLoadingShimmer('ready', [])).toBe(false);
    expect(shouldShowLoadingShimmer('error', [])).toBe(false);
  });
});
