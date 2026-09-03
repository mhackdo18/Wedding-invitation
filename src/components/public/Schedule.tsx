import { useMemo } from 'react';
import type { WeddingEvent, TypeStyle } from '@/types';
import { typeStyle } from '@/lib/typography';
import HeroImage from '@/components/public/HeroImage';
import { Reveal } from '@/components/public/Reveal';
import { Clock, MapPin, CalendarPlus, Navigation, Navigation2 } from 'lucide-react';

function addToCalendar(ev: WeddingEvent, partner1?: string, partner2?: string) {
  const start = ev.start_time ? new Date(ev.start_time) : new Date();
  const end = ev.end_time ? new Date(ev.end_time) : new Date(start.getTime() + 60 * 60 * 1000);
  const fmtICS = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const venueLine = ev.venue ? `${ev.venue.name}${ev.venue.address ? `, ${ev.venue.address}` : ''}` : '';
  const prefix = [partner1, partner2].filter(Boolean).join(' & ');
  const title = prefix ? `${prefix} - ${ev.title}` : ev.title;
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Wedding//EN',
    'BEGIN:VEVENT',
    `UID:${ev.id}@wedding`,
    `DTSTART:${fmtICS(start)}`,
    `DTEND:${fmtICS(end)}`,
    `SUMMARY:${title}`,
    ev.description ? `DESCRIPTION:${ev.description}` : '',
    venueLine ? `LOCATION:${venueLine}` : '',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function getDirections(ev: WeddingEvent) {
  if (ev.venue?.map_url) {
    window.open(ev.venue.map_url, '_blank');
  } else {
    const q = ev.venue?.address || ev.venue?.name || ev.title;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank');
  }
}

function formatRange(start: string | null, end: string | null): string {
  const fmt = (t: string) => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (!start) return '';
  if (end && end !== start) return `${fmt(start)} – ${fmt(end)}`;
  return fmt(start);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function getEventDate(ev: WeddingEvent): string {
  if (!ev.start_time) return '';
  return new Date(ev.start_time).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function Schedule({
  events, typo, partner1, partner2, heroImageUrl, animEnabled,
}: { events: WeddingEvent[]; typo: Record<string, TypeStyle>; partner1?: string; partner2?: string; heroImageUrl?: string; animEnabled?: boolean }) {
  if (!events.length) return null;

  const dateGroups = useMemo(() => {
    const groups: { date: string; dateLabel: string; events: WeddingEvent[] }[] = [];
    const map = new Map<string, WeddingEvent[]>();
    const order: string[] = [];
    for (const ev of events) {
      const d = getEventDate(ev);
      const key = d || 'no-date';
      if (!map.has(key)) { map.set(key, []); order.push(key); }
      map.get(key)!.push(ev);
    }
    for (const key of order) {
      const evts = map.get(key)!;
      const dateLabel = key === 'no-date' ? '' : formatDate(evts[0].start_time!);
      groups.push({ date: key, dateLabel, events: evts });
    }
    return groups;
  }, [events]);

  const hasMultipleDates = dateGroups.length > 1 || (dateGroups.length === 1 && dateGroups[0].dateLabel);

  return (
    <section className="px-6 py-8">
      <div className="text-center mb-5">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="h-px w-8" style={{ background: typo.scheduleTitle?.color || '#c9b896' }} />
          <h2 style={{ fontFamily: 'var(--heading-font)', fontSize: 26, color: '#5a4430', margin: 0, ...typeStyle(typo.scheduleTitle) }}>
            Order of Events
          </h2>
          <span className="h-px w-8" style={{ background: typo.scheduleTitle?.color || '#c9b896' }} />
        </div>
      </div>

      <HeroImage url={heroImageUrl || ''} alt="Order of Events" />

      <div className="max-w-md mx-auto space-y-6">
        {dateGroups.map((group) => (
          <div key={group.date}>
            {hasMultipleDates && group.dateLabel && (
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ background: typo.eventDate?.color || '#d6cdbf' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#8a6d3b', letterSpacing: '0.03em', whiteSpace: 'nowrap', ...typeStyle(typo.eventDate) }}>
                  {group.dateLabel}
                </span>
                <div className="flex-1 h-px" style={{ background: typo.eventDate?.color || '#d6cdbf' }} />
              </div>
            )}
            {!hasMultipleDates && group.dateLabel && (
              <p className="text-center mb-4" style={{ fontSize: 14, color: '#8a6d3b', fontWeight: 500, ...typeStyle(typo.eventDate) }}>{group.dateLabel}</p>
            )}

            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-px" style={{ background: typo.eventTime?.color || typo.eventDate?.color || '#d6cdbf' }} />
              <div className="space-y-6">
                {group.events.map((ev, evIdx) => {
                  const showLoc = ev.show_location !== false;
                  const showPhoto = ev.show_venue_photo !== false;
                  return (
                    <Reveal key={ev.id} enabled={!!animEnabled} animation="fade-up" delay={evIdx * 60} className="relative pl-10">
                      <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full" style={{ background: typo.eventTime?.color || '#b5462f', border: '2px solid var(--page-color)' }} />
                      {ev.start_time && (
                        <span style={{ fontSize: 13, color: '#a07c4a', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', ...typeStyle(typo.eventTime) }}>
                          {formatRange(ev.start_time, ev.end_time)}
                        </span>
                      )}
                      <h3 style={{ fontFamily: 'var(--heading-font)', fontSize: 20, color: '#5a4430', margin: '4px 0 0', ...typeStyle(typo.eventName) }}>
                        {ev.title}
                      </h3>

                      {ev.description && (
                        <p style={{ fontSize: 13, color: '#8a7a66', marginTop: 4, ...typeStyle(typo.eventDescription) }}>{ev.description}</p>
                      )}

                      {showLoc && ev.venue && (
                        <div className="mt-2 rounded-lg overflow-hidden" style={{ background: 'rgba(138,109,59,0.06)', border: '1px solid rgba(138,109,59,0.12)' }}>
                          {showPhoto && ev.venue.photo_url && (
                            <img src={ev.venue.photo_url} alt={ev.venue.name} className="w-full max-h-32 object-cover" />
                          )}
                          <div className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <Navigation2 size={13} style={{ color: '#8a6d3b' }} />
                              <span className="text-xs font-semibold" style={{ color: '#5a4430', ...typeStyle(typo.venueName) }}>{ev.venue.name}</span>
                            </div>
                            {ev.venue.address && (
                              <p className="text-xs mt-0.5" style={{ color: '#8a7a66', ...typeStyle(typo.venueLocation) }}>{ev.venue.address}</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 mt-2.5">
                        <button onClick={() => addToCalendar(ev, partner1, partner2)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition hover:opacity-80" style={{ background: 'rgba(138,109,59,0.12)', color: '#8a6d3b' }}>
                          <CalendarPlus size={12} /> Add to Calendar
                        </button>
                        {showLoc && ev.venue && (
                          <button onClick={() => getDirections(ev)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition hover:opacity-80" style={{ background: 'rgba(90,122,74,0.12)', color: '#5a7a4a' }}>
                            <Navigation size={12} /> Get Directions
                          </button>
                        )}
                      </div>

                      {ev.sub_events && ev.sub_events.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {ev.sub_events.map((sub) => (
                            <div key={sub.id} className="pl-3 border-l-2" style={{ borderColor: typo.subEventTime?.color || typo.eventTime?.color || '#e0d4be' }}>
                              {sub.start_time && (
                                <span style={{ fontSize: 11, color: '#a07c4a', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', ...typeStyle(typo.subEventTime) }}>
                                  {formatRange(sub.start_time, sub.end_time)}
                                </span>
                              )}
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Clock size={11} style={{ color: typo.subEventTime?.color || '#c9b896' }} />
                                <span style={{ fontSize: 14, color: '#6b5d4f', ...typeStyle(typo.subEventName) }} className="truncate">
                                  {sub.title}
                                </span>
                              </div>
                              {sub.description && (
                                <p style={{ fontSize: 12, color: '#a08c7a', marginTop: 2, marginBottom: 4, ...typeStyle(typo.subEventDescription) }}>{sub.description}</p>
                              )}
                              {sub.photo_url && (
                                <img src={sub.photo_url} alt={sub.title} className="w-full max-h-32 object-cover rounded-lg mt-2 mb-1" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
