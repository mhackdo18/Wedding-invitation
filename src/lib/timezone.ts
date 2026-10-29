// Timezone handling built around fixed UTC offsets (UTC-12 .. UTC+14).
// A wedding's timezone is stored as a value like "UTC", "UTC+8", or "UTC-5".
// Wall-clock times entered by the coordinator are interpreted in that offset
// and converted to a UTC instant for storage; display formats render in the
// same offset so guests see the date/time the coordinator intended. The
// countdown compares two absolute instants, so it stays correct for every
// visitor regardless of their own local timezone.

const OFFSET_CITIES: Record<string, string> = {
  'UTC-12': 'Baker Island',
  'UTC-11': 'American Samoa',
  'UTC-10': 'Hawaii',
  'UTC-9': 'Alaska',
  'UTC-8': 'Los Angeles, Vancouver',
  'UTC-7': 'Denver, Phoenix',
  'UTC-6': 'Chicago, Mexico City',
  'UTC-5': 'New York, Bogota',
  'UTC-4': 'Halifax, Caracas',
  'UTC-3': 'Buenos Aires, Sao Paulo',
  'UTC-2': 'Mid-Atlantic',
  'UTC-1': 'Azores',
  'UTC': 'London, Accra',
  'UTC+1': 'Paris, Lagos',
  'UTC+2': 'Cairo, Athens',
  'UTC+3': 'Moscow, Nairobi',
  'UTC+4': 'Dubai, Baku',
  'UTC+5': 'Karachi, Tashkent',
  'UTC+6': 'Dhaka, Almaty',
  'UTC+7': 'Bangkok, Jakarta',
  'UTC+8': 'Beijing, Manila, Perth',
  'UTC+9': 'Tokyo, Seoul',
  'UTC+10': 'Sydney, Melbourne',
  'UTC+11': 'Solomon Islands',
  'UTC+12': 'Auckland, Fiji',
  'UTC+13': 'Samoa',
  'UTC+14': 'Kiribati',
};

const OFFSET_ORDER = [
  'UTC-12','UTC-11','UTC-10','UTC-9','UTC-8','UTC-7','UTC-6','UTC-5','UTC-4','UTC-3','UTC-2','UTC-1',
  'UTC','UTC+1','UTC+2','UTC+3','UTC+4','UTC+5','UTC+6','UTC+7','UTC+8','UTC+9','UTC+10','UTC+11','UTC+12','UTC+13','UTC+14',
];

export function getTimezoneOptions(): { label: string; value: string }[] {
  return OFFSET_ORDER.map((value) => {
    const cities = OFFSET_CITIES[value];
    return { value, label: cities ? `${value}  —  ${cities}` : value };
  });
}

// Parse a stored timezone value ("UTC", "UTC+8", "UTC-5", "UTC+5:30") into
// signed minutes east of UTC. Unknown / legacy IANA values fall back to 0.
export function offsetMinutes(timezone: string | null): number {
  if (!timezone) return 0;
  if (timezone === 'UTC' || timezone === 'UTC+0' || timezone === 'UTC-0') return 0;
  const m = timezone.match(/^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!m) return 0;
  const sign = m[1] === '+' ? 1 : -1;
  const h = parseInt(m[2], 10) || 0;
  const min = m[3] ? parseInt(m[3], 10) : 0;
  return sign * (h * 60 + min);
}

export function isRsvpClosed(deadline: string | null): boolean {
  if (!deadline) return false;
  return new Date().getTime() >= new Date(deadline).getTime();
}

// Convert a local "YYYY-MM-DDTHH:MM" string (from a datetime-local input),
// interpreted as a wall-clock time in the given UTC offset, into a UTC ISO
// string. UTC = wallclock - offset.
export function localToUtcIso(localString: string, timezone: string | null): string {
  const [datePart, timePart] = localString.split('T');
  const [Y, M, D] = datePart.split('-').map(Number);
  const [H, min] = (timePart || '00:00').split(':').map(Number);
  const wallUtcMs = Date.UTC(Y, (M || 1) - 1, D || 1, H || 0, min || 0, 0, 0);
  const utcMs = wallUtcMs - offsetMinutes(timezone) * 60000;
  const d = new Date(utcMs);
  return isNaN(d.getTime()) ? new Date(localString).toISOString() : d.toISOString();
}

// Inverse of localToUtcIso: render a stored UTC ISO instant back into the
// "YYYY-MM-DDTHH:MM" format a datetime-local input expects, shown in the
// given UTC offset.
export function utcToLocalInput(isoString: string | null, timezone: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const shifted = new Date(d.getTime() + offsetMinutes(timezone) * 60000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

// Format an ISO instant in the given UTC offset. We shift the instant by the
// offset and format with timeZone: 'UTC' so Intl reads our computed wall-clock
// components, giving correct date/time formatting without DST ambiguity.
export function formatInTimezone(
  isoString: string | null,
  timezone: string | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const fmt: Intl.DateTimeFormatOptions = options || {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  try {
    const shifted = new Date(d.getTime() + offsetMinutes(timezone) * 60000);
    return new Intl.DateTimeFormat('en-US', { ...fmt, timeZone: 'UTC' }).format(shifted);
  } catch {
    return new Intl.DateTimeFormat('en-US', fmt).format(d);
  }
}

export function formatDeadlineLong(deadline: string | null, timezone: string | null): string {
  if (!deadline) return '';
  return formatInTimezone(deadline, timezone, { dateStyle: 'long', timeStyle: 'short' });
}

export function formatDeadlineDate(deadline: string | null, timezone: string | null): string {
  if (!deadline) return '';
  return formatInTimezone(deadline, timezone, { dateStyle: 'long' });
}

// Format the wedding date for public display in the wedding's timezone.
export function formatWeddingDate(isoString: string | null, timezone: string | null): string {
  if (!isoString) return '';
  return formatInTimezone(isoString, timezone, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}
