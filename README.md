# Interactive News Video Intelligence

Turns news broadcasts into an interactive research surface: browse stories as a readable edition, then ask follow-up questions grounded in the source footage.

## Quick start

```bash
cp .env.sample .env   # set AI_GATEWAY_API_KEY at minimum
docker compose up -d
pnpm install
pnpm db:migrate && pnpm workflow:bootstrap && pnpm storage:bootstrap
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Full setup and evals

See **[docs/getting-started.md](docs/getting-started.md)** for prerequisites, sample configuration, infrastructure bootstrap, and steps to reproduce the Evalite pipeline evaluations.
