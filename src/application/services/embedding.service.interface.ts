/**
 * Turns text into vectors for storage and search. Cohere embeds documents and
 * queries with different input types, so the two directions are separate calls:
 * `embedDocuments` (stored chunks) and `embedQuery` (a search query). Document
 * output order matches the input order.
 */
export interface IEmbeddingService {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}
