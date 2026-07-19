/**
 * A single reranked candidate: `index` points back into the `documents` array
 * passed to `rerank`, and `score` is the reranker's relevance score (higher =
 * more relevant). Results come back sorted most relevant first.
 */
export interface RerankedDocument {
  index: number;
  score: number;
}

/**
 * Reorders a candidate set by relevance to a query, the second stage of
 * retrieval after vector recall. Unlike embedding, reranking reads the query and
 * each document together, so it catches relevance that asymmetric cosine misses.
 */
export interface IRerankService {
  rerank(query: string, documents: string[], topN: number): Promise<RerankedDocument[]>;
}
