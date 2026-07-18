import type { IFileStorageService } from '@/src/application/services/file-storage.service.interface';

export class MockFileStorageService implements IFileStorageService {
  private readonly deletedUploads = new Set<string>();

  async uploadExists(filename: string): Promise<boolean> {
    return !this.deletedUploads.has(filename);
  }

  async deleteUpload(filename: string): Promise<void> {
    this.deletedUploads.add(filename);
  }

  async deleteFrames(): Promise<void> {}
}
