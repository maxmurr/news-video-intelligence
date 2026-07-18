import { generateText, Output } from 'ai';
import { z } from 'zod';

import { MODELS } from '@/lib/models';
import { formatStoryList, HEADLINE_MAX_WORDS } from '@/lib/schemas';
import type {
  HeadlineCopy,
  IHeadlineWriterService,
} from '@/src/application/services/headline-writer.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Story } from '@/src/entities/models/story';

export class HeadlineWriterService implements IHeadlineWriterService {
  constructor(private readonly instrumentationService: IInstrumentationService) {}

  async writeHeadlines(stories: Story[], transcript: string): Promise<HeadlineCopy[]> {
    return this.instrumentationService.startSpan(
      { name: 'HeadlineWriterService > writeHeadlines', op: 'ai.run' },
      async () => {
        // Length is pinned so each item lines up 1:1 with the input stories.
        const headlinesSchema = z.object({
          items: z
            .array(
              z.object({
                headline: z
                  .string()
                  .describe(`Punchy news-style headline, under ${HEADLINE_MAX_WORDS} words, no clickbait`),
                summary: z.string().describe('Two to three sentence summary grounded only in this story segment'),
              }),
            )
            .length(stories.length),
        });

        const storyList = formatStoryList(stories, s => s.title);

        const result = await generateText({
          model: MODELS.headlines,
          telemetry: { functionId: 'write-headlines' },
          output: Output.object({ schema: headlinesSchema }),
          system:
            'You are a news editor. You write headlines and summaries for segments of a news video. ' +
            'For each story you are given, write one headline and one summary based only on what is said ' +
            "in that story's transcript span. Do not invent facts that are not in the transcript. " +
            'Return exactly one item per story, in the same order as the story list.',
          prompt: `Here are the detected stories:\n\n${storyList}\n\nFull timestamped transcript:\n\n${transcript}`,
        });

        return result.output.items;
      },
    );
  }
}
