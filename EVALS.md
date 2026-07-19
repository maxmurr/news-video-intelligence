---
contentType: How-to
---

# How do I run and interpret pipeline evals?

Evalite suites under `evals/` gate pipeline quality against fixture MP4s. They call the same DI stage controllers the product uses, then apply hard invariants and soft LLM judges. Local infra and `.env` setup live in [`docs/getting-started.md`](./docs/getting-started.md). Product testing beyond evals lives in [`docs/testing.md`](./docs/testing.md).

## What evals do (and do not)

Each suite runs real controllers through the DI container:

- `IDetectStoriesController`
- `IGenerateHeadlinesController`
- `IExtractFramesController`

Later suites still call `ITranscribeBroadcastController` first so a transcript exists; there is no dedicated transcribe suite.

They do **not** start `runVideoPipeline` in `workflows/video-pipeline.ts`. You exercise the same stage logic and caching, but not durable Workflow orchestration, retries, or the embed∥stories DAG. UI upload with `pnpm dev` is what runs the Workflow.

Chat groundedness, library recall, and rerank quality are not scored here yet.

## Prerequisites

1. Postgres + RustFS up (`docker compose up -d`)
2. Migrations and storage bootstrap applied (`pnpm db:migrate`, `pnpm storage:bootstrap`)
3. `AI_GATEWAY_API_KEY` in `.env` (pipeline models + Anthropic judge)
4. `ffmpeg` and `ffprobe` on your `PATH`
5. At least one `.mp4` in `public/uploads/` (gitignored aside from `.gitkeep`)
6. Those same files present in the object bucket under the **same filename keys**

## Fixture discovery and seeding

Evalite builds cases from `public/uploads/*.mp4` (`uploadsData` in `evals/lib.ts`). A UI upload alone does not add a fixture: put the file on disk under `public/uploads/`.

The stage controllers download video from S3 by filename. Local disk and the bucket must agree:

```bash
cp /path/to/your_broadcast.mp4 public/uploads/your_broadcast.mp4
pnpm eval:seed
```

`pnpm eval:seed` uploads every local fixture into `S3_BUCKET` when the key is missing. Re-run after you add files.

If the key is missing in the bucket, stages fail fast with `File not found: <filename>`.

## Commands

| Command            | Purpose                                                          |
| ------------------ | ---------------------------------------------------------------- |
| `pnpm eval:seed`   | Copy `public/uploads/*.mp4` into the bucket (skip existing keys) |
| `pnpm eval`        | Run all suites once (`evalite run`)                              |
| `pnpm eval:dev`    | Watch mode (re-run on change)                                    |
| `pnpm eval:export` | Run suites and write `evals/results/latest.json` (gitignored)    |

Single-fixture run (filename must exist under `public/uploads/`):

```bash
EVAL_VIDEO=your_broadcast.mp4 pnpm eval
```

Export for one fixture:

```bash
EVAL_VIDEO=your_broadcast.mp4 pnpm eval:export
```

Expect multi-minute runs. Each stage calls models over a full broadcast and may run ffmpeg. Keep fixtures short while iterating (about 3 to 15 minutes).

## Suites

| Suite file                | Stage              | Hard invariants (throw on fail)                              | Soft judge                  |
| ------------------------- | ------------------ | ------------------------------------------------------------ | --------------------------- |
| `evals/stories.eval.ts`   | Story segmentation | ≥1 story, contiguous spans, starts on transcript timestamps  | Boundary quality            |
| `evals/headlines.eval.ts` | Headlines          | One item per story, word cap, non-trivial summaries          | Groundedness                |
| `evals/frames.eval.ts`    | Frame extraction   | One frame per headline, time in span, files >1 KB in storage | Representativeness (vision) |

Shared helpers live in `evals/lib.ts` (`ensureBroadcast`, judges, `uploadsData`). Config: `evalite.config.ts` (`scoreThreshold: 60`, `testTimeout: 600_000`).

Later suites call earlier stage controllers first. If artifacts already exist for that broadcast, stages report `cached: true` and skip work.

## Pass / fail

Hard invariants and soft judges are separate gates:

- Any failed invariant throws → `evalite run` exits non-zero
- Soft scores below the suite threshold → non-zero exit
- A green `pnpm eval` with your fixtures is the reproduction target

Judge scores are raw 1 to 5 ratings divided by 5. `scoreThreshold: 60` means the suite average must be at least 0.6 (mean judge score ≥ 3/5).

Pipeline models are pinned in `lib/models.ts`. The judge uses `anthropic/claude-sonnet-5` through the AI Gateway (a different family from the Gemini pipeline models, to reduce self-preference).

## Recommended path

```bash
# one-time / when infra is cold
docker compose up -d
pnpm db:migrate && pnpm storage:bootstrap

# every time you change fixtures
cp /path/to/your_broadcast.mp4 public/uploads/your_broadcast.mp4
pnpm eval:seed

# run
EVAL_VIDEO=your_broadcast.mp4 pnpm eval
# or export machine-readable results
EVAL_VIDEO=your_broadcast.mp4 pnpm eval:export
```

Inspect failures in the Evalite terminal output or in `evals/results/latest.json` after `pnpm eval:export`.

## Common failures

| Symptom                                                                              | Likely cause                                                        | Fix                                                                                                        |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `File not found: <name>.mp4`                                                         | Object missing in S3, or fixture name does not match the bucket key | Put the MP4 in `public/uploads/`, run `pnpm eval:seed`, re-run with `EVAL_VIDEO=<name>.mp4`                |
| `insert into "broadcasts"` / duplicate key on `filename`                             | Parallel suites raced creating the same fixture row                 | Fixed in `ensureBroadcast` (shared in-flight create + unique retry). Pull latest `evals/lib.ts` and re-run |
| `Transcript … does not start with a timestamp. Got:` (empty) while other suites pass | Parallel suites each called ASR; one empty response failed a suite  | Fixed with `singleFlight` in pipeline use cases so one ASR/LLM run is shared per broadcast                 |
| Suites run an old filename                                                           | Leftover MP4 still in `public/uploads/`                             | Remove unused fixtures; set `EVAL_VIDEO` to the file you seeded                                            |
| Empty / no evals                                                                     | No `*.mp4` under `public/uploads/`                                  | Add at least one fixture                                                                                   |
| Timeout                                                                              | Broadcast too long for `testTimeout` (10 minutes)                   | Use a shorter clip while iterating                                                                         |
| Soft score fail, invariants green                                                    | Judge average below 60                                              | Inspect judge rationale in the Evalite UI / export; check transcript and story quality                     |

UI upload does not replace seeding for evals. Seeding does not start the durable Workflow; use `pnpm dev` and the app upload flow for that path.
