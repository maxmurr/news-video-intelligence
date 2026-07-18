import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import { NotFoundError } from '@/src/entities/errors/common';
import type { Broadcast } from '@/src/entities/models/broadcast';

export interface StageResult<T> {
  data: T;
  cached: boolean;
}

/**
 * Stages never create the aggregate root — the upload route is the sole
 * creator. A stage running against an id with no broadcast row is a broken
 * invocation, not a recoverable state.
 */
export async function requireBroadcastById(
  broadcastsRepository: IBroadcastsRepository,
  broadcastId: string,
): Promise<Broadcast> {
  const broadcast = await broadcastsRepository.getBroadcast(broadcastId);
  if (!broadcast) throw new NotFoundError(`No broadcast ${broadcastId}. Upload it first.`);
  return broadcast;
}
