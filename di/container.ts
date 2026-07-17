import { createContainer } from '@evyweb/ioctopus';

import { createBroadcastsModule } from '@/di/modules/broadcasts.module';
import { createTransactionManagerModule } from '@/di/modules/database.module';
import { createFramesModule } from '@/di/modules/frames.module';
import { createHeadlinesModule } from '@/di/modules/headlines.module';
import { createMonitoringModule } from '@/di/modules/monitoring.module';
import { createRunsModule } from '@/di/modules/runs.module';
import { createStoriesModule } from '@/di/modules/stories.module';
import { createTranscriptsModule } from '@/di/modules/transcripts.module';
import { DI_RETURN_TYPES, DI_SYMBOLS } from '@/di/types';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

const ApplicationContainer = createContainer();

ApplicationContainer.load(Symbol('MonitoringModule'), createMonitoringModule());
ApplicationContainer.load(Symbol('TransactionManagerModule'), createTransactionManagerModule());
ApplicationContainer.load(Symbol('BroadcastsModule'), createBroadcastsModule());
ApplicationContainer.load(Symbol('TranscriptsModule'), createTranscriptsModule());
ApplicationContainer.load(Symbol('StoriesModule'), createStoriesModule());
ApplicationContainer.load(Symbol('HeadlinesModule'), createHeadlinesModule());
ApplicationContainer.load(Symbol('FramesModule'), createFramesModule());
ApplicationContainer.load(Symbol('RunsModule'), createRunsModule());

export function getInjection<K extends keyof typeof DI_SYMBOLS>(symbol: K): DI_RETURN_TYPES[K] {
  const instrumentationService = ApplicationContainer.get<IInstrumentationService>(DI_SYMBOLS.IInstrumentationService);

  return instrumentationService.startSpan(
    { name: '(di) getInjection', op: 'function', attributes: { symbol: symbol.toString() } },
    () => ApplicationContainer.get<DI_RETURN_TYPES[K]>(DI_SYMBOLS[symbol]),
  );
}
