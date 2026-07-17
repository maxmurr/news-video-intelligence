import { beforeEach, expect, it } from 'vitest';

import { getInjection } from '@/di/container';
import { NotFoundError } from '@/src/entities/errors/common';

const createBroadcast = getInjection('ICreateBroadcastUseCase');
const getBroadcast = getInjection('IGetBroadcastUseCase');
const getBroadcastByFilename = getInjection('IGetBroadcastByFilenameUseCase');
const getBroadcasts = getInjection('IGetBroadcastsUseCase');
const deleteBroadcast = getInjection('IDeleteBroadcastUseCase');

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

it('gets a broadcast by id', async () => {
  const created = await createBroadcast({ filename, url: `/uploads/${filename}`, size: 1 });
  await expect(getBroadcast(created.id)).resolves.toMatchObject({ id: created.id, filename });
});

it('throws NotFoundError when the id does not exist', async () => {
  await expect(getBroadcast('missing')).rejects.toBeInstanceOf(NotFoundError);
});

it('looks a broadcast up by filename, returning undefined when absent', async () => {
  const created = await createBroadcast({ filename, url: `/uploads/${filename}`, size: 1 });
  await expect(getBroadcastByFilename(filename)).resolves.toMatchObject({ id: created.id });
  await expect(getBroadcastByFilename('nope.mp4')).resolves.toBeUndefined();
});

it('lists the created broadcast', async () => {
  const created = await createBroadcast({ filename, url: `/uploads/${filename}`, size: 1 });
  const all = await getBroadcasts();
  expect(all.some(broadcast => broadcast.id === created.id)).toBe(true);
});

it('deletes a broadcast so a later get throws', async () => {
  const created = await createBroadcast({ filename, url: `/uploads/${filename}`, size: 1 });
  await deleteBroadcast(created.id);
  await expect(getBroadcast(created.id)).rejects.toBeInstanceOf(NotFoundError);
});
