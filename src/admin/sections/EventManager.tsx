import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/upload';
import { SectionHeader, Card, EmptyState, ConfirmButton } from '../ui';
import type { WeddingEvent, Venue, SiteSettings } from '@/types';
import { Calendar, Plus, Loader2, ChevronDown, Clock, MapPin, Trash2, X, Upload, CalendarPlus } from 'lucide-react';

function formatTime(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}
function formatTimeOnly(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function downloadIcs(event: WeddingEvent, settings: SiteSettings | null) {
  const p1 = settings?.partner1_name || '';
  const p2 = settings?.partner2_name || '';
  const prefix = [p1, p2].filter(Boolean).join(' & ');
  const title = prefix ? `${prefix} - ${event.title}` : event.title;
  const desc = event.description || '';
  const loc = event.venue?.name || '';
  const start = event.start_time ? new Date(event.start_time) : null;
  const end = event.end_time ? new Date(event.end_time) : (start ? new Date(start.getTime() + 60 * 60 * 1000) : null);
  if (!start) return;
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Wedding//Event//EN',
    'BEGIN:VEVENT', `UID:${event.id}@wedding`,
    `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`,
    end ? `DTEND:${fmt(end)}` : '', `SUMMARY:${title}`,
    `DESCRIPTION:${desc}`, `LOCATION:${loc}`, 'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${title.replace(/[^a-z0-9]+/gi, '-')}.ics`; a.click();
  URL.revokeObjectURL(url);
}

export default function EventManager() {
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adding, setAdding] = useState<null | { parentId: string | null }>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data }, { data: v }, { data: s }] = await Promise.all([
      supabase.from('events').select('*, venue:venues(*)').order('display_order'),
      supabase.from('venues').select('*').order('name'),
      supabase.from('site_settings').select('*').maybeSingle(),
    ]);
    setVenues(v as Venue[] || []);
    setEvents(data as unknown as WeddingEvent[] || []);
    setSettings(s as SiteSettings || null);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const mainEvents = events.filter((e) => !e.parent_id).sort((a, b) => a.display_order - b.display_order);
  const subsOf = (id: string) => events.filter((e) => e.parent_id === id).sort((a, b) => a.display_order - b.display_order);

  const createEvent = async (data: Partial<WeddingEvent>, parentId?: string | null | undefined) => {
    const pid = parentId ?? null;
    const order = pid ? subsOf(pid).length : mainEvents.length;
    await supabase.from('events').insert({
      title: data.title, description: data.description,
      start_time: data.start_time || null, end_time: data.end_time || null,
      parent_id: pid, venue_id: data.venue_id || null,
      rsvp_enabled: data.rsvp_enabled ?? true,
      display_order: order, photo_url: data.photo_url || null,
    });
    setAdding(null); load();
  };

  const updateEvent = async (id: string, data: Partial<WeddingEvent>) => {
    await supabase.from('events').update({
      title: data.title, description: data.description,
      start_time: data.start_time || null, end_time: data.end_time || null,
      venue_id: data.venue_id || null, rsvp_enabled: data.rsvp_enabled ?? true,
      show_location: data.show_location ?? true, show_venue_photo: data.show_venue_photo ?? true,
      photo_url: data.photo_url || null,
    }).eq('id', id);
    setEditingId(null); load();
  };;

  const deleteEvent = async (id: string) => {
    await supabase.from('events').delete().eq('id', id);
    load();
  };

  const toggleRsvp = async (ev: WeddingEvent) => {
    await supabase.from('events').update({ rsvp_enabled: !ev.rsvp_enabled }).eq('id', ev.id);
    load();
  };

  const editingEvent = editingId ? events.find((e) => e.id === editingId) || null : null;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8a6d3b]" /></div>;

  return (
    <div>
      <SectionHeader title="Events" subtitle="Create main events and nest sub-events beneath them"
        action={<button onClick={() => setAdding({ parentId: null })} className="btn-primary flex items-center gap-1.5"><Plus size={16} /> Main Event</button>} />

      {mainEvents.length === 0 && !adding && (
        <Card><EmptyState icon={Calendar} title="No events yet" hint="Create your ceremony, reception, and more" /></Card>
      )}

      <div className="space-y-3">
        {mainEvents.map((ev) => (
          <div key={ev.id} className="admin-card overflow-hidden">
            <div className="flex items-center gap-3 p-3">
              <button onClick={() => setExpanded(expanded === ev.id ? null : ev.id)} className="text-[#8a7a66] hover:text-[#5a4430]">
                <ChevronDown size={18} className={`transition-transform ${expanded === ev.id ? 'rotate-180' : ''}`} />
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#3a2e22] text-sm">{ev.title}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#8a7a66] mt-0.5">
                  {ev.start_time && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {formatTime(ev.start_time)}
                      {ev.end_time && <> &ndash; {formatTimeOnly(ev.end_time)}</>}
                    </span>
                  )}
                  {ev.venue && <span className="flex items-center gap-1"><MapPin size={11} /> {ev.venue.name}</span>}
                </div>
              </div>
              <label className="flex items-center gap-1 text-xs text-[#8a7a66] cursor-pointer">
                <input type="checkbox" checked={ev.rsvp_enabled} onChange={() => toggleRsvp(ev)} className="accent-[#8a6d3b]" />
                RSVP
              </label>
              <button onClick={() => setEditingId(ev.id)} className="text-xs text-[#8a7a66] hover:text-[#5a4430] font-medium">Edit</button>
              <button onClick={() => downloadIcs(ev, settings)} title="Add to Calendar" className="text-[#8a7a66] hover:text-[#5a7a4a]"><CalendarPlus size={14} /></button>
              <ConfirmButton onConfirm={() => deleteEvent(ev.id)}><Trash2 size={14} /></ConfirmButton>
            </div>
            {ev.description && <p className="px-3 pb-2 text-xs text-[#8a7a66]">{ev.description}</p>}

            {expanded === ev.id && (
              <div className="border-t p-3 space-y-2" style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#6b5d4f]">Sub-Events ({subsOf(ev.id).length})</span>
                  <button onClick={() => setAdding({ parentId: ev.id })} className="text-xs text-[#8a6d3b] font-semibold flex items-center gap-1"><Plus size={12} /> Add</button>
                </div>
                {subsOf(ev.id).map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2 rounded-lg border p-2" style={{ borderColor: '#e6ddcd', background: '#fff' }}>
                    <Clock size={13} className="text-[#a07c4a] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#3a2e22] truncate">{sub.title}</p>
                      {sub.start_time && (
                        <p className="text-xs text-[#8a7a66]">
                          {formatTimeOnly(sub.start_time)}
                          {sub.end_time && <> &ndash; {formatTimeOnly(sub.end_time)}</>}
                        </p>
                      )}
                    </div>
                    <button onClick={() => setEditingId(sub.id)} className="text-xs text-[#8a7a66] hover:text-[#5a4430]">Edit</button>
                    <ConfirmButton onConfirm={() => deleteEvent(sub.id)}><Trash2 size={12} /></ConfirmButton>
                  </div>
                ))}
                {subsOf(ev.id).length === 0 && <p className="text-xs text-[#8a7a66] italic">No sub-events yet.</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {adding && <EventForm venues={venues} parentId={adding.parentId} onCancel={() => setAdding(null)} onSave={createEvent} />}
      {editingId && editingEvent && <EventForm venues={venues} parentId={editingEvent.parent_id} event={editingEvent} onCancel={() => setEditingId(null)} onSave={(data) => updateEvent(editingId, data)} />}
    </div>
  );
}

function EventForm({ venues, parentId, event, onCancel, onSave }: {
  venues: Venue[];
  parentId: string | null;
  event?: WeddingEvent;
  onCancel: () => void;
  onSave: (d: Partial<WeddingEvent>, p?: string | null | undefined) => void;
}) {
  const toLocal = (iso: string | null | undefined) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [form, setForm] = useState<Partial<WeddingEvent>>({
    title: event?.title || '',
    description: event?.description || '',
    start_time: event?.start_time ? toLocal(event.start_time) : '',
    end_time: event?.end_time ? toLocal(event.end_time) : '',
    venue_id: event?.venue_id || '',
    show_location: event?.show_location ?? true,
    show_venue_photo: event?.show_venue_photo ?? true,
    rsvp_enabled: event?.rsvp_enabled ?? true,
    photo_url: event?.photo_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = async (file: File) => {
    setPhotoUploading(true);
    const url = await uploadImage(file, 'events');
    if (url) setForm((f) => ({ ...f, photo_url: url }));
    setPhotoUploading(false);
  };

  const save = async () => {
    if (!form.title?.trim()) return;
    setSaving(true);
    await onSave({
      ...form,
      start_time: form.start_time ? new Date(form.start_time as string).toISOString() : null,
      end_time: form.end_time ? new Date(form.end_time as string).toISOString() : null,
      venue_id: form.venue_id || null,
    }, parentId);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onCancel}>
      <div className="admin-card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#3a2e22]">{event ? 'Edit Event' : parentId ? 'Add Sub-Event' : 'Add Main Event'}</h3>
          <button onClick={onCancel}><X size={18} className="text-[#8a7a66]" /></button>
        </div>
        <div className="space-y-3">
          <div><label className="admin-label">Title *</label><input className="admin-input" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ceremony, Reception..." /></div>
          <div><label className="admin-label">Description</label><input className="admin-input" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Start Time</label>
              <input type="datetime-local" className="admin-input" value={form.start_time as string || ''} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div>
              <label className="admin-label">End Time</label>
              <input type="datetime-local" className="admin-input" value={form.end_time as string || ''} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>
          {form.start_time && (
            <p className="text-xs text-[#a07c4a]">
              {formatTimeOnly(new Date(form.start_time as string).toISOString())}
              {form.end_time && <> &ndash; {formatTimeOnly(new Date(form.end_time as string).toISOString())}</>}
            </p>
          )}
          <div><label className="admin-label">Venue</label>
            <select className="admin-input" value={form.venue_id || ''} onChange={(e) => setForm({ ...form, venue_id: e.target.value })}>
              <option value="">No venue</option>
              {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-[#5a4430]">
              <input type="checkbox" checked={form.show_location ?? true} onChange={(e) => setForm({ ...form, show_location: e.target.checked })} className="accent-[#8a6d3b]" />
              Show GPS location
            </label>
            <label className="flex items-center gap-2 text-sm text-[#5a4430]">
              <input type="checkbox" checked={form.show_venue_photo ?? true} onChange={(e) => setForm({ ...form, show_venue_photo: e.target.checked })} className="accent-[#8a6d3b]" />
              Show venue photo
            </label>
          </div>
          <div>
            <label className="admin-label">Attached Photo {parentId ? '(Sub-Event)' : '(Optional)'}</label>
            <div onClick={() => fileRef.current?.click()} className="rounded-lg border-2 border-dashed p-2.5 text-center cursor-pointer transition hover:border-[#8a6d3b]" style={{ borderColor: '#d6cdbf', background: '#faf6ee' }}>
              {photoUploading ? <div className="flex items-center justify-center gap-2 text-sm text-[#8a7a66]"><Loader2 size={16} className="animate-spin" /> Uploading...</div>
                : form.photo_url ? <div><img src={form.photo_url} alt="" className="w-full max-h-24 object-cover rounded mb-1" /><p className="text-xs text-[#5a7a4a]">Click to replace</p></div>
                : <div><Upload size={16} className="mx-auto text-[#a07c4a] mb-1" /><p className="text-xs text-[#6b5d4f]">Click to upload a photo</p></div>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhoto(f); }} />
            {form.photo_url && <button type="button" onClick={() => setForm({ ...form, photo_url: '' })} className="text-xs text-[#b03a3a] mt-1">Remove photo</button>}
          </div>
          <label className="flex items-center gap-2 text-sm text-[#5a4430]">
            <input type="checkbox" checked={form.rsvp_enabled ?? true} onChange={(e) => setForm({ ...form, rsvp_enabled: e.target.checked })} className="accent-[#8a6d3b]" />
            Show on RSVP form
          </label>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Event'}</button>
        </div>
      </div>
    </div>
  );
}
