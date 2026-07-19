/**
 * Media operations against an uploaded broadcast video, keyed by upload
 * filename. Implementations own where the binaries live and how frames are
 * served; callers only see filenames, seconds, and public URLs. Every method
 * throws NotFoundError when the upload binary is missing.
 */
export interface IMediaProcessorService {
  /** Mono speech-optimized audio track of the upload, small enough for one inline model request. */
  extractSpeechAudio(filename: string): Promise<Uint8Array>;
  durationSeconds(filename: string): Promise<number>;
  extractFrame(filename: string, atSeconds: number, frameName: string): Promise<string>;
}
