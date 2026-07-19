export const NEGATIVE_FEEDBACK_CATEGORIES = [
  { id: 'not-relevant', label: 'Not relevant to the question' },
  { id: 'incorrect', label: 'Incorrect or inaccurate information' },
  { id: 'too-brief', label: 'Too brief / Missing key details' },
  { id: 'not-actionable', label: 'Not actionable / Not practical' },
  { id: 'unclear', label: 'Unclear or difficult to understand' },
  { id: 'other', label: 'Other' },
] as const;

export type NegativeFeedbackCategoryId = (typeof NEGATIVE_FEEDBACK_CATEGORIES)[number]['id'];

export function isNegativeFeedbackCategory(value: unknown): value is NegativeFeedbackCategoryId {
  return NEGATIVE_FEEDBACK_CATEGORIES.some(category => category.id === value);
}
