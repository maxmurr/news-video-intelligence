import { describe, expect, it } from 'vitest';

import { canSubmitNegativeFeedback, isOtherCategory } from '@/components/chat/negative-feedback-panel';

describe('isOtherCategory', () => {
  it('returns true only for other', () => {
    expect(isOtherCategory('other')).toBe(true);
    expect(isOtherCategory('incorrect')).toBe(false);
    expect(isOtherCategory(null)).toBe(false);
  });
});

describe('canSubmitNegativeFeedback', () => {
  it('requires a category', () => {
    expect(canSubmitNegativeFeedback(null, 'details')).toBe(false);
  });

  it('allows preset categories without a comment', () => {
    expect(canSubmitNegativeFeedback('not-relevant', '')).toBe(true);
    expect(canSubmitNegativeFeedback('incorrect', '  ')).toBe(true);
  });

  it('requires a non-empty comment for other', () => {
    expect(canSubmitNegativeFeedback('other', '')).toBe(false);
    expect(canSubmitNegativeFeedback('other', '   ')).toBe(false);
    expect(canSubmitNegativeFeedback('other', 'Missing context')).toBe(true);
  });
});
