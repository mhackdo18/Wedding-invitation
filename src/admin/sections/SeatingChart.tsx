import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SectionHeader, Card, EmptyState, ConfirmButton } from '../ui';
import type { SeatingTable, SeatAssignment, Guest, Party } from '@/types';
import { Armchair, Plus, Loader2, Trash2, X, Users, Circle, Square, Minus, UserCircle, Check, Search, Edit2 } from 'lucide-react';

const SHAPES = [
  { value: 'round', label: 'Round', icon: Circle },
  { value: 'rectangular', label: 'Rectangular', icon: Square },
  { value: 'banquet', label: 'Long Banquet', icon: Minus },
];

export default function SeatingChart() {
  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [assigningTo, setAssigningTo] = useState<SeatingTable | null>(null);
  const [showAssignParty, setShowAssignParty] = useState(false);
  const [assigningPartyTo, setAssigningPartyTo] = useState<SeatingTable | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: g }, { data: p }] = await Promise.all([
      supabase.from('seating_tables').select('*, assignments:seat_assignments(*, guest:guests(*))').order('display_order'),
      supabase.from('guests').select('*').order('name'),
      supabase.from('parties').select('*').order('name'),
    ]);
    setTables(t as unknown as SeatingTable[] || []);
    setGuests(g as Guest[] || []);
    setParties(p as Party[] || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addTable = async (name: string, shape: string, capacity: number) => {
    await supabase.from('seating_tables').insert({ name, shape, capacity, display_order: tables.length });
    setAdding(false); load();
  };

  const [editingTable, setEditingTable] = useState<SeatingTable | null>(null);

  const updateTable = async (id: string, name: string, shape: string, capacity: number) => {
    await supabase.from('seating_tables').update({ name, shape, capacity }).eq('id', id);
    setEditingTable(null); load();
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
    setAssigningPartyTo(null);
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
        action={
          <div className="flex gap-2">
            {parties.length > 0 && (
              <button onClick={() => setShowAssignParty(true)} className="btn-ghost flex items-center gap-1.5"><UserCircle size={16} /> Assign Party to Table</button>
            )}
            <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-1.5"><Plus size={16} /> Add Table</button>
          </div>
        } />

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
                <div className="flex gap-1">
                  <button onClick={() => setEditingTable(t)} className="text-[#8a7a66] hover:text-[#5a4430]"><Edit2 size={13} /></button>
                  <ConfirmButton onConfirm={() => removeTable(t.id)}><Trash2 size={13} /></ConfirmButton>
                </div>
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
              {!full && (
                <div className="flex gap-1.5">
                  <button onClick={() => setAssigningTo(t)} className="flex-1 text-xs font-semibold text-[#8a6d3b] py-1.5 rounded border border-dashed" style={{ borderColor: '#c9b896' }}>+ Assign guest</button>
                  {parties.length > 0 && <button onClick={() => setAssigningPartyTo(t)} className="flex-1 text-xs font-semibold text-[#5a7a4a] py-1.5 rounded border border-dashed" style={{ borderColor: '#b7c8ae' }}>+ Assign party</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {adding && <TableForm onCancel={() => setAdding(false)} onSave={addTable} />}
      {editingTable && <TableForm table={editingTable} onCancel={() => setEditingTable(null)} onSave={(name, shape, cap) => updateTable(editingTable.id, name, shape, cap)} />}
      {assigningTo && <AssignDialog table={assigningTo} guests={confirmedUnassigned} onCancel={() => setAssigningTo(null)} onAssign={(gid) => assign(assigningTo, gid)} />}
      {showAssignParty && <AssignPartyModal parties={parties} guests={guests} tables={tables} assignedGuestIds={assignedGuestIds} onCancel={() => setShowAssignParty(false)} onAssign={assignPartyMembers} />}
      {assigningPartyTo && <AssignPartyModal parties={parties} guests={guests} tables={tables} assignedGuestIds={assignedGuestIds} preselectedTable={assigningPartyTo} onCancel={() => setAssigningPartyTo(null)} onAssign={assignPartyMembers} />}
    </div>
  );
}

function TableForm({ table, onCancel, onSave }: { table?: SeatingTable | null; onCancel: () => void; onSave: (name: string, shape: string, cap: number) => void }) {
  const [name, setName] = useState(table?.name || '');
  const [shape, setShape] = useState(table?.shape || 'round');
  const [cap, setCap] = useState(table?.capacity || 8);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onCancel}>
      <div className="admin-card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-[#3a2e22] mb-3">{table ? 'Edit Table' : 'Add Table'}</h3>
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
          <button onClick={() => name.trim() && onSave(name, shape, cap)} className="btn-primary flex-1">{table ? 'Save Changes' : 'Add Table'}</button>
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

function AssignPartyModal({ parties, guests, tables, assignedGuestIds, preselectedTable, onCancel, onAssign }: {
  parties: Party[];
  guests: Guest[];
  tables: SeatingTable[];
  assignedGuestIds: Set<string>;
  preselectedTable?: SeatingTable | null;
  onCancel: () => void;
  onAssign: (table: SeatingTable, guestIds: string[]) => void;
}) {
  const [step, setStep] = useState<'party' | 'members' | 'table'>('party');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onCancel}>
      <div className="admin-card w-full max-w-md max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: '#e6ddcd' }}>
          <h3 className="font-semibold text-[#3a2e22]">
            {step === 'party' && 'Assign Party to Table'}
            {step === 'members' && 'Select Members'}
            {step === 'table' && 'Select Table'}
          </h3>
          <button onClick={onCancel}><X size={18} className="text-[#8a7a66]" /></button>
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
