# Rerank vector candidates before grounding the desk assistant

Library retrieval now runs in two stages: pgvector recall casts a wide net, then
a cross-encoder reranker reorders those candidates by query relevance and keeps
the top-k. This lands the rerank step that [0002](0002-vector-only-retrieval-for-chat.md)
deferred, while leaving the rest of that ADR's deferrals (BM25, RRF, query
expansion) still deferred.

## Context

0002 shipped vector-only recall and named its own risk: "a recall miss makes the
assistant say 'not covered'. k=10 bounds the downside; v2's hybrid+rerank is the
fix if measurement shows it's needed." embed-v4's asymmetric cosine embeds query
and document independently, so it ranks on vector proximity alone and cannot weigh
the two together. A cross-encoder reranker reads query and document jointly, which
is exactly the relevance signal cosine drops — the highest-leverage single
addition, and cheaper than the full hybrid pipeline.

The AI SDK 7 `rerank` primitive and Cohere `rerank-v4-*` on the gateway (both
confirmed in 0002) make this a service addition, not an infrastructure change.

## Decision

- **Two-stage retrieval:** `embedQuery` → cosine `<=>` over `transcript_chunks`
  for **`RETRIEVAL_CANDIDATE_K = 50`** candidates → `rerank` down to
  **`RETRIEVAL_TOP_K = 10`**. The candidate pool is `max(CANDIDATE_K, limit)` so a
  caller asking for more than 50 still over-fetches to at least what it requested.
- **Reranker is a service, mirroring embedding:** `IRerankService.rerank(query,
documents, topN)` returns `{ index, score }[]` sorted most-relevant-first.
  `RerankService` wraps AI SDK `rerank` with `MODELS.rerank`; `MockRerankService`
  scores by lexical overlap so tests are deterministic and network-free. Bound in
  the broadcasts module alongside its only consumer, `searchLibraryUseCase`.
- **Model is `cohere/rerank-v4-fast`:** cross-lingual, so it pairs with the
  multilingual embed-v4 recall; fast tier chosen because reranking is on every
  desk-assistant turn. `rerank-v4-pro` is the quality upgrade if evals justify the
  latency.
- **Graceful fallback:** a rerank error returns the vector-ordered top-k rather
  than throwing, so a reranker outage degrades ordering, not grounding. A
  single-candidate (or empty) pool skips the rerank call — nothing to reorder.
- **`rerankScore` on the hit, `similarity` preserved:** the reranker's score is a
  different scale from cosine, so it rides alongside `similarity` rather than
  overwriting it; absent when reranking was skipped or fell back.

## Consequences

- Every library turn now costs one rerank call (~50 docs) on top of the embed and
  vector query. Latency and spend rise; `rerank-v4-fast` keeps both modest.
- Retrieval quality is now gated by rerank quality, not cosine alone. Still no
  similarity/score floor — 0002's "if not covered, say so" instruction, and
  embed-v4's low raw cosines, keep a floor fragile; reconsider once `rerankScore`
  distributions are observed in practice.
- Rerank is **not eval-covered yet** (like chat). The candidate pool size, top-k,
  and model tier are the tuning knobs to sweep once retrieval evals exist.
- Still deferred from 0002: BM25 via `pg_search`, RRF fusion, query expansion /
  HyDE, multi-query fan-out, and follow-up query rewriting.
