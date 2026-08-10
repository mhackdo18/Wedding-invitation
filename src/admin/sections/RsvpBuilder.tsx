import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SectionHeader, Card, EmptyState, ConfirmButton } from '../ui';
import type { RsvpQuestion, WeddingEvent, ConditionalSubQuestion } from '@/types';
import { ClipboardList, Plus, Loader2, Trash2, Edit2, GripVertical, X, Tag, Calendar, ChevronUp, ChevronDown, GitBranch } from 'lucide-react';

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
];

export default function RsvpBuilder() {
  const [questions, setQuestions] = useState<RsvpQuestion[]>([]);
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RsvpQuestion | null>(null);
  const [adding, setAdding] = useState(false);

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
      : 'text';

    const payload: Record<string, unknown> = {
      label: q.label, field_key: q.field_key,
      input_type: inputType,
      question_type: q.question_type || 'text',
      sub_question: q.sub_question || null,
      options: q.options, required: q.required,
      display_order: q.display_order,
      event_id: q.event_id || null,
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

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8a6d3b]" /></div>;

  return (
    <div>
      <SectionHeader title="RSVP Builder" subtitle="Build step-by-step questions for your guests"
        action={<button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-1.5"><Plus size={16} /> Add Question</button>} />

      <div className="space-y-3">
        {questions.length === 0 && !adding && <Card><EmptyState icon={ClipboardList} title="No questions" hint="Add questions for your guests" /></Card>}
        {questions.map((q, i) => (
          <div key={q.id} className="admin-card p-3 flex items-center gap-3">
            <div className="flex flex-col gap-0.5 shrink-0">
              <button onClick={() => moveQuestion(q.id, 'up')} disabled={i === 0} className="text-[#c9b896] hover:text-[#5a4430] disabled:opacity-30"><ChevronUp size={14} /></button>
              <button onClick={() => moveQuestion(q.id, 'down')} disabled={i === questions.length - 1} className="text-[#c9b896] hover:text-[#5a4430] disabled:opacity-30"><ChevronDown size={14} /></button>
            </div>
            <GripVertical size={16} className="text-[#c9b896] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[#a07c4a] font-mono">{i + 1}.</span>
                <p className="text-sm font-semibold text-[#3a2e22] truncate">{q.label}</p>
                {q.required && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#fbe9e9', color: '#b03a3a' }}>REQ</span>}
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: '#f0e8d8', color: '#8a6d3b' }}>
                  {QUESTION_TYPES.find((t) => t.value === (q.question_type || (q.is_attendance ? 'attendance' : q.input_type)))?.label || q.input_type}
                </span>
                {q.is_attendance && <span className="text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5" style={{ background: '#e8f0e4', color: '#5a7a4a' }}><Calendar size={8} /> EVENT</span>}
                {q.conditional_sub_questions?.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5" style={{ background: '#e8e4f0', color: '#6a4a8a' }}><GitBranch size={8} /> {q.conditional_sub_questions.length} branches</span>}
                {q.guest_tags && q.guest_tags.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5" style={{ background: '#f0e8d8', color: '#8a6d3b' }}><Tag size={8} /> {q.guest_tags.join(', ')}</span>
                )}
              </div>
              {q.sub_question && <p className="text-xs text-[#8a7a66] mt-0.5 truncate italic">{q.sub_question}</p>}
            </div>
            <button onClick={() => setEditing(q)} className="text-[#8a7a66] hover:text-[#5a4430]"><Edit2 size={14} /></button>
            <ConfirmButton onConfirm={() => remove(q.id)}><Trash2 size={14} /></ConfirmButton>
          </div>
        ))}
      </div>

      {(adding || editing) && <QuestionForm q={editing} mainEvents={mainEvents} onCancel={() => { setEditing(null); setAdding(false); }} onSave={save} />}
    </div>
  );
}

