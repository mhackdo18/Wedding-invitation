import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SectionHeader, Card, EmptyState, ConfirmButton } from '../ui';
import type { SeatingTable, SeatAssignment, Guest } from '@/types';
import { Armchair, Plus, Loader2, Trash2, X, Users, Circle, Square, Minus } from 'lucide-react';

const SHAPES = [
  { value: 'round', label: 'Round', icon: Circle },
  { value: 'rectangular', label: 'Rectangular', icon: Square },
  { value: 'banquet', label: 'Long Banquet', icon: Minus },
];

export default function SeatingChart() {
  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [assigningTo, setAssigningTo] = useState<SeatingTable | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: g }] = await Promise.all([
      supabase.from('seating_tables').select('*, assignments:seat_assignments(*, guest:guests(*))').order('display_order'),
      supabase.from('guests').select('*').order('name'),
    ]);
    setTables(t as unknown as SeatingTable[] || []);
    setGuests(g as Guest[] || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addTable = async (name: string, shape: string, capacity: number) => {
    await supabase.from('seating_tables').insert({ name, shape, capacity, display_order: tables.length });
    setAdding(false); load();
  };

  const removeTable = async (id: string) => {
    await supabase.from('seating_tables').delete().eq('id', id);
    load();
  };

  const assign = async (table: SeatingTable, guestId: string) => {
    const usedSeats = (table.assignments || []).map((a) => a.seat_number);
    const nextSeat = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].find((n) => !usedSeats.includes(n)) || usedSeats.length + 1;
    await supabase.from('seat_assignments').insert({ table_id: table.id, guest_id: guestId, seat_number: nextSeat });
    setAssigningTo(null); load();
  };

  const unassign = async (assignmentId: string) => {
    await supabase.from('seat_assignments').delete().eq('id', assignmentId);
    load();
  };

  const assignedGuestIds = new Set(tables.flatMap((t) => (t.assignments || []).map((a) => a.guest_id)));
  const confirmedUnassigned = guests.filter((g) => g.rsvp_status === 'confirmed' && !assignedGuestIds.has(g.id));
  const totalSeats = tables.reduce((sum, t) => sum + t.capacity, 0);
  const totalAssigned = tables.reduce((sum, t) => sum + (t.assignments?.length || 0), 0);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8a6d3b]" /></div>;

  return (
    <div>
      <SectionHeader title="Seating Chart" subtitle="Arrange tables and assign confirmed guests to seats"
        action={<button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-1.5"><Plus size={16} /> Add Table</button>} />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="text-center !p-3"><p className="text-2xl font-bold text-[#3a2e22]">{tables.length}</p><p className="text-xs text-[#8a7a66]">Tables</p></Card>
        <Card className="text-center !p-3"><p className="text-2xl font-bold text-[#3a2e22]">{totalAssigned}/{totalSeats}</p><p className="text-xs text-[#8a7a66]">Seats filled</p></Card>
        <Card className="text-center !p-3"><p className="text-2xl font-bold" style={{ color: confirmedUnassigned.length > 0 ? '#b5722f' : '#5a7a4a' }}>{confirmedUnassigned.length}</p><p className="text-xs text-[#8a7a66]">Unassigned</p></Card>
      </div>

      {confirmedUnassigned.length > 0 && (
        <Card className="mb-4 !border-[#e4c98e]" >
          <div className="flex items-start gap-2">
            <Users size={16} className="text-[#b5722f] mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#5a4430]">{confirmedUnassigned.length} confirmed guest(s) not yet seated</p>
              <p className="text-xs text-[#8a7a66] mt-0.5">{confirmedUnassigned.map((g) => g.name).join(', ')}</p>
            </div>
          </div>
        </Card>
      )}

      {tables.length === 0 && !adding && <Card><EmptyState icon={Armchair} title="No tables yet" hint="Add round, rectangular, or banquet tables" /></Card>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((t) => {
          const occupied = t.assignments?.length || 0;
          const pct = t.capacity > 0 ? Math.min(100, (occupied / t.capacity) * 100) : 0;
          const full = occupied >= t.capacity;
          return (
            <div key={t.id} className="admin-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {t.shape === 'round' && <Circle size={16} className="text-[#a07c4a]" />}
                  {t.shape === 'rectangular' && <Square size={16} className="text-[#a07c4a]" />}
                  {t.shape === 'banquet' && <Minus size={16} className="text-[#a07c4a]" />}
                  <h3 className="font-semibold text-[#3a2e22]">{t.name}</h3>
                </div>
                <ConfirmButton onConfirm={() => removeTable(t.id)}><Trash2 size={13} /></ConfirmButton>
              </div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[#8a7a66]">{occupied}/{t.capacity} seats</span>
                <span style={{ color: full ? '#b03a3a' : '#5a7a4a' }}>{full ? 'Full' : `${t.capacity - occupied} left`}</span>
              </div>
              <div className="h-1.5 rounded-full mb-3" style={{ background: '#e0d4be' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: full ? '#b03a3a' : '#5a7a4a' }} />
              </div>
              <div className="space-y-1.5 mb-2">
                {(t.assignments || []).sort((a, b) => a.seat_number - b.seat_number).map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded px-2 py-1 text-xs" style={{ background: '#faf6ee' }}>
                    <span className="text-[#5a4430]"><span className="text-[#a07c4a] font-mono">#{a.seat_number}</span> {a.guest?.name}</span>
                    <button onClick={() => unassign(a.id)} className="text-[#8a7a66] hover:text-[#b03a3a]"><X size={11} /></button>
                  </div>
                ))}
                {occupied === 0 && <p className="text-xs text-[#8a7a66] italic">No guests assigned</p>}
              </div>
              {!full && <button onClick={() => setAssigningTo(t)} className="w-full text-xs font-semibold text-[#8a6d3b] py-1.5 rounded border border-dashed" style={{ borderColor: '#c9b896' }}>+ Assign guest</button>}
            </div>
          );
        })}
      </div>

      {adding && <TableForm onCancel={() => setAdding(false)} onSave={addTable} />}
      {assigningTo && <AssignDialog table={assigningTo} guests={guests.filter((g) => !assignedGuestIds.has(g.id))} onCancel={() => setAssigningTo(null)} onAssign={(gid) => assign(assigningTo, gid)} />}
    </div>
  );
}

function TableForm({ onCancel, onSave }: { onCancel: () => void; onSave: (name: string, shape: string, cap: number) => void }) {
  const [name, setName] = useState('');
  const [shape, setShape] = useState('round');
  const [cap, setCap] = useState(8);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onCancel}>
      <div className="admin-card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-[#3a2e22] mb-3">Add Table</h3>
        <div className="space-y-3">
          <div><label className="admin-label">Table Name *</label><input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Table 1, Head Table..." /></div>
          <div><label className="admin-label">Shape</label>
            <div className="grid grid-cols-3 gap-2">
              {SHAPES.map((s) => (
                <button key={s.value} onClick={() => setShape(s.value)} className="flex flex-col items-center gap-1 py-2 rounded-lg border text-xs" style={{ borderColor: shape === s.value ? '#8a6d3b' : '#e6ddcd', background: shape === s.value ? '#faf6ee' : '#fff', color: shape === s.value ? '#8a6d3b' : '#8a7a66' }}>
                  <s.icon size={16} /> {s.label}
                </button>
              ))}
            </div>
          </div>
          <div><label className="admin-label">Seat Capacity</label><input type="number" min={1} max={30} className="admin-input" value={cap} onChange={(e) => setCap(parseInt(e.target.value) || 1)} /></div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
          <button onClick={() => name.trim() && onSave(name, shape, cap)} className="btn-primary flex-1">Add Table</button>
        </div>
      </div>
    </div>
  );
}

function AssignDialog({ table, guests, onCancel, onAssign }: { table: SeatingTable; guests: Guest[]; onCancel: () => void; onAssign: (gid: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onCancel}>
      <div className="admin-card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-[#3a2e22] mb-1">Assign to {table.name}</h3>
        <p className="text-xs text-[#8a7a66] mb-3">{table.capacity - (table.assignments?.length || 0)} seats remaining</p>
        {guests.length === 0 ? (
          <p className="text-sm text-[#8a7a66] py-4 text-center">No available guests to assign.</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-auto thin-scroll">
            {guests.map((g) => (
              <button key={g.id} onClick={() => onAssign(g.id)} className="w-full text-left flex items-center justify-between rounded-lg px-3 py-2 border hover:bg-[#faf6ee]" style={{ borderColor: '#e6ddcd' }}>
                <span className="text-sm text-[#3a2e22]">{g.name}</span>
                <span className="text-xs text-[#a07c4a]">party of {g.party_size}</span>
              </button>
            ))}
          </div>
        )}
        <button onClick={onCancel} className="btn-ghost w-full mt-3">Close</button>
      </div>
    </div>
  );
}
