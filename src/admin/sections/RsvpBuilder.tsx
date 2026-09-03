import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SectionHeader, Card, EmptyState, ConfirmButton } from '../ui';
import type { RsvpQuestion, WeddingEvent, ConditionalSubQuestion } from '@/types';
import { ClipboardList, Plus, Loader2, Trash2, Edit2, GripVertical, X, Tag, Calendar, ChevronUp, ChevronDown, GitBranch, Image as ImageIcon, Settings2, Upload, Check } from 'lucide-react';
import RichTextEditor from '@/components/admin/RichTextEditor';
import TagInput from '@/components/admin/TagInput';
import { uploadImage } from '@/lib/upload';
import type { SiteSettings } from '@/types';
import { UploadProgress } from '@/components/admin/UploadProgress';

const QUESTION_TYPES = [
  { value: 'attendance', label: 'Attendance (Yes/No)' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'plus_one', label: 'Plus One (Yes/No + Name)' },
  { value: 'proxy', label: 'Proxy RSVP' },
  { value: 'dietary', label: 'Dietary Restrictions' },
  { value: 'terms', label: 'Terms & Conditions' },
  { value: 'message', label: 'Message to the Couple' },
];

const TYPES_WITH_CONDITIONAL = ['yes_no', 'multiple_choice', 'attendance', 'proxy', 'plus_one'];

function makeBlankSub(optionValue: string, parentFieldKey: string): ConditionalSubQuestion {
  const existingCount = 0;
  const suffix = existingCount > 0 ? `_${existingCount + 1}` : '';
  return {
    option_value: optionValue,
    label: '',
    field_key: `${parentFieldKey || 'q'}_${optionValue.toLowerCase().replace(/\s+/g, '_')}_followup${suffix}`,
    input_type: 'text',
    question_type: 'text',
    options: [],
    required: false,
    column_name: '',
    yes_text: 'Joyfully Accepts',
    no_text: 'Regretfully Declines',
    yes_label: '',
    no_label: '',
    sub_question: '',
    terms_body: '',
    accept_label: '',
    guest_tags: [],
    placeholder: '',
    conditional_sub_questions: [],
  };
}

function collectAllKeys(subs: ConditionalSubQuestion[], fks: Set<string>, cns: Set<string>) {
  for (const sub of subs) {
    const sfk = sub.field_key?.toLowerCase().trim();
    const scn = sub.column_name?.toLowerCase().trim();
    if (sfk) fks.add(sfk);
    if (scn) cns.add(scn);
    if (sub.conditional_sub_questions?.length) {
      collectAllKeys(sub.conditional_sub_questions, fks, cns);
    }
  }
}

function validateSubKeys(subs: ConditionalSubQuestion[], allFks: Set<string>, allCns: Set<string>, reservedCols: Set<string>, newFks: Set<string>, newCns: Set<string>): string | null {
  for (const sub of subs) {
    const sfk = sub.field_key?.toLowerCase().trim();
    const scn = sub.column_name?.toLowerCase().trim();
    if (sfk && (allFks.has(sfk) || newFks.has(sfk))) return `Follow-up "${sub.label}" has a duplicate field key. Please use a unique value.`;
    if (scn && (allCns.has(scn) || newCns.has(scn) || reservedCols.has(scn))) return `Follow-up "${sub.label}" has a duplicate column name. Please use a unique value.`;
    if (sfk) newFks.add(sfk);
    if (scn) newCns.add(scn);
    if (sub.conditional_sub_questions?.length) {
      const nestedErr = validateSubKeys(sub.conditional_sub_questions, allFks, allCns, reservedCols, newFks, newCns);
      if (nestedErr) return nestedErr;
    }
  }
  return null;
}

