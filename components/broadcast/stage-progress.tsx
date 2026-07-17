'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { PIPELINE_STAGES, type BroadcastRun, type BroadcastStages, type PipelineStage } from '@/lib/broadcast-types';
import { cn } from '@/lib/utils';

const STAGE_COPY: Record<PipelineStage, { label: string; detail: string }> = {
  transcript: { label: 'Transcribing', detail: 'Listening to the full broadcast' },
  stories: { label: 'Finding stories', detail: 'Splitting the transcript into segments' },
  headlines: { label: 'Writing headlines', detail: 'Summarizing each story' },
  frames: { label: 'Picking stills', detail: 'Choosing a representative frame per story' },
};

/**
 * Why the pipeline needs attention. `failed`/`not-started` come straight from
 * the workflow engine; `stalled` is the progress-clock fallback used only when
 * the engine can't report run health.
 */
export type AnalysisConcern = 'failed' | 'not-started' | 'stalled' | null;

export function analysisConcern(run: BroadcastRun, stalled: boolean): AnalysisConcern {
  if (run.status === 'failed' || run.status === 'cancelled') return 'failed';
  if (run.status === 'not-started') return 'not-started';
  if (run.status === 'unknown' && stalled) return 'stalled';
  return null;
}

const CONCERN_COPY: Record<Exclude<AnalysisConcern, null>, { heading: string; hint: string }> = {
  'not-started': {
    heading: 'Analysis didn’t start',
    hint: 'The upload is safe, but the pipeline never kicked off. Restart it below.',
  },
  failed: {
    heading: 'Analysis failed',
    hint: 'The pipeline stopped on an error. Restarting resumes from the first unfinished stage.',
  },
  stalled: {
    heading: 'Analysis may be stuck',
    hint: 'No progress for a while. Restart below, or keep waiting. Long broadcasts take time.',
  },
};

function elapsedMinutes(startedAt: string | null): number | null {
  if (!startedAt) return null;
  const started = Date.parse(startedAt);
  if (Number.isNaN(started)) return null;
  return Math.max(0, Math.floor((Date.now() - started) / 60_000));
}

function progressHint(stages: BroadcastStages, minutes: number | null): string {
  if (!stages.transcript) {
    const reassurance =
      minutes !== null && minutes >= 2
        ? ` ${minutes} min in. A full broadcast can take several minutes to transcribe.`
        : '';
    return `Q&A unlocks when transcription finishes.${reassurance}`;
  }
  return 'You can ask now. Stories keep filling in below.';
}

export function StageProgress({
  stages,
  concern = null,
  startedAt = null,
  onRetry,
  retrying = false,
}: {
  stages: BroadcastStages;
  concern?: AnalysisConcern;
  /** When the current run was started; drives elapsed-time reassurance. */
  startedAt?: string | null;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const doneCount = PIPELINE_STAGES.filter(stage => stages[stage]).length;
  const activeIndex = PIPELINE_STAGES.findIndex(stage => !stages[stage]);
  const heading = concern ? CONCERN_COPY[concern].heading : 'Analyzing broadcast';
  const hint = concern ? CONCERN_COPY[concern].hint : progressHint(stages, elapsedMinutes(startedAt));

  return (
    <section aria-label="Analysis progress" className="bg-card flex flex-col gap-4 rounded-xl border p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-medium">{heading}</h2>
        <span className="text-muted-foreground text-xs tabular-nums">
          {doneCount}/{PIPELINE_STAGES.length}
        </span>
      </div>
      <Progress
        value={(doneCount / PIPELINE_STAGES.length) * 100}
        aria-label={`Analysis progress, ${doneCount} of ${PIPELINE_STAGES.length} steps complete`}
      />
      <ol className="flex flex-col gap-3">
        {PIPELINE_STAGES.map((stage, i) => {
          const done = stages[stage];
          const active = i === activeIndex && !concern;
          return (
            <li key={stage} className="flex items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && 'border-primary',
                  concern && !done && 'border-muted-foreground/40',
                )}
              >
                {done ? (
                  <Check className="size-3" aria-hidden />
                ) : active ? (
                  <Spinner className="size-3" />
                ) : (
                  <span className="bg-border size-1.5 rounded-full" aria-hidden />
                )}
              </span>
              <div className="flex flex-col">
                <span className={cn('text-sm', done || active ? 'font-medium' : 'text-muted-foreground')}>
                  {STAGE_COPY[stage].label}
                  <span className="sr-only">
                    {done ? ', done' : active ? ', in progress' : concern ? ', needs restart' : ', pending'}
                  </span>
                </span>
                {active && <span className="text-muted-foreground text-xs">{STAGE_COPY[stage].detail}</span>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-muted-foreground text-xs" aria-live="polite">
        {hint}
      </p>
      {concern && (
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          {onRetry && (
            <Button type="button" size="sm" onClick={onRetry} disabled={retrying}>
              {retrying && <Spinner className="size-3" />}
              {retrying ? 'Restarting…' : 'Restart analysis'}
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" nativeButton={false} render={<Link href="/" />}>
            Back to library
          </Button>
        </div>
      )}
    </section>
  );
}
