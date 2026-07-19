---
contentType: Conceptual
---

# How is Broadcast Desk put together?

This page explains the runtime shape of Interactive News Video Intelligence: upload to durable pipeline to desk UI to grounded chat. Product intent lives in [`CONTEXT.md`](./CONTEXT.md). Local setup lives in [`docs/getting-started.md`](./docs/getting-started.md).

## End-to-end flow

```text
Upload MP4
  → S3-compatible bucket (RustFS locally)
  → Postgres broadcast row + workflow run
  → Durable pipeline:
       transcribe → (embed ∥ stories) → headlines → frames
  → Desk UI: library, story grid, player, transcript, chat
```

1. `POST /api/videos` streams the MP4 to object storage, inserts a `broadcasts` row, starts `runVideoPipeline`, and records a `runs` row (`app/api/videos/route.ts`).
2. Workflow steps call DI controllers for each stage (`workflows/video-pipeline.ts`).
3. The desk reads assembled artifacts via `IGetBroadcastDetailController` (`app/v/[fileId]/`).
4. Chat streams from either the full single-broadcast transcript or library retrieval (`app/api/chat/`, `app/api/chat/[fileId]/`).

You can restart a pipeline with `POST /api/pipeline` when the video object still exists. Poll stage progress with `GET /api/videos?id=…`.

## Directory ownership

| Path                                  | Owns                                                            |
| ------------------------------------- | --------------------------------------------------------------- |
| `app/`                                | Next.js App Router UI, API routes, Workflow well-known handlers |
| `workflows/`                          | Durable pipeline orchestration                                  |
| `src/entities/`                       | Zod models and domain errors                                    |
| `src/application/`                    | Use cases and repository/service ports                          |
| `src/infrastructure/`                 | Drizzle repos, AI / ffmpeg / S3 implementations                 |
| `src/interface-adapters/controllers/` | Thin controllers and presenters (including presigned URLs)      |
| `di/`                                 | ioctopus container and modules                                  |
| `lib/`                                | Models, chunking, timestamps, S3 client, chat streaming helpers |
| `drizzle/`                            | Postgres schema and migrations                                  |
| `evals/`                              | Evalite suites for pipeline stages                              |
| `components/`                         | Shared UI                                                       |
| `tests/`                              | Vitest unit tests                                               |

Pages, API routes, and workflow steps call controllers only. They do not reach repositories or infrastructure services directly.

## Pipeline stages

`runVideoPipeline` in `workflows/video-pipeline.ts` runs:

1. **transcribe**: extract audio, run ASR, validate a timestamped transcript, save it
2. **embed ∥ stories** (parallel): chunk and embed for library recall; segment stories from the transcript
3. **headlines**: grounded titles and summaries from stories + transcript
4. **frames**: pick times per headline, extract with ffmpeg, store object keys in `frames`

Stage dependencies:

- stories and embed need a transcript
- headlines need transcript + stories
- frames need headlines

Each stage returns `StageResult<{ cached }>`. If artifacts already exist, the stage skips work and reports `cached: true`.

### Retry vs fatal failures

`guarded` in the workflow maps deterministic failures to `FatalError` (no retry):

- `NotFoundError` (missing broadcast)
- `InputParseError` (invalid model/schema output)

Model and ffmpeg failures stay plain `Error` so the workflow can retry them.

Upload owns aggregate creation. Stages call `requireBroadcastById`; a missing row is fatal. An invalid transcript (no leading timestamp) throws before save so downstream stages do not cache bad data. If pipeline start fails after a successful upload, the API still returns 201 with `runId: null` so the UI can show the failure.

## Storage split

### Postgres (pgvector)

Structured artifacts live in `drizzle/schema.ts`:

| Table                              | Role                                                              |
| ---------------------------------- | ----------------------------------------------------------------- |
| `broadcasts`                       | Aggregate root; unique `filename`                                 |
| `transcripts`                      | 1:1 timestamped transcript text                                   |
| `stories` / `headlines` / `frames` | Ordered by `idx`                                                  |
| `transcript_chunks`                | Embeddings with HNSW cosine index (`EMBEDDING_DIMENSIONS = 1536`) |
| `runs`                             | 1:1 workflow run pointer (`runId` nullable if start failed)       |

Child rows cascade-delete with the broadcast.

### Object storage (S3 / RustFS)

- Videos at bucket root (`filename`)
- Frames under `frames/<broadcast>/`
- Bucket is private; presenters mint presigned URLs
- Postgres stores object keys, not binaries

Delete removes the DB row first (cascade), then cleans video and frame objects.

## Chat modes

| Mode             | Route                     | Grounding                                                                                            |
| ---------------- | ------------------------- | ---------------------------------------------------------------------------------------------------- |
| Single broadcast | `POST /api/chat/[fileId]` | Full transcript + headline list via `get-chat-context.use-case.ts`; cite `[mm:ss]`                   |
| Library desk     | `POST /api/chat`          | Embed query → vector top 50 → rerank top 20 (`search-library.use-case.ts`); sources as `/v/{id}?t=…` |

Shared streaming lives in `lib/chat/chat-stream.ts` (`MODELS.chat`, last 10 messages).

Library path constants: `RETRIEVAL_CANDIDATE_K = 50`, `RETRIEVAL_TOP_K = 20` in `search-library.use-case.ts`. Rerank failure falls back to vector order. Library retrieval failure uses an ungrounded decline prompt. Missing transcript for broadcast chat returns 409.

## Model routing

Pinned in `lib/models.ts`:

| Stage / surface | Model                          |
| --------------- | ------------------------------ |
| Transcribe      | `google/gemini-3.5-flash`      |
| Stories         | `google/gemini-3-flash`        |
| Headlines       | `google/gemini-3.1-flash-lite` |
| Frames          | `google/gemini-3.5-flash`      |
| Chat            | `google/gemini-3.5-flash`      |
| Embed           | `cohere/embed-v4.0`            |
| Rerank          | `cohere/rerank-v4-fast`        |

Stages that need multimodal headroom (transcribe, frames, chat) stay on Flash. Headlines use Flash-Lite. Embed and rerank stay on Cohere so the library index stays comparable across experiments.

## Dependency injection

The container is `@evyweb/ioctopus` (`di/container.ts`). Resolve with `getInjection('I…')`.

Module load order: Monitoring → Storage → Broadcasts → Transcripts → TranscriptChunks → Stories → Headlines → Frames → Runs → Pipeline.

Pattern:

1. Port interface in `src/application/`
2. Use-case higher-order function
3. Controller higher-order function
4. Infrastructure class bound in a `di/modules/*` module

`NODE_ENV === 'test'` swaps mocks so unit tests and Evalite share the same controller entry points.

## Invariants worth knowing

- Duration clamps on transcript, stories, and frames keep seek targets inside real media length when ASR drifts
- Schema validation failures on stories/headlines/frames become `InputParseError` (fatal)
- Evalite under `evals/` gates pipeline stages (stories, headlines, frames); chat groundedness is not scored there yet
- Positioning and UX rules: [`PRODUCT.md`](./PRODUCT.md), [`DESIGN.md`](./DESIGN.md)
