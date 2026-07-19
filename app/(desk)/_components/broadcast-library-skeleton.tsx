import { Skeleton } from '@/components/ui/skeleton';

export function BroadcastLibrarySkeleton() {
  return (
    <section aria-labelledby="recent-heading" className="flex flex-col gap-3" aria-busy="true">
      <h2 id="recent-heading" className="text-muted-foreground text-xs font-medium">
        Recent broadcasts
      </h2>
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
    </section>
  );
}
