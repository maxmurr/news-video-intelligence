/**
 * Model assignment per pipeline stage, sized to the job. Verified with
 * `pnpm evals` — when changing a model here, clear that stage's cached
 * artifacts (and downstream ones) and re-run the evals.
 *
 * Gateway pricing reference (per M tokens, input/output):
 *   google/gemini-3.5-flash      $1.50 / $9.00
 *   google/gemini-3-flash        $0.50 / $3.00
 *   google/gemini-3.1-flash-lite $0.25 / $1.50
 *
 * Eval evidence (2026-07-17, db04f8a1 + 74b844ef): cheaper tiers transcribe
 * fluently (judge 5/5 on text) but their timestamps drift past the real video
 * end — flash-lite 27% over, 3-flash 7% over on 74b844ef — which corrupts
 * every downstream span. Only 3.5-flash stays within 5% on both videos, so
 * both video-input stages need it. Story segmentation dropped to 3/5 on
 * flash-lite, recovered to 4/5 on 3-flash. Frame picking failed on flash-lite
 * (2/5 picks).
 */
export const MODELS = {
  /** Video in (~5.4k tokens/min). Cheaper tiers hallucinate timestamps past video end. */
  transcribe: 'google/gemini-3.5-flash',
  /** Text-only topic segmentation. flash-lite scored 3/5; 3-flash restores 4/5. */
  stories: 'google/gemini-3-flash',
  /** Text-only copywriting. flash-lite: judge 4/5, same as 3.5-flash. */
  headlines: 'google/gemini-3.1-flash-lite',
  /** Video in + visual judgment. Cheaper tiers picked unusable frames. */
  frames: 'google/gemini-3.5-flash',
  /** Interactive chat over pipeline output. Not eval-covered yet. */
  chat: 'google/gemini-3.5-flash',
  /** Transcript-chunk embeddings for pgvector search. 1536-dim, multilingual. */
  embed: 'cohere/embed-v4.0',
  /** Reranks vector candidates by query relevance. Cross-lingual, pairs with embed-v4. Not eval-covered yet. */
  rerank: 'cohere/rerank-v4-fast',
} as const;

/**
 * The `embed` model's output width. Baked into the pgvector column and HNSW
 * index, so schema and embedding service read it from here — changing it means
 * a re-embed and index rebuild (see docs/adr/0001).
 */
export const EMBEDDING_DIMENSIONS = 1536;
