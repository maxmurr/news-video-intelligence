import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

export class MockInstrumentationService implements IInstrumentationService {
  startSpan<T>(_options: { name: string; op?: string; attributes?: Record<string, unknown> }, callback: () => T): T {
    return callback();
  }

  async instrumentServerAction<T>(_name: string, _options: Record<string, unknown>, callback: () => T): Promise<T> {
    return callback();
  }
}
