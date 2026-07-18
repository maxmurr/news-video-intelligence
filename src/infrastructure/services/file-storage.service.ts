import { rm } from 'node:fs/promises';
import path from 'node:path';

import { FRAMES_DIR } from '@/lib/artifacts';
import { uploads } from '@/lib/files';
import type { IFileStorageService } from '@/src/application/services/file-storage.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

export class FileStorageService implements IFileStorageService {
  constructor(private readonly instrumentationService: IInstrumentationService) {}

  async uploadExists(filename: string): Promise<boolean> {
    return this.instrumentationService.startSpan({ name: 'FileStorageService > uploadExists', op: 'function' }, () =>
      uploads.exists(filename),
    );
  }

  async deleteUpload(filename: string): Promise<void> {
    await this.instrumentationService.startSpan({ name: 'FileStorageService > deleteUpload', op: 'function' }, () =>
      uploads.delete(filename).catch(() => {}),
    );
  }

  async deleteFrames(filename: string): Promise<void> {
    await this.instrumentationService.startSpan({ name: 'FileStorageService > deleteFrames', op: 'function' }, () =>
      rm(path.join(FRAMES_DIR, filename.replace(/\.mp4$/, '')), { recursive: true, force: true }),
    );
  }
}
