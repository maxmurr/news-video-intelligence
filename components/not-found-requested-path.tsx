'use client';

import { usePathname } from 'next/navigation';
import { broadcastFilenameFromPathname } from '@/lib/not-found-path';

/** Shows the failed `/v/{filename}` segment so analysts can confirm the bad link. */
export function NotFoundRequestedPath() {
  const pathname = usePathname();
  const filename = broadcastFilenameFromPathname(pathname);

  if (!filename) return null;

  return (
    <p className="text-muted-foreground max-w-full text-xs leading-snug" title={filename}>
      Looking for <span className="font-mono break-all">{filename}</span>
    </p>
  );
}
