import { createModule } from '@evyweb/ioctopus';

import { DI_SYMBOLS } from '@/di/types';
import { FileStorageService } from '@/src/infrastructure/services/file-storage.service';
import { MockFileStorageService } from '@/src/infrastructure/services/file-storage.service.mock';

export function createStorageModule() {
  const storageModule = createModule();

  if (process.env.NODE_ENV === 'test') {
    storageModule.bind(DI_SYMBOLS.IFileStorageService).toClass(MockFileStorageService);
  } else {
    storageModule
      .bind(DI_SYMBOLS.IFileStorageService)
      .toClass(FileStorageService, [DI_SYMBOLS.IInstrumentationService]);
  }

  return storageModule;
}
