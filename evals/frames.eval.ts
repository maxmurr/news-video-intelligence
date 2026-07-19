import { createScorer, evalite } from 'evalite';

import { getInjection } from '../di/container';
import type { HeadlineItem } from '../lib/schemas';
import { timestampToSeconds, transcriptSpan } from '../lib/timestamps';
import {
  assertInvariants,
  check,
  ensureBroadcast,
  JUDGE_THRESHOLD,
  readStoredBytes,
  runJudge,
  uploadsData,
} from './lib';

type FrameItem = {
  startTime: string;
  endTime: string;
  headline: string;
  frameTime: string;
  reason: string;
  frameUrl: string;
};

type FramesOutput = { frames: FrameItem[]; headlines: HeadlineItem[]; transcript: string };

evalite<string, FramesOutput>('Frames', {
  data: uploadsData,
  task: async filename => {
    const broadcastId = await ensureBroadcast(filename);
    const { text: transcript } = await getInjection('ITranscribeBroadcastController')(broadcastId);
    await getInjection('IDetectStoriesController')(broadcastId);
    const { items: headlines } = await getInjection('IGenerateHeadlinesController')(broadcastId);
    const { items: frames } = await getInjection('IExtractFramesController')(broadcastId);

    const inSpan = frames.every(f => {
      const t = timestampToSeconds(f.frameTime);
      return t >= timestampToSeconds(f.startTime) && t <= timestampToSeconds(f.endTime);
    });

    const frameBytes = await Promise.all(frames.map(f => readStoredBytes(f.frameUrl)));

    assertInvariants('frames', [
      check('one frame per headline', frames.length === headlines.length, `${frames.length} vs ${headlines.length}`),
      check('frame times within story spans', inSpan),
      check(
        'all frame files exist (>1KB)',
        frameBytes.every(b => b !== null && b.length > 1000),
      ),
    ]);

    return { frames, headlines, transcript };
  },
  scorers: [
    // Frames carry a variable number of per-frame judges; a suite's scorer list
    // is fixed, so they collapse into one scorer whose value is the mean 0-1
    // score, with each frame's raw score and reasoning kept in metadata.
    createScorer<unknown, FramesOutput, unknown>({
      name: 'frame representativeness',
      scorer: async ({ output }) => {
        const { frames, headlines, transcript } = output;

        const perFrame = await Promise.all(
          frames.map(async (f, i) => {
            const image = await readStoredBytes(f.frameUrl);
            if (!image) {
              return { frame: i + 1, raw: 1, reasoning: `Frame file missing: ${f.frameUrl}` };
            }
            const verdict = await runJudge(
              'This frame is the thumbnail for a news story. The viewer sees it next to the headline, so judge ' +
                'the pairing, not the image in isolation. Use the transcript of the story segment to identify ' +
                'who or what could plausibly be shown — people and scenes described there may appear as cutaway ' +
                `footage.\nHeadline: "${f.headline}"\nSummary: "${headlines[i]?.summary ?? ''}"\n` +
                `Story segment transcript:\n${transcriptSpan(transcript, f.startTime, f.endTime)}\n\n` +
                'Scoring: footage, graphics, or a scene/person plausibly from the story is good (4-5); a clear ' +
                'talking head of someone discussing it is acceptable (3); a blurry, transitional, or unrelated ' +
                'frame is bad (1-2).',
              [{ type: 'file', mediaType: 'image/jpeg', data: image }],
            );
            return { frame: i + 1, raw: verdict.score, reasoning: verdict.reasoning };
          }),
        );

        const mean = perFrame.reduce((sum, r) => sum + r.raw, 0) / Math.max(perFrame.length, 1);
        return { score: mean / 5, metadata: { threshold: JUDGE_THRESHOLD, frames: perFrame } };
      },
    }),
  ],
});
