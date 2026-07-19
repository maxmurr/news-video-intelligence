import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { BroadcastView } from './_components/broadcast-view';
import { getInjection } from '@/di/container';
import { isValidBroadcastId } from '@/lib/artifacts';
import { toBroadcastPageInitial } from '@/lib/broadcast-types';

const NOT_FOUND_TITLE = 'Broadcast not found · Broadcast Desk';

const getBroadcastDetail = cache(async function getBroadcastDetail(fileId: string) {
  const instrumentationService = getInjection('IInstrumentationService');
  return await instrumentationService.startSpan({ name: 'getBroadcastDetail', op: 'function.nextjs' }, async () => {
    try {
      const getBroadcastDetailController = getInjection('IGetBroadcastDetailController')(fileId);
      return await getBroadcastDetailController;
    } catch (err) {
      const crashReporterService = getInjection('ICrashReporterService');
      crashReporterService.report(err);
      throw err;
    }
  });
});

export async function generateMetadata({ params }: { params: Promise<{ fileId: string }> }): Promise<Metadata> {
  const { fileId } = await params;
  if (!isValidBroadcastId(fileId)) return { title: NOT_FOUND_TITLE };

  const broadcast = await getBroadcastDetail(fileId);
  if (broadcast === null) return { title: NOT_FOUND_TITLE };
  const headline = broadcast.topHeadline?.trim();
  return { title: headline ? `${headline} · Broadcast Desk` : 'Broadcast · Broadcast Desk' };
}

export default async function BroadcastPage({ params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  if (!isValidBroadcastId(fileId)) notFound();

  const broadcast = await getBroadcastDetail(fileId);
  if (broadcast === null) notFound();

  return (
    <main>
      <BroadcastView initial={toBroadcastPageInitial(broadcast)} />
    </main>
  );
}
