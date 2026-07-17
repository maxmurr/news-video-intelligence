/**
 * Date labels render in two phases: a deterministic UTC label for SSR and the
 * first client render (so hydration never diverges via locale / ICU / `Date`
 * timezone quirks), then the viewer's local timezone after mount via
 * `useLocalDateLabel`. Anything user-visible should end up local — a Bangkok
 * analyst's 9am upload must not file under yesterday's UTC day.
 */

export type DateLabelStyle = 'date' | 'time' | 'datetime';

const LABEL_OPTIONS: Record<DateLabelStyle, Intl.DateTimeFormatOptions> = {
  date: { month: 'short', day: 'numeric', year: 'numeric' },
  time: { hour: 'numeric', minute: '2-digit' },
  datetime: { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' },
};

/** e.g. "Jul 17, 2026", "1:22 PM" — UTC when `zone` is 'UTC', else viewer-local. */
export function formatDateLabel(iso: string, style: DateLabelStyle, zone?: 'UTC'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleString('en-US', { ...LABEL_OPTIONS[style], timeZone: zone });
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})/;

/** UTC calendar day from an ISO timestamp, e.g. "2026-07-17". */
export function utcDayKey(iso: string): string | null {
  const match = ISO_DAY.exec(iso);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

/** Calendar day in the viewer's timezone. Client-side only after hydration. */
export function localDayKey(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Heading for a `YYYY-MM-DD` day key, e.g. "Fri, Jul 17, 2026". The weekday of
 * a calendar date is zone-independent, so this is safe for both UTC and local
 * day keys.
 */
export function formatDayHeading(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  if (!year || !month || !day) return dayKey;
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
