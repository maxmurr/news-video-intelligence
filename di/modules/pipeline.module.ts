import { createModule } from '@evyweb/ioctopus';

import { DI_SYMBOLS } from '@/di/types';
import { detectStoriesUseCase } from '@/src/application/use-cases/pipeline/detect-stories.use-case';
import { embedTranscriptUseCase } from '@/src/application/use-cases/pipeline/embed-transcript.use-case';
import { extractFramesUseCase } from '@/src/application/use-cases/pipeline/extract-frames.use-case';
import { generateHeadlinesUseCase } from '@/src/application/use-cases/pipeline/generate-headlines.use-case';
import { transcribeBroadcastUseCase } from '@/src/application/use-cases/pipeline/transcribe-broadcast.use-case';
import { EmbeddingService } from '@/src/infrastructure/services/embedding.service';
import { MockEmbeddingService } from '@/src/infrastructure/services/embedding.service.mock';
import { FramePickerService } from '@/src/infrastructure/services/frame-picker.service';
import { MockFramePickerService } from '@/src/infrastructure/services/frame-picker.service.mock';
import { HeadlineWriterService } from '@/src/infrastructure/services/headline-writer.service';
import { MockHeadlineWriterService } from '@/src/infrastructure/services/headline-writer.service.mock';
import { MediaProcessorService } from '@/src/infrastructure/services/media-processor.service';
import { MockMediaProcessorService } from '@/src/infrastructure/services/media-processor.service.mock';
import { StorySegmentationService } from '@/src/infrastructure/services/story-segmentation.service';
import { MockStorySegmentationService } from '@/src/infrastructure/services/story-segmentation.service.mock';
import { TranscriptionService } from '@/src/infrastructure/services/transcription.service';
import { MockTranscriptionService } from '@/src/infrastructure/services/transcription.service.mock';
import { detectStoriesController } from '@/src/interface-adapters/controllers/pipeline/detect-stories.controller';
import { embedTranscriptController } from '@/src/interface-adapters/controllers/pipeline/embed-transcript.controller';
import { extractFramesController } from '@/src/interface-adapters/controllers/pipeline/extract-frames.controller';
import { generateHeadlinesController } from '@/src/interface-adapters/controllers/pipeline/generate-headlines.controller';
import { transcribeBroadcastController } from '@/src/interface-adapters/controllers/pipeline/transcribe-broadcast.controller';

export function createPipelineModule() {
  const pipelineModule = createModule();

  if (process.env.NODE_ENV === 'test') {
    pipelineModule.bind(DI_SYMBOLS.IMediaProcessorService).toClass(MockMediaProcessorService);
    pipelineModule.bind(DI_SYMBOLS.ITranscriptionService).toClass(MockTranscriptionService);
    pipelineModule.bind(DI_SYMBOLS.IStorySegmentationService).toClass(MockStorySegmentationService);
    pipelineModule.bind(DI_SYMBOLS.IHeadlineWriterService).toClass(MockHeadlineWriterService);
    pipelineModule.bind(DI_SYMBOLS.IFramePickerService).toClass(MockFramePickerService);
    pipelineModule.bind(DI_SYMBOLS.IEmbeddingService).toClass(MockEmbeddingService);
  } else {
    pipelineModule
      .bind(DI_SYMBOLS.IMediaProcessorService)
      .toClass(MediaProcessorService, [DI_SYMBOLS.IInstrumentationService]);
    pipelineModule
      .bind(DI_SYMBOLS.ITranscriptionService)
      .toClass(TranscriptionService, [DI_SYMBOLS.IInstrumentationService]);
    pipelineModule
      .bind(DI_SYMBOLS.IStorySegmentationService)
      .toClass(StorySegmentationService, [DI_SYMBOLS.IInstrumentationService]);
    pipelineModule
      .bind(DI_SYMBOLS.IHeadlineWriterService)
      .toClass(HeadlineWriterService, [DI_SYMBOLS.IInstrumentationService]);
    pipelineModule
      .bind(DI_SYMBOLS.IFramePickerService)
      .toClass(FramePickerService, [DI_SYMBOLS.IInstrumentationService]);
    pipelineModule.bind(DI_SYMBOLS.IEmbeddingService).toClass(EmbeddingService, [DI_SYMBOLS.IInstrumentationService]);
  }

  pipelineModule
    .bind(DI_SYMBOLS.ITranscribeBroadcastUseCase)
    .toHigherOrderFunction(transcribeBroadcastUseCase, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IBroadcastsRepository,
      DI_SYMBOLS.ITranscriptsRepository,
      DI_SYMBOLS.IMediaProcessorService,
      DI_SYMBOLS.ITranscriptionService,
    ]);
  pipelineModule
    .bind(DI_SYMBOLS.IEmbedTranscriptUseCase)
    .toHigherOrderFunction(embedTranscriptUseCase, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IBroadcastsRepository,
      DI_SYMBOLS.ITranscriptsRepository,
      DI_SYMBOLS.ITranscriptChunksRepository,
      DI_SYMBOLS.IEmbeddingService,
    ]);
  pipelineModule
    .bind(DI_SYMBOLS.IDetectStoriesUseCase)
    .toHigherOrderFunction(detectStoriesUseCase, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IBroadcastsRepository,
      DI_SYMBOLS.ITranscriptsRepository,
      DI_SYMBOLS.IStoriesRepository,
      DI_SYMBOLS.IStorySegmentationService,
      DI_SYMBOLS.IMediaProcessorService,
    ]);
  pipelineModule
    .bind(DI_SYMBOLS.IGenerateHeadlinesUseCase)
    .toHigherOrderFunction(generateHeadlinesUseCase, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IBroadcastsRepository,
      DI_SYMBOLS.ITranscriptsRepository,
      DI_SYMBOLS.IStoriesRepository,
      DI_SYMBOLS.IHeadlinesRepository,
      DI_SYMBOLS.IHeadlineWriterService,
    ]);
  pipelineModule
    .bind(DI_SYMBOLS.IExtractFramesUseCase)
    .toHigherOrderFunction(extractFramesUseCase, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IBroadcastsRepository,
      DI_SYMBOLS.IHeadlinesRepository,
      DI_SYMBOLS.IFramesRepository,
      DI_SYMBOLS.IMediaProcessorService,
      DI_SYMBOLS.IFramePickerService,
    ]);

  pipelineModule
    .bind(DI_SYMBOLS.ITranscribeBroadcastController)
    .toHigherOrderFunction(transcribeBroadcastController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.ITranscribeBroadcastUseCase,
    ]);
  pipelineModule
    .bind(DI_SYMBOLS.IEmbedTranscriptController)
    .toHigherOrderFunction(embedTranscriptController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IEmbedTranscriptUseCase,
    ]);
  pipelineModule
    .bind(DI_SYMBOLS.IDetectStoriesController)
    .toHigherOrderFunction(detectStoriesController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IDetectStoriesUseCase,
    ]);
  pipelineModule
    .bind(DI_SYMBOLS.IGenerateHeadlinesController)
    .toHigherOrderFunction(generateHeadlinesController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IGenerateHeadlinesUseCase,
    ]);
  pipelineModule
    .bind(DI_SYMBOLS.IExtractFramesController)
    .toHigherOrderFunction(extractFramesController, [
      DI_SYMBOLS.IInstrumentationService,
      DI_SYMBOLS.IExtractFramesUseCase,
    ]);

  return pipelineModule;
}
