---
contentType: Landing
---

# How do I run Interactive News Video Intelligence?

Turns news broadcasts into an interactive research surface: browse stories as a readable edition, then ask follow-up questions grounded in the source footage.

## Run locally

Copy env defaults, start infra, migrate, then boot the app:

```bash
cp .env.sample .env   # set AI_GATEWAY_API_KEY at minimum
docker compose up -d
pnpm install
pnpm db:migrate && pnpm workflow:bootstrap && pnpm storage:bootstrap
pnpm dev
```

Production: [https://news-intelligence.maxmurr.com](https://news-intelligence.maxmurr.com)

Local: [http://localhost:3000](http://localhost:3000)

## Docs for reviewers

| Doc                                                              | Contents                                                       |
| ---------------------------------------------------------------- | -------------------------------------------------------------- |
| [docs/getting-started.md](docs/getting-started.md)               | Prerequisites, sample `.env`, infra bootstrap                  |
| [EVALS.md](EVALS.md)                                             | Seed fixtures, run Evalite, suites, pass/fail, common failures |
| [docs/testing.md](docs/testing.md)                               | Unit tests, Evalite pointer, manual UI script, sample videos   |
| [docs/choices-and-trade-offs.md](docs/choices-and-trade-offs.md) | Product choices, architecture brief, trade-offs                |
| [ARCHITECTURE.md](ARCHITECTURE.md)                               | Upload → pipeline → desk → chat; storage, models, DI           |
| [CONTEXT.md](CONTEXT.md)                                         | Product contract and domain language                           |
| [PRODUCT.md](PRODUCT.md)                                         | Positioning and design principles                              |
| [DESIGN.md](DESIGN.md)                                           | Visual system reference                                        |
