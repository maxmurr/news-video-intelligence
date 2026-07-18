import * as Sentry from '@sentry/nextjs';

import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

export class InstrumentationService implements IInstrumentationService {
  startSpan<T>(options: { name: string; op?: string; attributes?: Record<string, unknown> }, callback: () => T): T {
    return Sentry.startSpan(options as Parameters<typeof Sentry.startSpan>[0], callback);
  }

  async instrumentServerAction<T>(name: string, options: Record<string, unknown>, callback: () => T): Promise<T> {
    return Sentry.withServerActionInstrumentation(name, options, callback);
  }
}
