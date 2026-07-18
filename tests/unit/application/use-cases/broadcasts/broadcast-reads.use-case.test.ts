import { beforeEach, expect, it } from 'vitest';

import { getInjection } from '@/di/container';
import { NotFoundError } from '@/src/entities/errors/common';

const createBroadcast = getInjection('ICreateBroadcastUseCase');
const getDetail = getInjection('IGetBroadcastDetailUseCase');
const getSummaries = getInjection('IGetBroadcastSummariesUseCase');
const getChatContext = getInjection('IGetChatContextUseCase');

let filename: string;

beforeEach(async () => {
  filename = `${crypto.randomUUID()}.mp4`;
  await createBroadcast({ filename, url: `/uploads/${filename}`, size: 1 });
});

async function runFullPipeline() {
  await getInjection('ITranscribeBroadcastUseCase')(filename);
  await getInjection('IDetectStoriesUseCase')(filename);
  await getInjection('IGenerateHeadlinesUseCase')(filename);
  await getInjection('IExtractFramesUseCase')(filename);
}

it('returns null detail for an unknown broadcast', async () => {
  await expect(getDetail('unknown.mp4')).resolves.toBeNull();
});

it('reports untouched stages and an unknown run before the pipeline starts', async () => {
  const detail = await getDetail(filename);

  expect(detail?.stages).toEqual({ transcript: false, stories: false, headlines: false, frames: false });
  expect(detail?.run.status).toBe('unknown');
});

it('resolves a live run through the run status service while incomplete', async () => {
  await getInjection('ISaveRunUseCase')({
    broadcastId: (await getInjection('IGetBroadcastByFilenameUseCase')(filename))!.id,
    runId: 'run_1',
  });

  const detail = await getDetail(filename);
  expect(detail?.run.status).toBe('running');
});

it('reports a completed pipeline without querying the engine', async () => {
  await runFullPipeline();

  const detail = await getDetail(filename);
  expect(detail?.stages).toEqual({ transcript: true, stories: true, headlines: true, frames: true });
  expect(detail?.run.status).toBe('completed');
  expect(detail?.headlines).toHaveLength(2);
  expect(detail?.frames).toHaveLength(2);
});

it('lists the broadcast in the summaries', async () => {
  await runFullPipeline();

  const summaries = await getSummaries();
  const summary = summaries.find(item => item.broadcast.filename === filename);
  expect(summary?.stages.frames).toBe(true);
  expect(summary?.headlines.length).toBeGreaterThan(0);
});

it('throws NotFoundError for chat context on an unknown broadcast', async () => {
  await expect(getChatContext('unknown.mp4')).rejects.toBeInstanceOf(NotFoundError);
});

it('returns a null transcript in chat context before transcription, then the text', async () => {
  const before = await getChatContext(filename);
  expect(before.transcript).toBeNull();
  expect(before.headlines).toEqual([]);

  await runFullPipeline();

  const after = await getChatContext(filename);
  expect(after.transcript?.text).toMatch(/^00:00 /);
  expect(after.headlines).toHaveLength(2);
});
