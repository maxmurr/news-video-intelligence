import { evalite } from 'evalite';

import { getInjection } from '../di/container';
import { HEADLINE_MAX_WORDS, type HeadlineItem, type Story } from '../lib/schemas';
import { assertInvariants, check, ensureBroadcast, judgeScorer, uploadsData } from './lib';

type HeadlinesOutput = { items: HeadlineItem[]; stories: Story[]; transcript: string };

evalite<string, HeadlinesOutput>('Headlines', {
  data: uploadsData,
  task: async filename => {
    const broadcastId = await ensureBroadcast(filename);
    const { text: transcript } = await getInjection('ITranscribeBroadcastController')(broadcastId);
    const { stories } = await getInjection('IDetectStoriesController')(broadcastId);
    const { items } = await getInjection('IGenerateHeadlinesController')(broadcastId);

    const aligned = items.every((h, i) => h.startTime === stories[i]?.startTime && h.endTime === stories[i]?.endTime);
    const headlineLengths = items.map(h => h.headline.split(/\s+/).length);

    assertInvariants('headlines', [
      check('one item per story', items.length === stories.length, `${items.length} vs ${stories.length}`),
      check('timestamps aligned with stories', aligned),
      check(
        // The generation prompt enforces the same bound via HEADLINE_MAX_WORDS.
        `headlines under ${HEADLINE_MAX_WORDS} words`,
        headlineLengths.every(l => l < HEADLINE_MAX_WORDS),
        `lengths ${headlineLengths.join(',')}`,
      ),
      check(
        'summaries non-trivial',
        items.every(h => h.summary.trim().length >= 50),
        'summary under 50 chars',
      ),
    ]);

    return { items, stories, transcript };
  },
  scorers: [
    judgeScorer<HeadlinesOutput>({
      name: 'groundedness & headline quality',
      criteria:
        'Every headline and summary must be fully grounded in the transcript (no invented facts, ' +
        'names, or numbers) and read like professional news copy. Penalise clickbait and vagueness.',
      content: ({ items, transcript }) =>
        `Headlines & summaries:\n${JSON.stringify(items, null, 2)}\n\nTranscript:\n\n${transcript}`,
    }),
  ],
});
