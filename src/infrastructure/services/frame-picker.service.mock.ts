import type { FramePick, IFramePickerService } from '@/src/application/services/frame-picker.service.interface';
import type { Headline } from '@/src/entities/models/headline';

export class MockFramePickerService implements IFramePickerService {
  async pickFrames(_filename: string, headlines: Headline[]): Promise<FramePick[]> {
    return headlines.map(headline => ({
      frameTime: headline.startTime,
      reason: `Representative footage for "${headline.headline}".`,
    }));
  }
}
