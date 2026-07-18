import { afterEach, describe, expect, it, vi } from 'vitest';

import { broadcastShareUrl, copyText, shareOrCopyUrl } from '@/lib/clipboard-share';

describe('broadcastShareUrl', () => {
  it('builds a canonical /v/ path without query params', () => {
    expect(broadcastShareUrl('desk-lead.mp4', 'https://news.example')).toBe('https://news.example/v/desk-lead.mp4');
  });

  it('encodes filenames safely', () => {
    expect(broadcastShareUrl('a b.mp4', 'https://news.example')).toBe('https://news.example/v/a%20b.mp4');
  });
});

describe('copyText', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await copyText('hello');

    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('throws when clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', {});

    await expect(copyText('hello')).rejects.toThrow('Clipboard unavailable');
  });
});

describe('shareOrCopyUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the system share sheet when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, clipboard: { writeText: vi.fn() } });

    await expect(shareOrCopyUrl({ title: 'Lead', url: 'https://news.example/v/a.mp4' })).resolves.toBe('shared');

    expect(share).toHaveBeenCalledWith({
      title: 'Lead',
      url: 'https://news.example/v/a.mp4',
      text: 'Lead',
    });
  });

  it('returns cancelled when the user dismisses the share sheet', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('Dismissed', 'AbortError'));
    vi.stubGlobal('navigator', { share, clipboard: { writeText: vi.fn() } });

    await expect(shareOrCopyUrl({ title: 'Lead', url: 'https://news.example/v/a.mp4' })).resolves.toBe('cancelled');
  });

  it('copies the URL when share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(shareOrCopyUrl({ title: 'Lead', url: 'https://news.example/v/a.mp4' })).resolves.toBe('copied');

    expect(writeText).toHaveBeenCalledWith('https://news.example/v/a.mp4');
  });
});
