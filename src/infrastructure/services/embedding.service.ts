import { embed, embedMany } from 'ai';

import { MODELS } from '@/lib/models';
import type { IEmbeddingService } from '@/src/application/services/embedding.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

export class EmbeddingService implements IEmbeddingService {
  constructor(private readonly instrumentationService: IInstrumentationService) {}

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    return this.instrumentationService.startSpan(
      { name: 'EmbeddingService > embedDocuments', op: 'ai.run' },
      async () => {
        // embedMany splits the batch to the provider's per-call cap and returns
        // vectors in input order. inputType must be search_document — the SDK
        // default is search_query, which would embed chunks as if they were
        // queries and quietly degrade recall.
        const { embeddings } = await embedMany({
          model: MODELS.embed,
          values: texts,
          telemetry: { functionId: 'embed-documents' },
          providerOptions: { cohere: { inputType: 'search_document' } },
        });
        return embeddings;
      },
    );
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.instrumentationService.startSpan({ name: 'EmbeddingService > embedQuery', op: 'ai.run' }, async () => {
      // inputType search_query is the asymmetric counterpart to the
      // search_document type stored chunks use — matching them is what makes
      // the cosine distance meaningful.
      const { embedding } = await embed({
        model: MODELS.embed,
        value: text,
        telemetry: { functionId: 'embed-query' },
        providerOptions: { cohere: { inputType: 'search_query' } },
      });
      return embedding;
    });
  }
}
