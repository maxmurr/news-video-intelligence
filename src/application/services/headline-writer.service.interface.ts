import type { Story } from '@/src/entities/models/story';

export interface HeadlineCopy {
  headline: string;
  summary: string;
}

/**
 * Writes news copy for detected stories. Returns exactly one item per input
 * story, in the same order — the caller aligns spans by index.
 */
export interface IHeadlineWriterService {
  writeHeadlines(stories: Story[], transcript: string): Promise<HeadlineCopy[]>;
}
