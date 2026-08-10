import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SectionHeader, StatCard } from '../ui';
import { Users, Calendar, Check, Image, Loader2 } from 'lucide-react';
import { navigate } from '@/lib/router';
import type { WeddingEvent, GuestEventRsvp } from '@/types';

export default function Dashboard() {
  const [stats, setStats] = useState({ guests: 0, confirmed: 0, events: 0, photos: 0, invites: 0 });
  const [eventAttendance, setEventAttendance] = useState<Array<{ event: WeddingEvent; attending: number; declined: number; pending: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ count: guests }, { count: events }, { count: photos }, { count: invites }] = await Promise.all([
        supabase.from('guests').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('gallery_photos').select('*', { count: 'exact', head: true }),
        supabase.from('invitations').select('*', { count: 'exact', head: true }),
      ]);
      const { count: confirmed } = await supabase.from('guests').select('*', { count: 'exact', head: true }).eq('rsvp_status', 'confirmed');
      setStats({ guests: guests || 0, confirmed: confirmed || 0, events: events || 0, photos: photos || 0, invites: invites || 0 });

      // Fetch events + RSVPs for per-event attendance
      const { data: ev } = await supabase.from('events').select('*').order('display_order');
      const { data: rsvps } = await supabase.from('guest_event_rsvps').select('*');
      const allEvents = ev as WeddingEvent[] || [];
      const allRsvps = rsvps as GuestEventRsvp[] || [];

      const attendance = allEvents.map((event) => {
        const eventRsvps = allRsvps.filter((r) => r.event_id === event.id);
        return {
          event,
          attending: eventRsvps.filter((r) => r.status === 'yes').length,
          declined: eventRsvps.filter((r) => r.status === 'no').length,
          pending: eventRsvps.filter((r) => r.status === 'pending').length,
        };
      });
      setEventAttendance(attendance);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8a6d3b]" /></div>;

  return (
    <div>
      <SectionHeader title="Dashboard" subtitle="Overview of your wedding planning progress" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Guests" value={stats.guests} icon={Users} tint="#8a6d3b" />
        <StatCard label="Confirmed" value={stats.confirmed} icon={Check} tint="#5a7a4a" />
        <StatCard label="Events" value={stats.events} icon={Calendar} tint="#b5722f" />
        <StatCard label="Photos" value={stats.photos} icon={Image} tint="#7a5c8a" />
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
                {eventAttendance.map(({ event, attending, declined, pending }) => {
                  const isSub = !!event.parent_id;
                  return (
                    <tr key={event.id} style={{ borderBottom: '1px solid rgba(201,184,150,0.15)' }}>
                      <td className="py-2 px-2">
                        <span style={{ color: '#3a2e22', fontWeight: isSub ? 400 : 600 }} className={isSub ? 'pl-3' : ''}>
                          {isSub && <span className="text-[#c9b896] mr-1">↳</span>}
                          {event.title}
                        </span>
                      </td>
                      <td className="text-center py-2 px-2"><span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(90,122,74,0.12)', color: '#5a7a4a' }}>{attending}</span></td>
                      <td className="text-center py-2 px-2"><span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(176,58,58,0.1)', color: '#b03a3a' }}>{declined}</span></td>
                      <td className="text-center py-2 px-2"><span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(160,124,74,0.12)', color: '#a07c4a' }}>{pending}</span></td>
                    </tr>
                  );
                })}
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
          <button onClick={() => navigate('/guest-portal')} className="btn-primary text-xs">Open Portal</button>
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
