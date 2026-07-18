'use client';

import { usePathname } from 'next/navigation';
import { broadcastPathSegmentFromPathname } from '@/lib/not-found-path';

/** Shows the failed `/v/{id}` segment so analysts can confirm the bad link. */
export function NotFoundRequestedPath() {
  const pathname = usePathname();
  const segment = broadcastPathSegmentFromPathname(pathname);

  if (!segment) return null;

  return (
    <p className="text-muted-foreground max-w-full text-xs leading-snug" title={segment}>
      Looking for <span className="font-mono break-all">{segment}</span>
    </p>
  );
}
