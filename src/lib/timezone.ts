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
