import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import { NotFoundError } from '@/src/entities/errors/common';
import type { Broadcast } from '@/src/entities/models/broadcast';

export interface StageResult<T> {
  data: T;
  cached: boolean;
}

/**
 * Stages never create the aggregate root — the upload route is the sole
 * creator. A stage running against a filename with no broadcast row is a
 * broken invocation, not a recoverable state.
 */
export async function requireBroadcastByFilename(
  broadcastsRepository: IBroadcastsRepository,
  filename: string,
): Promise<Broadcast> {
  const broadcast = await broadcastsRepository.getBroadcastByFilename(filename);
  if (!broadcast) throw new NotFoundError(`No broadcast for ${filename}. Upload it first.`);
  return broadcast;
}
