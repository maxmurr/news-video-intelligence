import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { IFramesRepository } from '@/src/application/repositories/frames.repository.interface';
import type { IHeadlinesRepository } from '@/src/application/repositories/headlines.repository.interface';
import type { IRunsRepository } from '@/src/application/repositories/runs.repository.interface';
import type { IStoriesRepository } from '@/src/application/repositories/stories.repository.interface';
import type { ITranscriptsRepository } from '@/src/application/repositories/transcripts.repository.interface';
import type { ICrashReporterService } from '@/src/application/services/crash-reporter.service.interface';
import type { IFileStorageService } from '@/src/application/services/file-storage.service.interface';
import type { IFramePickerService } from '@/src/application/services/frame-picker.service.interface';
import type { IHeadlineWriterService } from '@/src/application/services/headline-writer.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IMediaProcessorService } from '@/src/application/services/media-processor.service.interface';
import type { IRunStatusService } from '@/src/application/services/run-status.service.interface';
import type { IStorySegmentationService } from '@/src/application/services/story-segmentation.service.interface';
import type { ITranscriptionService } from '@/src/application/services/transcription.service.interface';
import type { ICreateBroadcastUseCase } from '@/src/application/use-cases/broadcasts/create-broadcast.use-case';
import type { IDeleteBroadcastUseCase } from '@/src/application/use-cases/broadcasts/delete-broadcast.use-case';
import type { IGetBroadcastByFilenameUseCase } from '@/src/application/use-cases/broadcasts/get-broadcast-by-filename.use-case';
import type { IGetBroadcastDetailUseCase } from '@/src/application/use-cases/broadcasts/get-broadcast-detail.use-case';
import type { IGetBroadcastSummariesUseCase } from '@/src/application/use-cases/broadcasts/get-broadcast-summaries.use-case';
import type { IGetChatContextUseCase } from '@/src/application/use-cases/broadcasts/get-chat-context.use-case';
import type { IDetectStoriesUseCase } from '@/src/application/use-cases/pipeline/detect-stories.use-case';
import type { IExtractFramesUseCase } from '@/src/application/use-cases/pipeline/extract-frames.use-case';
import type { IGenerateHeadlinesUseCase } from '@/src/application/use-cases/pipeline/generate-headlines.use-case';
import type { ITranscribeBroadcastUseCase } from '@/src/application/use-cases/pipeline/transcribe-broadcast.use-case';
import type { ISaveRunUseCase } from '@/src/application/use-cases/runs/save-run.use-case';
import type { ICreateBroadcastController } from '@/src/interface-adapters/controllers/broadcasts/create-broadcast.controller';
import type { IDeleteBroadcastController } from '@/src/interface-adapters/controllers/broadcasts/delete-broadcast.controller';
import type { IGetBroadcastByFilenameController } from '@/src/interface-adapters/controllers/broadcasts/get-broadcast-by-filename.controller';
import type { IGetBroadcastDetailController } from '@/src/interface-adapters/controllers/broadcasts/get-broadcast-detail.controller';
import type { IGetBroadcastSummariesController } from '@/src/interface-adapters/controllers/broadcasts/get-broadcast-summaries.controller';
import type { IGetChatContextController } from '@/src/interface-adapters/controllers/broadcasts/get-chat-context.controller';
import type { IDetectStoriesController } from '@/src/interface-adapters/controllers/pipeline/detect-stories.controller';
import type { IExtractFramesController } from '@/src/interface-adapters/controllers/pipeline/extract-frames.controller';
import type { IGenerateHeadlinesController } from '@/src/interface-adapters/controllers/pipeline/generate-headlines.controller';
import type { ITranscribeBroadcastController } from '@/src/interface-adapters/controllers/pipeline/transcribe-broadcast.controller';
import type { ISaveRunController } from '@/src/interface-adapters/controllers/runs/save-run.controller';

