import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

import { FRAMES_DIR, UPLOADS_DIR } from '@/lib/artifacts';
import { createFramePreview, extractFrame, extractSpeechAudio, videoDurationSeconds } from '@/lib/video';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IMediaProcessorService } from '@/src/application/services/media-processor.service.interface';
import { NotFoundError } from '@/src/entities/errors/common';

export class MediaProcessorService implements IMediaProcessorService {
  constructor(private readonly instrumentationService: IInstrumentationService) {}

  private async resolveUpload(filename: string): Promise<string> {
    const videoPath = path.join(UPLOADS_DIR, filename);
    try {
      await stat(videoPath);
    } catch {
      throw new NotFoundError(`File not found: ${filename}`);
    }
    return videoPath;
  }

  async extractSpeechAudio(filename: string): Promise<Uint8Array> {
    return this.instrumentationService.startSpan(
      { name: 'MediaProcessorService > extractSpeechAudio', op: 'function' },
      async () => extractSpeechAudio(await this.resolveUpload(filename)),
    );
  }

  async durationSeconds(filename: string): Promise<number> {
    return this.instrumentationService.startSpan(
      { name: 'MediaProcessorService > durationSeconds', op: 'function' },
      async () => videoDurationSeconds(await this.resolveUpload(filename)),
    );
  }

  /** Small downscaled proxy of the video for model calls that watch the footage. */
  async createFramePreview(filename: string): Promise<Uint8Array> {
    return this.instrumentationService.startSpan(
      { name: 'MediaProcessorService > createFramePreview', op: 'function' },
      async () => createFramePreview(await this.resolveUpload(filename)),
    );
  }

  async extractFrame(filename: string, atSeconds: number, frameName: string): Promise<string> {
    return this.instrumentationService.startSpan(
      { name: 'MediaProcessorService > extractFrame', op: 'function' },
      async () => {
        const videoPath = await this.resolveUpload(filename);
        const baseName = filename.replace(/\.mp4$/, '');
        const outputDir = path.join(FRAMES_DIR, baseName);
        await mkdir(outputDir, { recursive: true });
        await extractFrame(videoPath, atSeconds, path.join(outputDir, frameName));
        return `/frames/${baseName}/${frameName}`;
      },
    );
  }
}
