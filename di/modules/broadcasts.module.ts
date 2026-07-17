import { createModule } from '@evyweb/ioctopus';

import { DI_SYMBOLS } from '@/di/types';
import { createBroadcastUseCase } from '@/src/application/use-cases/broadcasts/create-broadcast.use-case';
import { deleteBroadcastUseCase } from '@/src/application/use-cases/broadcasts/delete-broadcast.use-case';
import { getBroadcastByFilenameUseCase } from '@/src/application/use-cases/broadcasts/get-broadcast-by-filename.use-case';
import { getBroadcastUseCase } from '@/src/application/use-cases/broadcasts/get-broadcast.use-case';
import { getBroadcastsUseCase } from '@/src/application/use-cases/broadcasts/get-broadcasts.use-case';
import { BroadcastsRepository } from '@/src/infrastructure/repositories/broadcasts.repository';
import { MockBroadcastsRepository } from '@/src/infrastructure/repositories/broadcasts.repository.mock';
import { createBroadcastController } from '@/src/interface-adapters/controllers/broadcasts/create-broadcast.controller';
import { deleteBroadcastController } from '@/src/interface-adapters/controllers/broadcasts/delete-broadcast.controller';
import { getBroadcastByFilenameController } from '@/src/interface-adapters/controllers/broadcasts/get-broadcast-by-filename.controller';
import { getBroadcastController } from '@/src/interface-adapters/controllers/broadcasts/get-broadcast.controller';
import { getBroadcastsController } from '@/src/interface-adapters/controllers/broadcasts/get-broadcasts.controller';

export function createBroadcastsModule() {
  const broadcastsModule = createModule();

  if (process.env.NODE_ENV === 'test') {
    broadcastsModule.bind(DI_SYMBOLS.IBroadcastsRepository).toClass(MockBroadcastsRepository);
  } else {
    broadcastsModule
      .bind(DI_SYMBOLS.IBroadcastsRepository)
      .toClass(BroadcastsRepository, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICrashReporterService]);
  }

  broadcastsModule
    .bind(DI_SYMBOLS.ICreateBroadcastUseCase)
    .toHigherOrderFunction(createBroadcastUseCase, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IBroadcastsRepository,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.IGetBroadcastUseCase)
    .toHigherOrderFunction(getBroadcastUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IBroadcastsRepository]);
  broadcastsModule
    .bind(DI_SYMBOLS.IGetBroadcastByFilenameUseCase)
    .toHigherOrderFunction(getBroadcastByFilenameUseCase, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IBroadcastsRepository,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.IGetBroadcastsUseCase)
    .toHigherOrderFunction(getBroadcastsUseCase, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IBroadcastsRepository,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.IDeleteBroadcastUseCase)
    .toHigherOrderFunction(deleteBroadcastUseCase, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IBroadcastsRepository,
    ]);

  broadcastsModule
    .bind(DI_SYMBOLS.ICreateBroadcastController)
    .toHigherOrderFunction(createBroadcastController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.ICreateBroadcastUseCase,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.IGetBroadcastController)
    .toHigherOrderFunction(getBroadcastController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IGetBroadcastUseCase,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.IGetBroadcastByFilenameController)
    .toHigherOrderFunction(getBroadcastByFilenameController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IGetBroadcastByFilenameUseCase,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.IGetBroadcastsController)
    .toHigherOrderFunction(getBroadcastsController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IGetBroadcastsUseCase,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.IDeleteBroadcastController)
    .toHigherOrderFunction(deleteBroadcastController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IDeleteBroadcastUseCase,
    ]);

  return broadcastsModule;
}
