'use client';

import * as Sentry from '@sentry/nextjs';
import { Geist, Newsreader } from 'next/font/google';
import { useEffect } from 'react';
import './globals.css';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader } from '@/components/ui/empty';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const newsreader = Newsreader({ subsets: ['latin'], variable: '--font-heading', style: ['normal', 'italic'] });

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className={`font-sans ${geist.variable} ${newsreader.variable}`}>
      <body className="bg-background text-foreground min-h-dvh antialiased">
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
          <header className="flex flex-col gap-1.5 border-b pb-4">
            <span className="text-muted-foreground w-fit text-xs font-medium">Broadcast Desk</span>
          </header>

          <Empty className="border-border flex-none gap-4 rounded-lg border border-solid p-6">
            <EmptyHeader className="gap-1.5">
              <h1 className="max-w-full font-sans text-base leading-snug font-semibold tracking-tight text-balance wrap-break-word">
                Something went wrong
              </h1>
              <EmptyDescription className="text-pretty wrap-break-word">
                An unexpected error interrupted the page. The issue has been reported. Try again, or return home.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={reset}>Try again</Button>
            </EmptyContent>
          </Empty>
        </main>
      </body>
    </html>
  );
}
