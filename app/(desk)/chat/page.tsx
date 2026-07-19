import type { Metadata } from 'next';
import { getInjection } from '@/di/container';
import { toChatBroadcastOption } from '@/lib/broadcast-types';
import { ChatInterface } from './_components/chat-interface';
import { Provider } from '@ai-sdk-tools/store';

export const metadata: Metadata = {
  title: 'Chat · Broadcast Desk',
};

async function getBroadcastSummaries() {
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

export default async function ChatPage() {
  const broadcastSummaries = await getBroadcastSummaries();
  const chatBroadcasts = broadcastSummaries.map(toChatBroadcastOption);

  return (
    <Provider initialMessages={[]}>
      <ChatInterface broadcasts={chatBroadcasts} />
    </Provider>
  );
}
