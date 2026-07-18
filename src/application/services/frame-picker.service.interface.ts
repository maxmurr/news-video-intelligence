import type { Headline } from '@/src/entities/models/headline';

export interface FramePick {
  /** MM:SS timestamp of the chosen frame; the use case clamps it into the story span. */
  frameTime: string;
  reason: string;
}

/**
 * Picks the single most representative video frame per story. Returns exactly
 * one pick per input headline, in the same order. Throws NotFoundError when
 * the upload binary is missing.
 */
export interface IFramePickerService {
  pickFrames(filename: string, headlines: Headline[]): Promise<FramePick[]>;
}
