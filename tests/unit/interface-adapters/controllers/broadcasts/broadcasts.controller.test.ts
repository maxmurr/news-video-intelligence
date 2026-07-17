import { expect, it } from 'vitest';

import { getInjection } from '@/di/container';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';

const createBroadcast = getInjection('ICreateBroadcastController');
const getBroadcastByFilename = getInjection('IGetBroadcastByFilenameController');

function uploadInput() {
  const filename = `${crypto.randomUUID()}.mp4`;
  return { filename, url: `/uploads/${filename}`, size: 2048 };
}

it('creates a broadcast and serializes timestamps as ISO strings', async () => {
  const input = uploadInput();
  const dto = await createBroadcast(input);

  expect(dto).toMatchObject({ filename: input.filename, url: input.url, size: input.size });
  expect(dto.uploadedAt).toBe(new Date(dto.uploadedAt).toISOString());
  expect(dto.createdAt).toBe(new Date(dto.createdAt).toISOString());
});

it('throws InputParseError when a required field is missing', async () => {
  await expect(createBroadcast({ filename: 'a.mp4' })).rejects.toBeInstanceOf(InputParseError);
});

it('throws InputParseError when size is negative', async () => {
  await expect(createBroadcast({ filename: 'a.mp4', url: '/uploads/a.mp4', size: -1 })).rejects.toBeInstanceOf(
    InputParseError,
  );
});

it('returns the broadcast DTO when looked up by filename', async () => {
  const input = uploadInput();
  await createBroadcast(input);
  await expect(getBroadcastByFilename(input.filename)).resolves.toMatchObject({ filename: input.filename });
});

it('throws NotFoundError when the filename is unknown', async () => {
  await expect(getBroadcastByFilename('unknown.mp4')).rejects.toBeInstanceOf(NotFoundError);
});
