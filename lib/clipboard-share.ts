/** Copy plain text to the clipboard. Throws if the Clipboard API is unavailable. */
export async function copyText(text: string): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    throw new Error('Clipboard unavailable');
  }
  await navigator.clipboard.writeText(text);
}

export type ShareOrCopyResult = 'shared' | 'copied' | 'cancelled';

/**
 * Prefer the system share sheet; fall back to copying the URL when share is
 * unsupported or fails for a non-cancel reason.
 */
export async function shareOrCopyUrl({
  title,
  url,
  text,
}: {
  title: string;
  url: string;
  text?: string;
}): Promise<ShareOrCopyResult> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, url, text: text ?? title });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Fall through to clipboard when share is present but rejects (e.g. bad payload).
    }
  }

  await copyText(url);
  return 'copied';
}

/** Canonical broadcast page URL (no tab/query noise). */
export function broadcastShareUrl(
  filename: string,
  origin = typeof window !== 'undefined' ? window.location.origin : '',
): string {
  return `${origin}/v/${encodeURIComponent(filename)}`;
}
