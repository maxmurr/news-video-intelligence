import { Skeleton } from '@/components/ui/skeleton';

export default function BroadcastLoading() {
  return (
    <main>
      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:pb-0">
        <div className="flex items-center gap-3 border-b py-3">
          <Skeleton className="size-8 rounded-lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="size-7 rounded-lg" />
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
    </main>
  );
}
