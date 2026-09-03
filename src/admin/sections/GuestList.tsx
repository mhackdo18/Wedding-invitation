import { useEffect, useMemo, useState, useRef, cloneElement } from 'react';
import { supabase } from '@/lib/supabase';
import { SectionHeader, Card, EmptyState, ConfirmButton } from '../ui';
import type { Guest, Party, RsvpQuestion, RsvpAnswer, ConditionalSubQuestion } from '@/types';
import { Users, Plus, Loader2, Trash2, Edit2, X, Search, Download, Upload, Tag, UserPlus, List, Layers, CheckSquare, Square, Settings2, ArrowUp, ArrowDown, ArrowUpDown, Clock, MailCheck, ArrowLeft, ArrowRight, GripVertical, AlertTriangle, RotateCcw, Eye, EyeOff, Columns3, Pin } from 'lucide-react';
import TagInput, { addTagToRegistry, removeTagFromRegistry, invalidateTagCache } from '@/components/admin/TagInput';
import { UploadProgress } from '@/components/admin/UploadProgress';
import { useColumnResize } from '@/lib/useColumnResize';
import { useStickyScrollbar } from '@/lib/useStickyScrollbar';
import { formatInTimezone } from '@/lib/timezone';

const STATUS_COLORS: Record<string, string> = { confirmed: '#5a7a4a', declined: '#b03a3a', pending: '#a07c4a' };
const PARTY_COLORS = ['#8a6d3b', '#5a7a4a', '#b5722f', '#7a5c8a', '#3a6a8a', '#a05a5a', '#5a8a7a', '#8a5a3a'];

function partyColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return PARTY_COLORS[Math.abs(hash) % PARTY_COLORS.length];
}

