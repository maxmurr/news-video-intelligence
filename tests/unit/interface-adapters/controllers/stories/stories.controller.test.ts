import { beforeEach, expect, it } from 'vitest';

import { getInjection } from '@/di/container';
import { InputParseError } from '@/src/entities/errors/common';

const replaceStories = getInjection('IReplaceStoriesController');
const getStories = getInjection('IGetStoriesController');

let broadcastId: string;

beforeEach(() => {
  broadcastId = crypto.randomUUID();
});

it('serializes stories with idx and ISO timestamps', async () => {
  const dtos = await replaceStories({
    broadcastId,
    items: [{ title: 'A', summary: 'B', startTime: '00:00', endTime: '01:00' }],
  });

  expect(dtos[0]).toMatchObject({ idx: 0, title: 'A', startTime: '00:00' });
  expect(dtos[0].createdAt).toBe(new Date(dtos[0].createdAt).toISOString());
});

it('reads stories back through the controller', async () => {
  await replaceStories({
    broadcastId,
    items: [{ title: 'A', summary: 'B', startTime: '00:00', endTime: '01:00' }],
  });
  await expect(getStories(broadcastId)).resolves.toHaveLength(1);
});

it('throws InputParseError when a timestamp is malformed', async () => {
  await expect(
    replaceStories({ broadcastId, items: [{ title: 'A', summary: 'B', startTime: 'noon', endTime: '01:00' }] }),
  ).rejects.toBeInstanceOf(InputParseError);
});
