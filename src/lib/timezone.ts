const COMMON_TIMEZONES: { label: string; value: string }[] = [
  { label: 'UTC', value: 'UTC' },
  { label: 'US Eastern (New York)', value: 'America/New_York' },
  { label: 'US Central (Chicago)', value: 'America/Chicago' },
  { label: 'US Mountain (Denver)', value: 'America/Denver' },
  { label: 'US Pacific (Los Angeles)', value: 'America/Los_Angeles' },
  { label: 'US Arizona (Phoenix)', value: 'America/Phoenix' },
  { label: 'US Alaska (Anchorage)', value: 'America/Anchorage' },
  { label: 'US Hawaii (Honolulu)', value: 'Pacific/Honolulu' },
  { label: 'Canada Eastern (Toronto)', value: 'America/Toronto' },
  { label: 'Canada Pacific (Vancouver)', value: 'America/Vancouver' },
  { label: 'UK (London)', value: 'Europe/London' },
  { label: 'Ireland (Dublin)', value: 'Europe/Dublin' },
  { label: 'Western Europe (Paris)', value: 'Europe/Paris' },
  { label: 'Central Europe (Berlin)', value: 'Europe/Berlin' },
  { label: 'Eastern Europe (Athens)', value: 'Europe/Athens' },
  { label: 'Middle East (Dubai)', value: 'Asia/Dubai' },
  { label: 'India (Kolkata)', value: 'Asia/Kolkata' },
  { label: 'Singapore', value: 'Asia/Singapore' },
  { label: 'Philippines (Manila)', value: 'Asia/Manila' },
  { label: 'Hong Kong', value: 'Asia/Hong_Kong' },
  { label: 'Japan (Tokyo)', value: 'Asia/Tokyo' },
  { label: 'Korea (Seoul)', value: 'Asia/Seoul' },
  { label: 'Australia East (Sydney)', value: 'Australia/Sydney' },
  { label: 'Australia West (Perth)', value: 'Australia/Perth' },
  { label: 'New Zealand (Auckland)', value: 'Pacific/Auckland' },
  { label: 'Brazil (Sao Paulo)', value: 'America/Sao_Paulo' },
  { label: 'Mexico (Mexico City)', value: 'America/Mexico_City' },
  { label: 'South Africa (Johannesburg)', value: 'Africa/Johannesburg' },
];

export function getTimezoneOptions() {
  return COMMON_TIMEZONES;
}

export function isRsvpClosed(deadline: string | null, timezone: string | null): boolean {
  if (!deadline) return false;
  return new Date().getTime() >= new Date(deadline).getTime();
}

// Convert a local "YYYY-MM-DDTHH:MM" string (as produced by a datetime-local input)
// into a UTC ISO string, interpreting the wall-clock time in the given timezone.
// This ensures the stored deadline represents the moment the coordinator intended.
export function localToUtcIso(localString: string, timezone: string | null): string {
  const tz = timezone || 'UTC';
  const naive = new Date(localString + ':00'); // interpreted as UTC by Date when no offset
  if (isNaN(naive.getTime())) return new Date(localString).toISOString();
  try {
    // Find the offset of `timezone` at this wall-clock time by formatting a reference
    // instant and measuring the difference.
    const asUtc = naive.getTime();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(naive);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || '0';
    const reassembled = Date.UTC(
      parseInt(get('year'), 10),
      parseInt(get('month'), 10) - 1,
      parseInt(get('day'), 10),
      (parseInt(get('hour'), 10) === 24 ? 0 : parseInt(get('hour'), 10)),
      parseInt(get('minute'), 10),
      parseInt(get('second'), 10),
    );
    const offset = asUtc - reassembled;
    return new Date(asUtc + offset).toISOString();
  } catch {
    return naive.toISOString();
  }
}

// Inverse of localToUtcIso: render a stored UTC ISO deadline back into the
// "YYYY-MM-DDTHH:MM" format a datetime-local input expects, shown in the given timezone.
export function utcToLocalInput(isoString: string | null, timezone: string | null): string {
  if (!isoString) return '';
  const tz = timezone || 'UTC';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || '0';
    const hh = get('hour') === '24' ? '00' : get('hour');
    return `${get('year')}-${get('month')}-${get('day')}T${hh}:${get('minute')}`;
  } catch {
    return d.toISOString().slice(0, 16);
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

export function formatInTimezone(
  isoString: string | null,
  timezone: string | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!isoString) return '';
  const tz = timezone || 'UTC';
  const fmt: Intl.DateTimeFormatOptions = options || {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  };
  try {
    return new Intl.DateTimeFormat('en-US', { ...fmt, timeZone: tz }).format(new Date(isoString));
  } catch {
    return new Intl.DateTimeFormat('en-US', fmt).format(new Date(isoString));
  }
}
