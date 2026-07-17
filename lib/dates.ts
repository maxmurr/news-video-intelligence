/**
 * Deterministic UTC date labels for SSR + client hydration.
 * Prefer the ISO calendar date (`YYYY-MM-DD`) so server and client never diverge
 * via locale / ICU / `Date` timezone quirks.
 */

const UTC_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})/;

/** UTC calendar day from an ISO timestamp, e.g. "2026-07-17". */
export function utcDayKey(iso: string): string | null {
  const match = ISO_DAY.exec(iso);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

/** e.g. "Jul 17, 2026" — identical on server and client. */
export function formatUtcDateLabel(iso: string): string {
  const day = utcDayKey(iso);
  if (day) {
    const [year, month, date] = day.split('-').map(Number);
    return `${UTC_MONTHS[month - 1]} ${date}, ${year}`;
  }

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Unknown date';
  return `${UTC_MONTHS[parsed.getUTCMonth()]} ${parsed.getUTCDate()}, ${parsed.getUTCFullYear()}`;
}
