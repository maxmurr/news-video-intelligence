# How do I set up the project and reproduce evals?

## Prerequisites

Install these before cloning:

- **Node.js** 20.9 or newer (`package.json` engines)
- **pnpm** 10 (`packageManager` pin: `pnpm@10.33.0`)
- **Docker** with Compose (Postgres + RustFS)
- **ffmpeg** and **ffprobe** on your `PATH` (frame extraction and duration checks shell out to them)
- A **Vercel AI Gateway** API key with access to the models in `lib/models.ts`, plus Anthropic for the eval judge (`anthropic/claude-sonnet-5` via the gateway)

Optional for local work: Langfuse keys (tracing) and Sentry DSN/tokens (error reporting). Leave those blank if you are not wiring observability yet.

## Clone and install

```bash
git clone <repo_url>
cd news-video-intelligence
pnpm install
```

## Configure environment variables

Copy the sample file and fill in secrets:

```bash
cp .env.sample .env
```

Sample configuration (matches `docker-compose.yml` defaults):

```bash
# Vercel AI Gateway — required for the app and for eval LLM judges
AI_GATEWAY_API_KEY=your_ai_gateway_api_key_here

# Postgres (docker compose)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/news_intelligence

# RustFS / S3-compatible storage (docker compose)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=rustfsadmin
S3_SECRET_KEY=rustfsadmin
S3_BUCKET=uploads
S3_REGION=ap-southeast-1

# Sentry — optional locally
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=

# Langfuse — optional locally
LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_BASE_URL=
```

`AI_GATEWAY_API_KEY`, `DATABASE_URL`, and the `S3_*` values are required to run the app or the evals. Sentry and Langfuse can stay empty for a first local pass.

## Start infrastructure

From the repo root:

```bash
docker compose up -d
```

That starts:

- **Postgres** with pgvector on `localhost:5432` (db `news_intelligence`, user/password `postgres`/`postgres`)
- **RustFS** (S3-compatible) on `localhost:9000` (API) and `localhost:9001` (console)

Wait until both containers are healthy, then bootstrap the app schema and storage:

```bash
pnpm db:migrate
pnpm workflow:bootstrap
pnpm storage:bootstrap
```

- `db:migrate` applies Drizzle migrations (broadcasts, transcripts, stories, embeddings, …)
- `workflow:bootstrap` creates Workflow “Postgres World” tables used by the durable pipeline queue
- `storage:bootstrap` creates the `S3_BUCKET` in RustFS (idempotent)

To wipe app tables and re-push the schema during development:

```bash
pnpm db:reset
```

## Run the app

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Upload an MP4 through the UI; the pipeline runs in the Workflow worker started by Next instrumentation.

Useful variants:

- `pnpm dev:noworker`: Next without draining the Workflow queue (`WORKFLOW_WORKER=0`)
- `pnpm workflow:web`: Workflow inspector UI
- `pnpm db:studio`: Drizzle Studio against `DATABASE_URL`

## Everyday commands

| Command          | Purpose                         |
| ---------------- | ------------------------------- |
| `pnpm lint`      | ESLint                          |
| `pnpm typecheck` | `next typegen` + `tsc --noEmit` |
| `pnpm test`      | Vitest unit tests               |
| `pnpm format`    | Prettier write                  |

## Reproduce evaluations

Pipeline quality is measured with [Evalite](https://www.evalite.dev/) suites under `evals/`. Each suite runs real controllers through the DI container against fixture MP4s: hard invariant checks fail the run immediately; LLM judges score soft quality (pass when the suite average is at least `scoreThreshold` in `evalite.config.ts`, currently **60**, i.e. mean judge score ≥ 3/5).

### What you need

1. Local infra up (Postgres + RustFS), migrations applied, bucket created
2. `AI_GATEWAY_API_KEY` set (pipeline models + Anthropic judge)
3. `ffmpeg` / `ffprobe` on `PATH`
4. At least one fixture MP4 in `public/uploads/` (that directory is gitignored aside from `.gitkeep`)
5. The same files copied into the object bucket under the **same filename keys**

### Seed fixtures

Drop your sample broadcast(s) into the local fixture directory:

```bash
cp /path/to/your_broadcast.mp4 public/uploads/your_broadcast.mp4
```

Evalite discovers `public/uploads/*.mp4`. The pipeline downloads videos from the bucket by filename, so seed storage next:

```bash
pnpm eval:seed
```

That uploads every local fixture into `S3_BUCKET` when the key is missing. Re-run after adding files.

To exercise a single video instead of every fixture:

```bash
EVAL_VIDEO=your_broadcast.mp4 pnpm eval
```

### Run the suites

```bash
pnpm eval
```

Watch mode (re-runs on change):

```bash
pnpm eval:dev
```

Export machine-readable results (written under `evals/results/`, gitignored):

```bash
pnpm eval:export
```

Suites and what they gate:

| Suite file                 | Stage              | Hard invariants (throw on fail)                              | Soft judge                  |
| -------------------------- | ------------------ | ------------------------------------------------------------ | --------------------------- |
| `evals/transcribe.eval.ts` | Transcription      | Non-empty, timestamped, monotonic, density, duration bounds  | Verbatim form               |
| `evals/stories.eval.ts`    | Story segmentation | ≥1 story, contiguous spans, starts on transcript timestamps  | Boundary quality            |
| `evals/headlines.eval.ts`  | Headlines          | One item per story, word cap, non-trivial summaries          | Groundedness                |
| `evals/frames.eval.ts`     | Frame extraction   | One frame per headline, time in span, files >1 KB in storage | Representativeness (vision) |

Shared helpers live in `evals/lib.ts` (`ensureBroadcast`, judges, `uploadsData`). Config: `evalite.config.ts` (`scoreThreshold: 60`, `testTimeout: 600_000`).

Pipeline models are pinned in `lib/models.ts`. The judge uses `anthropic/claude-sonnet-5` through the AI Gateway (a different family from the Gemini pipeline models, to reduce self-preference).

### Pass / fail

- Any failed invariant throws → `evalite run` exits non-zero
- Soft scores below the suite threshold → non-zero exit
- A green `pnpm eval` with your fixtures is the reproduction target

Expect multi-minute runs: each stage calls models over a full broadcast and may run ffmpeg. Keep fixtures short while iterating.

## Domain context

Product intentlive in [`CONTEXT.md`](../CONTEXT.md).
