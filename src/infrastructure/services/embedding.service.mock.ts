import { EMBEDDING_DIMENSIONS } from '@/lib/models';
import type { IEmbeddingService } from '@/src/application/services/embedding.service.interface';

/**
 * Deterministic unit vectors derived from the text, so tests exercise the embed
 * stage without a network call and identical inputs yield identical vectors.
 */
export class MockEmbeddingService implements IEmbeddingService {
  async embedDocuments(texts: string[]): Promise<number[][]> {
    return texts.map(pseudoVector);
  }

  async embedQuery(text: string): Promise<number[]> {
    return pseudoVector(text);
  }
}

function pseudoVector(text: string): number[] {
  let seed = 2166136261;
  for (let i = 0; i < text.length; i++) {
    seed = Math.imul(seed ^ text.charCodeAt(i), 16777619);
  }

  let state = seed >>> 0;
  const vector = new Array<number>(EMBEDDING_DIMENSIONS);
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    vector[i] = state / 0xffffffff - 0.5;
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map(value => value / norm);
}
