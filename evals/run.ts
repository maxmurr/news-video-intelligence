/**
 * Pipeline evals. For every video in public/uploads/, runs each pipeline stage
 * (transcribe -> stories -> headlines -> frames) and scores the outputs with
 * deterministic invariant checks plus an LLM judge (different model family
 * than the pipeline to avoid self-preference).
 *
 * Stages are called directly against lib/pipeline — the same code path the
 * durable workflow runs in production — so no dev server is required. Each
 * eval consumes the stage's return value; a second run gets the rows already
 * stored in the database. Fixture videos dropped straight into public/uploads
 * get their broadcast row created here before the stages run.
 *
 * Usage:
 *   pnpm evals                       # eval all videos, reuse stored stages
 *   pnpm evals --video <name>        # eval one video
 *
 * Requires AI_GATEWAY_API_KEY.
 */
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getInjection } from '../di/container';
import { PUBLIC_DIR } from '../lib/artifacts';
import { detectStories, extractFrames, generateHeadlines, transcribeVideo } from '../lib/pipeline';
import { HEADLINE_MAX_WORDS, type HeadlineItem, type Story } from '../lib/schemas';
import { lineTimestamp, timestampToSeconds, transcriptSpan, transcriptTimestamps } from '../lib/timestamps';
import { videoDurationSeconds } from '../lib/video';
import { NotFoundError } from '../src/entities/errors/common';
import { check, judge, type Check, type JudgeResult, type StageResult } from './lib';

const RESULTS_DIR = path.join(process.cwd(), 'evals', 'results');

// Story boundaries snap to transcript line timestamps, so allow a few
// seconds of gap between consecutive stories (but never overlap).
const STORY_GAP_SLACK_SEC = 15;

/**
 * Stages resolve their broadcast row by filename and never create it, so a
 * fixture video dropped straight into public/uploads needs its row minted
 * before the first stage runs.
 */
async function ensureBroadcast(filename: string): Promise<void> {
  try {
    await getInjection('IGetBroadcastByFilenameController')(filename);
  } catch (error) {
    if (!(error instanceof NotFoundError)) throw error;
    const { size } = await stat(path.join(PUBLIC_DIR, 'uploads', filename));
    await getInjection('ICreateBroadcastController')({ filename, url: `/uploads/${filename}`, size });
  }
}

async function evalTranscribe(filename: string): Promise<{ result: StageResult; transcript: string }> {
  const started = Date.now();
  const { data: transcript } = await transcribeVideo(filename);
  const videoSec = await videoDurationSeconds(path.join(PUBLIC_DIR, 'uploads', filename));

  const timestamps = transcriptTimestamps(transcript);
  const seconds = timestamps.map(timestampToSeconds);
  const monotonic = seconds.every((s, i) => i === 0 || s >= seconds[i - 1]);
  const lastTs = seconds.length > 0 ? seconds[seconds.length - 1] : 0;
  const durationMin = Math.max(videoSec, 1) / 60;

  const checks: Check[] = [
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
  ];

  const judges: JudgeResult[] = [
    await judge(
      'verbatim quality',
      'This should be a verbatim spoken-word transcript with MM:SS timestamps: natural speech, ' +
        'no editorial commentary, no meta text, no summarisation. Judge FORM only — whether it reads ' +
        'like faithfully transcribed speech. Do not judge whether the events described are real; ' +
        'you cannot verify current events and the source video is not available to you.',
      `Transcript (first 3000 chars):\n\n${transcript.slice(0, 3000)}`,
    ),
  ];

  return { result: finalize('transcribe', checks, judges, started), transcript };
}

async function evalStories(filename: string, transcript: string): Promise<{ result: StageResult; stories: Story[] }> {
  const started = Date.now();
  const {
    data: { stories },
  } = await detectStories(filename);

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

  const checks: Check[] = [
    check('at least one story', stories.length >= 1, `count ${stories.length}`),
    check(
      'covers transcript start',
      stories[0]?.startTime === firstTs,
      `first story ${stories[0]?.startTime} vs ${firstTs}`,
    ),
    check('contiguous segments', contiguous),
    check('end after start', ordered),
    check('start times exist in transcript', knownTimestamps),
  ];

  const judges: JudgeResult[] = [
    await judge(
      'boundary quality',
      'Each story should cover one coherent news topic; boundaries should fall where the topic ' +
        'changes, not mid-topic or at mere speaker turns.',
      `Detected stories:\n${JSON.stringify(stories, null, 2)}\n\nTranscript:\n\n${transcript}`,
    ),
  ];

  return { result: finalize('stories', checks, judges, started), stories };
}

async function evalHeadlines(
  filename: string,
  transcript: string,
  stories: Story[],
): Promise<{ result: StageResult; headlines: HeadlineItem[] }> {
  const started = Date.now();
  const {
    data: { items },
  } = await generateHeadlines(filename);

  const aligned = items.every((h, i) => h.startTime === stories[i]?.startTime && h.endTime === stories[i]?.endTime);
  const headlineLengths = items.map(h => h.headline.split(/\s+/).length);

  const checks: Check[] = [
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
  ];

  const judges: JudgeResult[] = [
    await judge(
      'groundedness & headline quality',
      'Every headline and summary must be fully grounded in the transcript (no invented facts, ' +
        'names, or numbers) and read like professional news copy. Penalise clickbait and vagueness.',
      `Headlines & summaries:\n${JSON.stringify(items, null, 2)}\n\nTranscript:\n\n${transcript}`,
    ),
  ];

  return { result: finalize('headlines', checks, judges, started), headlines: items };
}

