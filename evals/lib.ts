import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import { gateway, generateText, Output } from 'ai';
import { createScorer } from 'evalite';
import { wrapAISDKModel } from 'evalite/ai-sdk';
import { z } from 'zod';

import { getInjection } from '../di/container';
import { PUBLIC_DIR } from '../lib/artifacts';
import { uploads } from '../lib/files';
import { NotFoundError } from '../src/entities/errors/common';

// A different model family than the pipeline (Gemini) to avoid self-preference.
const JUDGE_MODEL = 'anthropic/claude-sonnet-5';

// wrapAISDKModel proxies a resolved model object, not a gateway id string, so
// resolve through the gateway provider first (same provider the pipeline uses).
// The wrapper surfaces judge calls as Evalite UI traces, but its trace
// middleware throws on `file` prompt parts and only skips serialization when the
// model is fully unwrapped. The frames judge sends images, so it uses the raw
// gateway model; text-only judges keep the traced wrapper.
const tracedModel = wrapAISDKModel(gateway(JUDGE_MODEL));
const rawModel = gateway(JUDGE_MODEL);

export interface Check {
  name: string;
  pass: boolean;
  detail?: string;
}

export function check(name: string, pass: boolean, detail?: string): Check {
  return { name, pass, detail: pass ? undefined : detail };
}

/**
 * Deterministic invariants are the hard gate: any violation throws, which marks
 * the Evalite eval as failed and makes `evalite run` exit non-zero. LLM judges
 * stay soft (scored 0-1, gated by scoreThreshold in evalite.config.ts).
 */
export function assertInvariants(stage: string, checks: Check[]): void {
  const failed = checks.filter(c => !c.pass);
  if (failed.length === 0) return;
  const lines = failed.map(c => `  - ${c.name}${c.detail ? ` (${c.detail})` : ''}`);
  throw new Error(`${stage} invariants failed:\n${lines.join('\n')}`);
}

export const JUDGE_THRESHOLD = 3;

export interface JudgeVerdict {
  score: number;
  reasoning: string;
}

const scoreSchema = z.object({
  score: z.number().min(1).max(5).describe('Integer score from 1 (bad) to 5 (excellent)'),
  reasoning: z.string().describe('One or two sentences justifying the score'),
});

type JudgeContent = string | Array<{ type: 'text'; text: string } | { type: 'file'; mediaType: string; data: Buffer }>;

export async function runJudge(criteria: string, content: JudgeContent): Promise<JudgeVerdict> {
  const model = Array.isArray(content) && content.some(part => part.type === 'file') ? rawModel : tracedModel;

  const { output } = await generateText({
    model,
    output: Output.object({ schema: scoreSchema }),
    system:
      'You are a strict evaluator of an automated news-video pipeline. ' +
      'Score the material against the criteria on a 1-5 scale. ' +
      '5 = flawless, 4 = minor issues, 3 = acceptable, 2 = clear problems, 1 = unusable. ' +
      'Judge only what is in front of you; do not reward plausible-sounding but ungrounded content.',
    messages: [
      {
        role: 'user',
        content:
          typeof content === 'string'
            ? [{ type: 'text' as const, text: `Criteria: ${criteria}\n\n${content}` }]
            : [{ type: 'text' as const, text: `Criteria: ${criteria}` }, ...content],
      },
    ],
  });

  return { score: output.score, reasoning: output.reasoning };
}

/**
 * Wraps a single LLM judge as an Evalite scorer. The raw 1-5 verdict is
 * normalised to 0-1; the raw score and reasoning ride along as metadata.
 */
export function judgeScorer<TOutput>(opts: {
  name: string;
  criteria: string;
  content: (output: TOutput) => JudgeContent | Promise<JudgeContent>;
}) {
  return createScorer<unknown, TOutput, unknown>({
    name: opts.name,
    scorer: async ({ output }) => {
      const verdict = await runJudge(opts.criteria, await opts.content(output));
      return {
        score: verdict.score / 5,
        metadata: { raw: verdict.score, threshold: JUDGE_THRESHOLD, reasoning: verdict.reasoning },
      };
    },
  });
}

/**
 * Frame artifacts are pipeline output living only in the object bucket (keyed by
 * frameUrl), so eval checks read them through the storage client rather than the
 * local filesystem. Returns null when the object is missing or unreadable.
 */
export async function readStoredBytes(key: string): Promise<Buffer | null> {
  try {
    const file = await uploads.download(key);
    return Buffer.from(await file.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Every stage suite runs over the same fixtures: the mp4s in public/uploads.
 * Set EVAL_VIDEO to a filename to run a single video (replaces the old
 * `--video` flag). Returned as an async resolver so Evalite reads the directory
 * at run time, not module load.
 */
export const uploadsData = async (): Promise<Array<{ input: string }>> => {
  const files = (await readdir(path.join(PUBLIC_DIR, 'uploads'))).filter(f => f.endsWith('.mp4'));
  const only = process.env.EVAL_VIDEO;
  return files.filter(f => !only || f === only).map(input => ({ input }));
};

/**
 * Stages resolve their broadcast row by id and never create it, so a fixture
 * video dropped straight into public/uploads needs its row minted before the
 * first stage runs. Returns the broadcast id the stage controllers expect.
 *
 * Evalite runs suites in parallel, so many tasks call this for the same
 * filename at once. Share one in-flight create per filename, and if another
 * worker still wins the unique insert, re-fetch instead of failing.
 */
const ensuringBroadcast = new Map<string, Promise<string>>();

function isUniqueViolation(error: unknown): boolean {
  for (let current: unknown = error, depth = 0; current && typeof current === 'object' && depth < 16; depth++) {
    const node = current as { code?: unknown; message?: unknown; cause?: unknown };
    if (node.code === '23505') return true;
    if (typeof node.message === 'string' && /duplicate key|unique constraint/i.test(node.message)) return true;
    current = 'cause' in node ? node.cause : undefined;
  }
  return false;
}

async function ensureBroadcastOnce(filename: string): Promise<string> {
  try {
    const { id } = await getInjection('IGetBroadcastByFilenameController')(filename);
    return id;
  } catch (error) {
    if (!(error instanceof NotFoundError)) throw error;
  }

  const { size } = await stat(path.join(PUBLIC_DIR, 'uploads', filename));
  try {
    const { id } = await getInjection('ICreateBroadcastController')({
      filename,
      url: `/uploads/${filename}`,
      size,
    });
    return id;
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const { id } = await getInjection('IGetBroadcastByFilenameController')(filename);
    return id;
  }
}

export function ensureBroadcast(filename: string): Promise<string> {
  const inFlight = ensuringBroadcast.get(filename);
  if (inFlight) return inFlight;

  const promise = ensureBroadcastOnce(filename).finally(() => {
    ensuringBroadcast.delete(filename);
  });
  ensuringBroadcast.set(filename, promise);
  return promise;
}
