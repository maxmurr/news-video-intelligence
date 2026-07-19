---
contentType: Conceptual
---

# What product choices and trade-offs shape this build?

This page explains the product bet, a short architecture sketch, and the major trade-offs behind Broadcast Desk. Runtime detail lives in [`ARCHITECTURE.md`](../ARCHITECTURE.md). The client brief lives in [`CONTEXT.md`](../CONTEXT.md). Positioning and UX principles live in [`PRODUCT.md`](../PRODUCT.md) and [`DESIGN.md`](../DESIGN.md).

## Product choices

The open brief asks for an interactive newspaper over long news video. The product bet is proof before polish:

- **Stories first**: after upload, you browse headlines, summaries, and jump-to-moment cards instead of scrubbing a 30 to 60 minute timeline
- **Citations are the product**: every Q&A answer carries `[mm:ss]` controls that seek the player
- **Two chat modes**: per-broadcast “Ask the broadcast” (full transcript in context) and a library desk assistant (vector recall + rerank across all broadcasts)
- **Honest misses**: when a topic is absent, the assistant should say so instead of inventing coverage

## Architecture (brief)

Upload produces durable pipeline artifacts; the desk UI then reads them:

```text
Upload MP4
  → S3-compatible bucket (RustFS locally)
  → Postgres broadcast row
  → Durable Workflow pipeline:
       transcribe → (embed ∥ stories) → headlines → frames
  → Desk UI: library, story grid, player, transcript, chat
```

Videos and frames live in object storage. Transcripts, stories, headlines, frames metadata, embedding chunks, and runs live in Postgres. Library search uses pgvector on `transcript_chunks`, then Cohere rerank (`RETRIEVAL_CANDIDATE_K = 50` → `RETRIEVAL_TOP_K = 20`).

Chat grounding splits on purpose:

- Single broadcast: put the full timestamped transcript in the prompt (highest fidelity for one video; token cost grows with length)
- Library desk: embed query → vector candidates → rerank → inject top moments (scales across many broadcasts; recall depends on chunking + rerank)

Layers, DI, retries, and model pins: [`ARCHITECTURE.md`](../ARCHITECTURE.md).

## Major trade-offs

1. **Pipeline quality vs latency/cost**: multimodal Flash for transcription and frame picking; lighter Flash / Flash-Lite for segmentation and headlines. Models are pinned in `lib/models.ts`.
2. **Full-transcript chat vs RAG**: fidelity for one broadcast vs scalable library search. Hybrid retrieval (BM25 + vectors) stays deferred until vector-only quality is measured.
3. **Durable Workflow vs in-request pipeline**: survives restarts and retries; local review needs Postgres and a worker-enabled `pnpm dev`.
4. **Eval coverage on pipeline, not chat**: Evalite gates stories → headlines → frames (transcription is exercised as a prerequisite, not scored as its own suite). Chat usefulness is covered by dogfood and the manual script in [`testing.md`](./testing.md), not automated scorers yet.
5. **Local fixtures gitignored**: sample MP4s are not committed (size + rights). Reviewers bring 2 to 3 clips; seed steps live in [`getting-started.md`](./getting-started.md) and [`testing.md`](./testing.md).

### Adaptive model routing

“Adaptive” here means route by stage and surface, not one model for every token.

| Stage / surface | Model                          | Why this tier                                               |
| --------------- | ------------------------------ | ----------------------------------------------------------- |
| Transcribe      | `google/gemini-3.5-flash`      | Multimodal audio/video → timestamped speech; needs headroom |
| Stories         | `google/gemini-3-flash`        | Structure detection over long text; mid tier                |
| Headlines       | `google/gemini-3.1-flash-lite` | Short grounded copy; cheapest LLM stage                     |
| Frames          | `google/gemini-3.5-flash`      | Vision over candidates + transcript span                    |
| Chat            | `google/gemini-3.5-flash`      | Grounded answers + citation discipline                      |
| Embed           | `cohere/embed-v4.0`            | Library recall                                              |
| Rerank          | `cohere/rerank-v4-fast`        | Reorder vector candidates before prompting                  |

Other adaptive choices:

- Embed runs in parallel with story detection (workflow DAG) to cut wall-clock time
- Library chat uses retrieve-then-generate; single-broadcast chat skips retrieval when the full transcript fits the job
- Rerank failure falls back to vector order instead of failing the turn

A fixed-model control (every LLM stage on `google/gemini-3.5-flash`, skip rerank) is a fair comparison baseline. Reproduce it by editing `MODELS` in `lib/models.ts`, optionally short-circuiting rerank in `search-library.use-case.ts`, then re-running the same fixtures and [`testing.md`](./testing.md) script.
