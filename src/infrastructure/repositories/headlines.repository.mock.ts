import type { IHeadlinesRepository } from '@/src/application/repositories/headlines.repository.interface';
import type { Headline, HeadlineInsert } from '@/src/entities/models/headline';

export class MockHeadlinesRepository implements IHeadlinesRepository {
  private headlines: Headline[] = [];

  async replaceHeadlines(broadcastId: string, items: HeadlineInsert[]): Promise<Headline[]> {
    this.headlines = this.headlines.filter(headline => headline.broadcastId !== broadcastId);
    const now = new Date();
    const created: Headline[] = items.map((item, idx) => ({
      id: crypto.randomUUID(),
      broadcastId,
      idx,
      ...item,
      createdAt: now,
    }));
    this.headlines.push(...created);
    return created;
  }

  async getHeadlines(broadcastId: string): Promise<Headline[]> {
    return this.headlines.filter(headline => headline.broadcastId === broadcastId).sort((a, b) => a.idx - b.idx);
  }

  async getTopHeadlines(broadcastIds: string[]): Promise<{ broadcastId: string; headline: string }[]> {
    const wanted = new Set(broadcastIds);
    return this.headlines
      .filter(headline => headline.idx === 0 && wanted.has(headline.broadcastId))
      .map(headline => ({ broadcastId: headline.broadcastId, headline: headline.headline }));
  }
}
