import { describe, expect, it } from 'vitest';
import { broadcastSeekHref, collectMessageSources, countMessageSources } from '@/lib/chat/message-sources';

describe('collectMessageSources', () => {
  it('groups moments from the same broadcast and sorts timecodes', () => {
    const sources = collectMessageSources([
      {
        type: 'source-url',
        sourceId: 'b1',
        title: 'Wildfires',
        url: '/v/b1?t=01:15',
      },
      {
        type: 'source-url',
        sourceId: 'b1',
        title: 'Wildfires',
        url: '/v/b1?t=00:30',
      },
      {
        type: 'source-url',
        sourceId: 'b2',
        title: 'Elections',
        url: '/v/b2?t=05:00',
      },
    ]);

    expect(sources).toEqual([
      {
        sourceId: 'b1',
        title: 'Wildfires',
        href: '/v/b1',
        timestamps: ['00:30', '01:15'],
      },
      {
        sourceId: 'b2',
        title: 'Elections',
        href: '/v/b2',
        timestamps: ['05:00'],
      },
    ]);
  });

  it('dedupes identical timecodes on one broadcast', () => {
    const sources = collectMessageSources([
      { type: 'source-url', sourceId: 'b1', title: 'Lead', url: '/v/b1?t=00:10' },
      { type: 'source-url', sourceId: 'b1', title: 'Lead', url: '/v/b1?t=00:10' },
    ]);

    expect(sources).toEqual([
      {
        sourceId: 'b1',
        title: 'Lead',
        href: '/v/b1',
        timestamps: ['00:10'],
      },
    ]);
  });

  it('ignores invalid timecode query values', () => {
    const sources = collectMessageSources([
      { type: 'source-url', sourceId: 'b1', title: 'Lead', url: '/v/b1?t=not-a-time' },
    ]);

    expect(sources[0]?.timestamps).toEqual([]);
  });
});

describe('countMessageSources', () => {
  it('counts unique broadcasts, not moments', () => {
    expect(
      countMessageSources([
        { type: 'source-url', sourceId: 'b1', title: 'A', url: '/v/b1?t=00:01' },
        { type: 'source-url', sourceId: 'b1', title: 'A', url: '/v/b1?t=00:02' },
        { type: 'source-url', sourceId: 'b2', title: 'B', url: '/v/b2?t=00:03' },
      ]),
    ).toBe(2);
  });
});

describe('broadcastSeekHref', () => {
  it('builds a detail path with an encoded timecode query', () => {
    expect(broadcastSeekHref('abc', '01:05')).toBe('/v/abc?t=01%3A05');
  });
});
