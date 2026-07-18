import type { Metadata } from 'next';
import './globals.css';
import { Geist, Newsreader } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const newsreader = Newsreader({ subsets: ['latin'], variable: '--font-heading', style: ['normal', 'italic'] });

export const metadata: Metadata = {
  title: 'Broadcast Desk: Interactive News Video Intelligence',
  description:
    'Ask questions about a news broadcast and jump to the supporting moment in the footage. Stories, headlines, and timestamps you can trust.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`font-sans ${geist.variable} ${newsreader.variable}`}>
      <body className="bg-background text-foreground min-h-dvh antialiased">
        <NuqsAdapter>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </NuqsAdapter>
      </body>
    </html>
  );
}
