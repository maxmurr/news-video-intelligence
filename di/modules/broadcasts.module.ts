import { createModule } from '@evyweb/ioctopus';

import { DI_SYMBOLS } from '@/di/types';
import { createBroadcastUseCase } from '@/src/application/use-cases/broadcasts/create-broadcast.use-case';
import { deleteBroadcastUseCase } from '@/src/application/use-cases/broadcasts/delete-broadcast.use-case';
import { getBroadcastByFilenameUseCase } from '@/src/application/use-cases/broadcasts/get-broadcast-by-filename.use-case';
import { getBroadcastByIdUseCase } from '@/src/application/use-cases/broadcasts/get-broadcast-by-id.use-case';
import { getBroadcastDetailUseCase } from '@/src/application/use-cases/broadcasts/get-broadcast-detail.use-case';
import { getBroadcastSummariesUseCase } from '@/src/application/use-cases/broadcasts/get-broadcast-summaries.use-case';
import { getBroadcastTitlesUseCase } from '@/src/application/use-cases/broadcasts/get-broadcast-titles.use-case';
import { getChatContextUseCase } from '@/src/application/use-cases/broadcasts/get-chat-context.use-case';
import { searchLibraryUseCase } from '@/src/application/use-cases/broadcasts/search-library.use-case';
import { BroadcastsRepository } from '@/src/infrastructure/repositories/broadcasts.repository';
import { MockBroadcastsRepository } from '@/src/infrastructure/repositories/broadcasts.repository.mock';
import { RerankService } from '@/src/infrastructure/services/rerank.service';
import { MockRerankService } from '@/src/infrastructure/services/rerank.service.mock';
import { createBroadcastController } from '@/src/interface-adapters/controllers/broadcasts/create-broadcast.controller';
import { deleteBroadcastController } from '@/src/interface-adapters/controllers/broadcasts/delete-broadcast.controller';
import { getBroadcastByFilenameController } from '@/src/interface-adapters/controllers/broadcasts/get-broadcast-by-filename.controller';
import { getBroadcastByIdController } from '@/src/interface-adapters/controllers/broadcasts/get-broadcast-by-id.controller';
import { getBroadcastDetailController } from '@/src/interface-adapters/controllers/broadcasts/get-broadcast-detail.controller';
import { getBroadcastSummariesController } from '@/src/interface-adapters/controllers/broadcasts/get-broadcast-summaries.controller';
import { getBroadcastTitlesController } from '@/src/interface-adapters/controllers/broadcasts/get-broadcast-titles.controller';
import { getChatContextController } from '@/src/interface-adapters/controllers/broadcasts/get-chat-context.controller';
import { searchLibraryController } from '@/src/interface-adapters/controllers/broadcasts/search-library.controller';

export function createBroadcastsModule() {
  const broadcastsModule = createModule();

  if (process.env.NODE_ENV === 'test') {
    broadcastsModule.bind(DI_SYMBOLS.IBroadcastsRepository).toClass(MockBroadcastsRepository);
    broadcastsModule.bind(DI_SYMBOLS.IRerankService).toClass(MockRerankService);
  } else {
    broadcastsModule
      .bind(DI_SYMBOLS.IBroadcastsRepository)
      .toClass(BroadcastsRepository, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ICrashReporterService]);
    broadcastsModule.bind(DI_SYMBOLS.IRerankService).toClass(RerankService, [DI_SYMBOLS.IInstrumentationService]);
  }

  broadcastsModule
    .bind(DI_SYMBOLS.ICreateBroadcastUseCase)
    .toHigherOrderFunction(createBroadcastUseCase, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IBroadcastsRepository,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.IGetBroadcastByFilenameUseCase)
    .toHigherOrderFunction(getBroadcastByFilenameUseCase, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IBroadcastsRepository,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.IGetBroadcastByIdUseCase)
    .toHigherOrderFunction(getBroadcastByIdUseCase, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IBroadcastsRepository,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.IDeleteBroadcastUseCase)
    .toHigherOrderFunction(deleteBroadcastUseCase, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IBroadcastsRepository,
      DI_SYMBOLS.IFileStorageService,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.IGetBroadcastDetailUseCase)
    .toHigherOrderFunction(getBroadcastDetailUseCase, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IBroadcastsRepository,
      DI_SYMBOLS.IRunsRepository,
      DI_SYMBOLS.ITranscriptsRepository,
      DI_SYMBOLS.IStoriesRepository,
      DI_SYMBOLS.IHeadlinesRepository,
      DI_SYMBOLS.IFramesRepository,
      DI_SYMBOLS.IRunStatusService,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.IGetBroadcastSummariesUseCase)
    .toHigherOrderFunction(getBroadcastSummariesUseCase, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IBroadcastsRepository,
      DI_SYMBOLS.ITranscriptsRepository,
      DI_SYMBOLS.IStoriesRepository,
      DI_SYMBOLS.IHeadlinesRepository,
      DI_SYMBOLS.IFramesRepository,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.IGetBroadcastTitlesUseCase)
    .toHigherOrderFunction(getBroadcastTitlesUseCase, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IHeadlinesRepository,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.IGetChatContextUseCase)
    .toHigherOrderFunction(getChatContextUseCase, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IBroadcastsRepository,
      DI_SYMBOLS.ITranscriptsRepository,
      DI_SYMBOLS.IHeadlinesRepository,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.ISearchLibraryUseCase)
    .toHigherOrderFunction(searchLibraryUseCase, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.ITranscriptChunksRepository,
      DI_SYMBOLS.IEmbeddingService,
      DI_SYMBOLS.IRerankService,
    ]);

  broadcastsModule
    .bind(DI_SYMBOLS.ICreateBroadcastController)
    .toHigherOrderFunction(createBroadcastController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.ICreateBroadcastUseCase,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.IGetBroadcastByFilenameController)
    .toHigherOrderFunction(getBroadcastByFilenameController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IGetBroadcastByFilenameUseCase,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.IGetBroadcastByIdController)
    .toHigherOrderFunction(getBroadcastByIdController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IGetBroadcastByIdUseCase,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.IDeleteBroadcastController)
    .toHigherOrderFunction(deleteBroadcastController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IDeleteBroadcastUseCase,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.IGetBroadcastDetailController)
    .toHigherOrderFunction(getBroadcastDetailController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IGetBroadcastDetailUseCase,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.IGetBroadcastSummariesController)
    .toHigherOrderFunction(getBroadcastSummariesController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IGetBroadcastSummariesUseCase,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.IGetBroadcastTitlesController)
    .toHigherOrderFunction(getBroadcastTitlesController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IGetBroadcastTitlesUseCase,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.IGetChatContextController)
    .toHigherOrderFunction(getChatContextController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IGetChatContextUseCase,
    ]);
  broadcastsModule
    .bind(DI_SYMBOLS.ISearchLibraryController)
    .toHigherOrderFunction(searchLibraryController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.ISearchLibraryUseCase,
    ]);

  return broadcastsModule;
}
