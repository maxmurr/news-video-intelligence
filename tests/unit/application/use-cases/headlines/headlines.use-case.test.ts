import { beforeEach, expect, it } from 'vitest';

import { getInjection } from '@/di/container';
import type { HeadlineInsert } from '@/src/entities/models/headline';

const replaceHeadlines = getInjection('IReplaceHeadlinesUseCase');
const getHeadlines = getInjection('IGetHeadlinesUseCase');

let broadcastId: string;

const sampleHeadlines: HeadlineInsert[] = [
  { startTime: '00:00', endTime: '05:00', headline: 'Wildfires spread', summary: 'Coverage' },
  { startTime: '05:00', endTime: '10:00', headline: 'Election night', summary: 'Results' },
];

beforeEach(() => {
  broadcastId = crypto.randomUUID();
});

it('assigns a positional idx aligned with the input order', async () => {
  const created = await replaceHeadlines(broadcastId, sampleHeadlines);

  expect(created.map(headline => headline.idx)).toEqual([0, 1]);
  expect(created.map(headline => headline.headline)).toEqual(['Wildfires spread', 'Election night']);
});

it('replaces the previous set rather than appending', async () => {
  await replaceHeadlines(broadcastId, sampleHeadlines);
  await replaceHeadlines(broadcastId, [
    { startTime: '00:00', endTime: '02:00', headline: 'Weather', summary: 'Forecast' },
  ]);

  await expect(getHeadlines(broadcastId)).resolves.toHaveLength(1);
});

it('returns an empty list for a broadcast with no headlines', async () => {
  await expect(getHeadlines(broadcastId)).resolves.toEqual([]);
});
