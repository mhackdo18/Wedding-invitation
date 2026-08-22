import { useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { SectionHeader, Card, EmptyState, ConfirmButton } from '../ui';
import type { Guest, Party, RsvpQuestion, RsvpAnswer } from '@/types';
import { Users, Plus, Loader2, Trash2, Edit2, X, Search, Download, Upload, Tag, UserPlus, List, Layers, CheckSquare, Square, Settings2, ArrowUp, ArrowDown, ArrowUpDown, Clock, MailCheck, ArrowLeft, ArrowRight, GripVertical } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = { confirmed: '#5a7a4a', declined: '#b03a3a', pending: '#a07c4a' };
const PARTY_COLORS = ['#8a6d3b', '#5a7a4a', '#b5722f', '#7a5c8a', '#3a6a8a', '#a05a5a', '#5a8a7a', '#8a5a3a'];

function partyColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return PARTY_COLORS[Math.abs(hash) % PARTY_COLORS.length];
}

export default function GuestList() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [filterParty, setFilterParty] = useState('all');
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'individual' | 'party'>('individual');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [questions, setQuestions] = useState<RsvpQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({});
  const [showPartyManager, setShowPartyManager] = useState(false);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [invitations, setInvitations] = useState<Record<string, string | null>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>(['name', 'contact', 'name_on_card', 'party', 'plus_one', 'tags', 'proxy', 'status', 'invited']);
  const [draggedCol, setDraggedCol] = useState<string | null>(null);

  const colValue = (g: Guest, col: string): string => {
    if (col.startsWith('q_')) return answers[g.id]?.[col.slice(2)] || '';
    switch (col) {
      case 'name': return g.name;
      case 'contact': return g.email || g.phone || '';
      case 'party': return partyName(g.party_id) || '';
      case 'plus_one': return g.plus_one_name || '';
      case 'tags': return (g.tags || []).join(', ');
      case 'proxy': return g.proxy_guest_name || '';
      case 'name_on_card': return g.name_on_card || g.name;
      case 'status': return g.rsvp_status;
      case 'invited': return invitations[g.id] ? 'sent' : '';
      default: return '';
    }
  };

  const load = async () => {
    setLoading(true);
    const [{ data: g }, { data: p }, { data: qs }, { data: ans }, { data: inv }] = await Promise.all([
      supabase.from('guests').select('*').order('created_at', { ascending: false }),
      supabase.from('parties').select('*').order('name'),
      supabase.from('rsvp_questions').select('*').order('display_order'),
      supabase.from('rsvp_answers').select('*'),
      supabase.from('invitations').select('guest_id, sent_at'),
    ]);
    setGuests(g as Guest[] || []);
    setParties(p as Party[] || []);
    setQuestions(qs as RsvpQuestion[] || []);
    const ansMap: Record<string, Record<string, string>> = {};
    (ans as RsvpAnswer[] || []).forEach((a) => {
      if (!ansMap[a.guest_id]) ansMap[a.guest_id] = {};
      ansMap[a.guest_id][a.question_id] = a.answer || '';
    });
    setAnswers(ansMap);
    const invMap: Record<string, string | null> = {};
    (inv || []).forEach((i: { guest_id: string; sent_at: string | null }) => { invMap[i.guest_id] = i.sent_at; });
    setInvitations(invMap);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const qCols = questions.map(q => `q_${q.id}`);
    setColumnOrder(prev => {
      const valid = prev.filter(c => !c.startsWith('q_') || qCols.includes(c));
      const existing = new Set(valid);
      const missing = qCols.filter(c => !existing.has(c));
      return [...valid, ...missing];
    });
  }, [questions]);

  const partyName = (id: string | null) => parties.find((p) => p.id === id)?.name || null;

  const save = async (g: Partial<Guest>) => {
    if (g.id) {
      await supabase.from('guests').update({
        name: g.name, email: g.email, phone: g.phone, party_size: g.party_size,
        rsvp_status: g.rsvp_status, dietary: g.dietary, plus_one_name: g.plus_one_name,
        song_requests: g.song_requests, notes: g.notes,
        party_id: g.party_id, tags: g.tags, plus_one_allowed: g.plus_one_allowed, is_party_leader: g.is_party_leader,
        name_on_card: g.name_on_card,
      }).eq('id', g.id);

      // When admin sets status to pending or declined, clear all event RSVPs and attendance
      if (g.rsvp_status === 'pending' || g.rsvp_status === 'declined') {
        await supabase.from('guest_event_rsvps').delete().eq('guest_id', g.id);
        await supabase.from('guests').update({ attendance: {}, checked_in: false, checked_in_at: null }).eq('id', g.id);
      }
    } else {
      await supabase.from('guests').insert({
        name: g.name, email: g.email, phone: g.phone, party_size: g.party_size || 1,
        rsvp_status: g.rsvp_status || 'pending', dietary: g.dietary, plus_one_name: g.plus_one_name,
        song_requests: g.song_requests, notes: g.notes,
        party_id: g.party_id, tags: g.tags || [], plus_one_allowed: g.plus_one_allowed ?? true, is_party_leader: g.is_party_leader ?? false,
        name_on_card: g.name_on_card,
      });
    }
    setEditing(null); setAdding(false); load();
  };

  const remove = async (id: string) => { await supabase.from('guests').delete().eq('id', id); load(); };

  const allTags = useMemo(() => {
    const s = new Set<string>();
    guests.forEach((g) => (g.tags || []).forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [guests]);

  const filtered = useMemo(() => guests.filter((g) => {
    if (search) {
      const q = search.toLowerCase();
      if (!g.name.toLowerCase().includes(q) && !(g.email || '').toLowerCase().includes(q) && !(partyName(g.party_id) || '').toLowerCase().includes(q) && !(g.proxy_guest_name || '').toLowerCase().includes(q)) return false;
    }
    if (filterStatus !== 'all' && g.rsvp_status !== filterStatus) return false;
    if (filterTag !== 'all' && !(g.tags || []).includes(filterTag)) return false;
    if (filterParty !== 'all' && g.party_id !== filterParty) return false;
    for (const [col, f] of Object.entries(colFilters)) {
      if (f && !colValue(g, col).toLowerCase().includes(f.toLowerCase())) return false;
    }
    return true;
  }), [guests, search, filterStatus, filterTag, filterParty, parties, colFilters, answers, invitations]);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <ArrowUpDown size={11} className="text-[#c9b896] inline ml-0.5" />;
    return sortDir === 'asc' ? <ArrowUp size={11} className="text-[#8a6d3b] inline ml-0.5" /> : <ArrowDown size={11} className="text-[#8a6d3b] inline ml-0.5" />;
  };

  const moveCol = (col: string, dir: -1 | 1) => {
    setColumnOrder(prev => {
      const arr = [...prev];
      const idx = arr.indexOf(col);
      const swap = idx + dir;
      if (swap < 0 || swap >= arr.length) return prev;
      [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
      return arr;
    });
  };

  const renderGuestCell = (g: Guest, col: string, color?: string) => {
    switch (col) {
      case 'name':
        return (
          <td key="name" className="p-2.5 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <div>
                <span className="font-medium text-[#3a2e22]">{g.name}</span>
                {g.is_party_leader && g.party_id && <span className="ml-1 text-[9px] px-1 py-0.5 rounded-full font-bold" style={{ background: color, color: '#fff' }}>LEADER</span>}
              </div>
            </div>
          </td>
        );
      case 'contact':
        return <td key="contact" className="p-2.5 text-xs text-[#8a7a66] whitespace-nowrap">{g.email || g.phone || '\u2014'}</td>;
      case 'name_on_card':
        return <td key="name_on_card" className="p-2.5 text-xs text-[#5a4430] whitespace-nowrap"><NameOnCardCell guest={g} onSaved={load} /></td>;
      case 'party':
        return <td key="party" className="p-2.5 text-xs text-[#5a4430] whitespace-nowrap">{partyName(g.party_id) || '\u2014'}</td>;
      case 'plus_one':
        return <td key="plus_one" className="p-2.5 text-xs text-[#8a7a66] whitespace-nowrap">{g.plus_one_name || (g.plus_one_allowed ? <span className="text-[#c9b896]">allowed</span> : '\u2014')}</td>;
      case 'tags':
        return <td key="tags" className="p-2.5"><div className="flex flex-wrap gap-1">{(g.tags || []).map((t) => <span key={t} className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap" style={{ background: '#f0e8d8', color: '#8a6d3b' }}>{t}</span>)}</div></td>;
      case 'proxy':
        return <td key="proxy" className="p-2.5 text-xs text-[#8a7a66] whitespace-nowrap">{g.proxy_guest_name || '\u2014'}</td>;
      case 'status':
        return <td key="status" className="p-2.5"><span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: STATUS_COLORS[g.rsvp_status] }}><span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[g.rsvp_status] }} />{g.rsvp_status}</span></td>;
      case 'invited':
        return <td key="invited" className="p-2.5 text-xs whitespace-nowrap">{invitations[g.id] ? <span className="inline-flex items-center gap-1 text-[#5a7a4a] font-medium"><MailCheck size={12} /> Sent</span> : <span className="text-[#c9b896]">—</span>}</td>;
      default:
        if (col.startsWith('q_')) {
          const val = answers[g.id]?.[col.slice(2)];
          return <td key={col} className="p-2.5 text-xs text-[#8a7a66] whitespace-nowrap">{val || '\u2014'}</td>;
        }
        return <td key={col} className="p-2.5"></td>;
    }
  };

  const sortedFiltered = useMemo(() => {
    if (!sortCol) return [...filtered].sort((a, b) => {
      const ap = a.party_id || '';
      const bp = b.party_id || '';
      if (ap !== bp) return ap.localeCompare(bp);
      if (a.is_party_leader && !b.is_party_leader) return -1;
      if (!a.is_party_leader && b.is_party_leader) return 1;
      return a.name.localeCompare(b.name);
    });
    return [...filtered].sort((a, b) => {
      const av = colValue(a, sortCol).toLowerCase();
      const bv = colValue(b, sortCol).toLowerCase();
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir, answers]);

  const partyGroups = useMemo(() => {
    const m = new Map<string, Guest[]>();
    filtered.forEach((g) => {
      const key = g.party_id || g.id;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(g);
    });
    return Array.from(m.entries());
  }, [filtered]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSelectAll = () => {
    setSelected((prev) => prev.size === sortedFiltered.length ? new Set() : new Set(sortedFiltered.map((g) => g.id)));
  };

  const bulkDelete = async () => {
    await supabase.from('guests').delete().in('id', Array.from(selected));
    setSelected(new Set()); setBulkAction(null); load();
  };
  const bulkAssignParty = async (partyId: string) => {
    await supabase.from('guests').update({ party_id: partyId }).in('id', Array.from(selected));
    setSelected(new Set()); setBulkAction(null); load();
  };
  const bulkAddTag = async (tag: string) => {
    const updates = Array.from(selected).map(async (id) => {
      const g = guests.find((x) => x.id === id);
      if (g && !(g.tags || []).includes(tag)) {
        await supabase.from('guests').update({ tags: [...(g.tags || []), tag] }).eq('id', id);
      }
    });
    await Promise.all(updates);
    setSelected(new Set()); setBulkAction(null); load();
  };

  const exportCsv = () => {
    const rows = [['First Name', 'Last Name', 'Email', 'Partner Name', 'Party Name', 'Proxy Guest Name', 'Guest Tags', 'Plus-One Allowed']];
    filtered.forEach((g) => {
      const parts = g.name.split(' ');
      const party = partyName(g.party_id);
      rows.push([parts[0] || '', parts.slice(1).join(' '), g.email || '', '', party || '', g.proxy_guest_name || '', (g.tags || []).join(','), g.plus_one_allowed ? 'yes' : 'no']);
    });
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'guest-list.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) { setImportResult('CSV must have a header row and at least one data row.'); return; }

    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
    const firstNameIdx = headers.findIndex((h) => h.includes('first'));
    const lastNameIdx = headers.findIndex((h) => h.includes('last'));
    const emailIdx = headers.findIndex((h) => h.includes('email'));
    const partyIdx = headers.findIndex((h) => h.includes('party'));
    const tagsIdx = headers.findIndex((h) => h.includes('tag'));
    const plusOneIdx = headers.findIndex((h) => h.includes('plus') && h.includes('one'));

    let imported = 0;
    let skipped = 0;
    const partyCache = new Map<string, string>();
    const { data: existingGuests } = await supabase.from('guests').select('name, email');
    const existingEmails = new Set<string>();
    const existingNames = new Set<string>();
    (existingGuests || []).forEach((g: any) => {
      if (g.email) existingEmails.add(g.email.toLowerCase());
      existingNames.add(g.name.toLowerCase());
    });

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const firstName = (firstNameIdx >= 0 ? cols[firstNameIdx] : '') || '';
      const lastName = (lastNameIdx >= 0 ? cols[lastNameIdx] : '') || '';
      const name = `${firstName} ${lastName}`.trim() || cols[0] || `Guest ${i}`;
      const email = emailIdx >= 0 ? cols[emailIdx] || '' : '';
      const pName = partyIdx >= 0 ? cols[partyIdx] || '' : '';
      const tagsRaw = tagsIdx >= 0 ? cols[tagsIdx] || '' : '';
      const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
      const plusOneAllowed = plusOneIdx >= 0 ? cols[plusOneIdx]?.toLowerCase().trim() !== 'no' : true;

      let partyId: string | null = null;
      if (pName) {
        if (partyCache.has(pName)) partyId = partyCache.get(pName)!;
        else {
          const { data: existing } = await supabase.from('parties').select('id').ilike('name', pName).maybeSingle();
          if (existing) partyId = existing.id;
          else {
            const token = pName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).slice(2, 8);
            const { data: np } = await supabase.from('parties').insert({ name: pName, guest_token: token }).select().single();
            if (np) partyId = np.id;
          }
          partyCache.set(pName, partyId!);
        }
      }
      if (email && existingEmails.has(email.toLowerCase())) { skipped++; continue; }
      if (!email && existingNames.has(name.toLowerCase())) { skipped++; continue; }
      await supabase.from('guests').insert({ name, email: email || null, party_size: 1, rsvp_status: 'pending', party_id: partyId, tags, plus_one_allowed: plusOneAllowed ?? false, is_party_leader: false });
      imported++;
      if (email) existingEmails.add(email.toLowerCase());
      existingNames.add(name.toLowerCase());
    }
    setImportResult(`Imported ${imported} guest${imported !== 1 ? 's' : ''}${skipped > 0 ? `, skipped ${skipped} duplicate${skipped !== 1 ? 's' : ''}` : ''} successfully.`);
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8a6d3b]" /></div>;

  const hasSelection = selected.size > 0;

  return (
    <div>
      <SectionHeader title="Guest List" subtitle="Manage guests, parties, and tags"
        action={
          <div className="flex gap-2">
            <button onClick={exportCsv} className="btn-ghost flex items-center gap-1.5"><Download size={15} /> Export</button>
            <button onClick={() => setShowImport(true)} className="btn-ghost flex items-center gap-1.5"><Upload size={15} /> Import CSV</button>
            <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-1.5"><Plus size={16} /> Add Guest</button>
          </div>
        } />

      <div className="flex gap-3 mb-4">
        <div className="admin-card px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#f0e8d8' }}><Users size={18} className="text-[#8a6d3b]" /></div>
          <div><p className="text-2xl font-bold text-[#3a2e22] leading-none">{guests.length}</p><p className="text-xs text-[#8a7a66] mt-0.5">Total Guests</p></div>
        </div>
        <div className="admin-card px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#e8f0e4' }}><CheckSquare size={18} className="text-[#5a7a4a]" /></div>
          <div><p className="text-2xl font-bold text-[#3a2e22] leading-none">{guests.filter((g) => g.rsvp_status === 'confirmed').length}</p><p className="text-xs text-[#8a7a66] mt-0.5">Confirmed</p></div>
        </div>
        <div className="admin-card px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#fbe9e9' }}><X size={18} className="text-[#b03a3a]" /></div>
          <div><p className="text-2xl font-bold text-[#3a2e22] leading-none">{guests.filter((g) => g.rsvp_status === 'declined').length}</p><p className="text-xs text-[#8a7a66] mt-0.5">Declined</p></div>
        </div>
        <div className="admin-card px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#faf6ee' }}><Clock size={18} className="text-[#a07c4a]" /></div>
          <div><p className="text-2xl font-bold text-[#3a2e22] leading-none">{guests.filter((g) => g.rsvp_status === 'pending').length}</p><p className="text-xs text-[#8a7a66] mt-0.5">Pending</p></div>
        </div>
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-40">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a07c4a]" />
            <input className="admin-input pl-9" placeholder="Search name, email, party..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="admin-input w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All statuses</option><option value="confirmed">Confirmed</option><option value="declined">Declined</option><option value="pending">Pending</option>
          </select>
          {allTags.length > 0 && (
            <select className="admin-input w-auto" value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
              <option value="all">All tags</option>{allTags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <div className="flex items-center gap-1">
            {parties.length > 0 && (
              <select className="admin-input w-auto" value={filterParty} onChange={(e) => setFilterParty(e.target.value)}>
                <option value="all">All parties</option>{parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <button onClick={() => setShowPartyManager(true)} title="Manage Parties" className="p-2 rounded-lg border transition hover:bg-[#faf6ee]" style={{ borderColor: '#d6cdbf', color: '#8a7a66' }}>
              <Settings2 size={15} />
            </button>
          </div>
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: '#d6cdbf' }}>
            <button onClick={() => setViewMode('individual')} className="px-2.5 py-2 text-xs flex items-center gap-1" style={{ background: viewMode === 'individual' ? '#8a6d3b' : 'transparent', color: viewMode === 'individual' ? '#fff' : '#8a7a66' }}><List size={14} /> List</button>
            <button onClick={() => setViewMode('party')} className="px-2.5 py-2 text-xs flex items-center gap-1" style={{ background: viewMode === 'party' ? '#8a6d3b' : 'transparent', color: viewMode === 'party' ? '#fff' : '#8a7a66' }}><Layers size={14} /> Party</button>
          </div>
        </div>
      </Card>

      {hasSelection && (
        <Card className="mb-4" >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[#5a4430]">{selected.size} selected</span>
            <button onClick={() => setBulkAction('tags')} className="btn-ghost text-xs flex items-center gap-1"><Tag size={12} /> Bulk Edit Tags</button>
            <button onClick={() => setBulkAction('party')} className="btn-ghost text-xs flex items-center gap-1"><UserPlus size={12} /> Bulk Assign Party</button>
            <button onClick={() => setBulkAction('delete')} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ background: '#fbe9e9', color: '#b03a3a' }}><Trash2 size={12} /> Bulk Delete</button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-[#8a7a66]">Clear selection</button>
          </div>
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card><EmptyState icon={Users} title={guests.length === 0 ? 'No guests yet' : 'No matches'} hint={guests.length === 0 ? 'Add guests manually or import a CSV' : 'Try a different filter'} /></Card>
      ) : viewMode === 'individual' ? (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto thin-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
                  <th className="p-2.5 w-8"><button onClick={toggleSelectAll}>{selected.size === sortedFiltered.length && sortedFiltered.length > 0 ? <CheckSquare size={16} className="text-[#8a6d3b]" /> : <Square size={16} className="text-[#c9b896]" />}</button></th>
                  {columnOrder.map((col, idx) => {
                    const isQ = col.startsWith('q_');
                    const q = isQ ? questions.find(qx => `q_${qx.id}` === col) : null;
                    const rawLabel = isQ ? (q ? (q.column_name || q.label) : col) : (col === 'plus_one' ? 'Plus One' : col === 'name_on_card' ? 'Name on Card' : col);
                    const header = isQ && rawLabel.length > 20 ? rawLabel.slice(0, 18) + '…' : rawLabel;
                    return (
                      <th key={col} draggable onDragStart={() => setDraggedCol(col)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (draggedCol && draggedCol !== col) { const arr = [...columnOrder]; const from = arr.indexOf(draggedCol); const to = arr.indexOf(col); arr.splice(from, 1); arr.splice(to, 0, draggedCol); setColumnOrder(arr); } setDraggedCol(null); }} className="text-left p-2.5 font-semibold text-[#6b5d4f] whitespace-nowrap align-top" style={{ cursor: 'grab', opacity: draggedCol === col ? 0.4 : 1 }} title={isQ ? q?.label : undefined}>
                        <div className="flex items-center gap-0.5">
                          <GripVertical size={10} className="text-[#c9b896] shrink-0" />
                          <button onClick={() => toggleSort(col)} className="flex items-center gap-0.5 hover:text-[#3a2e22] capitalize">{header} <SortIcon col={col} /></button>
                          <div className="flex items-center ml-0.5">
                            <button onClick={() => moveCol(col, -1)} disabled={idx === 0} className="text-[#c9b896] disabled:opacity-30 hover:text-[#8a6d3b]"><ArrowLeft size={10} /></button>
                            <button onClick={() => moveCol(col, 1)} disabled={idx === columnOrder.length - 1} className="text-[#c9b896] disabled:opacity-30 hover:text-[#8a6d3b]"><ArrowRight size={10} /></button>
                          </div>
                        </div>
                        <input className="admin-input text-xs mt-1 w-full" style={{ padding: '2px 6px', maxWidth: 90 }} placeholder="Filter..." value={colFilters[col] || ''} onChange={(e) => setColFilters((p) => ({ ...p, [col]: e.target.value }))} />
                      </th>
                    );
                  })}
                  <th className="p-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const rows: React.ReactNode[] = [];
                  let lastPartyId: string | null | undefined = undefined;
                  for (let i = 0; i < sortedFiltered.length; i++) {
                    const g = sortedFiltered[i];
                    const nextG = sortedFiltered[i + 1];
                    const isPartyStart = g.party_id && g.party_id !== lastPartyId;
                    const isPartyEnd = g.party_id && (!nextG || nextG.party_id !== g.party_id);
                    const isInParty = !!g.party_id;
                    const color = g.party_id ? partyColor(g.party_id) : undefined;

                    if (isPartyStart) {
                      rows.push(
                        <tr key={`party-header-${g.party_id}`}>
                          <td colSpan={columnOrder.length + 2} className="px-2.5 pt-3 pb-0">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                              <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color }}>{partyName(g.party_id)}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    rows.push(
                      <tr key={g.id} style={{
                        borderColor: '#f0e8d8',
                        background: selected.has(g.id) ? 'rgba(138,109,59,0.04)' : isInParty ? `${color}06` : 'transparent',
                        borderLeft: isInParty ? `3px solid ${color}` : undefined,
                        borderBottom: isPartyEnd ? `1px solid ${color}30` : '1px solid #f0e8d8',
                      }}>
                        <td className="p-2.5"><button onClick={() => toggleSelect(g.id)}>{selected.has(g.id) ? <CheckSquare size={16} className="text-[#8a6d3b]" /> : <Square size={16} className="text-[#c9b896]" />}</button></td>
                        {columnOrder.map((col) => renderGuestCell(g, col, color))}
                        <td className="p-2.5"><div className="flex gap-1 justify-end"><button onClick={() => setEditing(g)} className="text-[#8a7a66] hover:text-[#5a4430]"><Edit2 size={14} /></button><ConfirmButton onConfirm={() => remove(g.id)}><Trash2 size={14} /></ConfirmButton></div></td>
                      </tr>
                    );

                    lastPartyId = g.party_id;
                  }
                  return rows;
                })()}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {partyGroups.map(([key, members]) => {
            const pName = partyName(members[0].party_id) || members[0].name + "'s Party";
            const color = members[0].party_id ? partyColor(members[0].party_id) : '#c9b896';
            const sortedMembers = [...members].sort((a, b) => {
              if (a.is_party_leader && !b.is_party_leader) return -1;
              if (!a.is_party_leader && b.is_party_leader) return 1;
              return 0;
            });
            return (
              <div key={key} className="admin-card p-4" style={{ borderLeft: `4px solid ${color}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-3 h-3 rounded-full" style={{ background: color, border: `2px solid ${color}40` }} />
                  <h3 className="font-semibold text-[#3a2e22]">{pName}</h3>
                  <span className="text-xs text-[#8a7a66]">{members.length} member{members.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="relative">
                  {/* Vertical connector line */}
                  <div className="absolute left-3.5 top-0 bottom-0 w-0.5" style={{ background: `${color}30` }} />
                  <div className="space-y-2">
                    {sortedMembers.map((g) => (
                      <div key={g.id} className="flex items-center gap-3 relative pl-0">
                        {/* Circle marker */}
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 relative z-10" style={{
                          background: '#fff',
                          border: `2px solid ${color}`,
                        }}>
                          {g.is_party_leader ? (
                            <span className="text-[9px] font-bold" style={{ color }}>★</span>
                          ) : (
                            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 rounded-lg border p-2.5" style={{ borderColor: '#e6ddcd', background: g.is_party_leader ? `${color}08` : '#faf6ee' }}>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[#3a2e22] truncate">{g.name}</p>
                            {g.is_party_leader && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: color, color: '#fff' }}>LEADER</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            <span className="text-[10px] font-medium" style={{ color: STATUS_COLORS[g.rsvp_status] }}>{g.rsvp_status}</span>
                            {g.email && <span className="text-[10px] text-[#8a7a66]">· {g.email}</span>}
                            {g.proxy_guest_name && <span className="text-[10px] text-[#8a7a66]">· RSVP by {g.proxy_guest_name}</span>}
                            {invitations[g.id] && <span className="text-[10px] text-[#5a7a4a] inline-flex items-center gap-0.5"><MailCheck size={9} /> Sent</span>}
                          </div>
                        </div>
                        <button onClick={() => setEditing(g)} className="text-[#8a7a66] hover:text-[#5a4430]"><Edit2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(adding || editing) && <GuestForm guest={editing} parties={parties} onCancel={() => { setEditing(null); setAdding(false); }} onSave={save} />}
      {showImport && <ImportModal onClose={() => { setShowImport(false); setImportResult(null); }} onImport={handleImport} result={importResult} />}
      {bulkAction === 'delete' && <BulkConfirmModal title="Delete Selected Guests" message={`Delete ${selected.size} guest(s)? This cannot be undone.`} onConfirm={bulkDelete} onCancel={() => setBulkAction(null)} />}
      {bulkAction === 'party' && <BulkPartyModal parties={parties} onAssign={bulkAssignParty} onCancel={() => setBulkAction(null)} />}
      {bulkAction === 'tags' && <BulkTagModal onAdd={bulkAddTag} onCancel={() => setBulkAction(null)} />}
      {showPartyManager && <PartyManagerModal parties={parties} onClose={() => { setShowPartyManager(false); load(); }} />}
    </div>
  );
}

function PartyManagerModal({ parties, onClose }: { parties: Party[]; onClose: () => void }) {
  const [localParties, setLocalParties] = useState<Party[]>(parties);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const addParty = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { data } = await supabase.from('parties').insert({ name: newName.trim() }).select().single();
    if (data) setLocalParties((prev) => [...prev, data as Party]);
    setNewName(''); setAdding(false); setSaving(false);
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setSaving(true);
    await supabase.from('parties').update({ name: editName.trim() }).eq('id', id);
    setLocalParties((prev) => prev.map((p) => p.id === id ? { ...p, name: editName } : p));
    setEditingId(null); setSaving(false);
  };

  const deleteParty = async (id: string) => {
    await supabase.from('parties').delete().eq('id', id);
    setLocalParties((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.45)' }} onClick={onClose}>
      <div className="admin-card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#3a2e22]">Manage Parties</h3>
          <button onClick={onClose}><X size={18} className="text-[#8a7a66]" /></button>
        </div>
        <div className="space-y-2 mb-3 max-h-60 overflow-y-auto thin-scroll">
          {localParties.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-lg border p-2" style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
              {editingId === p.id ? (
                <>
                  <input className="admin-input flex-1 text-sm" style={{ padding: '4px 8px' }} value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit(p.id)} autoFocus />
                  <button onClick={() => saveEdit(p.id)} disabled={saving} className="text-xs text-[#5a7a4a] font-semibold">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-[#8a7a66]">Cancel</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-[#3a2e22]">{p.name}</span>
                  <button onClick={() => { setEditingId(p.id); setEditName(p.name); }} className="text-[#8a7a66] hover:text-[#5a4430]"><Edit2 size={13} /></button>
                  <button onClick={() => deleteParty(p.id)} className="text-[#c9b896] hover:text-[#b03a3a]"><Trash2 size={13} /></button>
                </>
              )}
            </div>
          ))}
          {localParties.length === 0 && <p className="text-sm text-[#8a7a66] text-center py-4">No parties yet.</p>}
        </div>
        {adding ? (
          <div className="flex items-center gap-2">
            <input className="admin-input flex-1 text-sm" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addParty()} placeholder="Party name..." autoFocus />
            <button onClick={addParty} disabled={saving} className="btn-primary text-sm px-3 py-1.5">Add</button>
            <button onClick={() => setAdding(false)} className="btn-ghost text-sm px-2 py-1.5">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="btn-ghost w-full flex items-center justify-center gap-1.5"><Plus size={14} /> Add Party</button>
        )}
        <button onClick={onClose} className="btn-primary w-full mt-3">Done</button>
      </div>
    </div>
  );
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []; let cur = ''; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') inQuotes = false; else cur += ch; }
    else { if (ch === '"') inQuotes = true; else if (ch === ',') { result.push(cur.trim()); cur = ''; } else cur += ch; }
  }
  result.push(cur.trim()); return result;
}

function ImportModal({ onClose, onImport, result }: { onClose: () => void; onImport: (file: File) => void; result: string | null }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const downloadTemplate = () => {
    const csv = 'First Name,Last Name,Email,Party Name,Guest Tags,Plus-One Allowed\nJohn,Smith,john@email.com,The Smith Family,VIP,Family,yes\nJane,Smith,jane@email.com,The Smith Family,Family,yes';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'guest-import-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onClose}>
      <div className="admin-card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#3a2e22]">Import Guests from CSV</h3>
          <button onClick={onClose}><X size={18} className="text-[#8a7a66]" /></button>
        </div>
        <div className="space-y-3">
          <div className="rounded-lg border p-3 text-xs text-[#8a7a66]" style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
            <p className="font-semibold text-[#5a4430] mb-1">Expected columns:</p>
            <p>First Name, Last Name, Email, Party Name, Guest Tags (comma-separated), Plus-One Allowed (yes/no)</p>
            <button onClick={downloadTemplate} className="mt-2 text-[#8a6d3b] font-semibold underline">Download template</button>
          </div>
          <div onClick={() => fileRef.current?.click()} className="rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition hover:border-[#8a6d3b]" style={{ borderColor: '#d6cdbf', background: '#faf6ee' }}>
            <Upload size={24} className="mx-auto text-[#a07c4a] mb-2" />
            <p className="text-sm text-[#6b5d4f]">Click to select a CSV file</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); }} />
          {result && <p className="text-sm font-semibold text-[#5a7a4a]">{result}</p>}
        </div>
        <div className="mt-4"><button onClick={onClose} className="btn-ghost w-full">Close</button></div>
      </div>
    </div>
  );
}

function BulkConfirmModal({ title, message, onConfirm, onCancel }: { title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onCancel}>
      <div className="admin-card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-[#3a2e22] mb-2">{title}</h3>
        <p className="text-sm text-[#8a7a66] mb-4">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-lg font-semibold text-white" style={{ background: '#b03a3a' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function BulkPartyModal({ parties, onAssign, onCancel }: { parties: Party[]; onAssign: (id: string) => void; onCancel: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = parties.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onCancel}>
      <div className="admin-card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-[#3a2e22] mb-3">Assign to Party</h3>
        <input className="admin-input mb-3" placeholder="Search parties..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
        <div className="space-y-2 max-h-60 overflow-auto thin-scroll">
          {filtered.length === 0 ? (
            <p className="text-xs text-center text-[#a0927e] py-4">No parties match "{search}".</p>
          ) : filtered.map((p) => (
            <button key={p.id} onClick={() => onAssign(p.id)} className="w-full text-left rounded-lg border p-2.5 text-sm hover:border-[#8a6d3b]" style={{ borderColor: '#e6ddcd', background: '#faf6ee', color: '#5a4430' }}>{p.name}</button>
          ))}
        </div>
        <div className="mt-3"><button onClick={onCancel} className="btn-ghost w-full">Cancel</button></div>
      </div>
    </div>
  );
}

function BulkTagModal({ onAdd, onCancel }: { onAdd: (tag: string) => void; onCancel: () => void }) {
  const [tag, setTag] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onCancel}>
      <div className="admin-card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-[#3a2e22] mb-3">Add Tag to Selected</h3>
        <input className="admin-input" placeholder="Tag name (e.g. VIP)" value={tag} onChange={(e) => setTag(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && tag.trim() && onAdd(tag.trim())} />
        <div className="flex gap-2 mt-3">
          <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
          <button onClick={() => tag.trim() && onAdd(tag.trim())} className="btn-primary flex-1">Add Tag</button>
        </div>
      </div>
    </div>
  );
}

function GuestForm({ guest, parties, onCancel, onSave }: { guest: Guest | null; parties: Party[]; onCancel: () => void; onSave: (g: Partial<Guest>) => void }) {
  const [form, setForm] = useState<Partial<Guest>>(guest || { name: '', email: '', phone: '', party_size: 1, rsvp_status: 'pending', dietary: '', plus_one_name: '', song_requests: '', notes: '', tags: [], plus_one_allowed: false, is_party_leader: false, name_on_card: '' });
  const [tagInput, setTagInput] = useState('');
  const [newPartyName, setNewPartyName] = useState('');

  const addTag = () => {
    const tags = tagInput.split(',').map((t) => t.trim()).filter(Boolean);
    const current = form.tags || [];
    const newTags = tags.filter((t) => !current.includes(t));
    if (newTags.length) { setForm({ ...form, tags: [...current, ...newTags] }); setTagInput(''); }
  };
  const removeTag = (t: string) => setForm({ ...form, tags: (form.tags || []).filter((x) => x !== t) });

  const createParty = async () => {
    if (!newPartyName.trim()) return;
    const token = newPartyName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).slice(2, 8);
    const { data } = await supabase.from('parties').insert({ name: newPartyName.trim(), guest_token: token }).select().single();
    if (data) { setForm({ ...form, party_id: data.id }); setNewPartyName(''); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onCancel}>
      <div className="admin-card w-full max-w-md p-5 max-h-[90vh] overflow-auto thin-scroll" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#3a2e22]">{guest ? 'Edit Guest' : 'Add Guest'}</h3>
          <button onClick={onCancel}><X size={18} className="text-[#8a7a66]" /></button>
        </div>
        <div className="space-y-3">
          <div><label className="admin-label">Name *</label><input className="admin-input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="admin-label">Name on Card <span className="text-[10px] font-normal text-[#8a7a66]">(defaults to guest name)</span></label><input className="admin-input" value={form.name_on_card ?? ''} onChange={(e) => setForm({ ...form, name_on_card: e.target.value })} placeholder={form.name || ''} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="admin-label">Email</label><input className="admin-input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="admin-label">Phone</label><input className="admin-input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div>
            <label className="admin-label">Party</label>
            <select className="admin-input" value={form.party_id || ''} onChange={(e) => setForm({ ...form, party_id: e.target.value || null })}>
              <option value="">No party</option>{parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="flex gap-2 mt-2">
              <input className="admin-input text-xs" placeholder="New party name..." value={newPartyName} onChange={(e) => setNewPartyName(e.target.value)} />
              <button onClick={createParty} className="btn-ghost text-xs flex items-center gap-1"><UserPlus size={12} /> Create</button>
            </div>
          </div>
          <div>
            <label className="admin-label">Guest Tags (comma-separated)</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(form.tags || []).map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#f0e8d8', color: '#5a4430' }}><Tag size={10} /> {t}<button onClick={() => removeTag(t)}><X size={10} /></button></span>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="admin-input text-xs" placeholder="VIP, Family, Bridal Party..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
              <button onClick={addTag} className="btn-ghost text-xs">Add</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="admin-label">RSVP Status</label><select className="admin-input" value={form.rsvp_status} onChange={(e) => setForm({ ...form, rsvp_status: e.target.value })}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="declined">Declined</option></select></div>
            <div><label className="admin-label">Plus-One Allowed</label><select className="admin-input" value={form.plus_one_allowed ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, plus_one_allowed: e.target.value === 'yes' })}><option value="yes">Yes</option><option value="no">No</option></select>
              <p className="text-xs text-[#8a7a66] mt-1">When Yes, the guest will see a Plus One (Yes/No + Name) question in the RSVP wizard.</p>
            </div>
            <div><label className="admin-label">Party Leader</label><select className="admin-input" value={form.is_party_leader ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, is_party_leader: e.target.value === 'yes' })}><option value="no">No</option><option value="yes">Yes — appears at top of party group</option></select></div>
          </div>
          <div><label className="admin-label">Plus-one Name</label><input className="admin-input" value={form.plus_one_name || ''} onChange={(e) => setForm({ ...form, plus_one_name: e.target.value })} /></div>
          <div><label className="admin-label">Dietary Restrictions</label><input className="admin-input" value={form.dietary || ''} onChange={(e) => setForm({ ...form, dietary: e.target.value })} /></div>
          <div><label className="admin-label">Song Requests</label><input className="admin-input" value={form.song_requests || ''} onChange={(e) => setForm({ ...form, song_requests: e.target.value })} /></div>
          <div><label className="admin-label">Notes</label><textarea className="admin-input" rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
          <button onClick={() => form.name?.trim() && onSave(form)} className="btn-primary flex-1">Save</button>
        </div>
      </div>
    </div>
  );
}

function NameOnCardCell({ guest, onSaved }: { guest: Guest; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(guest.name_on_card ?? '');

  useEffect(() => { setValue(guest.name_on_card ?? ''); }, [guest.name_on_card]);

  const save = async () => {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed === (guest.name_on_card || '')) return;
    await supabase.from('guests').update({ name_on_card: trimmed || null }).eq('id', guest.id);
    onSaved();
  };

  if (editing) {
    return (
      <input
        className="admin-input text-xs"
        style={{ padding: '2px 6px', width: 140 }}
        value={value}
        placeholder={guest.name}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setValue(guest.name_on_card ?? ''); } }}
      />
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="text-left hover:text-[#8a6d3b] hover:underline truncate" style={{ maxWidth: 160 }} title="Click to edit name on card">
      {guest.name_on_card || guest.name}
    </button>
  );
}
