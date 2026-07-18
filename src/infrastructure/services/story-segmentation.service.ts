import { generateText, Output } from 'ai';

import { MODELS } from '@/lib/models';
import { storiesOutputSchema } from '@/lib/schemas';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IStorySegmentationService } from '@/src/application/services/story-segmentation.service.interface';
import type { StoryInsert } from '@/src/entities/models/story';

export class StorySegmentationService implements IStorySegmentationService {
  constructor(private readonly instrumentationService: IInstrumentationService) {}

  async segmentTranscript(transcript: string): Promise<StoryInsert[]> {
    return this.instrumentationService.startSpan(
      { name: 'StorySegmentationService > segmentTranscript', op: 'ai.run' },
      async () => {
        const result = await generateText({
          model: MODELS.stories,
          telemetry: { functionId: 'segment-stories' },
          output: Output.object({ schema: storiesOutputSchema }),
          system:
            'You are a news video segmentation engine. You split news transcripts into distinct stories. ' +
            'A story boundary is where the topic changes to a different news item, not where speakers change turns ' +
            'within the same discussion. Use only timestamps that appear in the transcript. ' +
            "Stories must be contiguous and cover the full transcript in order: each story's startTime must be " +
            "exactly the previous story's endTime — the shared boundary timestamp — with no gap in between.",
          prompt: `Detect the story boundaries in this timestamped news transcript:\n\n${transcript}`,
        });
        return result.output.stories;
      },
    );
  }
}
