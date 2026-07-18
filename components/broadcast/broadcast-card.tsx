'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Spinner } from '@/components/ui/spinner';
import { PIPELINE_STAGES, type BroadcastSummary, type PipelineStage } from '@/lib/broadcast-types';
import { DeleteBroadcastButton } from './delete-broadcast-button';
import { useLocalDateLabel } from './use-local-date-label';

const STAGE_LABELS: Record<PipelineStage, string> = {
  transcript: 'Extracting transcript',
  stories: 'Finding stories',
  headlines: 'Writing headlines',
  frames: 'Capturing stills',
};

/** First UUID segment (8 hex chars) — enough to tell near-identical rows apart. */
function shortFileId(filename: string): string {
  const stem = filename.replace(/\.mp4$/i, '');
  const segment = stem.split('-')[0] ?? stem;
  return segment.slice(0, 8);
}

function nextStage(broadcast: BroadcastSummary): PipelineStage | undefined {
  return PIPELINE_STAGES.find(stage => !broadcast.stages[stage]);
}

function stageStatusLabel(broadcast: BroadcastSummary): string {
  const next = nextStage(broadcast);
  if (!next) {
    const count = broadcast.storyCount ?? 0;
    return count === 1 ? '1 story' : `${count} stories`;
  }
  return STAGE_LABELS[next];
}

function cardTitle(broadcast: BroadcastSummary): string {
  const headline = broadcast.topHeadline?.trim();
  if (headline) return headline;
  if (nextStage(broadcast)) return 'Processing…';
  return 'Untitled broadcast';
}

/** Dense desk row: still + headline + short id + status — not a marketing card tile. */
export function BroadcastCard({
  broadcast,
  timeOnly = false,
  onDeletedAction,
}: {
  broadcast: BroadcastSummary;
  /** When day headers already show the date, rows only need the clock time. */
  timeOnly?: boolean;
  /** Client callback after a successful delete (optimistic library update). */
  onDeletedAction?: () => void;
}) {
  const statusLabel = stageStatusLabel(broadcast);
  const title = cardTitle(broadcast);
  const fileId = shortFileId(broadcast.filename);
  const uploadedLabel = useLocalDateLabel(broadcast.uploadedAt, timeOnly ? 'time' : 'datetime');
  const ariaLabel = `${title}. File ${fileId}. Uploaded ${uploadedLabel}. ${statusLabel}.`;

  return (
    <div className="group bg-card hover:bg-muted/40 relative grid grid-cols-[6rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-2 transition-colors duration-150 ease-out sm:grid-cols-[8rem_minmax(0,1fr)_10rem] sm:gap-4">
      {/* Stretched overlay: the whole row navigates, so the delete button can sit
          beside it as a sibling instead of nesting interactive-in-interactive. */}
      <Link
        href={`/v/${broadcast.filename}`}
        aria-label={ariaLabel}
        className="focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-0 z-0 rounded-lg focus-visible:ring-3 focus-visible:outline-none"
      />
      <div className="bg-muted pointer-events-none relative z-10 col-start-1 aspect-video w-full overflow-hidden rounded-md">
        {broadcast.thumbnailUrl ? (
          <Image src={broadcast.thumbnailUrl} alt="" fill sizes="128px" className="object-cover" />
        ) : (
          <div className="text-muted-foreground flex size-full items-center justify-center" aria-hidden>
            <Spinner className="size-4 motion-reduce:animate-none" />
          </div>
        )}
      </div>
      <div className="pointer-events-none relative z-10 col-start-2 flex min-w-0 flex-col gap-1">
        <span className="line-clamp-2 text-sm font-medium text-pretty wrap-break-word" title={title} aria-hidden>
          {title}
        </span>
        <div className="text-muted-foreground flex min-w-0 items-baseline gap-2 text-xs" aria-hidden>
          <span className="shrink-0 font-mono tabular-nums" title={broadcast.filename}>
            {fileId}
          </span>
          <time dateTime={broadcast.uploadedAt} className="shrink-0 tabular-nums">
            {uploadedLabel}
          </time>
        </div>
      </div>
      <div className="pointer-events-none relative z-10 col-start-3 flex items-center justify-end gap-1">
        <span className="text-muted-foreground text-right text-xs whitespace-nowrap" aria-hidden>
          {statusLabel}
        </span>
        <DeleteBroadcastButton
          filename={broadcast.filename}
          title={title}
          onDeletedAction={onDeletedAction}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 pointer-events-auto opacity-100 transition-opacity duration-150 ease-out motion-reduce:transition-none [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100"
        />
      </div>
    </div>
  );
}
