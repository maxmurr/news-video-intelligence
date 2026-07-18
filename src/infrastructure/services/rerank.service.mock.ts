import type { IRerankService, RerankedDocument } from '@/src/application/services/rerank.service.interface';

/**
 * Deterministic lexical reranker for tests: scores each document by how many of
 * the query's words it contains, so an exact match ranks first and identical
 * inputs always produce the same order — no network call.
 */
export class MockRerankService implements IRerankService {
  async rerank(query: string, documents: string[], topN: number): Promise<RerankedDocument[]> {
    const queryTerms = new Set(tokenize(query));
    return documents
      .map((document, index) => ({ index, score: overlap(queryTerms, tokenize(document)) }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, topN);
  }
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/\p{L}+/gu) ?? [];
}

function overlap(queryTerms: Set<string>, documentTerms: string[]): number {
  let shared = 0;
  const seen = new Set<string>();
  for (const term of documentTerms) {
    if (queryTerms.has(term) && !seen.has(term)) {
      shared++;
      seen.add(term);
    }
  }
  return shared;
}
