/**
 * Binary artifact storage for a broadcast: the uploaded source video and the
 * extracted frame images. Deletes are idempotent — removing artifacts that
 * were never written is a no-op, so cleanup paths never throw on partial state.
 */
export interface IFileStorageService {
  uploadExists(filename: string): Promise<boolean>;
  deleteUpload(filename: string): Promise<void>;
  deleteFrames(filename: string): Promise<void>;
}
