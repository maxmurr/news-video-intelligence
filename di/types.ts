import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { IFramesRepository } from '@/src/application/repositories/frames.repository.interface';
import type { IHeadlinesRepository } from '@/src/application/repositories/headlines.repository.interface';
import type { IRunsRepository } from '@/src/application/repositories/runs.repository.interface';
import type { IStoriesRepository } from '@/src/application/repositories/stories.repository.interface';
import type { ITranscriptsRepository } from '@/src/application/repositories/transcripts.repository.interface';
import type { ICrashReporterService } from '@/src/application/services/crash-reporter.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ITransactionManagerService } from '@/src/application/services/transaction-manager.service.interface';
import type { ICreateBroadcastUseCase } from '@/src/application/use-cases/broadcasts/create-broadcast.use-case';
import type { IDeleteBroadcastUseCase } from '@/src/application/use-cases/broadcasts/delete-broadcast.use-case';
import type { IGetBroadcastByFilenameUseCase } from '@/src/application/use-cases/broadcasts/get-broadcast-by-filename.use-case';
import type { IGetBroadcastUseCase } from '@/src/application/use-cases/broadcasts/get-broadcast.use-case';
import type { IGetBroadcastsUseCase } from '@/src/application/use-cases/broadcasts/get-broadcasts.use-case';
import type { IGetFramesUseCase } from '@/src/application/use-cases/frames/get-frames.use-case';
import type { IReplaceFramesUseCase } from '@/src/application/use-cases/frames/replace-frames.use-case';
import type { IGetHeadlinesUseCase } from '@/src/application/use-cases/headlines/get-headlines.use-case';
import type { IReplaceHeadlinesUseCase } from '@/src/application/use-cases/headlines/replace-headlines.use-case';
import type { IGetRunUseCase } from '@/src/application/use-cases/runs/get-run.use-case';
import type { ISaveRunUseCase } from '@/src/application/use-cases/runs/save-run.use-case';
import type { IGetStoriesUseCase } from '@/src/application/use-cases/stories/get-stories.use-case';
import type { IReplaceStoriesUseCase } from '@/src/application/use-cases/stories/replace-stories.use-case';
import type { IGetTranscriptUseCase } from '@/src/application/use-cases/transcripts/get-transcript.use-case';
import type { ISaveTranscriptUseCase } from '@/src/application/use-cases/transcripts/save-transcript.use-case';
import type { ICreateBroadcastController } from '@/src/interface-adapters/controllers/broadcasts/create-broadcast.controller';
import type { IDeleteBroadcastController } from '@/src/interface-adapters/controllers/broadcasts/delete-broadcast.controller';
import type { IGetBroadcastByFilenameController } from '@/src/interface-adapters/controllers/broadcasts/get-broadcast-by-filename.controller';
import type { IGetBroadcastController } from '@/src/interface-adapters/controllers/broadcasts/get-broadcast.controller';
import type { IGetBroadcastsController } from '@/src/interface-adapters/controllers/broadcasts/get-broadcasts.controller';
import type { IGetFramesController } from '@/src/interface-adapters/controllers/frames/get-frames.controller';
import type { IReplaceFramesController } from '@/src/interface-adapters/controllers/frames/replace-frames.controller';
import type { IGetHeadlinesController } from '@/src/interface-adapters/controllers/headlines/get-headlines.controller';
import type { IReplaceHeadlinesController } from '@/src/interface-adapters/controllers/headlines/replace-headlines.controller';
import type { IGetRunController } from '@/src/interface-adapters/controllers/runs/get-run.controller';
import type { ISaveRunController } from '@/src/interface-adapters/controllers/runs/save-run.controller';
import type { IGetStoriesController } from '@/src/interface-adapters/controllers/stories/get-stories.controller';
import type { IReplaceStoriesController } from '@/src/interface-adapters/controllers/stories/replace-stories.controller';
import type { IGetTranscriptController } from '@/src/interface-adapters/controllers/transcripts/get-transcript.controller';
import type { ISaveTranscriptController } from '@/src/interface-adapters/controllers/transcripts/save-transcript.controller';

