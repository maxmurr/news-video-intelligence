import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

/**
 * Passthrough implementation. Swap the span bodies for a real tracer
 * (e.g. Sentry.startSpan / withServerActionInstrumentation) when observability
 * is wired up — callers already thread this service through every layer.
 */
export class InstrumentationService implements IInstrumentationService {
  startSpan<T>(_options: { name: string; op?: string; attributes?: Record<string, unknown> }, callback: () => T): T {
    return callback();
  }

  async instrumentServerAction<T>(_name: string, _options: Record<string, unknown>, callback: () => T): Promise<T> {
    return callback();
  }
}
