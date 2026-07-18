# Vector-only, library-wide retrieval for the desk assistant (hybrid/rerank deferred)

The desk assistant grounds answers in the top-k transcript chunks most
semantically similar to the question, retrieved by pgvector cosine search across
**every broadcast's** chunks. Lexical/BM25 search, reciprocal-rank fusion,
reranking, and query expansion are deliberately deferred, even though the earlier
embedding work was chosen to support them.

## Context

Two chat surfaces exist. Single-broadcast Q&A (`/api/chat/[fileId]`) already has
one broadcast's full timestamped transcript, which fits in the prompt — no
retrieval needed there. The **desk assistant** (`/api/chat`) answers across the
user's whole library, where dumping every transcript is impossible — that is the
surface retrieval exists for.

The reference architecture we're working toward is a full hybrid pipeline
(multi-query expansion → BM25 + vector → RRF → rerank → blend), but that adds,
per user turn, an expansion LLM call, ~6 retrievals, and a rerank call. Building
it all before measuring retrieval quality means tuning blind and paying the
latency before knowing it's needed.

## Decision

- **v1 is vector-only, library-wide:** query → `embedQuery` (Cohere `embed-v4.0`,
  `inputType=search_query`) → cosine `<=>` over `transcript_chunks` across all
  broadcasts (no scope filter), HNSW, ORDER BY distance LIMIT k. Default
  **k = 10**. Hits carry `broadcastId` so answers attribute each moment to its
  source video.
- **Wired into the desk assistant:** retrieved moments (broadcast title + [mm:ss]
  - `/v/{id}` link) go into the system prompt; the model cites the broadcast and
    timestamp. No chunks yet, an empty query, or a retrieval error leaves the
    assistant general rather than breaking the chat.
- **No similarity floor:** the model's "if not covered, say so" instruction
  handles no-match; embed-v4 raw cosines run low, so a floor would be fragile.
- **Single-broadcast chat unchanged:** `/api/chat/[fileId]` still grounds in that
  one broadcast's full transcript.
- **Deferred to v2, seams preserved:** BM25 via `pg_search` (ParadeDB ships a
  `pg18` image that also bundles pgvector — confirmed, so it's a clean image
  swap), RRF fusion, Cohere rerank (`cohere/rerank-v4-*` is on the gateway and
  AI SDK 7 exposes reranking), query expansion / HyDE, multi-query fan-out,
  position-aware blend, and follow-up query rewriting.

## Consequences

- Retrieval quality gates library-answer quality: a recall miss makes the
  assistant say "not covered". k=10 bounds the downside; v2's hybrid+rerank is
  the fix if measurement shows it's needed.
- Cross-broadcast citations render as text ("<title> [mm:ss]") plus a `/v/{id}`
  markdown link; a deep-seek link into the player at the exact second is a
  follow-up.
- Library-wide search has no per-broadcast scope filter, so pgvector's iterative
  scan (needed only for filtered HNSW) does not apply here.
- Follow-up questions ("where did it happen?") embed poorly on their own — query
  rewriting is a known v2 gap.
