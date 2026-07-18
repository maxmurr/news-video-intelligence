/** Extract a broadcast filename from a `/v/...` pathname, if present. */
export function broadcastFilenameFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/v\/([^/?#]+)/);
  if (!match?.[1]) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
