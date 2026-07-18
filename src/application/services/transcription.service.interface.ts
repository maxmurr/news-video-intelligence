/**
 * Speech-to-text over an extracted audio track. Returns the raw model output;
 * normalization and validation of the timestamp grammar are the use case's
 * business rules, not the transcription engine's.
 */
export interface ITranscriptionService {
  transcribeAudio(audio: Uint8Array): Promise<string>;
}
