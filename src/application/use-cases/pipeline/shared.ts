import type { IBroadcastsRepository } from '@/src/application/repositories/broadcasts.repository.interface';
import { NotFoundError } from '@/src/entities/errors/common';
import type { Broadcast } from '@/src/entities/models/broadcast';

export interface StageResult<T> {
  data: T;
  cached: boolean;
}

const inflight = new Map<string, Promise<unknown>>();

/**
 * Share one in-flight promise per key. Evalite runs stage suites in parallel
 * against the same broadcast; without this, each suite can miss the cache and
 * kick off duplicate ASR / LLM work (and one empty ASR response can fail a
 * suite while another succeeds).
 */
export function singleFlight<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = run().finally(() => {
    if (inflight.get(key) === promise) inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
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
