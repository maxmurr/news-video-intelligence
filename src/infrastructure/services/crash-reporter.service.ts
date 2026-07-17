import { randomUUID } from 'node:crypto';

import type { ICrashReporterService } from '@/src/application/services/crash-reporter.service.interface';

/**
 * Passthrough implementation. Swap for a real reporter (e.g.
 * Sentry.captureException) when crash reporting is wired up; the returned id
 * stands in for the reporter's event id.
 */
export class CrashReporterService implements ICrashReporterService {
  report(error: unknown): string {
    console.error(error);
    return randomUUID();
  }
}
