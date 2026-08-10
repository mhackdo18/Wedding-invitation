import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useSiteSettings, applySettingsVars } from '@/lib/useSiteSettings';
import type { Guest, SeatingTable, SeatAssignment, Party } from '@/types';
import { Search, MapPin, Users, Check, Clock, X, Armchair, Utensils, ChevronDown, UserCircle } from 'lucide-react';

export default function CoordinatorPage() {
  const { settings, loading } = useSiteSettings();
  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [search, setSearch] = useState('');
  const [filterTable, setFilterTable] = useState<string>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);

  useEffect(() => { applySettingsVars(settings); }, [settings]);

  const load = async () => {
    const [{ data: t }, { data: g }, { data: p }] = await Promise.all([
      supabase.from('seating_tables').select('*, assignments:seat_assignments(*, guest:guests(*))').order('display_order'),
      supabase.from('guests').select('*').order('name'),
      supabase.from('parties').select('*').order('name'),
    ]);
    setTables(t as unknown as SeatingTable[] || []);
    setGuests(g as Guest[] || []);
    setParties(p as Party[] || []);
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
      return true;
    });
  }, [guests, search, filterTable, assignmentMap, parties]);

  const checkedInCount = guests.filter((g) => g.checked_in).length;
  const totalGuests = guests.length;

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f4efe6' }}>
        <div className="skeleton w-48 h-6 rounded" />
      </div>
    );
  }

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
            <div className="text-right">
              <p className="text-sm font-bold text-[#3a2e22]">{checkedInCount}/{totalGuests}</p>
              <p className="text-[10px] text-[#8a7a66]">Checked In</p>
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
            value={filterTable}
            onChange={(e) => setFilterTable(e.target.value)}
          >
            <option value="all">All Tables</option>
            <option value="unassigned">Unassigned</option>
            {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="admin-card !p-2.5 text-center">
            <p className="text-lg font-bold text-[#3a2e22]">{totalGuests}</p>
            <p className="text-[10px] text-[#8a7a66]">Total Guests</p>
          </div>
          <div className="admin-card !p-2.5 text-center">
            <p className="text-lg font-bold" style={{ color: '#5a7a4a' }}>{checkedInCount}</p>
            <p className="text-[10px] text-[#8a7a66]">Checked In</p>
          </div>
          <div className="admin-card !p-2.5 text-center">
            <p className="text-lg font-bold" style={{ color: '#b5722f' }}>{totalGuests - checkedInCount}</p>
            <p className="text-[10px] text-[#8a7a66]">Remaining</p>
          </div>
        </div>

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
            return (
              <div key={g.id} className="admin-card p-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleCheckIn(g)}
                    disabled={updating === g.id}
                    className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition"
                    style={{
                      background: g.checked_in ? '#5a7a4a' : 'transparent',
                      border: g.checked_in ? 'none' : '2px solid #d6cdbf',
                    }}
                  >
                    {g.checked_in ? <Check size={18} className="text-white" /> : <Clock size={16} className="text-[#a07c4a]" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#3a2e22] truncate">{g.name}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      {info ? (
                        <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#5a7a4a' }}>
                          <MapPin size={11} /> {info.tableName} · Seat #{info.seat}
                        </span>
                      ) : (
                        <span className="text-xs text-[#b5722f]">No table assigned</span>
                      )}
                      {g.plus_one_name && (
                        <span className="text-xs text-[#8a7a66] flex items-center gap-0.5"><Users size={10} /> +1: {g.plus_one_name}</span>
                      )}
                      {pName && (
                        <span className="text-xs text-[#8a6d3b] flex items-center gap-0.5"><UserCircle size={10} /> {pName}</span>
                      )}
                    </div>
                    {g.dietary && (
                      <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: '#9c6b2f' }}>
                        <Utensils size={10} /> {g.dietary}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold shrink-0" style={{ color: g.checked_in ? '#5a7a4a' : '#a07c4a' }}>
                    {g.checked_in ? 'ARRIVED' : 'PENDING'}
                  </span>
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

        <div className="mt-6">
          <h2 className="text-sm font-bold text-[#3a2e22] mb-3">Table Overview</h2>
          <div className="space-y-2">
            {tables.map((t) => {
              const occupied = t.assignments?.length || 0;
              const checkedIn = (t.assignments || []).filter((a) => a.guest?.checked_in).length;
              const pct = t.capacity > 0 ? Math.min(100, (occupied / t.capacity) * 100) : 0;
              const full = occupied >= t.capacity;
              return (
                <div key={t.id} className="admin-card overflow-hidden">
                  <button
                    onClick={() => setExpandedTable(expandedTable === t.id ? null : t.id)}
                    className="w-full flex items-center gap-3 p-3"
                  >
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-[#3a2e22]">{t.name}</p>
                      <p className="text-xs text-[#8a7a66]">{checkedIn}/{occupied} arrived · {t.capacity} seats</p>
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
