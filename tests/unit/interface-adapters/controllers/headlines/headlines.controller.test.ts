import { beforeEach, expect, it } from 'vitest';

import { getInjection } from '@/di/container';
import { InputParseError } from '@/src/entities/errors/common';

const replaceHeadlines = getInjection('IReplaceHeadlinesController');
const getHeadlines = getInjection('IGetHeadlinesController');

let broadcastId: string;

beforeEach(() => {
  broadcastId = crypto.randomUUID();
});

it('serializes headlines with idx and ISO timestamps', async () => {
  const dtos = await replaceHeadlines({
    broadcastId,
    items: [{ startTime: '00:00', endTime: '01:00', headline: 'H', summary: 'S' }],
  });

  expect(dtos[0]).toMatchObject({ idx: 0, headline: 'H' });
  expect(dtos[0].createdAt).toBe(new Date(dtos[0].createdAt).toISOString());
});

it('reads headlines back through the controller', async () => {
  await replaceHeadlines({
    broadcastId,
    items: [{ startTime: '00:00', endTime: '01:00', headline: 'H', summary: 'S' }],
  });
  await expect(getHeadlines(broadcastId)).resolves.toHaveLength(1);
});

it('throws InputParseError when a timestamp is malformed', async () => {
  await expect(
    replaceHeadlines({ broadcastId, items: [{ startTime: 'x', endTime: '01:00', headline: 'H', summary: 'S' }] }),
  ).rejects.toBeInstanceOf(InputParseError);
});
