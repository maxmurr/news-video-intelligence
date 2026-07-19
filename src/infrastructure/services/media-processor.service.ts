import { readFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { downloadToFile, FRAMES_PREFIX, uploads } from '@/lib/files';
import { createFramePreview, extractFrame, extractSpeechAudio, videoDurationSeconds } from '@/lib/video';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IMediaProcessorService } from '@/src/application/services/media-processor.service.interface';
import { NotFoundError } from '@/src/entities/errors/common';

// ffmpeg reads from local paths, so each broadcast is pulled from the bucket to
// a temp file once and reused across the many probe/extract calls a single
// pipeline step makes — a frames step runs durationSeconds plus one extractFrame
// per story against the same video. The cached copy is evicted after an idle
// window so a long-lived worker never accumulates hundreds of MB of stale temps.
const UPLOAD_CACHE_TTL_MS = 5 * 60_000;

export class MediaProcessorService implements IMediaProcessorService {
  constructor(private readonly instrumentationService: IInstrumentationService) {}

  private readonly cache = new Map<string, { localPath: Promise<string>; timer: NodeJS.Timeout }>();

  private resolveUpload(filename: string): Promise<string> {
    const cached = this.cache.get(filename);
    if (cached) {
      cached.timer.refresh();
      return cached.localPath;
    }
    const localPath = this.downloadUpload(filename);
    const timer = setTimeout(() => void this.evict(filename), UPLOAD_CACHE_TTL_MS);
    timer.unref();
    this.cache.set(filename, { localPath, timer });
    return localPath;
  }

  private async downloadUpload(filename: string): Promise<string> {
    if (!(await uploads.exists(filename))) throw new NotFoundError(`File not found: ${filename}`);
    const dest = path.join(tmpdir(), `inv-${randomUUID()}-${filename}`);
    await downloadToFile(filename, dest);
    return dest;
  }

  private async evict(filename: string): Promise<void> {
    const entry = this.cache.get(filename);
    if (!entry) return;
    this.cache.delete(filename);
    await unlink(await entry.localPath).catch(() => {});
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
        const base = filename.replace(/\.mp4$/, '');
        const localFrame = path.join(tmpdir(), `inv-frame-${randomUUID()}-${frameName}`);
        try {
          await extractFrame(videoPath, atSeconds, localFrame);
          const key = `${FRAMES_PREFIX}/${base}/${frameName}`;
          await uploads.upload(key, await readFile(localFrame), { contentType: 'image/jpeg' });
          return key;
        } finally {
          await unlink(localFrame).catch(() => {});
        }
      },
    );
  }
}
