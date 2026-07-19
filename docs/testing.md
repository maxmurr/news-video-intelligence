---
contentType: How-to
---

# How do I test this product?

This page covers unit tests, a short Evalite pointer, a manual UI script, and sample-video guidance. Full Evalite docs live in [`EVALS.md`](../EVALS.md). Boot the stack with [`getting-started.md`](./getting-started.md) before anything below.

## Unit tests

Run Vitest from the repo root:

```bash
pnpm test
```

Unit tests live under `tests/` and exercise use cases, helpers, and pure logic with DI mocks (`NODE_ENV === 'test'`). Use them for fast feedback while changing application code. They do not call live models or ffmpeg.

## Pipeline evals (Evalite)

Minimal path after infra and `.env` are ready:

```bash
cp /path/to/your_broadcast.mp4 public/uploads/your_broadcast.mp4
pnpm eval:seed
EVAL_VIDEO=your_broadcast.mp4 pnpm eval
```

Suites, pass/fail rules, and common failures (including `File not found`): [`EVALS.md`](../EVALS.md).

## Manual UI script

Use this after at least one fixture is seeded and `pnpm dev` is running.

1. Copy fixtures into `public/uploads/`, run `pnpm eval:seed`, then optionally `pnpm eval` (or `EVAL_VIDEO=… pnpm eval` for one file).
2. Open [http://localhost:3000](http://localhost:3000), upload fixture 1 through the UI, and wait for stories + frames.
3. Click a story card: the player should seek to the segment start.
4. Ask: “Was there any news about wildfires? Please summarize it.” For an absent topic, expect a clear no.
5. Ask a topic that is in the video. Follow up with “Why …?” then “Show me the relevant clip.”
6. Open citations: each `[mm:ss]` should seek and play inside the media duration.
7. Optional: upload fixture 2, then ask a cross-broadcast question on `/chat`.
8. Optional: upload fixture 3 (no-news / silent) and confirm the product does not present fabricated news as verified stories.

Also useful while iterating:

- `pnpm lint` and `pnpm typecheck` before a review hand-off
- `pnpm workflow:web` to inspect Workflow step durations
- Browser network panel for chat TTFB / stream timing

## Sample videos

MP4s under `public/uploads/` are gitignored. Provide 2 to 3 English (or clearly spoken) news MP4s, ideally 3 to 15 minutes each, so pipeline and eval runs finish in a review session.

| #   | Role                   | What to look for                                                                                                                |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Primary broadcast      | Multiple distinct stories, named people, clear topic changes                                                                    |
| 2   | Follow-up / second day | Overlapping topics (tests multi-mention and library search)                                                                     |
| 3   | Negative control       | Short clip with no news speech (silence / test pattern): expect Q&A to refuse invented topics; watch for pipeline hallucination |

Public sources you can evaluate against (check license yourself):

- Outlet YouTube or upload pages with redistributable clips
- Internet Archive news segments
- Synthetic ffmpeg tests for the negative control

Seed with `pnpm eval:seed` before `pnpm eval` or UI upload that depends on the same object keys.
