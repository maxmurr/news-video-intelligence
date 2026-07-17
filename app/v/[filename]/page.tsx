import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { BroadcastView } from '@/components/broadcast/broadcast-view';
import { Skeleton } from '@/components/ui/skeleton';
import { isValidUploadFilename } from '@/lib/artifacts';
import { getBroadcast } from '@/lib/broadcasts';

async function BroadcastLoader({ params }: { params: Promise<{ filename: string }> }) {
  await connection();
  const { filename } = await params;
  if (!isValidUploadFilename(filename)) notFound();

  const broadcast = await getBroadcast(filename);
  if (broadcast === null) notFound();

  return <BroadcastView initial={broadcast} />;
}

function BroadcastSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col px-4 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:pb-0">
      <div className="flex items-center gap-3 border-b py-3">
        <Skeleton className="size-8 rounded-lg" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="grid min-h-0 grid-cols-1 gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>
        <Skeleton className="hidden h-[calc(100dvh-6rem)] rounded-xl lg:block" />
      </div>
      <div className="bg-card fixed inset-x-0 bottom-0 z-40 border-t lg:hidden">
        <Skeleton className="h-14 w-full rounded-none" />
      </div>
    </div>
  );
}

export default function BroadcastPage({ params }: { params: Promise<{ filename: string }> }) {
  return (
    <main>
      <Suspense fallback={<BroadcastSkeleton />}>
        <BroadcastLoader params={params} />
      </Suspense>
    </main>
  );
}
