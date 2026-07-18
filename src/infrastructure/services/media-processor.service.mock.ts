import type { IMediaProcessorService } from '@/src/application/services/media-processor.service.interface';

export class MockMediaProcessorService implements IMediaProcessorService {
  async extractSpeechAudio(): Promise<Uint8Array> {
    return new Uint8Array([0]);
  }

  async durationSeconds(): Promise<number> {
    return 600;
  }

  async extractFrame(filename: string, _atSeconds: number, frameName: string): Promise<string> {
    return `frames/${filename.replace(/\.mp4$/, '')}/${frameName}`;
  }
}
