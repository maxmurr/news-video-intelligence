import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader } from '@/components/ui/empty';
import { cn } from '@/lib/utils';

export function ErrorScreen({
  title = 'Something went wrong',
  description = 'An unexpected error interrupted the page. The issue has been reported. Try again, or return home.',
  reset,
}: {
  title?: string;
  description?: string;
  reset: () => void;
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
          <EmptyDescription className="text-pretty wrap-break-word">{description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row flex-wrap justify-center gap-2">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Link href="/" className={cn(buttonVariants({ variant: 'outline' }))}>
            Back to all broadcasts
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  );
}