const CHECKBOX_WIDTH = 32;
const DEFAULT_COL_WIDTH = 150;

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
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'individual' | 'party'>('individual');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [questions, setQuestions] = useState<RsvpQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({});
  const [showPartyManager, setShowPartyManager] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [invitations, setInvitations] = useState<Record<string, string | null>>({});
  const [timezone, setTimezone] = useState<string | null>('UTC');
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try { const saved = localStorage.getItem('guestList_columnOrder'); if (saved) return JSON.parse(saved); } catch {}
    return ['name', 'contact', 'name_on_card', 'party', 'plus_one', 'tags', 'proxy', 'status', 'rsvp_submitted', 'invited', 'dietary', 'song_requests', 'notes'];
  });
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => {
    try { const saved = localStorage.getItem('guestList_hiddenCols'); if (saved) return new Set(JSON.parse(saved)); } catch {}
    return new Set();
  });
  const [freezeCount, setFreezeCount] = useState<number>(() => {
    try { const saved = localStorage.getItem('guestList_freezeCount'); if (saved !== null) return Math.min(parseInt(saved, 10) || 0, 3); } catch {}
    return 0;
  });
  const [showColMenu, setShowColMenu] = useState(false);
  const [draggedCol, setDraggedCol] = useState<string | null>(null);
  const { colWidths, startResize } = useColumnResize('guestList_colWidths', { name: 180, contact: 200, name_on_card: 160, party: 140, plus_one: 140, tags: 160, proxy: 140, status: 110, rsvp_submitted: 160, invited: 90, dietary: 160, song_requests: 160, notes: 200 });
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const { visible: stickyVisible, thumbWidth, thumbLeft, scrollTo } = useStickyScrollbar(tableScrollRef);
  const stickyTrackRef = useRef<HTMLDivElement>(null);
  const stickyDragging = useRef(false);

  useEffect(() => { localStorage.setItem('guestList_columnOrder', JSON.stringify(columnOrder)); }, [columnOrder]);
  useEffect(() => { localStorage.setItem('guestList_hiddenCols', JSON.stringify(Array.from(hiddenCols))); }, [hiddenCols]);
  useEffect(() => { localStorage.setItem('guestList_freezeCount', String(freezeCount)); }, [freezeCount]);
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('[data-column-menu]')) setShowColMenu(false);
    };
    if (showColMenu) { document.addEventListener('click', handler); return () => document.removeEventListener('click', handler); }
  }, [showColMenu]);

  const toggleColVisibility = (col: string) => setHiddenCols((prev) => { const n = new Set(prev); n.has(col) ? n.delete(col) : n.add(col); return n; });
  const allColumnsVisible = columnOrder.length > 0 && columnOrder.every((col) => !hiddenCols.has(col));
  const toggleAllColumns = () => setHiddenCols(allColumnsVisible ? new Set(columnOrder) : new Set());

  const formatAnswerValue = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    if (typeof v === 'object') {
      if ('first_name' in v && 'last_name' in v) {
        const fn = String((v as { first_name: unknown }).first_name || '').trim();
        const ln = String((v as { last_name: unknown }).last_name || '').trim();
        return `${fn} ${ln}`.trim() || '';
      }
      if ('value' in v) return formatAnswerValue((v as { value: unknown }).value);
    }
    return String(v);
  };

  const flattenFollowups = (obj: Record<string, unknown>, prefix: string, out: Record<string, string>): void => {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}__${k}` : k;
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        const fo = v as { value?: unknown; __followups?: Record<string, unknown> };
        if (fo.value !== undefined) out[key] = formatAnswerValue(fo.value);
        if (fo.__followups) flattenFollowups(fo.__followups, key, out);
      } else {
        out[key] = formatAnswerValue(v);
      }
    }
  };

  const parseAnswer = (raw: string): { value: string; followups: Record<string, string> } => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if (parsed.value !== undefined) {
          const followups: Record<string, string> = {};
          if (parsed.__followups) flattenFollowups(parsed.__followups as Record<string, unknown>, '', followups);
          return { value: formatAnswerValue(parsed.value), followups };
        }
        if ('first_name' in parsed && 'last_name' in parsed) {
          return { value: formatAnswerValue(parsed), followups: {} };
        }
      }
      if (typeof parsed === 'string') return { value: parsed, followups: {} };
    } catch {}
    return { value: raw, followups: {} };
  };

  const colValue = (g: Guest, col: string): string => {
    if (col.startsWith('q_')) { const raw = answers[g.id]?.[col.slice(2)]; if (!raw) return ''; const { value } = parseAnswer(raw); return value; }
    if (col.startsWith('f_')) { const rest = col.slice(2); const firstSep = rest.indexOf('__'); const qid = firstSep >= 0 ? rest.slice(0, firstSep) : rest; const fkey = firstSep >= 0 ? rest.slice(firstSep + 2) : ''; const raw = answers[g.id]?.[qid]; if (!raw) return ''; const { followups } = parseAnswer(raw); return followups[fkey] || ''; }
    switch (col) {
      case 'name': return g.name;
      case 'contact': return g.email || g.phone || '';
      case 'party': return partyName(g.party_id) || '';
      case 'plus_one': return g.plus_one_name || '';
      case 'tags': return (g.tags || []).join(', ');
      case 'proxy': return g.proxy_guest_name || '';
      case 'name_on_card': return g.name_on_card || g.name;
      case 'status': return g.rsvp_status;
      case 'rsvp_submitted': return g.rsvp_submitted_at ? formatInTimezone(g.rsvp_submitted_at, timezone) : '';
      case 'invited': return invitations[g.id] ? 'sent' : '';
      case 'dietary': return g.dietary || '';
      case 'song_requests': return g.song_requests || '';
      case 'notes': return g.notes || '';
      default: return '';
    }
  };

  const load = async () => {
    setLoading(true);
    const [{ data: g }, { data: p }, { data: qs }, { data: ans }, { data: inv }, { data: st }] = await Promise.all([
      supabase.from('guests').select('*').order('created_at', { ascending: false }),
      supabase.from('parties').select('*').order('name'),
      supabase.from('rsvp_questions').select('*').order('display_order'),
      supabase.from('rsvp_answers').select('*'),
      supabase.from('invitations').select('guest_id, sent_at'),
      supabase.from('site_settings').select('timezone').order('created_at').limit(1).maybeSingle(),
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
    setTimezone((st as { timezone?: string } | null)?.timezone || 'UTC');
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const qCols: string[] = [];
    const addSubCols = (subs: ConditionalSubQuestion[], qid: string) => {
      for (const sub of subs) {
        qCols.push(`f_${qid}__${sub.field_key}`);
        if (sub.conditional_sub_questions?.length) addSubCols(sub.conditional_sub_questions, qid);
      }
    };
    questions.forEach(q => {
      qCols.push(`q_${q.id}`);
      addSubCols(q.conditional_sub_questions || [], q.id);
    });
    setColumnOrder(prev => {
      const builtIn = prev.filter(c => !c.startsWith('q_') && !c.startsWith('f_'));
      const existing = new Set(builtIn);
      const missingBuiltIn = ['name', 'contact', 'name_on_card', 'party', 'plus_one', 'tags', 'proxy', 'status', 'rsvp_submitted', 'invited', 'dietary', 'song_requests', 'notes'].filter(c => !existing.has(c));
      return [...builtIn, ...missingBuiltIn, ...qCols.filter(c => !prev.includes(c))];
    });
  }, [questions]);

  const findSubQuestion = (q: RsvpQuestion, fkey: string): ConditionalSubQuestion | undefined => {
    const search = (subs: ConditionalSubQuestion[]): ConditionalSubQuestion | undefined => {
      for (const sub of subs) {
        if (sub.field_key === fkey) return sub;
        if (sub.conditional_sub_questions?.length) {
          const found = search(sub.conditional_sub_questions);
          if (found) return found;
        }
      }
      return undefined;
    };
    return search(q.conditional_sub_questions || []);
  };

  const partyName = (id: string | null) => parties.find((p) => p.id === id)?.name || null;

  const save = async (g: Partial<Guest>) => {
    if (g.id) {
      await supabase.from('guests').update({
        name: g.name, email: g.email, phone: g.phone, party_size: g.party_size,
        rsvp_status: g.rsvp_status, dietary: g.dietary, plus_one_name: g.plus_one_name,
        proxy_guest_name: g.proxy_guest_name,
        song_requests: g.song_requests, notes: g.notes,
        party_id: g.party_id, tags: g.tags, plus_one_allowed: g.plus_one_allowed, is_party_leader: g.is_party_leader,
        name_on_card: g.name_on_card,
      }).eq('id', g.id);

      // DB trigger clears all RSVP data automatically when status changes to pending
    } else {
      await supabase.from('guests').insert({
        name: g.name, email: g.email, phone: g.phone, party_size: g.party_size || 1,
        rsvp_status: g.rsvp_status || 'pending', dietary: g.dietary, plus_one_name: g.plus_one_name,
        proxy_guest_name: g.proxy_guest_name,
        song_requests: g.song_requests, notes: g.notes,
        party_id: g.party_id, tags: g.tags || [], plus_one_allowed: g.plus_one_allowed ?? true, is_party_leader: g.is_party_leader ?? false,
        name_on_card: g.name_on_card,
      });
    }
    setEditing(null); setAdding(false); load();
  };

  const cleanupEmptyParties = async () => {
    const { data: allParties } = await supabase.from('parties').select('id');
    if (!allParties) return;
    for (const p of allParties) {
      const { count } = await supabase.from('guests').select('*', { count: 'exact', head: true }).eq('party_id', p.id);
      if (count === 0) await supabase.from('parties').delete().eq('id', p.id);
    }
  };

  const remove = async (id: string) => { await supabase.from('guests').delete().eq('id', id); await cleanupEmptyParties(); load(); };

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

  const renderGuestCell = (g: Guest, col: string, color?: string, showPartyVisual?: boolean) => {
    switch (col) {
      case 'name':
        return (
          <td key="name" className="p-2.5 whitespace-nowrap">
            <div className="flex items-center gap-2">
              {g.party_id && color && (
                <span
                  className="w-3.5 h-3.5 rounded shrink-0"
                  style={{ background: color, border: `1.5px solid ${color}55` }}
                  title={partyName(g.party_id) || undefined}
                />
              )}
              <div className={showPartyVisual ? 'pl-2' : ''}>
                <button onClick={() => setEditing(g)} className="font-medium text-[#3a2e22] hover:text-[#8a6d3b] hover:underline cursor-pointer text-left">{g.name}</button>
                {g.is_party_leader && g.party_id && <span className="ml-1 text-[9px] px-1 py-0.5 rounded-full font-bold" style={{ background: color, color: '#fff' }}>LEADER</span>}
                {(g.tags || []).includes('plus-one') && g.proxy_guest_name && <div className="text-[10px] text-[#5a7a4a] mt-0.5">Plus one of {g.proxy_guest_name}</div>}
                {g.proxy_guest_name && !(g.tags || []).includes('plus-one') && <div className="text-[10px] text-[#7a5c8a] mt-0.5">Attending as Proxy {g.proxy_guest_name}</div>}
              </div>
            </div>
          </td>
        );
      case 'contact':
        return <td key="contact" className="p-2.5 text-xs text-[#8a7a66] whitespace-nowrap">{g.email || g.phone || '\u2014'}</td>;
      case 'name_on_card':
        return <td key="name_on_card" className="p-2.5 text-xs text-[#5a4430] whitespace-nowrap"><NameOnCardCell guest={g} onSaved={load} /></td>;
      case 'party':
        return <td key="party" className="p-2.5 text-xs whitespace-nowrap">{g.party_id ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: `${color}15`, color: color }}>{partyName(g.party_id) || ''}</span> : null}</td>;
      case 'plus_one':
        return <td key="plus_one" className="p-2.5 text-xs text-[#8a7a66] whitespace-nowrap">{g.plus_one_name || (g.plus_one_allowed ? <span className="text-[#c9b896]">allowed</span> : '\u2014')}</td>;
      case 'tags':
        return <td key="tags" className="p-2.5"><div className="flex flex-wrap gap-1">{(g.tags || []).map((t) => <span key={t} className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap" style={{ background: '#f0e8d8', color: '#8a6d3b' }}>{t}</span>)}</div></td>;
      case 'proxy':
        return <td key="proxy" className="p-2.5 text-xs text-[#8a7a66] whitespace-nowrap">{g.proxy_guest_name || '\u2014'}</td>;
      case 'dietary':
        return <td key="dietary" className="p-2.5 text-xs text-[#8a7a66] whitespace-nowrap">{g.dietary || '\u2014'}</td>;
      case 'song_requests':
        return <td key="song_requests" className="p-2.5 text-xs text-[#8a7a66] whitespace-nowrap">{g.song_requests || '\u2014'}</td>;
      case 'notes':
        return <td key="notes" className="p-2.5 text-xs text-[#8a7a66]">{g.notes || '\u2014'}</td>;
      case 'status':
        return <td key="status" className="p-2.5"><span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: STATUS_COLORS[g.rsvp_status] }}><span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[g.rsvp_status] }} />{g.rsvp_status}</span></td>;
      case 'rsvp_submitted':
        return <td key="rsvp_submitted" className="p-2.5 text-xs text-[#8a7a66] whitespace-nowrap">{g.rsvp_submitted_at ? <span className="inline-flex items-center gap-1"><Clock size={11} className="text-[#8a6d3b]" />{formatInTimezone(g.rsvp_submitted_at, timezone)}</span> : <span className="text-[#c9b896]">—</span>}</td>;
      case 'invited':
        return <td key="invited" className="p-2.5 text-xs whitespace-nowrap">{invitations[g.id] ? <span className="inline-flex items-center gap-1 text-[#5a7a4a] font-medium"><MailCheck size={12} /> Sent</span> : <span className="text-[#c9b896]">—</span>}</td>;
      default:
        if (col.startsWith('f_')) {
          const rest = col.slice(2);
          const firstSep = rest.indexOf('__');
          const qid = firstSep >= 0 ? rest.slice(0, firstSep) : rest;
          const fkey = firstSep >= 0 ? rest.slice(firstSep + 2) : '';
          const raw = answers[g.id]?.[qid];
          if (!raw) return <td key={col} className="p-2.5 text-xs text-[#8a7a66] whitespace-nowrap">{'\u2014'}</td>;
          const { followups } = parseAnswer(raw);
          return <td key={col} className="p-2.5 text-xs text-[#8a7a66] whitespace-nowrap">{followups[fkey] || '\u2014'}</td>;
        }
        if (col.startsWith('q_')) {
          const raw = answers[g.id]?.[col.slice(2)];
          if (!raw) return <td key={col} className="p-2.5 text-xs text-[#8a7a66] whitespace-nowrap">{'\u2014'}</td>;
          const { value } = parseAnswer(raw);
          return <td key={col} className="p-2.5 text-xs text-[#8a7a66] whitespace-nowrap">{value || '\u2014'}</td>;
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

  const partyMemberCount = useMemo(() => {
    const m = new Map<string, number>();
    guests.forEach((g) => {
      const key = g.party_id || g.id;
      m.set(key, (m.get(key) || 0) + 1);
    });
    return m;
  }, [guests]);

  const isMultiMemberParty = (partyId: string | null, guestId: string) => {
    const key = partyId || guestId;
    return (partyMemberCount.get(key) || 1) >= 2;
  };

  const visibleCols = useMemo(() => columnOrder.filter(c => !hiddenCols.has(c)), [columnOrder, hiddenCols]);

  const frozenOffsets = useMemo(() => {
    const offsets: { left: number; isFrozen: boolean; isLastFrozen: boolean }[] = [];
    let cum = CHECKBOX_WIDTH;
    for (let i = 0; i < visibleCols.length; i++) {
      const isFrozen = i < freezeCount;
      offsets.push({ left: cum, isFrozen, isLastFrozen: isFrozen && i === freezeCount - 1 });
      cum += colWidths[visibleCols[i]] || DEFAULT_COL_WIDTH;
    }
    return offsets;
  }, [visibleCols, freezeCount, colWidths]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSelectAll = () => {
    setSelected((prev) => prev.size === sortedFiltered.length ? new Set() : new Set(sortedFiltered.map((g) => g.id)));
  };

  const bulkDelete = async () => {
    await supabase.from('guests').delete().in('id', Array.from(selected));
    await cleanupEmptyParties();
    setSelected(new Set()); setBulkAction(null); load();
  };
  const bulkAssignParty = async (partyId: string) => {
    await supabase.from('guests').update({ party_id: partyId }).in('id', Array.from(selected));
    setSelected(new Set()); setBulkAction(null); load();
  };
  const bulkSetStatus = async (status: string) => {
    await supabase.from('guests').update({ rsvp_status: status }).in('id', Array.from(selected));
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
    const baseHeaders = ['First Name', 'Last Name', 'Email', 'Phone', 'Party Name', 'Party Leader', 'RSVP Status', 'RSVP Submitted At', 'Plus One Allowed', 'Plus One Name', 'Proxy Guest Name', 'Guest Tags', 'Name on Card', 'Dietary', 'Song Requests', 'Notes', 'Checked In'];
    const qHeaders: string[] = [];
    const addSubHeaders = (subs: ConditionalSubQuestion[], qLabel: string) => {
      for (const sub of subs) {
        const subLabel = sub.column_name || sub.label || sub.field_key;
        qHeaders.push(`${qLabel} → ${subLabel}`);
        if (sub.conditional_sub_questions?.length) addSubHeaders(sub.conditional_sub_questions, qLabel);
      }
    };
    questions.forEach(q => {
      const qLabel = q.column_name || q.label || q.id;
      qHeaders.push(qLabel);
      addSubHeaders(q.conditional_sub_questions || [], qLabel);
    });
    const headers = [...baseHeaders, ...qHeaders];
    const rows: string[][] = [headers];
    filtered.forEach((g) => {
      const parts = g.name.split(' ');
      const party = partyName(g.party_id);
      const baseRow = [
        parts[0] || '',
        parts.slice(1).join(' '),
        g.email || '',
        g.phone || '',
        party || '',
        g.is_party_leader ? 'yes' : 'no',
        g.rsvp_status || 'pending',
        g.rsvp_submitted_at ? formatInTimezone(g.rsvp_submitted_at, timezone) : '',
        g.plus_one_allowed ? 'yes' : 'no',
        g.plus_one_name || '',
        g.proxy_guest_name || '',
        (g.tags || []).join(','),
        g.name_on_card || '',
        g.dietary || '',
        g.song_requests || '',
        g.notes || '',
        g.checked_in ? 'yes' : 'no',
      ];
      const qValues: string[] = [];
      const addSubValues = (subs: ConditionalSubQuestion[], qid: string) => {
        for (const sub of subs) {
          const raw = answers[g.id]?.[qid];
          const { followups } = raw ? parseAnswer(raw) : { value: '', followups: {} as Record<string, string> };
          qValues.push(followups[sub.field_key] || '');
          if (sub.conditional_sub_questions?.length) addSubValues(sub.conditional_sub_questions, qid);
        }
      };
      questions.forEach(q => {
        const raw = answers[g.id]?.[q.id];
        const { value } = raw ? parseAnswer(raw) : { value: '', followups: {} };
        qValues.push(value);
        addSubValues(q.conditional_sub_questions || [], q.id);
      });
      rows.push([...baseRow, ...qValues]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'guest-list.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    if (importing) return;
    setImporting(true);
    setImportProgress(0);
    setImportResult(null);
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) { setImportResult('CSV must have a header row and at least one data row.'); setImporting(false); return; }

    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
    const firstNameIdx = headers.findIndex((h) => h.includes('first'));
    const lastNameIdx = headers.findIndex((h) => h.includes('last'));
    const emailIdx = headers.findIndex((h) => h.includes('email'));
    const phoneIdx = headers.findIndex((h) => h.includes('phone'));
    const partyIdx = headers.findIndex((h) => h.includes('party') && !h.includes('leader'));
    const partyLeaderIdx = headers.findIndex((h) => h.includes('party leader') || h === 'party_leader');
    const rsvpStatusIdx = headers.findIndex((h) => h.includes('rsvp') && h.includes('status'));
    const plusOneAllowedIdx = headers.findIndex((h) => h.includes('plus') && h.includes('one') && h.includes('allowed'));
    const plusOneNameIdx = headers.findIndex((h) => h.includes('plus') && h.includes('one') && h.includes('name'));
    const proxyIdx = headers.findIndex((h) => h.includes('proxy'));
    const tagsIdx = headers.findIndex((h) => h.includes('tag') && !h.includes('party'));
    const nameOnCardIdx = headers.findIndex((h) => h.includes('name') && h.includes('card'));
    const dietaryIdx = headers.findIndex((h) => h.includes('dietary'));
    const songIdx = headers.findIndex((h) => h.includes('song'));
    const notesIdx = headers.findIndex((h) => h.includes('notes'));
    const checkedInIdx = headers.findIndex((h) => h.includes('checked') && h.includes('in'));

    let imported = 0;
    let skipped = 0;
    const partyCache = new Map<string, string>();
    const { data: existingGuests } = await supabase.from('guests').select('name, email');
    const existingEmailName = new Set<string>();
    const existingNames = new Set<string>();
    (existingGuests || []).forEach((g: any) => {
      if (g.email) existingEmailName.add(`${g.email.toLowerCase()}__${g.name.toLowerCase()}`);
      existingNames.add(g.name.toLowerCase());
    });

    const totalRows = lines.length - 1;
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const firstName = (firstNameIdx >= 0 ? cols[firstNameIdx] : '') || '';
      const lastName = (lastNameIdx >= 0 ? cols[lastNameIdx] : '') || '';
      const name = `${firstName} ${lastName}`.trim() || cols[0] || `Guest ${i}`;
      const email = emailIdx >= 0 ? cols[emailIdx] || '' : '';
      const phone = phoneIdx >= 0 ? cols[phoneIdx] || '' : '';
      const pName = partyIdx >= 0 ? cols[partyIdx] || '' : '';
      const isPartyLeader = partyLeaderIdx >= 0 ? cols[partyLeaderIdx]?.toLowerCase().trim() === 'yes' : false;
      const rsvpStatus = rsvpStatusIdx >= 0 ? (cols[rsvpStatusIdx]?.toLowerCase().trim() || 'pending') : 'pending';
      const plusOneAllowed = plusOneAllowedIdx >= 0 ? cols[plusOneAllowedIdx]?.toLowerCase().trim() !== 'no' : true;
      const plusOneName = plusOneNameIdx >= 0 ? cols[plusOneNameIdx] || '' : '';
      const proxyGuestName = proxyIdx >= 0 ? cols[proxyIdx] || '' : '';
      const tagsRaw = tagsIdx >= 0 ? cols[tagsIdx] || '' : '';
      const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
      const nameOnCard = nameOnCardIdx >= 0 ? cols[nameOnCardIdx] || '' : '';
      const dietary = dietaryIdx >= 0 ? cols[dietaryIdx] || '' : '';
      const songRequests = songIdx >= 0 ? cols[songIdx] || '' : '';
      const notes = notesIdx >= 0 ? cols[notesIdx] || '' : '';
      const checkedIn = checkedInIdx >= 0 ? cols[checkedInIdx]?.toLowerCase().trim() === 'yes' : false;

      let partyId: string | null = null;
      if (pName) {
        const cacheKey = pName.toLowerCase().trim();
        if (partyCache.has(cacheKey)) partyId = partyCache.get(cacheKey)!;
        else {
          const { data: existing } = await supabase.from('parties').select('id').ilike('name', pName.trim()).maybeSingle();
          if (existing) partyId = existing.id;
          else {
            const token = pName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).slice(2, 8);
            const { data: np } = await supabase.from('parties').insert({ name: pName, guest_token: token }).select().single();
            if (np) partyId = np.id;
          }
          partyCache.set(cacheKey, partyId!);
        }
      }
      if (email && existingEmailName.has(`${email.toLowerCase()}__${name.toLowerCase()}`)) { skipped++; continue; }
      if (!email && existingNames.has(name.toLowerCase())) { skipped++; continue; }
      await supabase.from('guests').insert({
        name, email: email || null, phone: phone || null, party_size: 1,
        rsvp_status: rsvpStatus, party_id: partyId, tags,
        plus_one_allowed: plusOneAllowed ?? false, is_party_leader: isPartyLeader,
        plus_one_name: plusOneName || null, proxy_guest_name: proxyGuestName || null,
        name_on_card: nameOnCard || null, dietary: dietary || null,
        song_requests: songRequests || null, notes: notes || null,
        checked_in: checkedIn,
      });
      imported++;
      if (email) existingEmailName.add(`${email.toLowerCase()}__${name.toLowerCase()}`);
      existingNames.add(name.toLowerCase());
      setImportProgress(Math.round((i / totalRows) * 100));
    }
    setImportResult(`Imported ${imported} guest${imported !== 1 ? 's' : ''}${skipped > 0 ? `, skipped ${skipped} duplicate${skipped !== 1 ? 's' : ''}` : ''} successfully.`);
    setImportProgress(100);
    setImporting(false);
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
            <button onClick={() => setShowTagManager(true)} title="Manage Tags" className="p-2 rounded-lg border transition hover:bg-[#faf6ee]" style={{ borderColor: '#d6cdbf', color: '#8a7a66' }}>
              <Tag size={15} />
            </button>
            <div className="relative" data-column-menu>
              <button onClick={(e) => { e.stopPropagation(); setShowColMenu((open) => !open); }} title="Hide/Show Columns" className="p-2 rounded-lg border transition hover:bg-[#faf6ee]" style={{ borderColor: '#d6cdbf', color: '#8a7a66' }}>
                <Columns3 size={15} />
              </button>
              {showColMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 rounded-lg border shadow-lg max-h-80 overflow-y-auto thin-scroll min-w-48" style={{ borderColor: '#d6cdbf', background: '#fff' }}>
                  <p className="px-3 py-2 text-xs font-semibold text-[#5a4430] border-b" style={{ borderColor: '#e6ddcd' }}>Column Visibility</p>
                  <label className="flex items-center gap-2 px-3 py-1.5 border-b hover:bg-[#faf6ee] cursor-pointer text-xs font-semibold text-[#5a4430]" style={{ borderColor: '#e6ddcd' }}>
                    <input type="checkbox" checked={allColumnsVisible} onChange={toggleAllColumns} className="accent-[#8a6d3b]" />
                    {allColumnsVisible ? <Eye size={13} className="text-[#8a6d3b]" /> : <EyeOff size={13} className="text-[#c9b896]" />}
                    <span className="flex-1">All columns</span>
                  </label>
                  {columnOrder.map((col) => {
                    const isQ = col.startsWith('q_');
                    const isF = col.startsWith('f_');
                    const q = isQ ? questions.find(qx => `q_${qx.id}` === col) : null;
                    const label = isF ? (() => { const [qid, fkey] = col.slice(2).split('__'); const parent = questions.find(qx => qx.id === qid); const sub = parent ? findSubQuestion(parent, fkey) : undefined; return sub?.column_name || sub?.label || fkey; })() : isQ ? (q?.column_name || q?.label || col) : (col === 'plus_one' ? 'Plus One' : col === 'name_on_card' ? 'Name on Card' : col === 'rsvp_submitted' ? 'RSVP Submitted' : col);
                    return (
                      <label key={col} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#faf6ee] cursor-pointer text-xs text-[#5a4430]">
                        <input type="checkbox" checked={!hiddenCols.has(col)} onChange={() => toggleColVisibility(col)} className="accent-[#8a6d3b]" />
                        {hiddenCols.has(col) ? <EyeOff size={13} className="text-[#c9b896]" /> : <Eye size={13} className="text-[#8a6d3b]" />}
                        <span className="flex-1 truncate" style={{ opacity: hiddenCols.has(col) ? 0.5 : 1 }}>{label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1" title="Number of data columns to freeze on the left during horizontal scroll">
            <Pin size={13} className="text-[#8a7a66]" />
            <select className="admin-input w-auto text-xs" style={{ padding: '4px 8px' }} value={freezeCount} onChange={(e) => setFreezeCount(parseInt(e.target.value, 10))}>
              {Array.from({ length: Math.min(4, visibleCols.length + 1) }, (_, n) => <option key={n} value={n}>{n === 0 ? 'None' : n}</option>)}
            </select>
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
            <button onClick={() => setBulkAction('status')} className="btn-ghost text-xs flex items-center gap-1"><RotateCcw size={12} /> Bulk Set Status</button>
            <button onClick={() => setBulkAction('delete')} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ background: '#fbe9e9', color: '#b03a3a' }}><Trash2 size={12} /> Bulk Delete</button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-[#8a7a66]">Clear selection</button>
          </div>
        </Card>
      )}

      {viewMode === 'individual' ? (
        <div className="admin-card overflow-hidden">
          <div ref={tableScrollRef} className="overflow-auto thin-scroll" style={{ maxHeight: 'calc(100vh - 340px)', minHeight: '300px' }}>
            <table className="w-full text-sm" style={{ minWidth: 'max-content' }}>
              <thead className="sticky top-0" style={{ zIndex: 30 }}>
                <tr className="border-b" style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
                  <th className="p-2.5" style={{ position: 'sticky', left: 0, top: 0, zIndex: 40, width: CHECKBOX_WIDTH, minWidth: CHECKBOX_WIDTH, maxWidth: CHECKBOX_WIDTH, background: '#faf6ee' }}><button onClick={toggleSelectAll}>{selected.size === sortedFiltered.length && sortedFiltered.length > 0 ? <CheckSquare size={16} className="text-[#8a6d3b]" /> : <Square size={16} className="text-[#c9b896]" />}</button></th>
                  {visibleCols.map((col, idx) => {
                    const isQ = col.startsWith('q_');
                    const isF = col.startsWith('f_');
                    const q = isQ ? questions.find(qx => `q_${qx.id}` === col) : null;
                    const rawLabel = isF ? (() => { const [qid, fkey] = col.slice(2).split('__'); const parent = questions.find(qx => qx.id === qid); const sub = parent ? findSubQuestion(parent, fkey) : undefined; return sub?.column_name || sub?.label || fkey; })() : isQ ? (q ? (q.column_name || q.label) : col) : (col === 'plus_one' ? 'Plus One' : col === 'name_on_card' ? 'Name on Card' : col === 'rsvp_submitted' ? 'RSVP Submitted' : col);
                    const header = rawLabel.length > 20 ? rawLabel.slice(0, 18) + '…' : rawLabel;
                    const frozen = frozenOffsets[idx];
                    return (
                      <th key={col} draggable onDragStart={() => setDraggedCol(col)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (draggedCol && draggedCol !== col) { const arr = [...columnOrder]; const from = arr.indexOf(draggedCol); const to = arr.indexOf(col); arr.splice(from, 1); arr.splice(to, 0, draggedCol); setColumnOrder(arr); } setDraggedCol(null); }} className="text-left p-2.5 font-semibold text-[#6b5d4f] whitespace-nowrap align-top relative" style={{ cursor: 'grab', opacity: draggedCol === col ? 0.4 : 1, width: colWidths[col] || DEFAULT_COL_WIDTH, minWidth: colWidths[col] || DEFAULT_COL_WIDTH, ...(frozen.isFrozen ? { position: 'sticky', left: frozen.left, zIndex: 30, background: '#faf6ee', ...(frozen.isLastFrozen ? { borderRight: '1px solid #e6ddcd' } : {}) } : {}) }} title={isQ ? q?.label : undefined}>
                        <div className="flex items-center gap-0.5">
                          <GripVertical size={10} className="text-[#c9b896] shrink-0" />
                          <button onClick={() => toggleSort(col)} className="flex items-center gap-0.5 hover:text-[#3a2e22] capitalize">{header} <SortIcon col={col} /></button>
                          <div className="flex items-center ml-0.5">
                            <button onClick={() => moveCol(col, -1)} disabled={idx === 0} className="text-[#c9b896] disabled:opacity-30 hover:text-[#8a6d3b]"><ArrowLeft size={10} /></button>
                            <button onClick={() => moveCol(col, 1)} disabled={idx === visibleCols.length - 1} className="text-[#c9b896] disabled:opacity-30 hover:text-[#8a6d3b]"><ArrowRight size={10} /></button>
                          </div>
                        </div>
                        <input className="admin-input text-xs mt-1 w-full" style={{ padding: '2px 6px', maxWidth: 90 }} placeholder="Filter..." value={colFilters[col] || ''} onChange={(e) => setColFilters((p) => ({ ...p, [col]: e.target.value }))} />
                        <div onMouseDown={(e) => startResize(col, e)} className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#8a6d3b]/30" style={{ marginRight: '-2px' }} />
                      </th>
                    );
                  })}
                  <th className="p-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {sortedFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={visibleCols.length + 2} className="p-8 text-center text-sm text-[#8a7a66]">
                      {guests.length === 0 ? 'No guests yet' : 'No matches'}
                    </td>
                  </tr>
                ) : sortedFiltered.map((g) => {
                  const color = g.party_id ? partyColor(g.party_id) : undefined;
                  const isMulti = isMultiMemberParty(g.party_id, g.id);
                  const showPartyVisual = isMulti && !!g.party_id;
                  const rowBg = selected.has(g.id) ? '#fdfbf7' : '#ffffff';
                  return (
                    <tr key={g.id} style={{
                      borderColor: '#f0e8d8',
                      background: selected.has(g.id) ? 'rgba(138,109,59,0.04)' : showPartyVisual ? `${color}0a` : '#ffffff',
                      borderBottom: showPartyVisual ? `1px solid ${color}25` : '1px solid #f0e8d8',
                    }}>
                      <td className="p-2.5" style={{ position: 'sticky', left: 0, zIndex: 20, width: CHECKBOX_WIDTH, minWidth: CHECKBOX_WIDTH, maxWidth: CHECKBOX_WIDTH, background: rowBg, boxShadow: showPartyVisual ? `inset 4px 0 0 ${color}` : undefined }}><button onClick={() => toggleSelect(g.id)}>{selected.has(g.id) ? <CheckSquare size={16} className="text-[#8a6d3b]" /> : <Square size={16} className="text-[#c9b896]" />}</button></td>
                      {visibleCols.map((col, colIdx) => {
                        const cell = renderGuestCell(g, col, color, showPartyVisual);
                        const frozen = frozenOffsets[colIdx];
                        if (frozen.isFrozen) {
                          const colW = colWidths[col] || DEFAULT_COL_WIDTH;
                          return cloneElement(cell, {
                            style: {
                              ...(cell.props.style || {}),
                              position: 'sticky',
                              left: frozen.left,
                              zIndex: 20,
                              width: colW,
                              minWidth: colW,
                              maxWidth: colW,
                              background: rowBg,
                              ...(frozen.isLastFrozen ? { borderRight: '1px solid #e6ddcd' } : {})
                            }
                          });
                        }
                        return cell;
                      })}
                      <td className="p-2.5"><div className="flex gap-1 justify-end"><button onClick={() => setEditing(g)} className="text-[#8a7a66] hover:text-[#5a4430]"><Edit2 size={14} /></button><ConfirmButton onConfirm={() => remove(g.id)}><Trash2 size={14} /></ConfirmButton></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {partyGroups.filter(([key, members]) => members.length >= 2).map(([key, members]) => {
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
                            <button onClick={() => setEditing(g)} className="text-sm font-medium text-[#3a2e22] hover:text-[#8a6d3b] hover:underline cursor-pointer truncate text-left">{g.name}</button>
                            {g.is_party_leader && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: color, color: '#fff' }}>LEADER</span>
                            )}
                            {(g.tags || []).includes('plus-one') && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#5a7a4a', color: '#fff' }}>PLUS ONE</span>
                            )}
                            {g.proxy_guest_name && !(g.tags || []).includes('plus-one') && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#7a5c8a', color: '#fff' }}>PROXY</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            <span className="text-[10px] font-medium" style={{ color: STATUS_COLORS[g.rsvp_status] }}>{g.rsvp_status}</span>
                            {g.email && <span className="text-[10px] text-[#8a7a66]">· {g.email}</span>}
                            {g.proxy_guest_name && (g.tags || []).includes('plus-one') && <span className="text-[10px] text-[#5a7a4a]">· Plus one of {g.proxy_guest_name}</span>}
                            {g.proxy_guest_name && !(g.tags || []).includes('plus-one') && <span className="text-[10px] text-[#7a5c8a]">· Attending as Proxy {g.proxy_guest_name}</span>}
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

      {stickyVisible && viewMode === 'individual' && (
        <div
          ref={stickyTrackRef}
          onMouseDown={(e) => { stickyDragging.current = true; if (stickyTrackRef.current) scrollTo(e.clientX - stickyTrackRef.current.getBoundingClientRect().left, stickyTrackRef.current.clientWidth); }}
          onMouseMove={(e) => { if (stickyDragging.current && stickyTrackRef.current) scrollTo(e.clientX - stickyTrackRef.current.getBoundingClientRect().left, stickyTrackRef.current.clientWidth); }}
          onMouseUp={() => { stickyDragging.current = false; }}
          onMouseLeave={() => { stickyDragging.current = false; }}
          className="fixed bottom-0 left-0 right-0 h-3 z-40"
          style={{ background: 'rgba(250,246,238,0.92)', borderTop: '1px solid #e6ddcd', cursor: 'pointer' }}
        >
          <div
            className="absolute h-2 top-0.5 rounded"
            style={{ width: thumbWidth, left: thumbLeft, background: '#c9b896', transition: 'width 0.1s' }}
          />
        </div>
      )}
      {(adding || editing) && <GuestForm guest={editing} parties={parties} timezone={timezone} onCancel={() => { setEditing(null); setAdding(false); }} onSave={save} />}
      {showImport && <ImportModal onClose={() => { if (!importing) { setShowImport(false); setImportResult(null); } }} onImport={handleImport} result={importResult} importing={importing} progress={importProgress} />}
      {bulkAction === 'delete' && <BulkConfirmModal title="Delete Selected Guests" message={`Delete ${selected.size} guest(s)? This cannot be undone.`} onConfirm={bulkDelete} onCancel={() => setBulkAction(null)} />}
      {bulkAction === 'party' && <BulkPartyModal parties={parties} onAssign={bulkAssignParty} onCancel={() => setBulkAction(null)} />}
      {bulkAction === 'tags' && <BulkTagModal onAdd={bulkAddTag} onCancel={() => setBulkAction(null)} />}
      {bulkAction === 'status' && <BulkStatusModal count={selected.size} guests={guests.filter((g) => selected.has(g.id))} onConfirm={bulkSetStatus} onCancel={() => setBulkAction(null)} />}
      {showPartyManager && <PartyManagerModal parties={parties} onClose={() => { setShowPartyManager(false); load(); }} />}
      {showTagManager && <TagManagerModal guests={guests} onClose={() => { setShowTagManager(false); load(); }} />}
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
    const { data: existing } = await supabase.from('parties').select('id').ilike('name', newName.trim()).maybeSingle();
    if (existing) { setNewName(''); setAdding(false); setSaving(false); return; }
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

function TagManagerModal({ guests, onClose }: { guests: Guest[]; onClose: () => void }) {
  const [tags, setTags] = useState<string[]>([]);
  const [guestCounts, setGuestCounts] = useState<Record<string, number>>({});
  const [newTag, setNewTag] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const loadTags = async () => {
    const { data } = await supabase.from('tags').select('name').order('name');
    const tagList = (data || []).map((t: { name: string }) => t.name);
    setTags(tagList);
    const counts: Record<string, number> = {};
    guests.forEach((g) => (g.tags || []).forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    setGuestCounts(counts);
  };

  useEffect(() => { loadTags(); }, [guests]);

  const addTag = async () => {
    const t = newTag.trim();
    if (!t) { setAdding(false); return; }
    if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) { setNewTag(''); setAdding(false); return; }
    setBusy(true);
    await addTagToRegistry(t);
    invalidateTagCache();
    setTags((prev) => [...prev, t].sort((a, b) => a.localeCompare(b)));
    setNewTag(''); setAdding(false); setBusy(false);
  };

  const removeTag = async (tag: string) => {
    setRemoving(tag);
    setBusy(true);
    const { data: affected } = await supabase.from('guests').select('id, tags').contains('tags', [tag]);
    if (affected) {
      for (const g of affected as { id: string; tags: string[] | null }[]) {
        const updated = (g.tags || []).filter((t) => t !== tag);
        await supabase.from('guests').update({ tags: updated }).eq('id', g.id);
      }
    }
    const { data: questions } = await supabase.from('rsvp_questions').select('id, guest_tags');
    if (questions) {
      for (const q of questions as { id: string; guest_tags: string[] | null }[]) {
        if ((q.guest_tags || []).includes(tag)) {
          const updated = (q.guest_tags || []).filter((t) => t !== tag);
          await supabase.from('rsvp_questions').update({ guest_tags: updated }).eq('id', q.id);
        }
      }
    }
    const { data: pages } = await supabase.from('pages').select('id, config');
    if (pages) {
      for (const p of pages as { id: string; config: Record<string, unknown> }[]) {
        const cfg = p.config;
        if (cfg && typeof cfg === 'object' && 'blocks' in cfg) {
          const blocks = (cfg as { blocks?: Array<{ tags?: string[] }> }).blocks;
          if (Array.isArray(blocks)) {
            let changed = false;
            const newBlocks = blocks.map((b) => {
              if (b.tags && b.tags.includes(tag)) { changed = true; return { ...b, tags: b.tags.filter((t) => t !== tag) }; }
              return b;
            });
            if (changed) await supabase.from('pages').update({ config: { ...cfg, blocks: newBlocks } }).eq('id', p.id);
          }
        }
      }
    }
    await removeTagFromRegistry(tag);
    invalidateTagCache();
    setTags((prev) => prev.filter((t) => t !== tag));
    setBusy(false); setRemoving(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.45)' }} onClick={onClose}>
      <div className="admin-card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#3a2e22]">Manage Tags</h3>
          <button onClick={onClose}><X size={18} className="text-[#8a7a66]" /></button>
        </div>
        <p className="text-xs text-[#8a7a66] mb-3">Tags are shared across guests, RSVP questions, and information blocks. Adding creates a new tag. Removing deletes it and removes it from all guests, questions, and blocks.</p>
        <div className="space-y-2 mb-3 max-h-60 overflow-y-auto thin-scroll">
          {tags.map((t) => (
            <div key={t} className="flex items-center gap-2 rounded-lg border p-2" style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
              <Tag size={13} className="text-[#8a6d3b]" />
              <span className="flex-1 text-sm text-[#3a2e22]">{t}</span>
              <span className="text-[10px] text-[#a0927e]">{guestCounts[t] || 0} guest{(guestCounts[t] || 0) !== 1 ? 's' : ''}</span>
              <button onClick={() => removeTag(t)} disabled={busy} className="text-[#c9b896] hover:text-[#b03a3a] disabled:opacity-40">
                {removing === t ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              </button>
            </div>
          ))}
          {tags.length === 0 && <p className="text-sm text-[#8a7a66] text-center py-4">No tags yet.</p>}
        </div>
        {adding ? (
          <div className="flex items-center gap-2">
            <input className="admin-input flex-1 text-sm" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag()} placeholder="Tag name..." autoFocus disabled={busy} />
            <button onClick={addTag} disabled={busy} className="btn-primary text-sm px-3 py-1.5">Add</button>
            <button onClick={() => { setAdding(false); setNewTag(''); }} disabled={busy} className="btn-ghost text-sm px-2 py-1.5">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} disabled={busy} className="btn-ghost w-full flex items-center justify-center gap-1.5"><Plus size={14} /> Add Tag</button>
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

function ImportModal({ onClose, onImport, result, importing, progress }: { onClose: () => void; onImport: (file: File) => void; result: string | null; importing: boolean; progress: number }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const downloadTemplate = () => {
    const csv = 'First Name,Last Name,Email,Party Name,Guest Tags,Plus-One Allowed\nJohn,Smith,john@email.com,The Smith Family,VIP,Family,yes\nJane,Smith,jane@email.com,The Smith Family,Family,yes';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'guest-import-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={() => !importing && onClose()}>
      <div className="admin-card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#3a2e22]">Import Guests from CSV</h3>
          <button onClick={onClose} disabled={importing} className="disabled:opacity-40 disabled:cursor-not-allowed"><X size={18} className="text-[#8a7a66]" /></button>
        </div>
        <div className="space-y-3">
          <div className={`rounded-lg border p-3 text-xs text-[#8a7a66] ${importing ? 'opacity-60' : ''}`} style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
            <p className="font-semibold text-[#5a4430] mb-1">Expected columns:</p>
            <p>First Name, Last Name, Email, Party Name, Guest Tags (comma-separated), Plus-One Allowed (yes/no)</p>
            <button onClick={downloadTemplate} disabled={importing} className="mt-2 text-[#8a6d3b] font-semibold underline disabled:opacity-50 disabled:cursor-not-allowed">Download template</button>
          </div>
          <div onClick={() => !importing && fileRef.current?.click()} className={`rounded-lg border-2 border-dashed p-6 text-center transition ${importing ? '' : 'cursor-pointer hover:border-[#8a6d3b]'}`} style={{ borderColor: '#d6cdbf', background: '#faf6ee' }}>
            {importing ? <div className="flex items-center justify-center gap-2 text-sm text-[#8a7a66]"><Loader2 size={16} className="animate-spin" /> Importing guests...</div>
              : <><Upload size={24} className="mx-auto text-[#a07c4a] mb-2" /><p className="text-sm text-[#6b5d4f]">Click to select a CSV file</p></>}
          </div>
          {importing && <UploadProgress percent={progress} />}
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" disabled={importing} onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />
          {result && <p className="text-sm font-semibold text-[#5a7a4a]">{result}</p>}
        </div>
        <div className="mt-4"><button onClick={onClose} disabled={importing} className="btn-ghost w-full disabled:opacity-50 disabled:cursor-not-allowed">{importing ? 'Importing...' : 'Close'}</button></div>
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
        <TagInput tags={[]} onAdd={(t) => onAdd(t)} onRemove={() => {}} input={tag} setInput={setTag} placeholder="Tag name (e.g. VIP)" />
        <div className="flex gap-2 mt-3">
          <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
          <button onClick={() => tag.trim() && onAdd(tag.trim())} className="btn-primary flex-1">Add Tag</button>
        </div>
      </div>
    </div>
  );
}