export const DI_SYMBOLS = {
  // Services
  IInstrumentationService: Symbol.for('IInstrumentationService'),
  ICrashReporterService: Symbol.for('ICrashReporterService'),
  IFileStorageService: Symbol.for('IFileStorageService'),
  IMediaProcessorService: Symbol.for('IMediaProcessorService'),
  ITranscriptionService: Symbol.for('ITranscriptionService'),
  IStorySegmentationService: Symbol.for('IStorySegmentationService'),
  IHeadlineWriterService: Symbol.for('IHeadlineWriterService'),
  IFramePickerService: Symbol.for('IFramePickerService'),
  IRunStatusService: Symbol.for('IRunStatusService'),

  // Repositories
  IBroadcastsRepository: Symbol.for('IBroadcastsRepository'),
  ITranscriptsRepository: Symbol.for('ITranscriptsRepository'),
  IStoriesRepository: Symbol.for('IStoriesRepository'),
  IHeadlinesRepository: Symbol.for('IHeadlinesRepository'),
  IFramesRepository: Symbol.for('IFramesRepository'),
  IRunsRepository: Symbol.for('IRunsRepository'),

  // Use Cases — broadcasts
  ICreateBroadcastUseCase: Symbol.for('ICreateBroadcastUseCase'),
  IGetBroadcastByFilenameUseCase: Symbol.for('IGetBroadcastByFilenameUseCase'),
  IDeleteBroadcastUseCase: Symbol.for('IDeleteBroadcastUseCase'),
  IGetBroadcastDetailUseCase: Symbol.for('IGetBroadcastDetailUseCase'),
  IGetBroadcastSummariesUseCase: Symbol.for('IGetBroadcastSummariesUseCase'),
  IGetChatContextUseCase: Symbol.for('IGetChatContextUseCase'),

  // Use Cases — pipeline stages
  ITranscribeBroadcastUseCase: Symbol.for('ITranscribeBroadcastUseCase'),
  IDetectStoriesUseCase: Symbol.for('IDetectStoriesUseCase'),
  IGenerateHeadlinesUseCase: Symbol.for('IGenerateHeadlinesUseCase'),
  IExtractFramesUseCase: Symbol.for('IExtractFramesUseCase'),

  // Use Cases — runs
  ISaveRunUseCase: Symbol.for('ISaveRunUseCase'),

  // Controllers — broadcasts
  ICreateBroadcastController: Symbol.for('ICreateBroadcastController'),
  IGetBroadcastByFilenameController: Symbol.for('IGetBroadcastByFilenameController'),
  IDeleteBroadcastController: Symbol.for('IDeleteBroadcastController'),
  IGetBroadcastDetailController: Symbol.for('IGetBroadcastDetailController'),
  IGetBroadcastSummariesController: Symbol.for('IGetBroadcastSummariesController'),
  IGetChatContextController: Symbol.for('IGetChatContextController'),

  // Controllers — pipeline stages
  ITranscribeBroadcastController: Symbol.for('ITranscribeBroadcastController'),
  IDetectStoriesController: Symbol.for('IDetectStoriesController'),
  IGenerateHeadlinesController: Symbol.for('IGenerateHeadlinesController'),
  IExtractFramesController: Symbol.for('IExtractFramesController'),

  // Controllers — runs
  ISaveRunController: Symbol.for('ISaveRunController'),
};

export interface DI_RETURN_TYPES {
  // Services
  IInstrumentationService: IInstrumentationService;
  ICrashReporterService: ICrashReporterService;
  IFileStorageService: IFileStorageService;
  IMediaProcessorService: IMediaProcessorService;
  ITranscriptionService: ITranscriptionService;
  IStorySegmentationService: IStorySegmentationService;
  IHeadlineWriterService: IHeadlineWriterService;
  IFramePickerService: IFramePickerService;
  IRunStatusService: IRunStatusService;

  // Repositories
  IBroadcastsRepository: IBroadcastsRepository;
  ITranscriptsRepository: ITranscriptsRepository;
  IStoriesRepository: IStoriesRepository;
  IHeadlinesRepository: IHeadlinesRepository;
  IFramesRepository: IFramesRepository;
  IRunsRepository: IRunsRepository;

  // Use Cases — broadcasts
  ICreateBroadcastUseCase: ICreateBroadcastUseCase;
  IGetBroadcastByFilenameUseCase: IGetBroadcastByFilenameUseCase;
  IDeleteBroadcastUseCase: IDeleteBroadcastUseCase;
  IGetBroadcastDetailUseCase: IGetBroadcastDetailUseCase;
  IGetBroadcastSummariesUseCase: IGetBroadcastSummariesUseCase;
  IGetChatContextUseCase: IGetChatContextUseCase;

  // Use Cases — pipeline stages
  ITranscribeBroadcastUseCase: ITranscribeBroadcastUseCase;
  IDetectStoriesUseCase: IDetectStoriesUseCase;
  IGenerateHeadlinesUseCase: IGenerateHeadlinesUseCase;
  IExtractFramesUseCase: IExtractFramesUseCase;

  // Use Cases — runs
  ISaveRunUseCase: ISaveRunUseCase;

  // Controllers — broadcasts
  ICreateBroadcastController: ICreateBroadcastController;
  IGetBroadcastByFilenameController: IGetBroadcastByFilenameController;
  IDeleteBroadcastController: IDeleteBroadcastController;
  IGetBroadcastDetailController: IGetBroadcastDetailController;
  IGetBroadcastSummariesController: IGetBroadcastSummariesController;
  IGetChatContextController: IGetChatContextController;

  // Controllers — pipeline stages
  ITranscribeBroadcastController: ITranscribeBroadcastController;
  IDetectStoriesController: IDetectStoriesController;
  IGenerateHeadlinesController: IGenerateHeadlinesController;
  IExtractFramesController: IExtractFramesController;

  // Controllers — runs
  ISaveRunController: ISaveRunController;
}
