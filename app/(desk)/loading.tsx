import { Skeleton } from '@/components/ui/skeleton';
import { BroadcastLibrarySkeleton } from './_components/broadcast-library-skeleton';

export default function DeskLoading() {
  return (
    <>
      <header className="flex flex-col gap-1.5 border-b pb-4">
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </header>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <BroadcastLibrarySkeleton />
    </>
  );
}
