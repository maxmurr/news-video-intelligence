'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { PIPELINE_STAGES, type BroadcastStages, type PipelineStage } from '@/lib/broadcast-types';
import { cn } from '@/lib/utils';

const STAGE_COPY: Record<PipelineStage, { label: string; detail: string }> = {
  transcript: { label: 'Transcribing', detail: 'Listening to the full broadcast' },
  stories: { label: 'Finding stories', detail: 'Splitting the transcript into segments' },
  headlines: { label: 'Writing headlines', detail: 'Summarizing each story' },
  frames: { label: 'Picking stills', detail: 'Choosing a representative frame per story' },
};

function nextStepHint(stages: BroadcastStages, stalled: boolean): string {
  if (stalled) return 'No progress for a few minutes — retry or return to the library.';
  if (!stages.transcript) return 'Q&A unlocks when transcription finishes.';
  return 'You can ask now — stories keep filling in below.';
}

export function StageProgress({
  stages,
  stalled = false,
  onRetry,
}: {
  stages: BroadcastStages;
  stalled?: boolean;
  onRetry?: () => void;
}) {
  const doneCount = PIPELINE_STAGES.filter(stage => stages[stage]).length;
  const activeIndex = PIPELINE_STAGES.findIndex(stage => !stages[stage]);

  return (
    <section aria-label="Analysis progress" className="bg-card flex flex-col gap-4 rounded-xl border p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-medium">{stalled ? 'Analysis stalled' : 'Analyzing broadcast'}</h2>
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
          const active = i === activeIndex && !stalled;
          return (
            <li key={stage} className="flex items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && 'border-primary',
                  stalled && !done && 'border-muted-foreground/40',
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
                    {done ? ' — done' : active ? ' — in progress' : stalled && !done ? ' — stalled' : ' — pending'}
                  </span>
                </span>
                {active && <span className="text-muted-foreground text-xs">{STAGE_COPY[stage].detail}</span>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-muted-foreground text-xs" aria-live="polite">
        {nextStepHint(stages, stalled)}
      </p>
      {stalled && (
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          {onRetry && (
            <Button type="button" size="sm" onClick={onRetry}>
              Try again
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
