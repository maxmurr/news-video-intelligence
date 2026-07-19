'use client';

import type { ReactNode } from 'react';

function ChatShell({ headerStatus, children }: { headerStatus?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Always in the a11y tree (sr-only on mobile); dock toggle carries the visible label. */}
      <div className="sr-only lg:not-sr-only lg:flex lg:items-center lg:justify-between lg:gap-2 lg:border-b lg:px-4 lg:py-3">
        <h2 className="text-base font-medium">Ask the broadcast</h2>
        {headerStatus ? <div className="flex items-center gap-2">{headerStatus}</div> : null}
      </div>
      {children}
    </div>
  );
}

/** Transcript still running — Q&A locked. */
export function ChatWaiting() {
  return (
    <ChatShell headerStatus={<span className="shimmer text-muted-foreground text-xs">Transcribing…</span>}>
      <div className="flex flex-col gap-1.5 px-4 py-4" role="status">
        <h3 className="text-sm font-medium">Q&A opens after transcription</h3>
        <p className="text-muted-foreground text-sm leading-normal text-pretty">
          The broadcast is being transcribed now. Once the transcript lands, ask about any claim and jump straight to
          the cited moment.
        </p>
      </div>
    </ChatShell>
  );
}

/** Pipeline concern blocked transcription — don't promise live progress. */
export function ChatHalted() {
  return (
    <ChatShell headerStatus={<span className="text-muted-foreground text-xs">Transcription paused</span>}>
      <div className="flex flex-col gap-1.5 px-4 py-4" role="status">
        <h3 className="text-sm font-medium">Q&A is paused</h3>
        <p className="text-muted-foreground text-sm leading-normal text-pretty">
          Transcription stopped before finishing. Restart the analysis from the progress panel to unlock questions.
        </p>
      </div>
    </ChatShell>
  );
}

/** Placeholder while the heavy chat panel chunk loads. */
export function ChatPanelFallback() {
  return (
    <ChatShell>
      <div className="flex flex-col gap-1.5 px-4 py-4" role="status" aria-busy="true">
        <h3 className="text-sm font-medium">Loading Q&A…</h3>
        <p className="text-muted-foreground text-sm leading-normal text-pretty">Preparing the ask panel.</p>
      </div>
    </ChatShell>
  );
}
