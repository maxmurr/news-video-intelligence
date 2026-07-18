import { rerank } from 'ai';

import { MODELS } from '@/lib/models';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IRerankService, RerankedDocument } from '@/src/application/services/rerank.service.interface';

export class RerankService implements IRerankService {
  constructor(private readonly instrumentationService: IInstrumentationService) {}

  async rerank(query: string, documents: string[], topN: number): Promise<RerankedDocument[]> {
    if (documents.length === 0) return [];
    return this.instrumentationService.startSpan({ name: 'RerankService > rerank', op: 'ai.run' }, async () => {
      const { ranking } = await rerank({
        model: MODELS.rerank,
        query,
        documents,
        topN,
      });
      return ranking.map(({ originalIndex, score }) => ({ index: originalIndex, score }));
    });
  }
}
