import Link from 'next/link';
import type { ReactNode } from 'react';
import { BroadcastCard } from '@/components/broadcast/broadcast-card';
import { buttonVariants } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader } from '@/components/ui/empty';
import type { BroadcastSummary } from '@/lib/broadcast-types';
import { cn } from '@/lib/utils';

export function NotFoundScreen({
  title,
  description,
  context,
  recent = [],
}: {
  title: string;
  description: string;
  /** Optional path/slug echo (e.g. failed broadcast filename). */
  context?: ReactNode;
  recent?: BroadcastSummary[];
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-1.5 border-b pb-4">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 inline-flex min-h-8 w-fit items-center text-xs font-medium transition-colors duration-150 ease-out outline-none focus-visible:ring-3"
        >
          Broadcast Desk
        </Link>
      </header>

      <Empty className="border-border flex-none gap-4 rounded-lg border border-solid p-6">
        <EmptyHeader className="gap-1.5">
          <h1 className="max-w-full font-sans text-base leading-snug font-semibold tracking-tight text-balance wrap-break-word">
            {title}
          </h1>
          {context}
          <EmptyDescription className="text-pretty wrap-break-word">{description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href="/" className={cn(buttonVariants())}>
            Back to all broadcasts
          </Link>
        </EmptyContent>
      </Empty>

      {recent.length > 0 ? (
        <section aria-labelledby="not-found-recent-heading" className="flex flex-col gap-3">
          <h2 id="not-found-recent-heading" className="text-muted-foreground text-xs font-medium">
            Recent broadcasts
          </h2>
          <ul className="flex flex-col gap-2">
            {recent.map(broadcast => (
              <li key={broadcast.id}>
                <BroadcastCard broadcast={broadcast} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
