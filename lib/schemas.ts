/**
 * Single source of truth for the artifact shapes each pipeline stage writes
 * and the next stage reads. The producer generates against the schema and
 * the consumer parses with the same schema, so shape drift fails loudly
 * instead of surfacing as a misleading "file not found" downstream.
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

export const storiesFileSchema = z.object({
  stories: z.array(storySchema),
});

export type Story = z.infer<typeof storySchema>;

/** Word cap for generated headlines; the prompt and the eval enforce the same bound. */
export const HEADLINE_MAX_WORDS = 12;

export const headlineItemSchema = z.object({
  startTime: timestampField,
  endTime: timestampField,
  headline: z.string(),
  summary: z.string(),
});

export const headlinesFileSchema = z.object({
  items: z.array(headlineItemSchema),
});

export type HeadlineItem = z.infer<typeof headlineItemSchema>;

export const frameItemSchema = headlineItemSchema.omit({ summary: true }).extend({
  frameTime: timestampField,
  reason: z.string(),
  frameUrl: z.string(),
});

export const framesFileSchema = z.object({
  items: z.array(frameItemSchema),
});

export type FrameItem = z.infer<typeof frameItemSchema>;