async function evalFrames(filename: string, transcript: string, headlines: HeadlineItem[]): Promise<StageResult> {
  const started = Date.now();
  const {
    data: { items },
  } = await extractFrames(filename);

  const inSpan = items.every(f => {
    const t = timestampToSeconds(f.frameTime);
    return t >= timestampToSeconds(f.startTime) && t <= timestampToSeconds(f.endTime);
  });

  const frameFiles = await Promise.all(
    items.map(async f => {
      try {
        const s = await stat(path.join(PUBLIC_DIR, f.frameUrl));
        return s.size > 1000;
      } catch {
        return false;
      }
    }),
  );

  const checks: Check[] = [
    check('one frame per headline', items.length === headlines.length, `${items.length} vs ${headlines.length}`),
    check('frame times within story spans', inSpan),
    check('all frame files exist (>1KB)', frameFiles.every(Boolean)),
  ];

  // Judges are independent per frame — run them concurrently. A missing
  // frame file becomes a failing judge rather than crashing the whole run.
  const judges = await Promise.all(
    items.map(async (f, i): Promise<JudgeResult> => {
      let image: Buffer;
      try {
        image = await readFile(path.join(PUBLIC_DIR, f.frameUrl));
      } catch {
        return {
          name: `frame ${i + 1} representativeness`,
          score: 1,
          threshold: 3,
          pass: false,
          reasoning: `Frame file missing: ${f.frameUrl}`,
        };
      }
      return judge(
        `frame ${i + 1} representativeness`,
        `This frame is the thumbnail for a news story. The viewer sees it next to the headline, so judge ` +
          `the pairing, not the image in isolation. Use the transcript of the story segment to identify ` +
          `who or what could plausibly be shown — people and scenes described there may appear as cutaway ` +
          `footage.\n` +
          `Headline: "${f.headline}"\n` +
          `Summary: "${headlines[i]?.summary ?? ''}"\n` +
          `Story segment transcript:\n${transcriptSpan(transcript, f.startTime, f.endTime)}\n\n` +
          'Scoring: footage, graphics, or a scene/person plausibly from the story is good (4-5); a clear ' +
          'talking head of someone discussing it is acceptable (3); a blurry, transitional, or unrelated ' +
          'frame is bad (1-2).',
        [{ type: 'file', mediaType: 'image/jpeg', data: image }],
      );
    }),
  );

  return finalize('frames', checks, judges, started);
}

function finalize(stage: string, checks: Check[], judges: JudgeResult[], started: number): StageResult {
  return {
    stage,
    checks,
    judges,
    pass: checks.every(c => c.pass) && judges.every(j => j.pass),
    durationMs: Date.now() - started,
  };
}

function formatStage(result: StageResult): string {
  const lines = [`  [${result.pass ? 'PASS' : 'FAIL'}] ${result.stage} (${(result.durationMs / 1000).toFixed(1)}s)`];
  for (const c of result.checks) {
    lines.push(`    ${c.pass ? 'ok  ' : 'FAIL'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
  }
  for (const j of result.judges) {
    lines.push(`    ${j.pass ? 'ok  ' : 'FAIL'} [judge ${j.score}/5] ${j.name} — ${j.reasoning}`);
  }
  return lines.join('\n');
}

async function main() {
  const videoFilter = process.argv.includes('--video') ? process.argv[process.argv.indexOf('--video') + 1] : undefined;

  const uploads = (await readdir(path.join(PUBLIC_DIR, 'uploads'))).filter(f => f.endsWith('.mp4'));
  const videos = videoFilter ? uploads.filter(f => f === videoFilter) : uploads;
  if (videos.length === 0) {
    console.error(videoFilter ? `Video not found: ${videoFilter}` : 'No videos in public/uploads/.');
    process.exit(1);
  }

  // Videos are independent — eval them concurrently. Stages within a video
  // stay sequential because each stage's output feeds the next. Output is
  // buffered per video so interleaved runs still print readably.
  const perVideo = await Promise.all(
    videos.map(async video => {
      await ensureBroadcast(video);
      const transcribe = await evalTranscribe(video);
      const stories = await evalStories(video, transcribe.transcript);
      const headlines = await evalHeadlines(video, transcribe.transcript, stories.stories);
      const frames = await evalFrames(video, transcribe.transcript, headlines.headlines);
      return [video, [transcribe.result, stories.result, headlines.result, frames]] as const;
    }),
  );

  let allPass = true;
  for (const [video, results] of perVideo) {
    console.log(`\n=== ${video} ===\n`);
    for (const result of results) {
      console.log(formatStage(result));
      if (!result.pass) allPass = false;
    }
  }

  await mkdir(RESULTS_DIR, { recursive: true });
  const resultPath = path.join(RESULTS_DIR, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await writeFile(resultPath, JSON.stringify(Object.fromEntries(perVideo), null, 2), 'utf8');
  console.log(`\nReport: ${path.relative(process.cwd(), resultPath)}`);
  console.log(allPass ? 'ALL STAGES PASSED' : 'SOME STAGES FAILED');
  process.exit(allPass ? 0 : 1);
}

await main();
