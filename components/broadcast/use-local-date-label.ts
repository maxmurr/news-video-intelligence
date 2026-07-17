'use client';

import * as React from 'react';
import { formatDateLabel, type DateLabelStyle } from '@/lib/dates';

const emptySubscribe = () => () => {};

/** False on the server and during hydration, true once the client took over. */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/**
 * Two-phase date label: deterministic UTC for SSR + hydration, the viewer's
 * timezone once hydrated. The swap is text-only, so layout never shifts.
 */
export function useLocalDateLabel(iso: string, style: DateLabelStyle): string {
  const hydrated = useHydrated();
  return formatDateLabel(iso, style, hydrated ? undefined : 'UTC');
}
