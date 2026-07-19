import type { ReactNode } from 'react';

export function BroadcastHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-1.5 border-b pb-4">
      <h1 className="font-heading max-w-2xl text-2xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-3xl">
        Ask the broadcast. Jump to the proof.
      </h1>
      {children}
    </header>
  );
}
