import { Skeleton } from '@/components/ui/skeleton';

export default function ChatLoading() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex w-full flex-col gap-1.5 border-b pb-4">
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="flex w-full flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-36 rounded-md" />
          <Skeleton className="h-8 w-40 rounded-md" />
          <Skeleton className="h-8 w-44 rounded-md" />
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  );
}
