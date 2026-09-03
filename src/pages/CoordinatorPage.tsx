import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useSiteSettings, applySettingsVars } from '@/lib/useSiteSettings';
import type { Guest, SeatingTable, SeatAssignment, Party, WeddingEvent } from '@/types';
import { Search, MapPin, Users, Check, Clock, X, Armchair, Utensils, ChevronDown, UserCircle, UserCheck, Loader2, RotateCcw, AlertCircle, UserX, MailCheck } from 'lucide-react';

export default function CoordinatorPage() {
  const { settings, loading } = useSiteSettings();
  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [search, setSearch] = useState('');
  const [filterTable, setFilterTable] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCheckIn, setFilterCheckIn] = useState<string>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [rsvpGuest, setRsvpGuest] = useState<Guest | null>(null);
  const [assignGuest, setAssignGuest] = useState<Guest | null>(null);
  const [showAssignParty, setShowAssignParty] = useState(false);
  const [tableFilter, setTableFilter] = useState<'all' | 'free' | 'full'>('all');
  const [viewMode, setViewMode] = useState<'all' | 'guests' | 'tables'>('all');
  const [assignGuestToTable, setAssignGuestToTable] = useState<SeatingTable | null>(null);
  const [assignPartyToTable, setAssignPartyToTable] = useState<SeatingTable | null>(null);
  const [invitations, setInvitations] = useState<Record<string, string | null>>({});
  const tableOverviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => { applySettingsVars(settings); }, [settings]);

  const load = async () => {
    const [{ data: t }, { data: g }, { data: p }, { data: ev }, { data: inv }] = await Promise.all([
      supabase.from('seating_tables').select('*, assignments:seat_assignments(*, guest:guests(*))').order('display_order'),
      supabase.from('guests').select('*').order('name'),
      supabase.from('parties').select('*').order('name'),
      supabase.from('events').select('*').order('display_order'),
      supabase.from('invitations').select('guest_id, sent_at'),
    ]);
    setTables(t as unknown as SeatingTable[] || []);
    setGuests(g as Guest[] || []);
    setParties(p as Party[] || []);
    setEvents(ev as WeddingEvent[] || []);
    const invMap: Record<string, string | null> = {};
    (inv || []).forEach((i: { guest_id: string; sent_at: string | null }) => { invMap[i.guest_id] = i.sent_at; });
    setInvitations(invMap);
  };

  useEffect(() => { load(); }, []);

  const toggleCheckIn = async (guest: Guest) => {
    setUpdating(guest.id);
    const newCheckedIn = !guest.checked_in;
    await supabase.from('guests').update({
      checked_in: newCheckedIn,
      checked_in_at: newCheckedIn ? new Date().toISOString() : null,
    }).eq('id', guest.id);
    setUpdating(null);
    load();
  };

  const returnToPending = async (guest: Guest) => {
    setUpdating(guest.id);
    await supabase.from('guest_event_rsvps').delete().eq('guest_id', guest.id);
    await supabase.from('seat_assignments').delete().eq('guest_id', guest.id);
    await supabase.from('guests').update({
      rsvp_status: 'pending',
      attendance: {},
      checked_in: false,
      checked_in_at: null,
    }).eq('id', guest.id);
    setUpdating(null);
    load();
  };

  const unassignTable = async (guest: Guest) => {
    setUpdating(guest.id);
    await supabase.from('seat_assignments').delete().eq('guest_id', guest.id);
    setUpdating(null);
    load();
  };

  const partyName = (id: string | null) => parties.find((p) => p.id === id)?.name || null;
  const partyMembers = (guest: Guest) => {
    if (!guest.party_id) return [];
    return guests.filter((g) => g.party_id === guest.party_id && g.id !== guest.id);
  };

  const assignmentMap = useMemo(() => {
    const m = new Map<string, { tableId: string; tableName: string; seat: number }>();
    tables.forEach((t) => {
      (t.assignments || []).forEach((a: SeatAssignment) => {
        m.set(a.guest_id, { tableId: t.id, tableName: t.name, seat: a.seat_number });
      });
    });
    return m;
  }, [tables]);

  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      if (search) {
        const q = search.toLowerCase();
        const inName = g.name.toLowerCase().includes(q);
        const inPlusOne = (g.plus_one_name || '').toLowerCase().includes(q);
        const inParty = (partyName(g.party_id) || '').toLowerCase().includes(q);
        if (!inName && !inPlusOne && !inParty) return false;
      }
      if (filterTable !== 'all') {
        const info = assignmentMap.get(g.id);
        if (filterTable === 'unassigned') return !info;
        if (!info || info.tableId !== filterTable) return false;
      }
      if (filterStatus !== 'all') {
        if (filterStatus === 'confirmed' && g.rsvp_status !== 'confirmed') return false;
        if (filterStatus === 'declined' && g.rsvp_status !== 'declined') return false;
        if (filterStatus === 'pending' && g.rsvp_status !== 'pending') return false;
      }
      if (filterCheckIn === 'checked-in' && !g.checked_in) return false;
      if (filterCheckIn === 'not-checked-in' && g.checked_in) return false;
      if (filterCheckIn === 'assigned' && !assignmentMap.has(g.id)) return false;
      if (filterCheckIn === 'unassigned' && assignmentMap.has(g.id)) return false;
      return true;
    });
  }, [guests, search, filterTable, filterStatus, filterCheckIn, assignmentMap, parties]);

  const assignedGuestIds = useMemo(() => new Set(tables.flatMap((t) => (t.assignments || []).map((a) => a.guest_id))), [tables]);

  const assignPartyMembers = async (table: SeatingTable, guestIds: string[]) => {
    const usedSeats = (table.assignments || []).map((a) => a.seat_number);
    let nextSeat = 1;
    for (const gid of guestIds) {
      while (usedSeats.includes(nextSeat)) nextSeat++;
      await supabase.from('seat_assignments').insert({ table_id: table.id, guest_id: gid, seat_number: nextSeat });
      usedSeats.push(nextSeat);
      nextSeat++;
    }
    setShowAssignParty(false);
    setAssignPartyToTable(null);
    load();
  };

  const assignGuestToSpecificTable = async (table: SeatingTable, guestId: string) => {
    const usedSeats = (table.assignments || []).map((a) => a.seat_number);
    let nextSeat = 1;
    while (usedSeats.includes(nextSeat)) nextSeat++;
    await supabase.from('seat_assignments').insert({ table_id: table.id, guest_id: guestId, seat_number: nextSeat });
    setAssignGuestToTable(null);
    load();
  };

  const checkedInCount = guests.filter((g) => g.checked_in).length;
  const totalGuests = guests.length;
  const assignedCount = assignmentMap.size;
  const unassignedCount = totalGuests - assignedCount;
  const freeTables = tables.filter((t) => (t.assignments?.length || 0) < t.capacity).length;
  const fullTables = tables.length - freeTables;

  const clearFilters = () => { setFilterStatus('all'); setFilterTable('all'); setFilterCheckIn('all'); setTableFilter('all'); };
  const activeFilterCount = (filterStatus !== 'all' ? 1 : 0) + (filterTable !== 'all' ? 1 : 0) + (filterCheckIn !== 'all' ? 1 : 0) + (tableFilter !== 'all' ? 1 : 0);

  const scrollToTables = () => {
    setTimeout(() => tableOverviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f4efe6' }}>
        <div className="skeleton w-48 h-6 rounded" />
      </div>
    );
  }

  const statusLabel = (status: string) => {
    if (status === 'confirmed') return { text: 'CONFIRMED', color: '#5a7a4a' };
    if (status === 'declined') return { text: 'NOT ATTENDING', color: '#b03a3a' };
    return { text: 'RSVP PENDING', color: '#a07c4a' };
  };

  return (
    <div className="min-h-screen" style={{ background: '#f4efe6', fontFamily: "'Inter', sans-serif" }}>
      <header className="sticky top-0 z-30 border-b" style={{ background: '#faf6ee', borderColor: '#e6ddcd' }}>
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#5a4430' }}>
                <Armchair size={16} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-[#3a2e22] leading-tight">Coordinator Portal</h1>
                <p className="text-[10px] text-[#8a7a66]">{settings.partner1_name} &amp; {settings.partner2_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {parties.length > 0 && (
                <button onClick={() => setShowAssignParty(true)} className="text-xs font-semibold px-3 py-1.5 rounded-lg transition" style={{ background: 'rgba(138,109,59,0.1)', color: '#8a6d3b', border: '1px solid rgba(138,109,59,0.2)' }}>
                  <UserCircle size={12} className="inline mr-1" />Assign Party
                </button>
              )}
              <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: '#d6cdbf' }}>
                {([['all', 'All'], ['guests', 'Guests'], ['tables', 'Tables']] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setViewMode(key)} className="px-2.5 py-1.5 text-[11px] font-semibold transition" style={{ background: viewMode === key ? '#5a4430' : 'transparent', color: viewMode === key ? '#fff' : '#8a7a66' }}>{label}</button>
                ))}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[#3a2e22]">{checkedInCount}/{totalGuests}</p>
                <p className="text-[10px] text-[#8a7a66]">Checked In</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a07c4a]" />
            <input
              className="w-full rounded-lg border pl-9 pr-3 py-2.5 text-sm bg-white outline-none focus:border-[#b59a6b]"
              style={{ borderColor: '#d6cdbf' }}
              placeholder="Search name, plus-one, or party..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="rounded-lg border px-3 py-2.5 text-sm bg-white outline-none"
            style={{ borderColor: '#d6cdbf' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">RSVP Pending</option>
            <option value="declined">Not Attending</option>
          </select>
          <select
            className="rounded-lg border px-3 py-2.5 text-sm bg-white outline-none"
            style={{ borderColor: '#d6cdbf' }}
            value={filterTable}
            onChange={(e) => setFilterTable(e.target.value)}
          >
            <option value="all">All Tables</option>
            <option value="unassigned">Unassigned</option>
            {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <button onClick={() => setFilterCheckIn(filterCheckIn === 'checked-in' ? 'all' : 'checked-in')} className="admin-card !p-2.5 text-center transition hover:shadow-md" style={filterCheckIn === 'checked-in' ? { borderColor: '#5a7a4a', borderWidth: 2 } : {}}>
            <p className="text-lg font-bold" style={{ color: '#5a7a4a' }}>{checkedInCount}</p>
            <p className="text-[10px] text-[#8a7a66]">Checked In</p>
          </button>
          <button onClick={() => setFilterCheckIn(filterCheckIn === 'not-checked-in' ? 'all' : 'not-checked-in')} className="admin-card !p-2.5 text-center transition hover:shadow-md" style={filterCheckIn === 'not-checked-in' ? { borderColor: '#b5722f', borderWidth: 2 } : {}}>
            <p className="text-lg font-bold" style={{ color: '#b5722f' }}>{totalGuests - checkedInCount}</p>
            <p className="text-[10px] text-[#8a7a66]">Not Checked In</p>
          </button>
          <button onClick={() => setFilterCheckIn(filterCheckIn === 'assigned' ? 'all' : 'assigned')} className="admin-card !p-2.5 text-center transition hover:shadow-md" style={filterCheckIn === 'assigned' ? { borderColor: '#5a7a4a', borderWidth: 2 } : {}}>
            <p className="text-lg font-bold text-[#3a2e22]">{assignedCount}</p>
            <p className="text-[10px] text-[#8a7a66]">Seated</p>
          </button>
          <button onClick={() => setFilterCheckIn(filterCheckIn === 'unassigned' ? 'all' : 'unassigned')} className="admin-card !p-2.5 text-center transition hover:shadow-md" style={filterCheckIn === 'unassigned' ? { borderColor: '#b5722f', borderWidth: 2 } : {}}>
            <p className="text-lg font-bold" style={{ color: '#b5722f' }}>{unassignedCount}</p>
            <p className="text-[10px] text-[#8a7a66]">Unseated</p>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={() => { setTableFilter(tableFilter === 'free' ? 'all' : 'free'); scrollToTables(); }} className="admin-card !p-2.5 text-center transition hover:shadow-md" style={tableFilter === 'free' ? { borderColor: '#5a7a4a', borderWidth: 2 } : {}}>
            <p className="text-lg font-bold" style={{ color: '#5a7a4a' }}>{freeTables}</p>
            <p className="text-[10px] text-[#8a7a66]">Tables with Seats</p>
          </button>
          <button onClick={() => { setTableFilter(tableFilter === 'full' ? 'all' : 'full'); scrollToTables(); }} className="admin-card !p-2.5 text-center transition hover:shadow-md" style={tableFilter === 'full' ? { borderColor: '#b03a3a', borderWidth: 2 } : {}}>
            <p className="text-lg font-bold" style={{ color: '#b03a3a' }}>{fullTables}</p>
            <p className="text-[10px] text-[#8a7a66]">Full Tables</p>
          </button>
        </div>

        {activeFilterCount > 0 && (
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs text-[#8a7a66]">{activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active</span>
            <button onClick={clearFilters} className="text-xs font-semibold text-[#8a6d3b] flex items-center gap-1"><X size={12} /> Clear Filters</button>
          </div>
        )}

        {(viewMode === 'all' || viewMode === 'guests') && (
        <div className="space-y-2">
          {filteredGuests.length === 0 && (
            <div className="admin-card p-8 text-center">
              <p className="text-sm text-[#8a7a66]">No guests found</p>
            </div>
          )}
          {filteredGuests.map((g) => {
            const info = assignmentMap.get(g.id);
            const pName = partyName(g.party_id);
            const members = partyMembers(g);
            const sLabel = statusLabel(g.rsvp_status);
            const canCheckIn = g.rsvp_status === 'confirmed';
            return (
              <div key={g.id} className="admin-card p-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => canCheckIn ? toggleCheckIn(g) : setRsvpGuest(g)}
                    disabled={updating === g.id}
                    className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition"
                    style={{
                      background: g.checked_in ? '#5a7a4a' : 'transparent',
                      border: g.checked_in ? 'none' : `2px solid ${canCheckIn ? '#d6cdbf' : '#e0d4be'}`,
                    }}
                    title={canCheckIn ? (g.checked_in ? 'Undo check-in' : 'Check in') : 'Manual RSVP required'}
                  >
                    {g.checked_in ? <Check size={18} className="text-white" /> : canCheckIn ? <Clock size={16} className="text-[#a07c4a]" /> : <UserCheck size={16} className="text-[#b5722f]" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#3a2e22] truncate">{g.name}</p>
                    {(g.tags || []).includes('plus-one') && g.proxy_guest_name && (
                      <p className="text-[10px] font-medium text-[#5a7a4a]">Plus one of {g.proxy_guest_name}</p>
                    )}
                    {g.proxy_guest_name && !(g.tags || []).includes('plus-one') && (
                      <p className="text-[10px] font-medium text-[#7a5c8a]">Attending as Proxy {g.proxy_guest_name}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      {info ? (
                        <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#5a7a4a' }}>
                          <MapPin size={11} /> {info.tableName} · Seat #{info.seat}
                        </span>
                      ) : (
                        <span className="text-xs text-[#b5722f]">No table assigned</span>
                      )}
                      {g.plus_one_name && !((g.tags || []).includes('plus-one')) && (
                        <span className="text-xs text-[#8a7a66] flex items-center gap-0.5"><Users size={10} /> +1: {g.plus_one_name}</span>
                      )}
                      {pName && (
                        <span className="text-xs text-[#8a6d3b] flex items-center gap-0.5"><UserCircle size={10} /> {pName}</span>
                      )}
                      {invitations[g.id] && (
                        <span className="text-xs text-[#5a7a4a] flex items-center gap-0.5"><MailCheck size={10} /> Invitation sent</span>
                      )}
                    </div>
                    {g.dietary && (
                      <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: '#9c6b2f' }}>
                        <Utensils size={10} /> {g.dietary}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold shrink-0" style={{ color: sLabel.color }}>
                    {g.checked_in ? 'ARRIVED' : sLabel.text}
                  </span>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {!canCheckIn && !g.checked_in && (
                    <button onClick={() => setRsvpGuest(g)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition" style={{ background: 'rgba(138,109,59,0.1)', color: '#8a6d3b', border: '1px solid rgba(138,109,59,0.2)' }}>
                      Manual RSVP
                    </button>
                  )}
                  {!info && g.rsvp_status === 'confirmed' && (
                    <button onClick={() => setAssignGuest(g)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition" style={{ background: 'rgba(90,122,74,0.1)', color: '#5a7a4a', border: '1px solid rgba(90,122,74,0.2)' }}>
                      Assign Table
                    </button>
                  )}
                  {info && (
                    <button onClick={() => unassignTable(g)} disabled={updating === g.id} className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition" style={{ background: 'rgba(176,58,58,0.08)', color: '#b03a3a', border: '1px solid rgba(176,58,58,0.15)' }}>
                      <UserX size={12} className="inline mr-1" />Unassign
                    </button>
                  )}
                  {g.rsvp_status !== 'pending' && (
                    <button onClick={() => returnToPending(g)} disabled={updating === g.id} className="py-1.5 px-3 rounded-lg text-xs font-semibold transition" style={{ background: 'rgba(160,124,74,0.1)', color: '#a07c4a', border: '1px solid rgba(160,124,74,0.2)' }} title="Return to pending — clears all RSVP responses">
                      <RotateCcw size={12} className="inline mr-1" />Reset RSVP
                    </button>
                  )}
                </div>
                {members.length > 0 && (
                  <div className="mt-2 pt-2 border-t" style={{ borderColor: '#e6ddcd' }}>
                    <p className="text-[10px] font-semibold text-[#8a7a66] mb-1">Party Members</p>
                    <div className="flex flex-wrap gap-1.5">
                      {members.map((m) => (
                        <span key={m.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]" style={{ background: '#f0e8d8', color: '#5a4430' }}>
                          {m.checked_in && <Check size={9} style={{ color: '#5a7a4a' }} />}
                          {m.name}
                          {m.dietary && <span style={{ color: '#9c6b2f' }}>· {m.dietary}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}

        {(viewMode === 'all' || viewMode === 'tables') && (
        <div className="mt-6" ref={tableOverviewRef}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#3a2e22]">Table Overview</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#8a7a66]">{freeTables} free · {fullTables} full</span>
              <button onClick={() => setTableFilter('all')} disabled={tableFilter === 'all'} className="text-xs font-medium" style={{ color: tableFilter === 'all' ? '#a07c4a' : '#8a6d3b', cursor: tableFilter === 'all' ? 'default' : 'pointer' }}>All</button>
              <button onClick={() => setTableFilter('free')} disabled={tableFilter === 'free'} className="text-xs font-medium" style={{ color: tableFilter === 'free' ? '#5a7a4a' : '#8a6d3b', cursor: tableFilter === 'free' ? 'default' : 'pointer' }}>Free</button>
              <button onClick={() => setTableFilter('full')} disabled={tableFilter === 'full'} className="text-xs font-medium" style={{ color: tableFilter === 'full' ? '#b03a3a' : '#8a6d3b', cursor: tableFilter === 'full' ? 'default' : 'pointer' }}>Full</button>
            </div>
          </div>
          <div className="space-y-2">
            {tables.filter((t) => {
              if (tableFilter === 'free') return (t.assignments?.length || 0) < t.capacity;
              if (tableFilter === 'full') return (t.assignments?.length || 0) >= t.capacity;
              return true;
            }).map((t) => {
              const occupied = t.assignments?.length || 0;
              const checkedIn = (t.assignments || []).filter((a) => a.guest?.checked_in).length;
              const pct = t.capacity > 0 ? Math.min(100, (occupied / t.capacity) * 100) : 0;
              const full = occupied >= t.capacity;
              const available = t.capacity - occupied;
              return (
                <div key={t.id} className="admin-card overflow-hidden" style={tableFilter === 'free' && available > 0 ? { borderColor: '#5a7a4a', borderWidth: 1.5 } : tableFilter === 'full' ? { borderColor: '#b03a3a', borderWidth: 1.5 } : {}}>
                  <button
                    onClick={() => setExpandedTable(expandedTable === t.id ? null : t.id)}
                    className="w-full flex items-center gap-3 p-3"
                  >
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-[#3a2e22]">{t.name}</p>
                      <p className="text-xs text-[#8a7a66]">{checkedIn}/{occupied} arrived · {t.capacity} seats{available > 0 && !full ? ` · ${available} available` : ''}</p>
                    </div>
                    <div className="w-20 h-1.5 rounded-full" style={{ background: '#e0d4be' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: full ? '#b03a3a' : '#5a7a4a' }} />
                    </div>
                    <ChevronDown size={16} className={`text-[#8a7a66] transition-transform ${expandedTable === t.id ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedTable === t.id && (
                    <div className="border-t p-2 space-y-1" style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
                      {(t.assignments || []).sort((a, b) => a.seat_number - b.seat_number).map((a) => (
                        <div key={a.id} className="flex items-center justify-between rounded px-2 py-1.5 text-xs" style={{ background: '#fff' }}>
                          <span className="text-[#5a4430]"><span className="font-mono text-[#a07c4a]">#{a.seat_number}</span> {a.guest?.name}</span>
                          {a.guest?.checked_in ? <Check size={12} className="text-[#5a7a4a]" /> : <Clock size={12} className="text-[#a07c4a]" />}
                        </div>
                      ))}
                      {occupied === 0 && <p className="text-xs text-[#8a7a66] italic px-2 py-1">No guests assigned</p>}
                      {!full && (
                        <div className="flex gap-1.5 pt-1">
                          <button onClick={(e) => { e.stopPropagation(); setAssignGuestToTable(t); }} className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition" style={{ background: 'rgba(90,122,74,0.1)', color: '#5a7a4a', border: '1px solid rgba(90,122,74,0.2)' }}>
                            <MapPin size={12} className="inline mr-1" />Assign Guest
                          </button>
                          {parties.length > 0 && (
                            <button onClick={(e) => { e.stopPropagation(); setAssignPartyToTable(t); }} className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition" style={{ background: 'rgba(138,109,59,0.1)', color: '#8a6d3b', border: '1px solid rgba(138,109,59,0.2)' }}>
                              <UserCircle size={12} className="inline mr-1" />Assign Party
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        )}

        <div className="h-8" />
      </div>

      {rsvpGuest && (
        <ManualRsvpModal guest={rsvpGuest} events={events} onClose={() => setRsvpGuest(null)} onDone={() => { setRsvpGuest(null); load(); }} />
      )}
      {assignGuest && (
        <AssignTableModal guest={assignGuest} tables={tables} onClose={() => setAssignGuest(null)} onDone={() => { setAssignGuest(null); load(); }} />
      )}
      {showAssignParty && (
        <AssignPartyModal parties={parties} guests={guests} tables={tables} assignedGuestIds={assignedGuestIds} onClose={() => setShowAssignParty(false)} onAssign={assignPartyMembers} />
      )}
      {assignGuestToTable && (
        <AssignGuestToTableModal table={assignGuestToTable} guests={guests} assignedGuestIds={assignedGuestIds} onClose={() => setAssignGuestToTable(null)} onAssign={assignGuestToSpecificTable} />
      )}
      {assignPartyToTable && (
        <AssignPartyModal parties={parties} guests={guests} tables={tables} assignedGuestIds={assignedGuestIds} onClose={() => setAssignPartyToTable(null)} onAssign={assignPartyMembers} preselectedTable={assignPartyToTable} />
      )}
    </div>
  );
}

function ManualRsvpModal({ guest, events, onClose, onDone }: { guest: Guest; events: WeddingEvent[]; onClose: () => void; onDone: () => void }) {
  const mainEvents = events.filter((e) => !e.parent_id);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (eventId: string, status: string) => {
    setAttendance((prev) => ({ ...prev, [eventId]: prev[eventId] === status ? 'pending' : status }));
  };

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const hasYes = Object.values(attendance).some((s) => s === 'yes');
      const status = hasYes ? 'confirmed' : 'declined';

      for (const ev of mainEvents) {
        const s = attendance[ev.id] || 'no';
        const { error: rsvpError } = await supabase.from('guest_event_rsvps').upsert({ guest_id: guest.id, event_id: ev.id, status: s }, { onConflict: 'guest_id,event_id' });
        if (rsvpError) throw rsvpError;
      }

      const { error: guestError } = await supabase.from('guests').update({ rsvp_status: status, attendance }).eq('id', guest.id);
      if (guestError) throw guestError;

      if (status !== 'confirmed') {
        await supabase.from('seat_assignments').delete().eq('guest_id', guest.id);
      }

      onDone();
    } catch {
      setError('Failed to save RSVP. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onClose}>
      <div className="admin-card w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: '#e6ddcd' }}>
          <div>
            <h3 className="font-semibold text-[#3a2e22]">Manual RSVP</h3>
            <p className="text-xs text-[#8a7a66]">{guest.name}</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-[#8a7a66]" /></button>
        </div>
        <div className="overflow-y-auto thin-scroll p-4 flex-1 min-h-0">
          <p className="text-xs text-[#8a7a66] mb-3">Mark attendance for each event. The guest will be checked in after saving.</p>
          <div className="space-y-2">
            {mainEvents.map((ev) => (
              <div key={ev.id} className="rounded-lg border p-3" style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
                <p className="text-sm font-semibold text-[#3a2e22] mb-2">{ev.title}</p>
                <div className="flex gap-2">
                  <button onClick={() => toggle(ev.id, 'yes')} className="flex-1 py-2 rounded-lg text-xs font-semibold transition" style={{ background: attendance[ev.id] === 'yes' ? '#5a7a4a' : '#fff', color: attendance[ev.id] === 'yes' ? '#fff' : '#5a7a4a', border: `1px solid ${attendance[ev.id] === 'yes' ? '#5a7a4a' : '#d6cdbf'}` }}>
                    <Check size={14} className="inline mr-1" /> Attending
                  </button>
                  <button onClick={() => toggle(ev.id, 'no')} className="flex-1 py-2 rounded-lg text-xs font-semibold transition" style={{ background: attendance[ev.id] === 'no' ? '#b03a3a' : '#fff', color: attendance[ev.id] === 'no' ? '#fff' : '#b03a3a', border: `1px solid ${attendance[ev.id] === 'no' ? '#b03a3a' : '#d6cdbf'}` }}>
                    <X size={14} className="inline mr-1" /> Not Attending
                  </button>
                </div>
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-[#b03a3a] mt-3 text-center">{error}</p>}
        </div>
        <div className="p-4 border-t shrink-0" style={{ borderColor: '#e6ddcd' }}>
          <button onClick={submit} disabled={saving} className="w-full btn-primary flex items-center justify-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
            Confirm &amp; Check In
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignTableModal({ guest, tables, onClose, onDone }: { guest: Guest; tables: SeatingTable[]; onClose: () => void; onDone: () => void }) {
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const availableTables = tables.filter((t) => (t.assignments?.length || 0) < t.capacity);

  const submit = async () => {
    if (guest.rsvp_status !== 'confirmed') {
      setError('Only confirmed guests can be assigned to a table.');
      return;
    }
    if (!selectedTable) { setError('Please select a table.'); return; }
    setSaving(true);
    setError('');
    try {
      const table = tables.find((t) => t.id === selectedTable);
      if (!table) throw new Error('Table not found');
      const occupiedSeats = new Set((table.assignments || []).map((a) => a.seat_number));
      let seatNumber = 1;
      while (occupiedSeats.has(seatNumber)) seatNumber++;
      const { error: assignError } = await supabase.from('seat_assignments').insert({ table_id: selectedTable, guest_id: guest.id, seat_number: seatNumber });
      if (assignError) throw assignError;
      onDone();
    } catch {
      setError('Failed to assign table. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onClose}>
      <div className="admin-card w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: '#e6ddcd' }}>
          <div>
            <h3 className="font-semibold text-[#3a2e22]">Assign Table</h3>
            <p className="text-xs text-[#8a7a66]">{guest.name}</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-[#8a7a66]" /></button>
        </div>
        <div className="overflow-y-auto thin-scroll p-4 flex-1 min-h-0">
          {guest.rsvp_status !== 'confirmed' ? (
            <div className="text-center py-6">
              <p className="text-sm font-semibold text-[#b03a3a] mb-1">Cannot assign table</p>
              <p className="text-xs text-[#8a7a66]">Only guests with a confirmed RSVP can be assigned to a table. This guest's RSVP status is "{guest.rsvp_status || 'pending'}".</p>
            </div>
          ) : availableTables.length === 0 ? (
            <p className="text-sm text-[#b03a3a] text-center py-4">All tables are full. Add more tables in the admin seating chart.</p>
          ) : (
            <>
            <p className="text-xs text-[#8a7a66] mb-3">Select a table with available seats. The guest will be assigned to the next open seat.</p>
            <div className="space-y-2">
              {availableTables.map((t) => {
                const occupied = t.assignments?.length || 0;
                const available = t.capacity - occupied;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTable(t.id)}
                    className="w-full text-left rounded-lg border p-3 transition"
                    style={{
                      borderColor: selectedTable === t.id ? '#5a7a4a' : '#d6cdbf',
                      background: selectedTable === t.id ? 'rgba(90,122,74,0.08)' : '#fff',
                      borderWidth: selectedTable === t.id ? 2 : 1,
                    }}
                  >
                    <p className="text-sm font-semibold text-[#3a2e22]">{t.name}</p>
                    <p className="text-xs text-[#8a7a66]">{occupied}/{t.capacity} occupied · {available} seat{available !== 1 ? 's' : ''} available</p>
                  </button>
                );
              })}
            </div>
            </>
          )}
          {error && <p className="text-sm text-[#b03a3a] mt-3 text-center">{error}</p>}
        </div>
        <div className="p-4 border-t shrink-0" style={{ borderColor: '#e6ddcd' }}>
          <button onClick={submit} disabled={saving || !selectedTable || guest.rsvp_status !== 'confirmed'} className="w-full btn-primary flex items-center justify-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
            Assign to Table
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignGuestToTableModal({ table, guests, assignedGuestIds, onClose, onAssign }: {
  table: SeatingTable;
  guests: Guest[];
  assignedGuestIds: Set<string>;
  onClose: () => void;
  onAssign: (table: SeatingTable, guestId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const available = table.capacity - (table.assignments?.length || 0);
  const eligible = guests.filter((g) => g.rsvp_status === 'confirmed' && !assignedGuestIds.has(g.id));
  const filtered = eligible.filter((g) => {
    const q = search.toLowerCase();
    return !q || g.name.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onClose}>
      <div className="admin-card w-full max-w-sm max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: '#e6ddcd' }}>
          <div>
            <h3 className="font-semibold text-[#3a2e22]">Assign Guest to {table.name}</h3>
            <p className="text-xs text-[#8a7a66]">{available} seat{available !== 1 ? 's' : ''} remaining</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-[#8a7a66]" /></button>
        </div>
        <div className="overflow-y-auto thin-scroll p-4 flex-1 min-h-0">
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a07c4a]" />
            <input className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm bg-white outline-none focus:border-[#b59a6b]" style={{ borderColor: '#d6cdbf' }} placeholder="Search guests..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-[#8a7a66] py-4 text-center">{search ? 'No matching guests.' : 'No confirmed unseated guests available.'}</p>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((g) => (
                <button key={g.id} onClick={() => onAssign(table, g.id)} className="w-full text-left flex items-center justify-between rounded-lg px-3 py-2 border hover:bg-[#faf6ee]" style={{ borderColor: '#e6ddcd' }}>
                  <span className="text-sm text-[#3a2e22]">{g.name}</span>
                  <span className="text-xs text-[#a07c4a]">party of {g.party_size}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t shrink-0" style={{ borderColor: '#e6ddcd' }}>
          <button onClick={onClose} className="btn-ghost w-full">Close</button>
        </div>
      </div>
    </div>
  );
}

function AssignPartyModal({ parties, guests, tables, assignedGuestIds, onClose, onAssign, preselectedTable }: {
  parties: Party[];
  guests: Guest[];
  tables: SeatingTable[];
  assignedGuestIds: Set<string>;
  onClose: () => void;
  onAssign: (table: SeatingTable, guestIds: string[]) => void;
  preselectedTable?: SeatingTable | null;
}) {
  const [step, setStep] = useState<'party' | 'members' | 'table'>(preselectedTable ? 'party' : 'party');
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [selectedTableId, setSelectedTableId] = useState<string>(preselectedTable?.id || '');
  const [search, setSearch] = useState('');

  const partyMembers = selectedPartyId ? guests.filter((g) => g.party_id === selectedPartyId) : [];
  const confirmedMembers = partyMembers.filter((g) => g.rsvp_status === 'confirmed');
  const selectableMembers = confirmedMembers.filter((g) => !assignedGuestIds.has(g.id));
  const availableTables = tables.filter((t) => (t.assignments?.length || 0) < t.capacity);
  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const availableSeats = selectedTable ? selectedTable.capacity - (selectedTable.assignments?.length || 0) : 0;

  const toggleMember = (id: string) => {
    setSelectedGuestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedGuestIds.size === selectableMembers.length) {
      setSelectedGuestIds(new Set());
    } else {
      setSelectedGuestIds(new Set(selectableMembers.map((m) => m.id)));
    }
  };

  const selectParty = (partyId: string) => {
    setSelectedPartyId(partyId);
    setSelectedGuestIds(new Set());
    setStep('members');
  };

  const filteredParties = parties.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const submit = () => {
    const targetTable = preselectedTable || selectedTable;
    if (!targetTable || selectedGuestIds.size === 0 || selectedGuestIds.size > targetTable.capacity - (targetTable.assignments?.length || 0)) return;
    onAssign(targetTable, Array.from(selectedGuestIds));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onClose}>
      <div className="admin-card w-full max-w-md max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: '#e6ddcd' }}>
          <h3 className="font-semibold text-[#3a2e22]">
            {step === 'party' && 'Assign Party to Table'}
            {step === 'members' && 'Select Members'}
            {step === 'table' && 'Select Table'}
          </h3>
          <button onClick={onClose}><X size={18} className="text-[#8a7a66]" /></button>
        </div>

        <div className="overflow-y-auto thin-scroll p-4 flex-1 min-h-0">
          {step === 'party' && (
            <>
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a07c4a]" />
                <input className="w-full rounded-lg border pl-9 pr-3 py-2.5 text-sm bg-white outline-none focus:border-[#b59a6b]" style={{ borderColor: '#d6cdbf' }} placeholder="Search parties..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
              </div>
              {filteredParties.length === 0 ? (
                <p className="text-sm text-[#8a7a66] py-4 text-center">{search ? `No parties match "${search}".` : 'No parties available.'}</p>
              ) : (
                <div className="space-y-2">
                  {filteredParties.map((p) => {
                    const members = guests.filter((g) => g.party_id === p.id);
                    const confirmed = members.filter((m) => m.rsvp_status === 'confirmed' && !assignedGuestIds.has(m.id));
                    return (
                      <button key={p.id} onClick={() => selectParty(p.id)} className="w-full text-left rounded-lg border p-3 transition hover:bg-[#faf6ee]" style={{ borderColor: '#e6ddcd' }}>
                        <p className="text-sm font-semibold text-[#3a2e22]">{p.name}</p>
                        <p className="text-xs text-[#8a7a66]">{members.length} member(s) · {confirmed.length} confirmed & unseated</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {step === 'members' && (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-[#8a7a66]">{partyMembers.length} member(s) in this party</p>
                {selectableMembers.length > 0 && (
                  <button onClick={toggleSelectAll} className="text-xs font-semibold text-[#8a6d3b]">
                    {selectedGuestIds.size === selectableMembers.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {partyMembers.map((m) => {
                  const isConfirmed = m.rsvp_status === 'confirmed';
                  const isAlreadySeated = assignedGuestIds.has(m.id);
                  const isDisabled = !isConfirmed || isAlreadySeated;
                  const isChecked = selectedGuestIds.has(m.id);
                  return (
                    <label key={m.id} className={`flex items-center gap-3 rounded-lg border p-2.5 ${isDisabled ? 'opacity-50' : 'cursor-pointer'}`} style={{ borderColor: '#e6ddcd', background: isChecked ? '#faf6ee' : '#fff' }}>
                      <input type="checkbox" checked={isChecked} disabled={isDisabled} onChange={() => toggleMember(m.id)} className="accent-[#8a6d3b]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#3a2e22] truncate">{m.name}</p>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: isConfirmed ? (isAlreadySeated ? '#5a7a4a' : '#8a6d3b') : '#b03a3a' }}>
                          {isAlreadySeated ? 'Already seated' : m.rsvp_status === 'confirmed' ? 'Confirmed' : m.rsvp_status === 'declined' ? 'Declined' : 'Pending'}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setStep('party')} className="btn-ghost flex-1">Back</button>
                {preselectedTable ? (
                  <button onClick={submit} disabled={selectedGuestIds.size === 0 || selectedGuestIds.size > availableSeats} className="btn-primary flex-1 disabled:opacity-40">Assign to {preselectedTable.name}</button>
                ) : (
                  <button onClick={() => setStep('table')} disabled={selectedGuestIds.size === 0} className="btn-primary flex-1 disabled:opacity-40">Next</button>
                )}
              </div>
            </>
          )}

          {step === 'table' && (
            <>
              <p className="text-xs text-[#8a7a66] mb-3">{selectedGuestIds.size} member(s) selected. Choose a table with enough seats.</p>
              {availableTables.length === 0 ? (
                <p className="text-sm text-[#b03a3a] text-center py-4">All tables are full. Add more tables first.</p>
              ) : (
                <div className="space-y-2">
                  {availableTables.map((t) => {
                    const occupied = t.assignments?.length || 0;
                    const available = t.capacity - occupied;
                    const canFit = available >= selectedGuestIds.size;
                    return (
                      <button key={t.id} onClick={() => setSelectedTableId(t.id)} className="w-full text-left rounded-lg border p-3 transition" style={{ borderColor: selectedTableId === t.id ? '#5a7a4a' : '#d6cdbf', background: selectedTableId === t.id ? 'rgba(90,122,74,0.08)' : '#fff', borderWidth: selectedTableId === t.id ? 2 : 1 }}>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-[#3a2e22]">{t.name}</p>
                          <span className="text-xs font-semibold" style={{ color: canFit ? '#5a7a4a' : '#b5722f' }}>{available} seat{available !== 1 ? 's' : ''} available{!canFit && ' (too few)'}</span>
                        </div>
                        <p className="text-xs text-[#8a7a66]">{occupied}/{t.capacity} occupied</p>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <button onClick={() => setStep('members')} className="btn-ghost flex-1">Back</button>
                <button onClick={submit} disabled={!selectedTableId || selectedGuestIds.size === 0} className="btn-primary flex-1 disabled:opacity-40">Assign {selectedGuestIds.size} to Table</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
