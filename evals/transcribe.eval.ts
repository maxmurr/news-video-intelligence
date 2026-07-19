import path from 'node:path';

import { evalite } from 'evalite';

import { getInjection } from '../di/container';
import { PUBLIC_DIR } from '../lib/artifacts';
import { lineTimestamp, timestampToSeconds, transcriptTimestamps } from '../lib/timestamps';
import { videoDurationSeconds } from '../lib/video';
import { assertInvariants, check, ensureBroadcast, judgeScorer, uploadsData } from './lib';

type TranscribeOutput = { transcript: string };

evalite<string, TranscribeOutput>('Transcribe', {
  data: uploadsData,
  task: async filename => {
    const broadcastId = await ensureBroadcast(filename);
    const { text: transcript } = await getInjection('ITranscribeBroadcastController')(broadcastId);
    const videoSec = await videoDurationSeconds(path.join(PUBLIC_DIR, 'uploads', filename));

    const timestamps = transcriptTimestamps(transcript);
    const seconds = timestamps.map(timestampToSeconds);
    const monotonic = seconds.every((s, i) => i === 0 || s >= seconds[i - 1]);
    const lastTs = seconds.length > 0 ? seconds[seconds.length - 1] : 0;
    const durationMin = Math.max(videoSec, 1) / 60;

    assertInvariants('transcribe', [
      check('non-empty', transcript.trim().length > 100, `length ${transcript.trim().length}`),
      check('starts with timestamp', lineTimestamp(transcript.trim()) !== null, transcript.slice(0, 60)),
      check(
        'no preamble/commentary',
        !/^(sure|here is|here's|okay|certainly)/i.test(transcript.trim()),
        transcript.slice(0, 60),
      ),
      check('timestamps monotonic', monotonic),
      check(
        'timestamps within video duration (+5% tolerance)',
        lastTs <= videoSec * 1.05,
        `last timestamp ${lastTs}s vs video ${Math.round(videoSec)}s`,
      ),
      check(
        'timestamp density >= 2/min',
        timestamps.length / durationMin >= 2,
        `${timestamps.length} timestamps over ${durationMin.toFixed(1)}min`,
      ),
    ]);

    return { transcript };
  },
  scorers: [
    judgeScorer<TranscribeOutput>({
      name: 'verbatim quality',
      criteria:
        'This should be a verbatim spoken-word transcript with MM:SS timestamps: natural speech, ' +
        'no editorial commentary, no meta text, no summarisation. Judge FORM only — whether it reads ' +
        'like faithfully transcribed speech. Do not judge whether the events described are real; ' +
        'you cannot verify current events and the source video is not available to you.',
      content: ({ transcript }) => `Transcript (first 3000 chars):\n\n${transcript.slice(0, 3000)}`,
    }),
  ],
});