export default function RsvpBuilder() {
  const [questions, setQuestions] = useState<RsvpQuestion[]>([]);
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RsvpQuestion | null>(null);
  const [adding, setAdding] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: q }, { data: ev }] = await Promise.all([
      supabase.from('rsvp_questions').select('*').order('display_order'),
      supabase.from('events').select('*').order('display_order'),
    ]);
    setQuestions(q as RsvpQuestion[] || []);
    setEvents(ev as WeddingEvent[] || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const mainEvents = events.filter((e) => !e.parent_id);

  const save = async (q: Partial<RsvpQuestion>) => {
    const isAttendance = q.question_type === 'attendance';
    const inputType = isAttendance ? 'radio'
      : q.question_type === 'multiple_choice' ? 'radio'
      : q.question_type === 'yes_no' ? 'radio'
      : q.question_type === 'number' ? 'number'
      : q.question_type === 'textarea' ? 'textarea'
      : q.question_type === 'message' ? 'textarea'
      : 'text';

    const payload: Record<string, unknown> = {
      label: q.label, field_key: q.field_key,
      input_type: inputType,
      question_type: q.question_type || 'text',
      sub_question: q.sub_question || null,
      options: q.options, required: q.required,
      display_order: q.display_order,
      event_id: q.event_id || null,
      event_ids: q.event_ids || [],
      column_name: q.column_name || null,
      yes_text: q.yes_text || 'Joyfully Accepts',
      no_text: q.no_text || 'Regretfully Declines',
      yes_label: q.yes_label || null,
      no_label: q.no_label || null,
      is_attendance: isAttendance,
      guest_tags: q.guest_tags || [],
      terms_body: q.terms_body || null,
      accept_label: q.accept_label || null,
      conditional_sub_questions: q.conditional_sub_questions || [],
    };
    if (isAttendance) payload.options = ['yes', 'no'];

    const reservedCols = new Set(['name', 'contact', 'name_on_card', 'party', 'plus_one', 'tags', 'proxy', 'status', 'invited', 'name on card', 'plus one']);
    const existing = questions.filter(eq => eq.id !== q.id);
    const allFks = new Set<string>();
    const allCns = new Set<string>();
    existing.forEach(eq => {
      if (eq.field_key) allFks.add(eq.field_key.toLowerCase().trim());
      if (eq.column_name) allCns.add(eq.column_name.toLowerCase().trim());
      if (eq.conditional_sub_questions?.length) collectAllKeys(eq.conditional_sub_questions, allFks, allCns);
    });

    const qFk = q.field_key?.toLowerCase().trim();
    const qCn = q.column_name?.toLowerCase().trim();
    if (qFk && allFks.has(qFk)) { setSaveError(`Field key "${q.field_key}" already exists. Please use a unique value.`); return; }
    if (qCn && (allCns.has(qCn) || reservedCols.has(qCn))) { setSaveError(`Column name "${q.column_name}" already exists. Please use a unique value.`); return; }

    const newFks = new Set<string>(qFk ? [qFk] : []);
    const newCns = new Set<string>(qCn ? [qCn] : []);
    const subErr = validateSubKeys(q.conditional_sub_questions || [], allFks, allCns, reservedCols, newFks, newCns);
    if (subErr) { setSaveError(subErr); return; }

    setSaveError(null);
    if (q.id) {
      await supabase.from('rsvp_questions').update(payload).eq('id', q.id);
    } else {
      await supabase.from('rsvp_questions').insert({ ...payload, display_order: questions.length });
    }
    setEditing(null); setAdding(false); load();
  };

  const remove = async (id: string) => {
    await supabase.from('rsvp_questions').delete().eq('id', id);
    load();
  };

  const moveQuestion = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...questions].sort((a, b) => a.display_order - b.display_order);
    const idx = sorted.findIndex((q) => q.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    await Promise.all([
      supabase.from('rsvp_questions').update({ display_order: b.display_order }).eq('id', a.id),
      supabase.from('rsvp_questions').update({ display_order: a.display_order }).eq('id', b.id),
    ]);
    load();
  };

  const reorderQuestion = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const sorted = [...questions].sort((a, b) => a.display_order - b.display_order);
    const sourceIndex = sorted.findIndex((q) => q.id === sourceId);
    const targetIndex = sorted.findIndex((q) => q.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = sorted.splice(sourceIndex, 1);
    sorted.splice(targetIndex, 0, moved);
    await Promise.all(sorted.map((q, index) => supabase.from('rsvp_questions').update({ display_order: index }).eq('id', q.id)));
    setDraggedId(null);
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8a6d3b]" /></div>;

  return (
    <div>
      <SectionHeader title="RSVP Builder" subtitle="Build step-by-step questions for your guests"
        action={<button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-1.5"><Plus size={16} /> Add Question</button>} />

      <RsvpSettingsPanel />

      <div className="space-y-3">
        {questions.length === 0 && !adding && <Card><EmptyState icon={ClipboardList} title="No questions" hint="Add questions for your guests" /></Card>}
        {questions.map((q, i) => (
          <div key={q.id} draggable onDragStart={() => setDraggedId(q.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => draggedId && reorderQuestion(draggedId, q.id)} className="admin-card p-3 flex items-center gap-3">
            <GripVertical size={16} className="text-[#c9b896] shrink-0 cursor-grab" />
            <div className="flex flex-col gap-0.5 shrink-0">
              <button onClick={() => moveQuestion(q.id, 'up')} disabled={i === 0} className="text-[#c9b896] hover:text-[#5a4430] disabled:opacity-30"><ChevronUp size={14} /></button>
              <button onClick={() => moveQuestion(q.id, 'down')} disabled={i === questions.length - 1} className="text-[#c9b896] hover:text-[#5a4430] disabled:opacity-30"><ChevronDown size={14} /></button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[#a07c4a] font-mono">{i + 1}.</span>
                <p className="text-sm font-semibold text-[#3a2e22] truncate">{q.label}</p>
                {q.required && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#fbe9e9', color: '#b03a3a' }}>REQ</span>}
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: '#f0e8d8', color: '#8a6d3b' }}>
                  {QUESTION_TYPES.find((t) => t.value === (q.question_type || (q.is_attendance ? 'attendance' : q.input_type)))?.label || q.input_type}
                </span>
                {q.is_attendance && <span className="text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5" style={{ background: '#e8f0e4', color: '#5a7a4a' }}><Calendar size={8} /> EVENT</span>}
                {q.conditional_sub_questions?.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5" style={{ background: '#e8e4f0', color: '#6a4a8a' }}><GitBranch size={8} /> {countAllSubs(q.conditional_sub_questions)} follow-up{countAllSubs(q.conditional_sub_questions) !== 1 ? 's' : ''}</span>}
                {q.guest_tags && q.guest_tags.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5" style={{ background: '#f0e8d8', color: '#8a6d3b' }}><Tag size={8} /> {q.guest_tags.join(', ')}</span>
                )}
              </div>
              {q.sub_question && <p className="text-xs text-[#8a7a66] mt-0.5 truncate italic">{q.sub_question}</p>}
              {q.conditional_sub_questions?.length > 0 && (
                <TreePreview subs={q.conditional_sub_questions} depth={0} />
              )}
            </div>
            <button onClick={() => setEditing(q)} className="text-[#8a7a66] hover:text-[#5a4430]"><Edit2 size={14} /></button>
            <ConfirmButton onConfirm={() => remove(q.id)}><Trash2 size={14} /></ConfirmButton>
          </div>
        ))}
      </div>

      {(adding || editing) && <QuestionForm q={editing} mainEvents={mainEvents} saveError={saveError} onCancel={() => { setEditing(null); setAdding(false); setSaveError(null); }} onSave={save} />}
    </div>
  );
}

function RsvpSettingsPanel() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [heroProgress, setHeroProgress] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const heroInputId = 'rsvp-hero-upload';

  useEffect(() => {
    supabase.from('site_settings').select('*').maybeSingle().then(({ data }) => {
      if (data) setSettings(data as SiteSettings);
    });
  }, []);

  const patch = (p: Partial<SiteSettings>) => setSettings((prev) => prev ? { ...prev, ...p } : prev);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    const { data, error } = await supabase.from('site_settings').update({
      rsvp_intro: settings.rsvp_intro,
      rsvp_thank_you_message: settings.rsvp_thank_you_message?.trim() || null,
      rsvp_hero_image_url: settings.rsvp_hero_image_url,
    }).eq('id', settings.id).select().single();
    if (!error && data) setSettings(data as SiteSettings);
    setSaving(false);
  };

  const handleHeroUpload = async (file: File) => {
    if (!settings || uploadingHero) return;
    setUploadingHero(true);
    setHeroProgress(0);
    const url = await uploadImage(file, 'rsvp-hero', setHeroProgress);
    if (url) {
      const next = { ...settings, rsvp_hero_image_url: url };
      setSettings(next);
      await supabase.from('site_settings').update({ rsvp_hero_image_url: url }).eq('id', settings.id);
    }
    setUploadingHero(false);
    setHeroProgress(0);
  };

  if (!settings) return null;

  return (
    <div className="admin-card mb-4 overflow-hidden">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Settings2 size={16} className="text-[#8a6d3b]" />
          <span className="font-semibold text-sm text-[#3a2e22]">RSVP Settings</span>
        </div>
        <ChevronDown size={16} className={`text-[#8a7a66] transition-transform ${collapsed ? '' : 'rotate-180'}`} />
      </button>
      {!collapsed && (
        <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: '#e6ddcd' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3">
            <div>
              <label className="admin-label">Intro Message</label>
              <input className="admin-input" value={settings.rsvp_intro || ''} onChange={(e) => patch({ rsvp_intro: e.target.value })} placeholder="We hope you can join us!" />
              <p className="text-xs text-[#8a7a66] mt-1">Shown above the RSVP questions on the public site.</p>
            </div>
            <div>
              <label className="admin-label">Thank-You Message</label>
              <input className="admin-input" value={settings.rsvp_thank_you_message || ''} onChange={(e) => patch({ rsvp_thank_you_message: e.target.value })} placeholder="Your RSVP has been received." />
              <p className="text-xs text-[#8a7a66] mt-1">Shown to guests after they submit their RSVP.</p>
            </div>
          </div>
          <div>
            <label className="admin-label">RSVP Thank You Page Photo</label>
            <div className="flex items-start gap-4">
              <div className="w-32 h-20 rounded-lg border overflow-hidden flex items-center justify-center shrink-0" style={{ borderColor: '#d6cdbf', background: '#faf6ee' }}>
                {settings.rsvp_hero_image_url ? (
                  <img src={settings.rsvp_hero_image_url} alt="RSVP hero" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={20} className="text-[#c9b896]" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor={heroInputId} className={`btn-ghost inline-flex items-center gap-1.5 text-sm w-fit ${uploadingHero ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}>
                  {uploadingHero ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {settings.rsvp_hero_image_url ? 'Replace Photo' : 'Upload Photo'}
                </label>
                <input id={heroInputId} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleHeroUpload(f); e.target.value = ''; }} />
                {uploadingHero && <UploadProgress percent={heroProgress} />}
                {settings.rsvp_hero_image_url && !uploadingHero && (
                  <button onClick={() => { patch({ rsvp_hero_image_url: null }); supabase.from('site_settings').update({ rsvp_hero_image_url: null }).eq('id', settings.id); }} className="text-xs text-[#b03a3a] w-fit">Remove</button>
                )}
                <p className="text-xs text-[#8a7a66]">Shown on the thank-you page after a guest submits their RSVP. Falls back to the monogram if no photo is set.</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={saveSettings} disabled={saving} className="btn-primary flex items-center gap-1.5 text-sm">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function countAllSubs(subs: ConditionalSubQuestion[]): number {
  let count = subs.length;
  for (const sub of subs) {
    if (sub.conditional_sub_questions?.length) count += countAllSubs(sub.conditional_sub_questions);
  }
  return count;
}

function TreePreview({ subs, depth }: { subs: ConditionalSubQuestion[]; depth: number }) {
  return (
    <div className="mt-1.5 space-y-0">
      {subs.map((sub, si) => (
        <div key={si} className="relative">
          <div className="flex items-start gap-2" style={{ paddingLeft: `${depth * 16 + 16}px` }}>
            <div className="absolute top-0 bottom-0 w-[2px]" style={{ left: `${depth * 16}px`, background: depth === 0 ? '#c9b6e4' : '#d4c4e8' }} />
            <div className="absolute top-2 w-3 h-[2px]" style={{ left: `${depth * 16}px`, background: depth === 0 ? '#c9b6e4' : '#d4c4e8' }} />
            <div className="flex items-center gap-1.5 text-[10px] text-[#8a7a66] py-0.5">
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 shrink-0" style={{ background: '#e8e4f0', color: '#6a4a8a' }}>
                <GitBranch size={7} />
                {sub.option_value === '__always__' ? 'Always' : sub.option_value}
              </span>
              <span className="truncate">{sub.label || '(untitled)'}</span>
              {sub.required && <span className="text-[#b03a3a] font-bold">*</span>}
              {sub.guest_tags?.length > 0 && <span className="inline-flex items-center gap-0.5" style={{ color: '#8a6d3b' }}><Tag size={6} /> {sub.guest_tags.join(',')}</span>}
            </div>
          </div>
          {sub.conditional_sub_questions?.length > 0 && (
            <TreePreview subs={sub.conditional_sub_questions} depth={depth + 1} />
          )}
        </div>
      ))}
    </div>
  );
}

function QuestionForm({ q, onCancel, onSave, mainEvents, saveError }: { q: RsvpQuestion | null; onCancel: () => void; onSave: (q: Partial<RsvpQuestion>) => void; mainEvents: WeddingEvent[]; saveError: string | null }) {
  const initialType = q?.question_type || (q?.is_attendance ? 'attendance' : q?.input_type || 'text');
  const [form, setForm] = useState<Partial<RsvpQuestion>>(q ? { ...q } : {
    label: '', field_key: '',
    question_type: initialType, input_type: 'text',
    sub_question: '',
    options: [], required: false,
    event_id: null,
    yes_text: q?.yes_text || 'Joyfully Accepts', no_text: q?.no_text || 'Regretfully Declines',
    yes_label: q?.yes_label || '', no_label: q?.no_label || '',
    is_attendance: q?.is_attendance || false,
    guest_tags: q?.guest_tags || [],
    terms_body: q?.terms_body || '', accept_label: q?.accept_label || '',
    conditional_sub_questions: [],
    column_name: '',
  });

  const qType = form.question_type || 'text';
  const hasConditional = TYPES_WITH_CONDITIONAL.includes(qType);
  const yesNoOptions = qType === 'multiple_choice' ? (form.options || []) : ['yes', 'no'];

  const addConditionalSub = (optionValue: string) => {
    setForm({
      ...form,
      conditional_sub_questions: [...(form.conditional_sub_questions || []), makeBlankSub(optionValue, form.field_key || 'q')],
    });
  };
  const updateConditional = (idx: number, patch: Partial<ConditionalSubQuestion>) => {
    const subs = [...(form.conditional_sub_questions || [])];
    subs[idx] = { ...subs[idx], ...patch };
    setForm({ ...form, conditional_sub_questions: subs });
  };
  const removeConditional = (idx: number) => {
    const subs = [...(form.conditional_sub_questions || [])];
    subs.splice(idx, 1);
    setForm({ ...form, conditional_sub_questions: subs });
  };
  const moveConditional = (idx: number, direction: 'up' | 'down') => {
    const subs = [...(form.conditional_sub_questions || [])];
    const target = subs[idx];
    let swapIdx = -1;
    if (direction === 'up') {
      for (let i = idx - 1; i >= 0; i--) { if (subs[i].option_value === target.option_value) { swapIdx = i; break; } }
    } else {
      for (let i = idx + 1; i < subs.length; i++) { if (subs[i].option_value === target.option_value) { swapIdx = i; break; } }
    }
    if (swapIdx < 0) return;
    [subs[idx], subs[swapIdx]] = [subs[swapIdx], subs[idx]];
    setForm({ ...form, conditional_sub_questions: subs });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onCancel}>
      <div className="admin-card w-full max-w-[1440px] p-4 max-h-[92vh] overflow-auto thin-scroll" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#3a2e22]">{q ? 'Edit Question' : 'Add Question'}</h3>
          <button onClick={onCancel}><X size={18} className="text-[#8a7a66]" /></button>
        </div>
        <div className="space-y-3">
          <QuestionFields form={form} setForm={setForm} mainEvents={mainEvents} />

          {hasConditional && (
            <div className="rounded-lg border p-2.5 space-y-2.5" style={{ borderColor: '#d6cdbf', background: '#faf6ee' }}>
              <div className="flex items-center gap-2">
                <GitBranch size={14} className="text-[#6a4a8a]" />
                <span className="text-xs font-semibold text-[#5a4430]">Conditional Follow-up Questions</span>
              </div>
              <p className="text-xs text-[#8a7a66]">When a guest selects an option, show an additional question. Follow-ups can have their own follow-ups, enabling multi-level branching (Parent → Child → Grandchild).</p>
              <div className="flex flex-wrap gap-1.5">
                {yesNoOptions.map((opt) => {
                  const count = (form.conditional_sub_questions || []).filter((s) => s.option_value === opt).length;
                  return (
                    <button key={opt} onClick={() => addConditionalSub(opt)} className="text-xs px-2 py-1 rounded-full border transition" style={{ borderColor: count > 0 ? '#6a4a8a' : '#d6cdbf', background: count > 0 ? '#e8e4f0' : '#fff', color: count > 0 ? '#6a4a8a' : '#8a7a66' }}>
                      + On &ldquo;{opt}&rdquo;{count > 0 && ` (${count})`}
                    </button>
                  );
                })}
                <button onClick={() => addConditionalSub('__always__')} className="text-xs px-2 py-1 rounded-full border transition" style={{ borderColor: (form.conditional_sub_questions || []).some((s) => s.option_value === '__always__') ? '#6a4a8a' : '#d6cdbf', background: (form.conditional_sub_questions || []).some((s) => s.option_value === '__always__') ? '#e8e4f0' : '#fff', color: (form.conditional_sub_questions || []).some((s) => s.option_value === '__always__') ? '#6a4a8a' : '#8a7a66' }}>
                  + Always Show
                </button>
              </div>
              {(form.conditional_sub_questions || []).length > 0 && (() => {
                const subs = form.conditional_sub_questions || [];
                const groups: { option_value: string; items: { sub: ConditionalSubQuestion; idx: number }[] }[] = [];
                subs.forEach((sub, idx) => {
                  let g = groups.find((x) => x.option_value === sub.option_value);
                  if (!g) { g = { option_value: sub.option_value, items: [] }; groups.push(g); }
                  g.items.push({ sub, idx });
                });
                return (
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3 items-start">
                    {groups.map((group) => (
                      <div key={group.option_value} className="space-y-2">
                        <div className="text-[10px] font-semibold px-2 py-1 rounded-full inline-flex items-center gap-1" style={{ background: '#e8e4f0', color: '#6a4a8a' }}>
                          <GitBranch size={8} /> {group.option_value === '__always__' ? 'Always Show' : `On “${group.option_value}”`}
                        </div>
                        <div className="space-y-2">
                          {group.items.map(({ sub, idx }, posInGroup) => (
                            <FollowUpTreeEditor
                              key={idx}
                              sub={sub}
                              depth={0}
                              mainEvents={mainEvents}
                              onUpdate={(patch) => updateConditional(idx, patch)}
                              onRemove={() => removeConditional(idx)}
                              onMoveUp={posInGroup > 0 ? () => moveConditional(idx, 'up') : undefined}
                              onMoveDown={posInGroup < group.items.length - 1 ? () => moveConditional(idx, 'down') : undefined}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
        {saveError && <p className="text-sm text-[#b03a3a] mt-3">{saveError}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
          <button onClick={() => form.label?.trim() && form.field_key?.trim() && form.column_name?.trim() && onSave(form)} className="btn-primary flex-1">Save Question</button>
        </div>
      </div>
    </div>
  );
}

function QuestionFields({ form, setForm, mainEvents }: { form: Partial<RsvpQuestion>; setForm: (f: Partial<RsvpQuestion>) => void; mainEvents: WeddingEvent[] }) {
  const [optText, setOptText] = useState('');
  const [tagInput, setTagInput] = useState('');

  const qType = form.question_type || 'text';
  const hasOptions = qType === 'multiple_choice';
  const hasYesNo = ['yes_no', 'attendance', 'plus_one', 'proxy'].includes(qType);
  const hasTerms = qType === 'terms';
  const isAttendance = qType === 'attendance';

  const addOpt = () => {
    if (!optText.trim()) return;
    setForm({ ...form, options: [...(form.options || []), optText.trim()] });
    setOptText('');
  };
  const addTag = (tag?: string) => {
    const t = (tag ?? tagInput).trim();
    if (t && !(form.guest_tags || []).includes(t)) {
      setForm({ ...form, guest_tags: [...(form.guest_tags || []), t] });
      setTagInput('');
    }
  };

  return (
    <>
      <div><label className="admin-label">Question Prompt *</label><input className="admin-input" value={form.label || ''} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Will you be celebrating with us?" /></div>
      <div><label className="admin-label">Sub Question / Hint</label><input className="admin-input" value={form.sub_question || ''} onChange={(e) => setForm({ ...form, sub_question: e.target.value })} placeholder="Optional description or additional context" /></div>
      <div><label className="admin-label">Field Key *</label><input className="admin-input font-mono text-xs" value={form.field_key || ''} onChange={(e) => setForm({ ...form, field_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })} placeholder="ceremony_attendance" /></div>
      <div><label className="admin-label">Column Name *</label><input className="admin-input" value={form.column_name || ''} onChange={(e) => setForm({ ...form, column_name: e.target.value })} placeholder="e.g. Attending Ceremony" /><p className="text-xs text-[#8a7a66] mt-1">Used as the column header on the guest list.</p></div>
      <div>
        <label className="admin-label">Question Type</label>
        <select className="admin-input" value={qType} onChange={(e) => setForm({ ...form, question_type: e.target.value, is_attendance: e.target.value === 'attendance', options: [] })}>
          {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {hasYesNo && (
        <div className="grid grid-cols-2 gap-3">
          <div><label className="admin-label">{isAttendance ? 'Yes Button (Accepting)' : 'Yes Label'}</label><input className="admin-input" value={isAttendance ? (form.yes_text || '') : (form.yes_label || '')} onChange={(e) => isAttendance ? setForm({ ...form, yes_text: e.target.value }) : setForm({ ...form, yes_label: e.target.value })} placeholder={isAttendance ? 'Joyfully Accepts' : 'Yes'} /></div>
          <div><label className="admin-label">{isAttendance ? 'No Button (Declining)' : 'No Label'}</label><input className="admin-input" value={isAttendance ? (form.no_text || '') : (form.no_label || '')} onChange={(e) => isAttendance ? setForm({ ...form, no_text: e.target.value }) : setForm({ ...form, no_label: e.target.value })} placeholder={isAttendance ? 'Regretfully Declines' : 'No'} /></div>
        </div>
      )}

      {isAttendance && (
        <div>
          <label className="admin-label">Link to Event(s) *</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-[#5a4430]">
              <input
                type="checkbox"
                checked={form.event_ids?.includes('__all__') ?? false}
                onChange={(e) => setForm({ ...form, event_ids: e.target.checked ? ['__all__'] : [], event_id: e.target.checked ? null : (form.event_id || null) })}
                className="accent-[#8a6d3b]"
              />
              All Events
            </label>
            {!(form.event_ids?.includes('__all__')) && (
              <div className="space-y-1.5 pl-6">
                {mainEvents.map((ev) => {
                  const checked = (form.event_ids || []).includes(ev.id) || form.event_id === ev.id;
                  return (
                    <label key={ev.id} className="flex items-center gap-2 text-sm text-[#5a4430]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const current = new Set(form.event_ids || (form.event_id ? [form.event_id] : []));
                          if (e.target.checked) current.add(ev.id); else current.delete(ev.id);
                          const arr = Array.from(current);
                          setForm({ ...form, event_ids: arr, event_id: arr.length === 1 ? arr[0] : null });
                        }}
                        className="accent-[#8a6d3b]"
                      />
                      {ev.title}
                    </label>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-[#8a7a66]">When a guest answers, their response will sync to all selected events (or every event they're invited to if &ldquo;All Events&rdquo; is chosen).</p>
          </div>
        </div>
      )}

      {hasOptions && (
        <div>
          <label className="admin-label">Options</label>
          <div className="flex gap-2 mb-2">
            <input className="admin-input" value={optText} onChange={(e) => setOptText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOpt())} placeholder="Add option..." />
            <button onClick={addOpt} className="btn-ghost">Add</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(form.options || []).map((o, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ background: '#f0e8d8', color: '#5a4430' }}>
                {o}<button onClick={() => setForm({ ...form, options: (form.options || []).filter((_, idx) => idx !== i) })}><X size={10} /></button>
              </span>
            ))}
          </div>
        </div>
      )}

      {hasTerms && (
        <div className="space-y-3">
          <div><label className="admin-label">Acceptance Checkbox Label</label><input className="admin-input" value={form.accept_label || ''} onChange={(e) => setForm({ ...form, accept_label: e.target.value })} placeholder="I accept the terms and conditions" /></div>
          <div>
            <label className="admin-label">Terms & Conditions Content</label>
            <RichTextEditor value={form.terms_body || ''} onChange={(html) => setForm({ ...form, terms_body: html })} placeholder="Enter the full terms and conditions text..." rows={6} />
          </div>
        </div>
      )}

      <TagEditor tags={form.guest_tags || []} onAdd={addTag} onRemove={(t) => setForm({ ...form, guest_tags: (form.guest_tags || []).filter((x) => x !== t) })} tagInput={tagInput} setTagInput={setTagInput} />
  

      <label className="flex items-center gap-2 text-sm text-[#5a4430]">
        <input type="checkbox" checked={form.required || false} onChange={(e) => setForm({ ...form, required: e.target.checked })} className="accent-[#8a6d3b]" />
        Required
      </label>
    </>
  );
}

function TagEditor({ tags, onAdd, onRemove, tagInput, setTagInput }: { tags: string[]; onAdd: (tag?: string) => void; onRemove: (t: string) => void; tagInput: string; setTagInput: (v: string) => void }) {
  return (
    <div>
      <label className="admin-label">Guest Tag Visibility</label>
      <p className="text-xs text-[#8a7a66] mb-2">Only show to guests with these tags. Empty = show to all.</p>
      <TagInput tags={tags} onAdd={(tag) => onAdd(tag)} onRemove={onRemove} input={tagInput} setInput={setTagInput} size="sm" placeholder="VIP, Bridal Party..." />
    </div>
  );
}

function FollowUpTreeEditor({ sub, depth, mainEvents, onUpdate, onRemove, onMoveUp, onMoveDown }: { sub: ConditionalSubQuestion; depth: number; mainEvents: WeddingEvent[]; onUpdate: (patch: Partial<ConditionalSubQuestion>) => void; onRemove: () => void; onMoveUp?: () => void; onMoveDown?: () => void }) {
  const [optText, setOptText] = useState('');
  const [tagInput, setTagInput] = useState('');

  const qType = sub.question_type || 'text';
  const hasOptions = qType === 'multiple_choice';
  const hasYesNo = ['yes_no', 'attendance', 'plus_one', 'proxy'].includes(qType);
  const hasTerms = qType === 'terms';
  const hasConditional = TYPES_WITH_CONDITIONAL.includes(qType);
  const yesNoOptions = qType === 'multiple_choice' ? (sub.options || []) : ['yes', 'no'];

  const addOpt = () => {
    if (!optText.trim()) return;
    onUpdate({ options: [...(sub.options || []), optText.trim()] });
    setOptText('');
  };
  const addTag = (tag?: string) => {
    const t = (tag ?? tagInput).trim();
    if (t && !(sub.guest_tags || []).includes(t)) {
      onUpdate({ guest_tags: [...(sub.guest_tags || []), t] });
      setTagInput('');
    }
  };

  const addNestedSub = (optionValue: string) => {
    onUpdate({
      conditional_sub_questions: [...(sub.conditional_sub_questions || []), makeBlankSub(optionValue, sub.field_key || 'q')],
    });
  };
  const updateNestedSub = (idx: number, patch: Partial<ConditionalSubQuestion>) => {
    const subs = [...(sub.conditional_sub_questions || [])];
    subs[idx] = { ...subs[idx], ...patch };
    onUpdate({ conditional_sub_questions: subs });
  };
  const removeNestedSub = (idx: number) => {
    const subs = [...(sub.conditional_sub_questions || [])];
    subs.splice(idx, 1);
    onUpdate({ conditional_sub_questions: subs });
  };
  const moveNestedSub = (idx: number, direction: 'up' | 'down') => {
    const subs = [...(sub.conditional_sub_questions || [])];
    const target = subs[idx];
    let swapIdx = -1;
    if (direction === 'up') {
      for (let i = idx - 1; i >= 0; i--) { if (subs[i].option_value === target.option_value) { swapIdx = i; break; } }
    } else {
      for (let i = idx + 1; i < subs.length; i++) { if (subs[i].option_value === target.option_value) { swapIdx = i; break; } }
    }
    if (swapIdx < 0) return;
    [subs[idx], subs[swapIdx]] = [subs[swapIdx], subs[idx]];
    onUpdate({ conditional_sub_questions: subs });
  };

  return (
    <div className="relative" style={{ paddingLeft: `${depth * 12 + 8}px` }}>
      <div className="absolute top-0 bottom-0 w-[2px]" style={{ left: `${depth * 12}px`, background: depth === 0 ? '#c9b6e4' : '#d4c4e8' }} />
      <div className="absolute top-3 w-2 h-[2px]" style={{ left: `${depth * 12}px`, background: depth === 0 ? '#c9b6e4' : '#d4c4e8' }} />
      <div className="rounded-lg border p-2.5 space-y-2" style={{ borderColor: '#c9b6e4', background: '#f5f0fa' }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: '#e8e4f0', color: '#6a4a8a' }}>
            <GitBranch size={8} /> {sub.option_value === '__always__' ? 'Always Show' : <>Trigger: &ldquo;{sub.option_value}&rdquo;</>}
          </span>
          <div className="flex items-center gap-1">
            {onMoveUp && <button onClick={onMoveUp} className="text-[#c9b896] hover:text-[#5a4430]" title="Move up"><ChevronUp size={12} /></button>}
            {onMoveDown && <button onClick={onMoveDown} className="text-[#c9b896] hover:text-[#5a4430]" title="Move down"><ChevronDown size={12} /></button>}
            <button onClick={onRemove} className="text-[#c9b896] hover:text-[#b03a3a]"><X size={12} /></button>
          </div>
        </div>

        <div><label className="admin-label">Follow-up Question Prompt *</label><input className="admin-input text-sm" value={sub.label} onChange={(e) => onUpdate({ label: e.target.value })} placeholder="e.g. How many plus-ones will you bring?" /></div>
        <div><label className="admin-label">Sub Question / Hint</label><input className="admin-input text-sm" value={sub.sub_question || ''} onChange={(e) => onUpdate({ sub_question: e.target.value })} placeholder="Optional description" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="admin-label">Field Key</label><input className="admin-input text-xs font-mono" value={sub.field_key} onChange={(e) => onUpdate({ field_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })} /></div>
          <div><label className="admin-label">Column Name</label><input className="admin-input text-xs" value={sub.column_name || ''} onChange={(e) => onUpdate({ column_name: e.target.value })} placeholder="e.g. Meal Choice" /></div>
        </div>
        <div>
          <label className="admin-label">Question Type</label>
          <select className="admin-input text-sm" value={qType} onChange={(e) => onUpdate({ question_type: e.target.value, options: [] })}>
            {QUESTION_TYPES.filter((t) => t.value !== 'attendance').map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {hasYesNo && (
          <div className="grid grid-cols-2 gap-2">
            <div><label className="admin-label">Yes Label</label><input className="admin-input text-sm" value={sub.yes_label || ''} onChange={(e) => onUpdate({ yes_label: e.target.value })} placeholder="Yes" /></div>
            <div><label className="admin-label">No Label</label><input className="admin-input text-sm" value={sub.no_label || ''} onChange={(e) => onUpdate({ no_label: e.target.value })} placeholder="No" /></div>
          </div>
        )}

        {hasOptions && (
          <div>
            <label className="admin-label">Options</label>
            <div className="flex gap-2 mb-2">
              <input className="admin-input text-sm" value={optText} onChange={(e) => setOptText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOpt())} placeholder="Add option..." />
              <button onClick={addOpt} className="btn-ghost text-xs">Add</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(sub.options || []).map((o, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ background: '#e8e4f0', color: '#6a4a8a' }}>
                  {o}<button onClick={() => onUpdate({ options: (sub.options || []).filter((_, idx) => idx !== i) })}><X size={10} /></button>
                </span>
              ))}
            </div>
          </div>
        )}

        {hasTerms && (
          <div className="space-y-2">
            <div><label className="admin-label">Acceptance Checkbox Label</label><input className="admin-input text-sm" value={sub.accept_label || ''} onChange={(e) => onUpdate({ accept_label: e.target.value })} placeholder="I accept the terms and conditions" /></div>
            <div>
              <label className="admin-label">Terms & Conditions Content</label>
              <RichTextEditor value={sub.terms_body || ''} onChange={(html) => onUpdate({ terms_body: html })} placeholder="Enter the full terms and conditions text..." rows={4} />
            </div>
          </div>
        )}

        <TagEditor
          tags={sub.guest_tags || []}
          onAdd={addTag}
          onRemove={(t) => onUpdate({ guest_tags: (sub.guest_tags || []).filter((x) => x !== t) })}
          tagInput={tagInput}
          setTagInput={setTagInput}
        />

        <label className="flex items-center gap-2 text-sm text-[#5a4430]">
          <input type="checkbox" checked={sub.required || false} onChange={(e) => onUpdate({ required: e.target.checked })} className="accent-[#6a4a8a]" />
          Required
        </label>

        {hasConditional && (
          <div className="rounded-lg border p-2 space-y-2" style={{ borderColor: '#d4c4e8', background: '#ede8f5' }}>
            <div className="flex items-center gap-2">
              <GitBranch size={12} className="text-[#7a5aaa]" />
              <span className="text-[11px] font-semibold text-[#5a4430]">Nested Follow-ups</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {yesNoOptions.map((opt) => {
                const count = (sub.conditional_sub_questions || []).filter((s) => s.option_value === opt).length;
                return (
                  <button key={opt} onClick={() => addNestedSub(opt)} className="text-[11px] px-2 py-1 rounded-full border transition" style={{ borderColor: count > 0 ? '#7a5aaa' : '#d4c4e8', background: count > 0 ? '#e8e4f0' : '#fff', color: count > 0 ? '#7a5aaa' : '#8a7a66' }}>
                    + On &ldquo;{opt}&rdquo;{count > 0 && ` (${count})`}
                  </button>
                );
              })}
              <button onClick={() => addNestedSub('__always__')} className="text-[11px] px-2 py-1 rounded-full border transition" style={{ borderColor: (sub.conditional_sub_questions || []).some((s) => s.option_value === '__always__') ? '#7a5aaa' : '#d4c4e8', background: (sub.conditional_sub_questions || []).some((s) => s.option_value === '__always__') ? '#e8e4f0' : '#fff', color: (sub.conditional_sub_questions || []).some((s) => s.option_value === '__always__') ? '#7a5aaa' : '#8a7a66' }}>
                + Always Show
              </button>
            </div>
            {(sub.conditional_sub_questions || []).length > 0 && (() => {
              const nested = sub.conditional_sub_questions || [];
              const groups: { option_value: string; items: { sub: ConditionalSubQuestion; idx: number }[] }[] = [];
              nested.forEach((ns, idx) => {
                let g = groups.find((x) => x.option_value === ns.option_value);
                if (!g) { g = { option_value: ns.option_value, items: [] }; groups.push(g); }
                g.items.push({ sub: ns, idx });
              });
              return (
                <div className="grid grid-cols-1 gap-2 items-start">
                  {groups.map((group) => (
                    <div key={group.option_value} className="space-y-2">
                      <div className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: '#e8e4f0', color: '#7a5aaa' }}>
                        <GitBranch size={7} /> {group.option_value === '__always__' ? 'Always Show' : `On “${group.option_value}”`}
                      </div>
                      <div className="space-y-2">
                        {group.items.map(({ sub: ns, idx }, posInGroup) => (
                          <FollowUpTreeEditor
                            key={idx}
                            sub={ns}
                            depth={depth + 1}
                            mainEvents={mainEvents}
                            onUpdate={(patch) => updateNestedSub(idx, patch)}
                            onRemove={() => removeNestedSub(idx)}
                            onMoveUp={posInGroup > 0 ? () => moveNestedSub(idx, 'up') : undefined}
                            onMoveDown={posInGroup < group.items.length - 1 ? () => moveNestedSub(idx, 'down') : undefined}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
