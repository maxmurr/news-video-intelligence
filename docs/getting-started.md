---
contentType: Tutorial
---

# How do I set up the project and reproduce evals?

Clone the repo, boot Postgres and RustFS, configure `AI_GATEWAY_API_KEY`, run the app, then reproduce pipeline quality with Evalite against fixture MP4s.

## Tools and accounts you need

Install these before cloning:

- **Node.js** 20.9 or newer (`package.json` engines)
- **pnpm** 10 (`packageManager` pin: `pnpm@10.33.0`)
- **Docker** with Compose (Postgres + RustFS)
- **ffmpeg** and **ffprobe** on your `PATH` (frame extraction and duration checks shell out to them)
- A **Vercel AI Gateway** API key with access to the models in `lib/models.ts`, plus Anthropic for the eval judge (`anthropic/claude-sonnet-5` via the gateway; pinned in code)

Optional for local work: Langfuse keys (tracing) and Sentry DSN/tokens (error reporting). Leave those blank if you are not wiring observability yet.

## Clone and install

Replace `your_repo_url_here` with the Git remote, then install dependencies:

```bash
git clone your_repo_url_here
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
# Vercel AI Gateway: required for the app and for eval LLM judges
AI_GATEWAY_API_KEY=your_ai_gateway_api_key_here

# Postgres (docker compose)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/news_intelligence

# RustFS / S3-compatible storage (docker compose)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=rustfsadmin
S3_SECRET_KEY=rustfsadmin
S3_BUCKET=uploads
S3_REGION=ap-southeast-1

# Sentry: optional locally
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=

# Langfuse: optional locally
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

Start Next.js and the Workflow worker:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Upload an MP4 through the UI. The Workflow worker started by Next instrumentation runs the pipeline.

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

Full Evalite docs (seed, suites, pass/fail, common failures): [`EVALS.md`](../EVALS.md).

Quick path once infra and `.env` are ready:

```bash
cp /path/to/your_broadcast.mp4 public/uploads/your_broadcast.mp4
pnpm eval:seed
EVAL_VIDEO=your_broadcast.mp4 pnpm eval
```

## Domain context

Product intent and vocabulary live in [`CONTEXT.md`](../CONTEXT.md). Runtime shape: [`ARCHITECTURE.md`](../ARCHITECTURE.md). Product choices and trade-offs: [`choices-and-trade-offs.md`](./choices-and-trade-offs.md). How to test: [`testing.md`](./testing.md). Evals: [`EVALS.md`](../EVALS.md).
