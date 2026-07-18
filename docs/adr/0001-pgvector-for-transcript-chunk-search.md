# pgvector on Postgres for transcript-chunk vector search

We store transcript-chunk embeddings in the existing Postgres database using the
`pgvector` extension, rather than adopting a dedicated vector database
(Pinecone, Qdrant, Weaviate, etc.).

## Context

The pipeline already runs on Postgres (drizzle-orm, one DB for every
broadcast artifact). Search is always scoped to a single broadcast — a small,
bounded slice of data — and the roadmap is a hybrid of semantic + BM25 with
reranking. Keeping vectors, chunk text, and the `broadcast_id` foreign key in
one store lets a single query filter, rank, and (later) BM25-score without a
cross-system join or a second consistency domain. A dedicated vector DB would
add an operational component, a sync path, and network hops for a dataset that
comfortably fits Postgres.

## Decision

- **Store:** `pgvector` in the same Postgres instance; no separate vector DB.
- **Column:** `vector(1536)` — Cohere `embed-v4` at 1536 dims (its default;
  1536 keeps us on plain `vector` + HNSW, under pgvector's 2000-dim HNSW ceiling,
  so no `halfvec`). Gateway model id is `cohere/embed-v4.0`; chunks are embedded
  with `providerOptions.cohere.inputType='search_document'` (the SDK default is
  `search_query`, which would silently degrade recall).
- **Index:** HNSW with `vector_cosine_ops` (embed-v4 vectors are unit-normalized,
  so cosine is the right metric). B-tree on `broadcast_id`; rely on pgvector 0.8
  iterative index scan so a broadcast-filtered search still returns k rows.
- **Extension + DDL:** created via a versioned, hand-augmented migration
  (`CREATE EXTENSION IF NOT EXISTS vector;` + table + HNSW index) using
  `db:generate`/`db:migrate` — not `db:push`, which is unreliable for extensions
  and index opclasses.
- **Image:** dev uses `pgvector/pgvector:pg18` (tag confirmed to exist).
  Railway's **default** managed Postgres does **not** ship pgvector — deploy must
  use Railway's pgvector marketplace template or run `pgvector/pgvector:pg18` as
  the Postgres service.

## Consequences

- The embedding **dimension (1536) and distance metric (cosine) are baked into
  the column and index.** Changing either means a re-embed and index rebuild, so
  they are effectively fixed once data exists.
- If the corpus ever outgrows a single Postgres (many broadcasts, cross-broadcast
  search at scale), this decision would be revisited — the chunk text and
  metadata are stored plainly, so a migration to a dedicated store stays possible.