function BulkStatusModal({ count, guests, onConfirm, onCancel }: { count: number; guests: Guest[]; onConfirm: (status: string) => void; onCancel: () => void }) {
  const [status, setStatus] = useState('pending');
  const [showConfirm, setShowConfirm] = useState(false);

  const confirmedOrDeclined = guests.filter((g) => g.rsvp_status === 'confirmed' || g.rsvp_status === 'declined');
  const willReset = status === 'pending' && confirmedOrDeclined.length > 0;

  const handleConfirm = () => {
    if (willReset) { setShowConfirm(true); return; }
    onConfirm(status);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onCancel}>
      <div className="admin-card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-[#3a2e22] mb-1">Set RSVP Status</h3>
        <p className="text-xs text-[#8a7a66] mb-3">Update {count} selected guest{count !== 1 ? 's' : ''}</p>
        <select className="admin-input" value={status} onChange={(e) => { setStatus(e.target.value); setShowConfirm(false); }}>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="declined">Declined</option>
        </select>

        {willReset && (
          <div className="mt-3 rounded-lg border p-3" style={{ borderColor: '#f0d0a0', background: '#fff8e8' }}>
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-[#b5722f] shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#5a4430]">Warning: RSVP data will be cleared</p>
                <p className="text-xs text-[#8a7a66] mt-1">
                  {confirmedOrDeclined.length} of the selected guest{confirmedOrDeclined.length !== 1 ? 's have' : ' has'} a confirmed or declined RSVP.
                  Setting them to Pending will permanently clear all saved RSVP responses,
                  including attending selections, meal and dietary choices, plus-one details, custom answers, and check-in status.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
          <button onClick={handleConfirm} className="btn-primary flex-1">Apply</button>
        </div>

        {showConfirm && willReset && (
          <div className="mt-3 rounded-lg border p-3" style={{ borderColor: '#e0b080', background: '#fef5e0' }}>
            <p className="text-sm font-semibold text-[#5a4430] mb-2">Are you absolutely sure?</p>
            <p className="text-xs text-[#8a7a66] mb-3">This action cannot be undone. All RSVP responses for {confirmedOrDeclined.length} guest{confirmedOrDeclined.length !== 1 ? 's' : ''} will be permanently deleted.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(false)} className="btn-ghost text-xs flex-1">Go Back</button>
              <button onClick={() => onConfirm(status)} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white flex-1" style={{ background: '#b5722f' }}>Yes, Reset All</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GuestForm({ guest, parties, timezone, onCancel, onSave }: { guest: Guest | null; parties: Party[]; timezone: string | null; onCancel: () => void; onSave: (g: Partial<Guest>) => void }) {
  const [form, setForm] = useState<Partial<Guest>>(guest || { name: '', email: '', phone: '', party_size: 1, rsvp_status: 'pending', dietary: '', plus_one_name: '', proxy_guest_name: '', song_requests: '', notes: '', tags: [], plus_one_allowed: false, is_party_leader: false, name_on_card: '' });
  const [tagInput, setTagInput] = useState('');
  const [newPartyName, setNewPartyName] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const isResettingToPending = guest && guest.rsvp_status !== 'pending' && form.rsvp_status === 'pending';

  const handleSave = () => {
    if (!form.name?.trim()) return;
    if (isResettingToPending) { setShowResetConfirm(true); return; }
    onSave(form);
  };

  const addTag = (t: string) => { const current = form.tags || []; if (!current.includes(t)) { setForm({ ...form, tags: [...current, t] }); } };
  const removeTag = (t: string) => setForm({ ...form, tags: (form.tags || []).filter((x) => x !== t) });

  const createParty = async () => {
    if (!newPartyName.trim()) return;
    const { data: existing } = await supabase.from('parties').select('id').ilike('name', newPartyName.trim()).maybeSingle();
    if (existing) { setForm({ ...form, party_id: existing.id }); setNewPartyName(''); return; }
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
            <label className="admin-label">Guest Tags</label>
            <TagInput tags={form.tags || []} onAdd={addTag} onRemove={removeTag} input={tagInput} setInput={setTagInput} placeholder="VIP, Family, Bridal Party..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="admin-label">RSVP Status</label><select className="admin-input" value={form.rsvp_status} onChange={(e) => setForm({ ...form, rsvp_status: e.target.value })}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="declined">Declined</option></select></div>
            <div><label className="admin-label">Plus-One Allowed</label><select className="admin-input" value={form.plus_one_allowed ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, plus_one_allowed: e.target.value === 'yes' })}><option value="yes">Yes</option><option value="no">No</option></select>
              <p className="text-xs text-[#8a7a66] mt-1">When Yes, the guest will see a Plus One (Yes/No + Name) question in the RSVP wizard.</p>
            </div>
            <div><label className="admin-label">Party Leader</label><select className="admin-input" value={form.is_party_leader ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, is_party_leader: e.target.value === 'yes' })}><option value="no">No</option><option value="yes">Yes — appears at top of party group</option></select></div>
          </div>
          <div><label className="admin-label">Plus-one Name</label><input className="admin-input" value={form.plus_one_name || ''} onChange={(e) => setForm({ ...form, plus_one_name: e.target.value })} /></div>
          <div><label className="admin-label">Proxy Guest</label><input className="admin-input" value={form.proxy_guest_name || ''} onChange={(e) => setForm({ ...form, proxy_guest_name: e.target.value })} placeholder="Who is attending as proxy for this guest" /></div>
          <div><label className="admin-label">Dietary Restrictions</label><input className="admin-input" value={form.dietary || ''} onChange={(e) => setForm({ ...form, dietary: e.target.value })} /></div>
          <div><label className="admin-label">Song Requests</label><input className="admin-input" value={form.song_requests || ''} onChange={(e) => setForm({ ...form, song_requests: e.target.value })} /></div>
          <div><label className="admin-label">Notes</label><textarea className="admin-input" rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div>
            <label className="admin-label">RSVP Submitted</label>
            <div className="admin-input bg-[#faf6ee] text-[#8a7a66] cursor-not-allowed flex items-center gap-2" style={{ pointerEvents: 'none' }}>
              <Clock size={14} className="text-[#8a6d3b]" />
              {guest?.rsvp_submitted_at ? formatInTimezone(guest.rsvp_submitted_at, timezone) : 'Not submitted yet'}
            </div>
            <p className="text-[10px] text-[#a0927e] mt-1">This field is automatically recorded when the guest submits their RSVP and cannot be edited.</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
          <button onClick={handleSave} className="btn-primary flex-1">Save</button>
        </div>
        {showResetConfirm && isResettingToPending && (
          <div className="mt-3 rounded-lg border p-3" style={{ borderColor: '#f0d0a0', background: '#fff8e8' }}>
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-[#b5722f] shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#5a4430]">Reset RSVP to Pending?</p>
                <p className="text-xs text-[#8a7a66] mt-1">This will permanently clear all saved RSVP responses for this guest, including:</p>
                <ul className="text-xs text-[#8a7a66] mt-1 ml-4 list-disc space-y-0.5">
                  <li>Attending/declined selections</li>
                  <li>Meal and dietary choices</li>
                  <li>Plus-one details</li>
                  <li>Custom question answers</li>
                  <li>Check-in status</li>
                </ul>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setShowResetConfirm(false)} className="btn-ghost text-xs flex-1">Cancel</button>
                  <button onClick={() => { setShowResetConfirm(false); onSave(form); }} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white flex-1" style={{ background: '#b5722f' }}>Yes, Reset RSVP</button>
                </div>
              </div>
            </div>
          </div>
        )}
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
