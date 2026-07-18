import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { ChatEmptyState } from '@/components/chat/chat-empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { getInjection } from '@/di/container';

export const metadata: Metadata = {
  title: 'Chat · Broadcast Desk',
};

async function ChatEmpty() {
  await connection();
  const broadcasts = await getInjection('IGetBroadcastSummariesController')();
  return <ChatEmptyState broadcasts={broadcasts} />;
}

function ChatEmptySkeleton() {
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

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatEmptySkeleton />}>
      <ChatEmpty />
    </Suspense>
  );
}
