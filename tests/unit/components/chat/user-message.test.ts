import { describe, expect, it } from 'vitest';

import { userMessageText } from '@/components/chat/user-message';

describe('userMessageText', () => {
  it('joins text parts for copy and edit', () => {
    expect(
      userMessageText([
        { type: 'text', text: 'First line' },
        { type: 'text', text: 'Second line' },
      ]),
    ).toBe('First line\n\nSecond line');
  });

  it('ignores non-text parts and empty text', () => {
    expect(userMessageText([{ type: 'file' }, { type: 'text', text: '  Keep me  ' }, { type: 'text' }])).toBe(
      'Keep me',
    );
  });

  it('returns an empty string when there is no text', () => {
    expect(userMessageText([{ type: 'file' }])).toBe('');
  });
});
