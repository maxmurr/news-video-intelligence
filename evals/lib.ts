import { generateText, Output } from 'ai';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { PUBLIC_DIR } from '../lib/artifacts';

export const BASE_URL = process.env.EVAL_BASE_URL ?? 'http://localhost:3000';
// A different model family than the pipeline (Gemini) to avoid self-preference.
const JUDGE_MODEL = 'anthropic/claude-sonnet-5';

export interface Check {
  name: string;
  pass: boolean;
  detail?: string;
}

export interface JudgeResult {
  name: string;
  score: number; // 1-5
  threshold: number;
  pass: boolean;
  reasoning: string;
}

export interface StageResult {
  stage: string;
  checks: Check[];
  judges: JudgeResult[];
  pass: boolean;
  durationMs: number;
}

export function check(name: string, pass: boolean, detail?: string): Check {
  return { name, pass, detail: pass ? undefined : detail };
}

export async function callEndpoint(endpoint: string, filename: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename }),
  });
  const body = await res.text(); // drain — streaming endpoints only persist after the stream completes
  if (!res.ok) {
    throw new Error(`${endpoint} -> ${res.status}: ${body}`);
  }
}

/**
 * Reads a pipeline artifact. Pass `retries` only for artifacts whose
 * persistence can lag the HTTP response (the transcript, which is written
 * after the stream completes); everything else is written before the
 * endpoint responds and should fail fast.
 */
export async function readArtifact(relativePath: string, retries = 0): Promise<string> {
  const fullPath = path.join(PUBLIC_DIR, relativePath);
  for (let attempt = 0; ; attempt++) {
    try {
      return await readFile(fullPath, 'utf8');
    } catch (error) {
      if (attempt >= retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
}

const scoreSchema = z.object({
  score: z.number().min(1).max(5).describe('Integer score from 1 (bad) to 5 (excellent)'),
  reasoning: z.string().describe('One or two sentences justifying the score'),
});

type JudgeContent = string | Array<{ type: 'text'; text: string } | { type: 'file'; mediaType: string; data: Buffer }>;

export async function judge(
  name: string,
  criteria: string,
  content: JudgeContent,
  threshold = 3,
): Promise<JudgeResult> {
  const { output } = await generateText({
    model: JUDGE_MODEL,
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

  return {
    name,
    score: output.score,
    threshold,
    pass: output.score >= threshold,
    reasoning: output.reasoning,
  };
}