function QuestionForm({ q, onCancel, onSave, mainEvents }: { q: RsvpQuestion | null; onCancel: () => void; onSave: (q: Partial<RsvpQuestion>) => void; mainEvents: WeddingEvent[] }) {
  const initialType = q?.question_type || (q?.is_attendance ? 'attendance' : q?.input_type || 'text');
  const [form, setForm] = useState<Partial<RsvpQuestion>>({
    label: q?.label || '', field_key: q?.field_key || '',
    question_type: initialType, input_type: q?.input_type || 'text',
    sub_question: q?.sub_question || '',
    options: q?.options || [], required: q?.required || false,
    event_id: q?.event_id || null,
    yes_text: q?.yes_text || 'Joyfully Accepts', no_text: q?.no_text || 'Regretfully Declines',
    yes_label: q?.yes_label || '', no_label: q?.no_label || '',
    is_attendance: q?.is_attendance || false,
    guest_tags: q?.guest_tags || [],
    terms_body: q?.terms_body || '', accept_label: q?.accept_label || '',
    conditional_sub_questions: q?.conditional_sub_questions || [],
  });
  const [optText, setOptText] = useState('');
  const [tagInput, setTagInput] = useState('');

  const qType = form.question_type || 'text';
  const hasOptions = qType === 'multiple_choice';
  const hasYesNo = ['yes_no', 'attendance', 'plus_one', 'proxy'].includes(qType);
  const hasTerms = qType === 'terms';
  const isAttendance = qType === 'attendance';
  const hasConditional = ['yes_no', 'multiple_choice', 'attendance', 'proxy', 'plus_one'].includes(qType);

  const addOpt = () => {
    if (!optText.trim()) return;
    setForm({ ...form, options: [...(form.options || []), optText.trim()] });
    setOptText('');
  };
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !(form.guest_tags || []).includes(t)) {
      setForm({ ...form, guest_tags: [...(form.guest_tags || []), t] });
      setTagInput('');
    }
  };

  const addConditionalSub = (optionValue: string) => {
    const existing = (form.conditional_sub_questions || []).find((s) => s.option_value === optionValue);
    if (existing) return;
    setForm({
      ...form,
      conditional_sub_questions: [...(form.conditional_sub_questions || []), {
        option_value: optionValue,
        label: '',
        field_key: `${(form.field_key || 'q')}_${optionValue.toLowerCase().replace(/\s+/g, '_')}_followup`,
        input_type: 'text',
        placeholder: '',
      }],
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

  const yesNoOptions = qType === 'multiple_choice' ? (form.options || []) : ['yes', 'no'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onCancel}>
      <div className="admin-card w-full max-w-lg p-5 max-h-[92vh] overflow-auto thin-scroll" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#3a2e22]">{q ? 'Edit Question' : 'Add Question'}</h3>
          <button onClick={onCancel}><X size={18} className="text-[#8a7a66]" /></button>
        </div>
        <div className="space-y-3">
          <div><label className="admin-label">Question Prompt *</label><input className="admin-input" value={form.label || ''} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Will you be celebrating with us?" /></div>
          <div><label className="admin-label">Sub Question / Hint</label><input className="admin-input" value={form.sub_question || ''} onChange={(e) => setForm({ ...form, sub_question: e.target.value })} placeholder="Optional description or additional context" /></div>
          <div><label className="admin-label">Field Key *</label><input className="admin-input font-mono text-xs" value={form.field_key || ''} onChange={(e) => setForm({ ...form, field_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })} placeholder="ceremony_attendance" /></div>
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
              <label className="admin-label">Link to Event *</label>
              <select className="admin-input" value={form.event_id || ''} onChange={(e) => setForm({ ...form, event_id: e.target.value || null })}>
                <option value="">Select event...</option>
                {mainEvents.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
              </select>
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
                <textarea className="admin-input text-xs" rows={6} value={form.terms_body || ''} onChange={(e) => setForm({ ...form, terms_body: e.target.value })} placeholder="Enter the full terms and conditions text..." />
              </div>
            </div>
          )}

          {hasConditional && (
            <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: '#d6cdbf', background: '#faf6ee' }}>
              <div className="flex items-center gap-2">
                <GitBranch size={14} className="text-[#6a4a8a]" />
                <span className="text-xs font-semibold text-[#5a4430]">Conditional Follow-up Questions</span>
              </div>
              <p className="text-xs text-[#8a7a66]">When a guest selects an option, show an additional question.</p>
              <div className="flex flex-wrap gap-1.5">
                {yesNoOptions.map((opt) => {
                  const hasSub = (form.conditional_sub_questions || []).some((s) => s.option_value === opt);
                  return (
                    <button key={opt} onClick={() => !hasSub && addConditionalSub(opt)} className="text-xs px-2 py-1 rounded-full border transition" style={{ borderColor: hasSub ? '#6a4a8a' : '#d6cdbf', background: hasSub ? '#e8e4f0' : '#fff', color: hasSub ? '#6a4a8a' : '#8a7a66' }}>
                      {hasSub ? '✓' : '+'} On "{opt}"
                    </button>
                  );
                })}
              </div>
              {(form.conditional_sub_questions || []).map((sub, idx) => (
                <div key={idx} className="rounded-lg border p-3 space-y-2" style={{ borderColor: '#c9b6e4', background: '#f5f0fa' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#e8e4f0', color: '#6a4a8a' }}>When: "{sub.option_value}"</span>
                    <button onClick={() => removeConditional(idx)} className="text-[#c9b896] hover:text-[#b03a3a]"><X size={12} /></button>
                  </div>
                  <div><label className="admin-label">Follow-up Question</label><input className="admin-input text-sm" value={sub.label} onChange={(e) => updateConditional(idx, { label: e.target.value })} placeholder="e.g. How many plus-ones will you bring?" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="admin-label">Field Key</label><input className="admin-input text-xs font-mono" value={sub.field_key} onChange={(e) => updateConditional(idx, { field_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })} /></div>
                    <div><label className="admin-label">Input Type</label>
                      <select className="admin-input" value={sub.input_type} onChange={(e) => updateConditional(idx, { input_type: e.target.value })}>
                        <option value="text">Text</option><option value="number">Number</option><option value="textarea">Long Text</option>
                      </select>
                    </div>
                  </div>
                  <div><label className="admin-label">Placeholder</label><input className="admin-input text-sm" value={sub.placeholder || ''} onChange={(e) => updateConditional(idx, { placeholder: e.target.value })} /></div>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="admin-label">Guest Tag Visibility</label>
            <p className="text-xs text-[#8a7a66] mb-2">Only show to guests with these tags. Empty = show to all.</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(form.guest_tags || []).map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#f0e8d8', color: '#8a6d3b' }}>
                  <Tag size={10} /> {t}
                  <button onClick={() => setForm({ ...form, guest_tags: (form.guest_tags || []).filter((x) => x !== t) })}><X size={10} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="admin-input text-xs" placeholder="VIP, Bridal Party..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
              <button onClick={addTag} className="btn-ghost text-xs">Add</button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-[#5a4430]">
            <input type="checkbox" checked={form.required || false} onChange={(e) => setForm({ ...form, required: e.target.checked })} className="accent-[#8a6d3b]" />
            Required
          </label>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
          <button onClick={() => form.label?.trim() && form.field_key?.trim() && onSave(form)} className="btn-primary flex-1">Save Question</button>
        </div>
      </div>
    </div>
  );
}
