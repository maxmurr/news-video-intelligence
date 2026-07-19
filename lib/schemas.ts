/**
 * Shapes shared by the pipeline stages: the structured-output schema the
 * story-detection model generates against, and the item shapes stages return
 * and downstream prompts consume. Persistence validation lives with the
 * clean-architecture entities in src/entities/models.
 */
import { z } from 'zod';
import { TIMESTAMP_PATTERN } from './timestamps';

const timestampField = z.string().regex(TIMESTAMP_PATTERN);

export const storySchema = z.object({
  title: z.string().describe('Short headline for the story'),
  summary: z.string().describe('One to two sentence summary of the story'),
  startTime: timestampField.describe('MM:SS timestamp where the story begins, taken from the transcript'),
  endTime: timestampField.describe('MM:SS timestamp where the story ends, taken from the transcript'),
});

export const storiesOutputSchema = z.object({
  stories: z.array(storySchema),
});

export type Story = z.infer<typeof storySchema>;

/** Word cap for generated headlines; the prompt and the eval enforce the same bound. */
export const HEADLINE_MAX_WORDS = 12;

export interface HeadlineItem {
  startTime: string;
  endTime: string;
  headline: string;
  summary: string;
}

/**
 * The numbered story-list block every prompt that references detected stories
 * uses (headline generation, frame picking, chat grounding). One owner so the
 * chat model and the pipeline stages always see the same shape.
 */
export function formatStoryList<T extends { startTime: string; endTime: string; summary: string }>(
  items: T[],
  heading: (item: T) => string,
): string {
  return items
    .map((item, i) => `${i + 1}. [${item.startTime}-${item.endTime}] ${heading(item)}: ${item.summary}`)
    .join('\n');
}
