import { evalite } from 'evalite';

import { getInjection } from '../di/container';
import type { Story } from '../lib/schemas';
import { timestampToSeconds, transcriptTimestamps } from '../lib/timestamps';
import { assertInvariants, check, ensureBroadcast, judgeScorer, uploadsData } from './lib';

// Story boundaries snap to transcript line timestamps, so allow a few seconds
// of gap between consecutive stories (but never overlap).
const STORY_GAP_SLACK_SEC = 15;

type StoriesOutput = { stories: Story[]; transcript: string };

evalite<string, StoriesOutput>('Stories', {
  data: uploadsData,
  task: async filename => {
    const broadcastId = await ensureBroadcast(filename);
    const { text: transcript } = await getInjection('ITranscribeBroadcastController')(broadcastId);
    const { stories } = await getInjection('IDetectStoriesController')(broadcastId);

    const timestamps = transcriptTimestamps(transcript);
    const tsSet = new Set(timestamps);
    const firstTs = timestamps[0];
    const contiguous = stories.every((s, i) => {
      if (i === 0) return true;
      const gap = timestampToSeconds(s.startTime) - timestampToSeconds(stories[i - 1].endTime);
      return gap >= 0 && gap <= STORY_GAP_SLACK_SEC;
    });
    const ordered = stories.every(s => timestampToSeconds(s.endTime) > timestampToSeconds(s.startTime));
    const knownTimestamps = stories.every(s => tsSet.has(s.startTime));

    assertInvariants('stories', [
      check('at least one story', stories.length >= 1, `count ${stories.length}`),
      check(
        'covers transcript start',
        stories[0]?.startTime === firstTs,
        `first story ${stories[0]?.startTime} vs ${firstTs}`,
      ),
      check('contiguous segments', contiguous),
      check('end after start', ordered),
      check('start times exist in transcript', knownTimestamps),
    ]);

    return { stories, transcript };
  },
  scorers: [
    judgeScorer<StoriesOutput>({
      name: 'boundary quality',
      criteria:
        'Each story should cover one coherent news topic; boundaries should fall where the topic ' +
        'changes, not mid-topic or at mere speaker turns.',
      content: ({ stories, transcript }) =>
        `Detected stories:\n${JSON.stringify(stories, null, 2)}\n\nTranscript:\n\n${transcript}`,
    }),
  ],
});