export const DI_SYMBOLS = {
  // Services
  ITransactionManagerService: Symbol.for('ITransactionManagerService'),
  IInstrumentationService: Symbol.for('IInstrumentationService'),
  ICrashReporterService: Symbol.for('ICrashReporterService'),

  // Repositories
  IBroadcastsRepository: Symbol.for('IBroadcastsRepository'),
  ITranscriptsRepository: Symbol.for('ITranscriptsRepository'),
  IStoriesRepository: Symbol.for('IStoriesRepository'),
  IHeadlinesRepository: Symbol.for('IHeadlinesRepository'),
  IFramesRepository: Symbol.for('IFramesRepository'),
  IRunsRepository: Symbol.for('IRunsRepository'),

  // Use Cases — broadcasts
  ICreateBroadcastUseCase: Symbol.for('ICreateBroadcastUseCase'),
  IGetBroadcastUseCase: Symbol.for('IGetBroadcastUseCase'),
  IGetBroadcastByFilenameUseCase: Symbol.for('IGetBroadcastByFilenameUseCase'),
  IGetBroadcastsUseCase: Symbol.for('IGetBroadcastsUseCase'),
  IDeleteBroadcastUseCase: Symbol.for('IDeleteBroadcastUseCase'),

  // Use Cases — transcripts
  ISaveTranscriptUseCase: Symbol.for('ISaveTranscriptUseCase'),
  IGetTranscriptUseCase: Symbol.for('IGetTranscriptUseCase'),

  // Use Cases — stories
  IReplaceStoriesUseCase: Symbol.for('IReplaceStoriesUseCase'),
  IGetStoriesUseCase: Symbol.for('IGetStoriesUseCase'),

  // Use Cases — headlines
  IReplaceHeadlinesUseCase: Symbol.for('IReplaceHeadlinesUseCase'),
  IGetHeadlinesUseCase: Symbol.for('IGetHeadlinesUseCase'),

  // Use Cases — frames
  IReplaceFramesUseCase: Symbol.for('IReplaceFramesUseCase'),
  IGetFramesUseCase: Symbol.for('IGetFramesUseCase'),

  // Use Cases — runs
  ISaveRunUseCase: Symbol.for('ISaveRunUseCase'),
  IGetRunUseCase: Symbol.for('IGetRunUseCase'),

  // Controllers — broadcasts
  ICreateBroadcastController: Symbol.for('ICreateBroadcastController'),
  IGetBroadcastController: Symbol.for('IGetBroadcastController'),
  IGetBroadcastByFilenameController: Symbol.for('IGetBroadcastByFilenameController'),
  IGetBroadcastsController: Symbol.for('IGetBroadcastsController'),
  IDeleteBroadcastController: Symbol.for('IDeleteBroadcastController'),

  // Controllers — transcripts
  ISaveTranscriptController: Symbol.for('ISaveTranscriptController'),
  IGetTranscriptController: Symbol.for('IGetTranscriptController'),

  // Controllers — stories
  IReplaceStoriesController: Symbol.for('IReplaceStoriesController'),
  IGetStoriesController: Symbol.for('IGetStoriesController'),

  // Controllers — headlines
  IReplaceHeadlinesController: Symbol.for('IReplaceHeadlinesController'),
  IGetHeadlinesController: Symbol.for('IGetHeadlinesController'),

  // Controllers — frames
  IReplaceFramesController: Symbol.for('IReplaceFramesController'),
  IGetFramesController: Symbol.for('IGetFramesController'),

  // Controllers — runs
  ISaveRunController: Symbol.for('ISaveRunController'),
  IGetRunController: Symbol.for('IGetRunController'),
};

export interface DI_RETURN_TYPES {
  // Services
  ITransactionManagerService: ITransactionManagerService;
  IInstrumentationService: IInstrumentationService;
  ICrashReporterService: ICrashReporterService;

  // Repositories
  IBroadcastsRepository: IBroadcastsRepository;
  ITranscriptsRepository: ITranscriptsRepository;
  IStoriesRepository: IStoriesRepository;
  IHeadlinesRepository: IHeadlinesRepository;
  IFramesRepository: IFramesRepository;
  IRunsRepository: IRunsRepository;

  // Use Cases — broadcasts
  ICreateBroadcastUseCase: ICreateBroadcastUseCase;
  IGetBroadcastUseCase: IGetBroadcastUseCase;
  IGetBroadcastByFilenameUseCase: IGetBroadcastByFilenameUseCase;
  IGetBroadcastsUseCase: IGetBroadcastsUseCase;
  IDeleteBroadcastUseCase: IDeleteBroadcastUseCase;

  // Use Cases — transcripts
  ISaveTranscriptUseCase: ISaveTranscriptUseCase;
  IGetTranscriptUseCase: IGetTranscriptUseCase;

  // Use Cases — stories
  IReplaceStoriesUseCase: IReplaceStoriesUseCase;
  IGetStoriesUseCase: IGetStoriesUseCase;

  // Use Cases — headlines
  IReplaceHeadlinesUseCase: IReplaceHeadlinesUseCase;
  IGetHeadlinesUseCase: IGetHeadlinesUseCase;

  // Use Cases — frames
  IReplaceFramesUseCase: IReplaceFramesUseCase;
  IGetFramesUseCase: IGetFramesUseCase;

  // Use Cases — runs
  ISaveRunUseCase: ISaveRunUseCase;
  IGetRunUseCase: IGetRunUseCase;

  // Controllers — broadcasts
  ICreateBroadcastController: ICreateBroadcastController;
  IGetBroadcastController: IGetBroadcastController;
  IGetBroadcastByFilenameController: IGetBroadcastByFilenameController;
  IGetBroadcastsController: IGetBroadcastsController;
  IDeleteBroadcastController: IDeleteBroadcastController;

  // Controllers — transcripts
  ISaveTranscriptController: ISaveTranscriptController;
  IGetTranscriptController: IGetTranscriptController;

  // Controllers — stories
  IReplaceStoriesController: IReplaceStoriesController;
  IGetStoriesController: IGetStoriesController;

  // Controllers — headlines
  IReplaceHeadlinesController: IReplaceHeadlinesController;
  IGetHeadlinesController: IGetHeadlinesController;

  // Controllers — frames
  IReplaceFramesController: IReplaceFramesController;
  IGetFramesController: IGetFramesController;

  // Controllers — runs
  ISaveRunController: ISaveRunController;
  IGetRunController: IGetRunController;
}
