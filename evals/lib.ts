import { generateText, Output } from 'ai';
import { z } from 'zod';

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
