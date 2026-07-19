import { Suspense } from 'react';
import { FileSearch } from 'lucide-react';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { getInjection } from '@/di/container';
import { type BroadcastSummary, toDeskBroadcastRow } from '@/lib/broadcast-types';
import { BroadcastHeader } from './_components/broadcast-header';
import { BroadcastLibrary } from './_components/broadcast-library';
import { BroadcastLibrarySkeleton } from './_components/broadcast-library-skeleton';
import { BroadcastUpload } from './_components/broadcast-upload';

async function getBroadcastSummaries(): Promise<BroadcastSummary[]> {
  const instrumentationService = getInjection('IInstrumentationService');
  return await instrumentationService.startSpan({ name: 'getBroadcastsSummaries', op: 'function.nextjs' }, async () => {
    try {
      const getBroadcastSummariesController = getInjection('IGetBroadcastSummariesController')();
      return await getBroadcastSummariesController;
    } catch (err) {
      const crashReporterService = getInjection('ICrashReporterService');
      crashReporterService.report(err);
      throw err;
    }
  });
}

async function RecentBroadcasts() {
  const summaries = await getBroadcastSummaries();

  if (summaries.length === 0) {
    return (
      <section aria-labelledby="recent-heading" className="flex flex-col gap-3">
        <h2 id="recent-heading" className="sr-only">
          Recent broadcasts
        </h2>
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
      </section>
    );
  }

  return (
    <section aria-labelledby="recent-heading" className="flex flex-col gap-3">
      <h2 id="recent-heading" className="text-muted-foreground text-xs font-medium">
        Recent broadcasts
      </h2>
      <BroadcastLibrary broadcasts={summaries.map(toDeskBroadcastRow)} />
    </section>
  );
}

export default function Home() {
  return (
    <>
      <BroadcastHeader>
        <p className="text-muted-foreground max-w-xl text-sm text-pretty">
          Upload a news video to extract the main stories, then ask follow-ups. Every answer links to the moment in the
          source footage.
        </p>
      </BroadcastHeader>

      <BroadcastUpload>
        <h2 id="upload-heading" className="text-muted-foreground text-xs font-medium">
          New broadcast
        </h2>
      </BroadcastUpload>

      <Suspense fallback={<BroadcastLibrarySkeleton />}>
        <RecentBroadcasts />
      </Suspense>
    </>
  );
}
