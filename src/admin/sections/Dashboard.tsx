import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SectionHeader, StatCard } from '../ui';
import { Users, Calendar, Check, Image, Loader2, X, Clock, Copy } from 'lucide-react';
import { navigate } from '@/lib/router';
import type { WeddingEvent, GuestEventRsvp, Guest } from '@/types';

type GuestModalState = { title: string; guestIds: string[] } | null;

export default function Dashboard() {
  const [stats, setStats] = useState({ guests: 0, confirmed: 0, declined: 0, pending: 0, events: 0, photos: 0, invites: 0 });
  const [eventAttendance, setEventAttendance] = useState<Array<{ event: WeddingEvent; attending: number; declined: number; pending: number; attendingGuestIds: string[]; declinedGuestIds: string[]; pendingGuestIds: string[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [allGuests, setAllGuests] = useState<Guest[]>([]);
  const [modal, setModal] = useState<GuestModalState>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
    window.addEventListener('copy-toast', handler);
    return () => window.removeEventListener('copy-toast', handler);
  }, []);

  useEffect(() => {
    (async () => {
      const [{ count: guests }, { count: events }, { count: photos }, { count: invites }] = await Promise.all([
        supabase.from('guests').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }).is('parent_id', null),
        supabase.from('gallery_photos').select('*', { count: 'exact', head: true }),
        supabase.from('invitations').select('*', { count: 'exact', head: true }),
      ]);

      const [{ data: ev }, { data: rsvps }, { data: guestRows }] = await Promise.all([
        supabase.from('events').select('*').order('display_order'),
        supabase.from('guest_event_rsvps').select('*'),
        supabase.from('guests').select('*').order('name'),
      ]);
      const allEvents = ev as WeddingEvent[] || [];
      const allRsvps = rsvps as GuestEventRsvp[] || [];
      const guestsData = (guestRows as Guest[]) || [];
      setAllGuests(guestsData);

      let confirmedCount = 0;
      let declinedCount = 0;
      let pendingCount = 0;
      const confirmedIds: string[] = [];
      const declinedIds: string[] = [];
      const pendingIds: string[] = [];
      for (const g of guestsData) {
        if (g.rsvp_status === 'confirmed') { confirmedCount++; confirmedIds.push(g.id); }
        else if (g.rsvp_status === 'declined') { declinedCount++; declinedIds.push(g.id); }
        else { pendingCount++; pendingIds.push(g.id); }
      }

      const mainEvents = allEvents.filter((event) => !event.parent_id);
      const descendants = (eventId: string): string[] => {
        const children = allEvents.filter((event) => event.parent_id === eventId);
        return children.flatMap((child) => [child.id, ...descendants(child.id)]);
      };

      setStats({ guests: guests || 0, confirmed: confirmedCount, declined: declinedCount, pending: pendingCount, events: events || 0, photos: photos || 0, invites: invites || 0 });

      const attendance = mainEvents.map((event) => {
        const eventIds = new Set([event.id, ...descendants(event.id)]);
        const eventRsvps = allRsvps.filter((rsvp) => eventIds.has(rsvp.event_id));
        const rsvpGuestIds = new Set(eventRsvps.map((r) => r.guest_id));
        const attendingGuestIds = eventRsvps.filter((r) => r.status === 'yes').map((r) => r.guest_id);
        const declinedGuestIds = eventRsvps.filter((r) => r.status === 'no').map((r) => r.guest_id);
        const pendingGuestIds = guestsData.filter((g) => !rsvpGuestIds.has(g.id) || eventRsvps.some((r) => r.guest_id === g.id && r.status === 'pending')).map((g) => g.id);
        return {
          event,
          attending: attendingGuestIds.length,
          declined: declinedGuestIds.length,
          pending: pendingGuestIds.length,
          attendingGuestIds,
          declinedGuestIds,
          pendingGuestIds,
        };
      });
      setEventAttendance(attendance);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8a6d3b]" /></div>;

  const guestName = (id: string) => allGuests.find((g) => g.id === id)?.name || 'Unknown';

  const GuestModal = () => {
    if (!modal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={() => setModal(null)}>
        <div className="admin-card w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: '#e6ddcd' }}>
            <h3 className="font-semibold text-[#3a2e22]">{modal.title}</h3>
            <button onClick={() => setModal(null)}><X size={18} className="text-[#8a7a66]" /></button>
          </div>
          <div className="overflow-y-auto thin-scroll p-4 flex-1 min-h-0">
            {modal.guestIds.length === 0 ? (
              <p className="text-sm text-[#8a7a66] text-center py-6">No guests in this category.</p>
            ) : (
              <div className="space-y-1.5">
                {modal.guestIds.map((id) => (
                  <div key={id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#faf6ee' }}>
                    <Users size={14} className="text-[#a07c4a] shrink-0" />
                    <span className="text-sm text-[#3a2e22]">{guestName(id)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <SectionHeader title="Dashboard" subtitle="Overview of your wedding planning progress" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total Guests" value={stats.guests} icon={Users} tint="#8a6d3b" />
        <button onClick={() => setModal({ title: 'Confirmed Guests', guestIds: allGuests.filter((g) => g.rsvp_status === 'confirmed').map((g) => g.id) })} className="text-left transition hover:scale-[1.02]">
          <StatCard label="Confirmed" value={stats.confirmed} icon={Check} tint="#5a7a4a" />
        </button>
        <button onClick={() => setModal({ title: 'Declined Guests', guestIds: allGuests.filter((g) => g.rsvp_status === 'declined').map((g) => g.id) })} className="text-left transition hover:scale-[1.02]">
          <StatCard label="Declined" value={stats.declined} icon={X} tint="#b03a3a" />
        </button>
        <button onClick={() => setModal({ title: 'Pending Guests', guestIds: allGuests.filter((g) => g.rsvp_status !== 'confirmed' && g.rsvp_status !== 'declined').map((g) => g.id) })} className="text-left transition hover:scale-[1.02]">
          <StatCard label="Pending" value={stats.pending} icon={Clock} tint="#a07c4a" />
        </button>
        <StatCard label="Events" value={stats.events} icon={Calendar} tint="#b5722f" />
      </div>

      {/* Per-Event Attendance */}
      {eventAttendance.length > 0 && (
        <div className="p-5 mb-4 rounded-xl" style={{ background: 'transparent', border: '1px solid rgba(201,184,150,0.25)' }}>
          <h2 className="font-semibold text-[#3a2e22] mb-3">Event Attendance</h2>
          <div className="overflow-x-auto thin-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(201,184,150,0.3)' }}>
                  <th className="text-left py-2 px-2 font-semibold text-[#6b5d4f]">Event</th>
                  <th className="text-center py-2 px-2 font-semibold text-[#6b5d4f]">Attending</th>
                  <th className="text-center py-2 px-2 font-semibold text-[#6b5d4f]">Declined</th>
                  <th className="text-center py-2 px-2 font-semibold text-[#6b5d4f]">Pending</th>
                </tr>
              </thead>
              <tbody>
                {eventAttendance.map(({ event, attending, declined, pending, attendingGuestIds, declinedGuestIds, pendingGuestIds }) => (
                  <tr key={event.id} style={{ borderBottom: '1px solid rgba(201,184,150,0.15)' }}>
                    <td className="py-2 px-2">
                      <span style={{ color: '#3a2e22', fontWeight: 600 }}>
                        {event.title}
                      </span>
                    </td>
                    <td className="text-center py-2 px-2">
                      <button onClick={() => setModal({ title: `${event.title} — Attending`, guestIds: attendingGuestIds })} className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold transition hover:opacity-80" style={{ background: 'rgba(90,122,74,0.12)', color: '#5a7a4a' }}>
                        {attending}
                      </button>
                    </td>
                    <td className="text-center py-2 px-2">
                      <button onClick={() => setModal({ title: `${event.title} — Declined`, guestIds: declinedGuestIds })} className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold transition hover:opacity-80" style={{ background: 'rgba(176,58,58,0.1)', color: '#b03a3a' }}>
                        {declined}
                      </button>
                    </td>
                    <td className="text-center py-2 px-2">
                      <button onClick={() => setModal({ title: `${event.title} — Pending`, guestIds: pendingGuestIds })} className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold transition hover:opacity-80" style={{ background: 'rgba(160,124,74,0.12)', color: '#a07c4a' }}>
                        {pending}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="admin-card p-5">
        <h2 className="font-semibold text-[#3a2e22] mb-3">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickAction label="Customize Your Site" hint="Colors, fonts, typography" icon="🎨" onClick={() => navigate('/admin/page-builder')} />
          <QuickAction label="Add an Event" hint="Ceremony, reception, sub-events" icon="📅" onClick={() => navigate('/admin/events')} />
          <QuickAction label="Build RSVP Form" hint="Custom questions for guests" icon="📝" onClick={() => navigate('/admin/rsvp-builder')} />
          <QuickAction label="Upload Photos" hint="Gallery layouts" icon="📸" onClick={() => navigate('/admin/gallery')} />
          <QuickAction label="Arrange Seating" hint="Tables and guest assignment" icon="🪑" onClick={() => navigate('/admin/seating')} />
          <QuickAction label="Send Invitations" hint="Email settings and dispatch" icon="✉️" onClick={() => navigate('/admin/invitation')} />
        </div>
      </div>

      <div className="admin-card p-5 mt-4">
        <h2 className="font-semibold text-[#3a2e22] mb-2">Coordinator Portal</h2>
        <p className="text-sm text-[#8a7a66] mb-3">
          Share this link with your wedding coordinator or door staff. They can check in guests, view seating, and see dietary restrictions without admin credentials.
        </p>
        <div className="flex items-center gap-2 rounded-lg border p-2.5" style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
          <code className="text-xs text-[#5a4430] flex-1 truncate">{window.location.origin}/#/coordinator</code>
          <CopyLinkButton url={`${window.location.origin}/#/coordinator`} />
          <button onClick={() => navigate('/coordinator')} className="btn-primary text-xs">Open Portal</button>
        </div>
      </div>

      <div className="admin-card p-5 mt-4">
        <h2 className="font-semibold text-[#3a2e22] mb-2">Guest Self-Service Portal</h2>
        <p className="text-sm text-[#8a7a66] mb-3">
          Share this link with anyone not yet on your guest list. They can add their own name, email, and phone number — which automatically appears in your guest list.
        </p>
        <div className="flex items-center gap-2 rounded-lg border p-2.5" style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
          <code className="text-xs text-[#5a4430] flex-1 truncate">{window.location.origin}/#/guest-portal</code>
          <CopyLinkButton url={`${window.location.origin}/#/guest-portal`} />
          <button onClick={() => navigate('/guest-portal')} className="btn-primary text-xs">Open Portal</button>
        </div>
      </div>

      <div className="admin-card p-5 mt-4">
        <h2 className="font-semibold text-[#3a2e22] mb-2">Find My Table</h2>
        <p className="text-sm text-[#8a7a66] mb-3">
          Share this link with guests so they can look up their seat assignment by name.
        </p>
        <div className="flex items-center gap-2 rounded-lg border p-2.5" style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
          <code className="text-xs text-[#5a4430] flex-1 truncate">{window.location.origin}/#/find-table</code>
          <CopyLinkButton url={`${window.location.origin}/#/find-table`} />
          <button onClick={() => navigate('/find-table')} className="btn-primary text-xs">Open Page</button>
        </div>
      </div>

      <div className="admin-card p-5 mt-4">
        <h2 className="font-semibold text-[#3a2e22] mb-2">Public Website</h2>
        <p className="text-sm text-[#8a7a66] mb-3">
          This is the invitation website your guests will see.
        </p>
        <div className="flex items-center gap-2 rounded-lg border p-2.5" style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
          <code className="text-xs text-[#5a4430] flex-1 truncate">{window.location.origin}/</code>
          <CopyLinkButton url={`${window.location.origin}/`} />
          <button onClick={() => navigate('/')} className="btn-primary text-xs">Open Site</button>
        </div>
      </div>

      <div className="admin-card p-5 mt-4">
        <h2 className="font-semibold text-[#3a2e22] mb-2">Setup Status</h2>
        <div className="space-y-2">
          <SetupRow done={stats.events > 0} label="Events configured" />
          <SetupRow done={stats.photos > 0} label="Gallery photos added" />
          <SetupRow done={stats.guests > 0} label="Guest list started" />
          <SetupRow done={stats.invites > 0} label="Invitations generated" />
        </div>
      </div>

      <GuestModal />
      <CopyToast copied={copied} />
    </div>
  );
}

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); } catch { const ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
    setCopied(true); window.dispatchEvent(new CustomEvent('copy-toast'));
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition hover:bg-[#f0e8d8] flex items-center gap-1.5" style={{ borderColor: '#d6cdbf', color: '#5a4430' }}>
      {copied ? <Check size={13} className="text-[#5a7a4a]" /> : <Copy size={13} />}
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  );
}

function CopyToast({ copied }: { copied: boolean }) {
  if (!copied) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium text-white" style={{ background: '#5a7a4a' }}>
      <Check size={15} /> Link copied to clipboard
    </div>
  );
}

function QuickAction({ label, hint, icon, onClick }: { label: string; hint: string; icon: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left p-3 rounded-lg border transition hover:shadow-sm" style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
      <span className="text-xl">{icon}</span>
      <p className="text-sm font-semibold text-[#5a4430] mt-1">{label}</p>
      <p className="text-xs text-[#8a7a66]">{hint}</p>
    </button>
  );
}

function SetupRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${done ? 'bg-[#5a7a4a]' : 'bg-[#e0d4be]'}`}>
        {done && <Check size={12} className="text-white" />}
      </div>
      <span className={done ? 'text-[#5a4430]' : 'text-[#8a7a66]'}>{label}</span>
    </div>
  );
}
