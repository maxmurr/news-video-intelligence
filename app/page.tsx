import { FileSearch } from 'lucide-react';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { BroadcastLibrary } from '@/components/broadcast/broadcast-library';
import { UploadDropzone } from '@/components/broadcast/upload-dropzone';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { listBroadcasts } from '@/lib/broadcasts';

async function DeskHome() {
  await connection();
  const broadcasts = await listBroadcasts();
  const hasLibrary = broadcasts.length > 0;

  return (
    <>
      <header className="flex flex-col gap-1.5 border-b pb-4">
        <p className="text-muted-foreground text-xs font-medium">Broadcast Desk</p>
        <h1 className="font-heading max-w-2xl text-2xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-3xl">
          Ask the broadcast. Jump to the proof.
        </h1>
        {!hasLibrary ? (
          <p className="text-muted-foreground max-w-xl text-sm text-pretty">
            Upload a news video to extract the main stories, then ask follow-ups. Every answer links to the moment in
            the source footage.
          </p>
        ) : null}
      </header>

      <section aria-labelledby="upload-heading" className="flex flex-col gap-2">
        <h2 id="upload-heading" className={hasLibrary ? 'sr-only' : 'text-muted-foreground text-xs font-medium'}>
          New broadcast
        </h2>
        <UploadDropzone />
      </section>

      <section aria-labelledby="recent-heading" className="flex flex-col gap-3">
        <h2 id="recent-heading" className={hasLibrary ? 'text-muted-foreground text-xs font-medium' : 'sr-only'}>
          Recent broadcasts
        </h2>
        {hasLibrary ? (
          <BroadcastLibrary broadcasts={broadcasts} />
        ) : (
          <Empty className="border-border gap-3 rounded-lg border border-solid p-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileSearch aria-hidden />
              </EmptyMedia>
              <EmptyTitle className="font-sans">No broadcasts yet</EmptyTitle>
              <EmptyDescription className="text-pretty">
                Upload an MP4 above to extract stories and ask questions grounded in the footage.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
    </>
  );
}

function DeskHomeSkeleton() {
  return (
    <>
      <header className="flex flex-col gap-1.5 border-b pb-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-80 max-w-full" />
      </header>
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-28" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-full rounded-lg" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-28" />
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="grid grid-cols-[6rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-2 sm:grid-cols-[8rem_minmax(0,1fr)_7rem] sm:gap-4"
              >
                <Skeleton className="aspect-video w-full rounded-md" />
                <div className="flex min-w-0 flex-col gap-1">
                  <Skeleton className="h-4 w-3/4 max-w-md" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-3 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <Suspense fallback={<DeskHomeSkeleton />}>
        <DeskHome />
      </Suspense>
    </main>
  );
}
