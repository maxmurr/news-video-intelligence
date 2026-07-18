import { FRAMES_PREFIX, uploads } from '@/lib/files';
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
    await this.instrumentationService.startSpan(
      { name: 'FileStorageService > deleteFrames', op: 'function' },
      async () => {
        const prefix = `${FRAMES_PREFIX}/${filename.replace(/\.mp4$/, '')}/`;
        const keys: string[] = [];
        for await (const file of uploads.listAll({ prefix })) keys.push(file.key);
        if (keys.length > 0) await uploads.delete(keys);
      },
    );
  }
}
