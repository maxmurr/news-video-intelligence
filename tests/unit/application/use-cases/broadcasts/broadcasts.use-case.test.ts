import { beforeEach, expect, it } from 'vitest';

import { getInjection } from '@/di/container';
import { NotFoundError } from '@/src/entities/errors/common';

const createBroadcast = getInjection('ICreateBroadcastUseCase');
const getBroadcastByFilename = getInjection('IGetBroadcastByFilenameUseCase');
const deleteBroadcast = getInjection('IDeleteBroadcastUseCase');
const broadcastsRepository = getInjection('IBroadcastsRepository');

let filename: string;

beforeEach(() => {
  filename = `${crypto.randomUUID()}.mp4`;
});

it('creates a broadcast with an id and timestamps', async () => {
  const broadcast = await createBroadcast({ filename, url: `/uploads/${filename}`, size: 1024 });

  expect(broadcast.id).toBeTruthy();
  expect(broadcast.filename).toBe(filename);
  expect(broadcast.uploadedAt).toBeInstanceOf(Date);
  expect(broadcast.createdAt).toBeInstanceOf(Date);
});

it('looks a broadcast up by filename, returning undefined when absent', async () => {
  const created = await createBroadcast({ filename, url: `/uploads/${filename}`, size: 1 });
  await expect(getBroadcastByFilename(filename)).resolves.toMatchObject({ id: created.id });
  await expect(getBroadcastByFilename('nope.mp4')).resolves.toBeUndefined();
});

it('lists the created broadcast', async () => {
  const created = await createBroadcast({ filename, url: `/uploads/${filename}`, size: 1 });
  const all = await broadcastsRepository.getBroadcasts();
  expect(all.some(broadcast => broadcast.id === created.id)).toBe(true);
});

it('deletes a broadcast and its stored binaries', async () => {
  const created = await createBroadcast({ filename, url: `/uploads/${filename}`, size: 1 });
  await deleteBroadcast(created.id);

  await expect(getBroadcastByFilename(filename)).resolves.toBeUndefined();
  await expect(getInjection('IFileStorageService').uploadExists(filename)).resolves.toBe(false);
});

it('throws NotFoundError when deleting an unknown broadcast', async () => {
  await expect(deleteBroadcast('missing')).rejects.toBeInstanceOf(NotFoundError);
});
