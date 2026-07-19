'use client';

import * as Sentry from '@sentry/nextjs';
import { Geist, Newsreader } from 'next/font/google';
import { useEffect } from 'react';
import './globals.css';
import { ErrorScreen } from '@/components/error-screen';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const newsreader = Newsreader({ subsets: ['latin'], variable: '--font-heading', style: ['normal', 'italic'] });

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className={`font-sans ${geist.variable} ${newsreader.variable}`}>
      <body className="bg-background text-foreground min-h-dvh antialiased">
        <ErrorScreen reset={reset} />
      </body>
    </html>
  );
}
