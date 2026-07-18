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

const pad2 = (n: number) => String(n).padStart(2, '0');

/** UTC calendar day from a Date, e.g. "2026-07-13". */
function utcDay(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/**
 * The viewer's IANA timezone, e.g. "Asia/Bangkok". Client-side only; the
 * server has no way to know it, so the client sends it with each chat request.
 */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/**
 * Narrow an untrusted timezone (e.g. from a request body) to a usable IANA
 * zone, falling back to UTC. `Intl` throws `RangeError` on an unknown zone, so
 * constructing a formatter is the validation.
 */
export function resolveTimeZone(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return value;
  } catch {
    return 'UTC';
  }
}

type ZoneParts = { year: string; month: string; day: string; hour: string; minute: string };

/** Wall-clock calendar/clock fields for `date` as seen in `timeZone`. */
function zoneParts(date: Date, timeZone: string): ZoneParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
  // en-US hour12:false renders midnight as "24" in some ICU builds.
  const hour = get('hour') === '24' ? '00' : get('hour');
  return { year: get('year'), month: get('month'), day: get('day'), hour, minute: get('minute') };
}

/** UTC±HH:MM offset label for `timeZone` at `date`, e.g. "UTC+07:00". */
function zoneOffset(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' }).formatToParts(date);
  const raw = parts.find(part => part.type === 'timeZoneName')?.value ?? 'GMT';
  const offset = raw.replace('GMT', '').trim();
  return `UTC${offset || '+00:00'}`;
}

/**
 * A DATE & TIME block for a chat system prompt so the model can resolve
 * relative references ("today", "tomorrow", "3pm") against a fixed clock in the
 * viewer's own timezone — the same zone the desk shows upload and broadcast
 * times in, so its answers stay consistent with what the user sees. Built from
 * `now` at request time (a stale hardcoded date is worse than none). `now` and
 * `timeZone` are injectable for tests; `timeZone` must already be validated
 * (see `resolveTimeZone`) and falls back to UTC.
 */
export function formatDateTimeContext(now: Date = new Date(), timeZone = 'UTC'): string {
  const parts = zoneParts(now, timeZone);
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const nextDay = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const tomorrow = utcDay(nextDay);
  const prettyNow = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(now);

  return [
    '=== DATE & TIME ===',
    `Timezone: ${timeZone} (${zoneOffset(now, timeZone)})`,
    `Now: ${prettyNow} ${parts.hour}:${parts.minute}`,
    `Tomorrow: ${tomorrow}`,
    '',
    `ALL user times are in ${timeZone}. Do not convert to another timezone.`,
    `When no date is specified, use TODAY (${today}).`,
    'Time format: YYYY-MM-DDTHH:MM:SS (no Z suffix, local wall-clock time).',
    `Example: "3pm" → ${today}T15:00:00`,
  ].join('\n');
}
