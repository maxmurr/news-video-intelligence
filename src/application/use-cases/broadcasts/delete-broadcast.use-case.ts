import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import type { IFileStorageService } from '@/src/application/services/file-storage.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import { NotFoundError } from '@/src/entities/errors/common';

export type IDeleteBroadcastUseCase = ReturnType<typeof deleteBroadcastUseCase>;

/**
 * Removes a broadcast and everything derived from it: the row (child rows
 * cascade in the database) plus the binaries on disk — the uploaded video and
 * the extracted frames. The row goes first; if file cleanup fails the
 * broadcast is already gone from every listing and the orphaned binaries are
 * harmless leftovers, whereas the reverse order could leave a listed
 * broadcast whose video no longer exists.
 */
export const deleteBroadcastUseCase =
  (
    instrumentationService: IInstrumentationService,
    broadcastsRepository: IBroadcastsRepository,
    fileStorageService: IFileStorageService,
  ) =>
  (id: string): Promise<void> => {
    return instrumentationService.startSpan({ name: 'deleteBroadcast Use Case', op: 'function' }, async () => {
      const broadcast = await broadcastsRepository.getBroadcast(id);
      if (!broadcast) throw new NotFoundError('Broadcast not found');

      await broadcastsRepository.deleteBroadcast(id);
      await Promise.all([
        fileStorageService.deleteUpload(broadcast.filename),
        fileStorageService.deleteFrames(broadcast.filename),
      ]);
    });
  };
