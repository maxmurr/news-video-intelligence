import type { Metadata } from 'next';
import { connection } from 'next/server';
import { NotFoundRequestedPath } from '@/components/not-found-requested-path';
import { NotFoundScreen } from '@/components/not-found-screen';
import { getInjection } from '@/di/container';

export const metadata: Metadata = {
  title: 'Broadcast not found · Broadcast Desk',
};

export default async function BroadcastNotFound() {
  await connection();
  const recent = (await getInjection('IGetBroadcastSummariesController')()).slice(0, 3);

  return (
    <NotFoundScreen
      title="Broadcast not found"
      description="This broadcast isn't available—or the link is wrong."
      context={<NotFoundRequestedPath />}
      recent={recent}
    />
  );
}
