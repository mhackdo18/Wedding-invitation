import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Guest, WeddingEvent, RsvpQuestion, SiteSettings, TypeStyle, ConditionalSubQuestion } from '@/types';
import { typeStyle } from '@/lib/typography';
import { Check, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { SiteMonogram } from '@/components/public/SiteMonogram';

interface RsvpWizardProps { guests: Guest[]; events: WeddingEvent[]; questions: RsvpQuestion[]; settings: SiteSettings; typo: Record<string, TypeStyle>; embedded?: boolean; }
type AnswerValue = string | boolean | { first_name: string; last_name: string };

export default function RsvpWizard({ guests, questions, settings, typo, embedded }: RsvpWizardProps) {
  const [view, setView] = useState<'party' | 'questions' | 'done'>('party');
  const [member, setMember] = useState<Guest | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});

  const partyMembers = useMemo(() => {
    const leader = guests[0];
    if (!leader?.party_id) return guests.map((g) => ({ ...g, rsvp_status: statusOverrides[g.id] ?? g.rsvp_status }));
    return guests.filter((g) => g.party_id === leader.party_id).sort((a, b) => a.name.localeCompare(b.name)).map((g) => ({ ...g, rsvp_status: statusOverrides[g.id] ?? g.rsvp_status }));
  }, [guests, statusOverrides]);

  const visibleQuestions = useMemo(() => {
    if (!member) return [];
    return questions.filter((q) => !q.guest_tags?.length || q.guest_tags.some((tag) => (member.tags || []).includes(tag))).sort((a, b) => a.display_order - b.display_order);
  }, [member, questions]);

  const currentQuestion = visibleQuestions[step];
  const currentValue = currentQuestion ? answers[currentQuestion.id] : undefined;

  useEffect(() => {
    if (!member) return;
    const loadAnswers = async () => {
      const { data } = await supabase.from('rsvp_answers').select('question_id, answer').eq('guest_id', member.id);
      const saved: Record<string, AnswerValue> = {};
      (data || []).forEach((answer: { question_id: string; answer: string | null }) => { if (answer.answer) saved[answer.question_id] = answer.answer; });
      setAnswers(saved);
      setStep(0);
    };
    void loadAnswers();
  }, [member]);

  const setAnswer = (id: string, value: AnswerValue) => setAnswers((previous) => ({ ...previous, [id]: value }));
  const isComplete = (q: RsvpQuestion, value: AnswerValue | undefined) => {
    if (!q.required) return true;
    if (q.question_type === 'terms') return value === true;
    if (q.question_type === 'plus_one' || q.question_type === 'proxy') {
      if (value === 'no' || value === 'No') return true;
      return typeof value === 'object' && value.first_name.trim() !== '' && value.last_name.trim() !== '';
    }
    return value !== undefined && value !== '';
  };

  const begin = (guest: Guest) => { setMember(guest); setView('questions'); setError(''); };
  const finish = () => { setMember(null); setView('party'); setError(''); };

  const submit = async () => {
    if (!member) return;
    setSubmitting(true); setError('');
    try {
      const attendance: Record<string, string> = {};
      let hasYes = false;
      let hasAttendance = false;
      let proxyName: string | null = null;
      let plusOneName: string | null = null;
      const attendanceEventIds: string[] = [];
      for (const q of visibleQuestions) {
        const value = answers[q.id];
        if (!isComplete(q, value)) throw new Error(`Please answer: ${q.label}`);
        if (q.is_attendance && q.event_id && typeof value === 'string') { attendance[q.event_id] = value; hasAttendance = true; if (value === 'yes') hasYes = true; attendanceEventIds.push(q.event_id); }
        if (q.question_type === 'proxy' && typeof value === 'object') proxyName = `${value.first_name.trim()} ${value.last_name.trim()}`;
        if (q.question_type === 'plus_one' && typeof value === 'object') plusOneName = `${value.first_name.trim()} ${value.last_name.trim()}`;
        if (value !== undefined) {
          const answer = typeof value === 'object' ? JSON.stringify(value) : String(value);
          const { error: answerError } = await supabase.from('rsvp_answers').upsert({ guest_id: member.id, question_id: q.id, answer }, { onConflict: 'guest_id,question_id' });
          if (answerError) throw answerError;
        }
        if (q.is_attendance && q.event_id && typeof value === 'string') {
          const { error: rsvpError } = await supabase.from('guest_event_rsvps').upsert({ guest_id: member.id, event_id: q.event_id, status: value }, { onConflict: 'guest_id,event_id' });
          if (rsvpError) throw rsvpError;
        }
      }
      const status = hasAttendance ? (hasYes ? 'confirmed' : 'declined') : 'pending';

      // Task 3: When overall status is pending or declined, set ALL event RSVPs to 'no'
      if (status === 'pending' || status === 'declined') {
        const allEventIds = (events.length > 0 ? events : []).map((e) => e.id);
        for (const eventId of allEventIds) {
          const { error: rsvpError } = await supabase.from('guest_event_rsvps').upsert({ guest_id: member.id, event_id: eventId, status: 'no' }, { onConflict: 'guest_id,event_id' });
          if (rsvpError) throw rsvpError;
        }
      }

      const { error: guestError } = await supabase.from('guests').update({ rsvp_status: status, attendance, proxy_guest_name: proxyName, plus_one_name: plusOneName }).eq('id', member.id);
      if (guestError) throw guestError;
      if (status !== 'confirmed') {
        await supabase.from('seat_assignments').delete().eq('guest_id', member.id);
      }
      if (plusOneName && hasYes) {
        let partyId = member.party_id;
        if (!partyId) {
          const { data: party, error: partyError } = await supabase.from('parties').insert({ name: `${member.name}'s Party` }).select().single();
          if (partyError) throw partyError;
          partyId = party.id;
          await supabase.from('guests').update({ party_id: partyId, is_party_leader: true }).eq('id', member.id);
        }
        const { data: existingPlusOne } = await supabase
          .from('guests')
          .select('id')
          .eq('party_id', partyId)
          .eq('proxy_guest_name', member.name)
          .eq('tags.cs', ['plus-one'])
          .maybeSingle();
        let plusOneId: string;
        if (existingPlusOne) {
          const { error: plusOneUpdateError } = await supabase
            .from('guests')
            .update({ name: plusOneName, rsvp_status: 'confirmed' })
            .eq('id', existingPlusOne.id);
          if (plusOneUpdateError) throw plusOneUpdateError;
          plusOneId = existingPlusOne.id;
        } else {
          const { data: newPlusOne, error: plusOneError } = await supabase.from('guests').insert({ name: plusOneName, party_id: partyId, party_size: 1, rsvp_status: 'confirmed', tags: ['plus-one'], plus_one_allowed: false, is_party_leader: false, proxy_guest_name: member.name }).select().single();
          if (plusOneError) throw plusOneError;
          plusOneId = newPlusOne.id;
        }

        // Task 2: Copy main guest's attendance answers and event RSVPs to the plus one
        for (const q of visibleQuestions) {
          const value = answers[q.id];
          if (value !== undefined && q.question_type !== 'plus_one' && q.question_type !== 'proxy') {
            const answer = typeof value === 'object' ? JSON.stringify(value) : String(value);
            await supabase.from('rsvp_answers').upsert({ guest_id: plusOneId, question_id: q.id, answer }, { onConflict: 'guest_id,question_id' });
          }
        }
        for (const eventId of attendanceEventIds) {
          const evStatus = attendance[eventId] || 'yes';
          await supabase.from('guest_event_rsvps').upsert({ guest_id: plusOneId, event_id: eventId, status: evStatus }, { onConflict: 'guest_id,event_id' });
        }
        await supabase.from('guests').update({ attendance }).eq('id', plusOneId);
      }
      setView('done');
      setStatusOverrides((prev) => ({ ...prev, [member.id]: status }));
    } catch (submissionError) { setError(submissionError instanceof Error ? submissionError.message : 'Unable to save your RSVP.'); }
    finally { setSubmitting(false); }
  };

  if (guests.length === 0) return <div className="px-6 py-10 text-center text-[#8a7a66]">No guests found for this invitation.</div>;
  if (view === 'done') return <DoneView hasParty={partyMembers.length > 1} onAnother={finish} embedded={embedded} settings={settings} />;
  if (view === 'party') return <PartyView members={partyMembers} onSelect={begin} />;
  if (!currentQuestion || !member) return <div className="px-6 py-10 text-center text-[#8a7a66]">RSVP questions will appear here soon.</div>;

  const last = step === visibleQuestions.length - 1;
  const next = () => { if (!isComplete(currentQuestion, currentValue)) { setError('Please answer this required question before continuing.'); return; } setError(''); last ? void submit() : setStep((value) => value + 1); };

  return <div className="px-6 py-8"><div className="max-w-lg mx-auto"><ProgressBar step={step} total={visibleQuestions.length} /><p className="text-xs text-[#a07c4a] text-center mb-2">RSVPing for: {member.name}</p><p className="text-xs text-[#a07c4a] text-center mb-4">Question {step + 1} of {visibleQuestions.length}</p><h2 style={{ fontFamily: 'var(--heading-font)', fontSize: 'clamp(20px, 4vw, 24px)', lineHeight: 1.2, color: '#5a4430', textAlign: 'center', margin: '0 0 6px', ...typeStyle(typo.rsvpTitle) }}>{currentQuestion.label}</h2>{currentQuestion.sub_question && <p className="text-center italic text-sm sm:text-base mb-3 text-[#8a7a66]">{currentQuestion.sub_question}</p>}<QuestionInput q={currentQuestion} value={currentValue} onChange={(value) => setAnswer(currentQuestion.id, value)} /><ConditionalFollowUps q={currentQuestion} answers={answers} onChange={setAnswer} /><p className="text-xs text-center mt-4 text-[#a07c66]">{currentQuestion.required ? 'Required' : 'Optional'}</p>{error && <p className="text-sm text-center mt-2 text-[#b03a3a]">{error}</p>}<div className="flex justify-between mt-6"><button onClick={() => step === 0 ? finish() : setStep((value) => value - 1)} className="btn-ghost flex items-center gap-1"><ChevronLeft size={16} /> Back</button><button onClick={next} disabled={submitting || (currentQuestion.required && !isComplete(currentQuestion, currentValue))} className="btn-primary flex items-center gap-1 disabled:opacity-40">{submitting ? <Loader2 size={16} className="animate-spin" /> : last ? <><Check size={16} /> Submit</> : <>Next <ChevronRight size={16} /></>}</button></div></div></div>;
}

function PartyView({ members, onSelect }: { members: Guest[]; onSelect: (guest: Guest) => void }) { return <div className="px-6 py-12"><div className="max-w-md mx-auto"><div className="text-center mb-8"><p className="text-[10px] tracking-[0.3em] uppercase text-[#a07c4a]">{members.length > 1 ? 'Your Party' : 'Your RSVP'}</p><h2 className="text-4xl text-[#3a2e22]" style={{ fontFamily: 'var(--heading-font)' }}>{members.length > 1 ? 'RSVP for Your Party' : 'Your RSVP'}</h2><p className="text-sm text-[#6b5d4f] mt-2">{members.length > 1 ? 'Choose one member at a time. You can RSVP for another member after saving.' : 'Choose your name to begin.'}</p></div><div className="space-y-2">{members.map((guest) => <div key={guest.id} className="flex items-center justify-between border p-3" style={{ borderColor: '#d6cdbf' }}><div><p className="font-medium text-[#3a2e22]">{guest.name}</p><p className="text-[10px] uppercase tracking-wider text-[#a07c4a]">{guest.rsvp_status === 'confirmed' ? 'Confirmed' : guest.rsvp_status === 'declined' ? 'Declined' : 'Pending'}</p></div><button onClick={() => onSelect(guest)} className="text-xs uppercase tracking-wider text-[#8a6d3b]">{guest.rsvp_status === 'pending' ? 'RSVP' : 'Edit'}</button></div>)}</div></div></div>; }
function DoneView({ hasParty, onAnother, embedded, settings }: { hasParty: boolean; onAnother: () => void; embedded?: boolean; settings: SiteSettings }) { return <div className="px-6 py-12 text-center"><div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3 overflow-hidden" style={{ background: '#e8dfc8' }}><SiteMonogram settings={settings} size={28} /></div><h2 className="text-3xl text-[#5a4430]" style={{ fontFamily: 'var(--heading-font)' }}>Thank you</h2><p className="text-sm text-[#6b5d4f] mt-2">Your RSVP has been received.</p>{hasParty && <button onClick={onAnother} className="btn-ghost mt-5">RSVP for Another Member</button>}{!embedded && <button onClick={() => { window.location.hash = '/'; }} className="btn-ghost block mx-auto mt-3">Back to Invitation</button>}</div>; }
function ProgressBar({ step, total }: { step: number; total: number }) { return <div className="flex gap-1 mb-5">{Array.from({ length: total }).map((_, index) => <div key={index} className="h-1 flex-1 rounded" style={{ background: index <= step ? '#8a6d3b' : '#e6ddcd' }} />)}</div>; }
function QuestionInput({ q, value, onChange }: { q: RsvpQuestion; value: AnswerValue | undefined; onChange: (value: AnswerValue) => void }) { const textValue = typeof value === 'string' ? value : ''; if (q.question_type === 'terms') return <label className="flex gap-3 border p-4 text-sm text-[#3a2e22]" style={{ borderColor: value === true ? '#5a7a4a' : '#d6cdbf' }}><input type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} className="mt-1 accent-[#8a6d3b]" />{q.accept_label || 'I accept the terms and conditions'}</label>; if (q.question_type === 'yes_no' || q.is_attendance) return <div className="flex flex-col gap-2"><AnswerButton active={value === 'yes'} label={q.yes_label || q.yes_text || 'Yes'} onClick={() => onChange('yes')} /><AnswerButton active={value === 'no'} label={q.no_label || q.no_text || 'No'} onClick={() => onChange('no')} /></div>; if (q.question_type === 'multiple_choice') return <div className="space-y-2">{(q.options || []).map((option) => <AnswerButton key={option} active={value === option} label={option} onClick={() => onChange(option)} />)}</div>; if (q.question_type === 'plus_one' || q.question_type === 'proxy') { const person = typeof value === 'object' ? value : { first_name: '', last_name: '' }; return <div><div className="flex gap-2 mb-3"><AnswerButton active={typeof value === 'object'} label={q.yes_label || 'Yes'} onClick={() => onChange(person)} /><AnswerButton active={value === 'no'} label={q.no_label || 'No'} onClick={() => onChange('no')} /></div>{typeof value === 'object' && <div className="grid grid-cols-2 gap-2"><input className="admin-input" placeholder={`${q.question_type === 'proxy' ? 'Proxy' : 'Plus one'} first name`} value={person.first_name} onChange={(event) => onChange({ ...person, first_name: event.target.value })} /><input className="admin-input" placeholder="Last name" value={person.last_name} onChange={(event) => onChange({ ...person, last_name: event.target.value })} /></div>}</div>; } if (q.input_type === 'textarea') return <textarea className="admin-input" rows={4} value={textValue} onChange={(event) => onChange(event.target.value)} />; return <input className="admin-input" type={q.input_type === 'number' ? 'number' : 'text'} value={textValue} onChange={(event) => onChange(event.target.value)} autoFocus />; }
function AnswerButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) { return <button onClick={onClick} className="w-full border px-4 py-3 text-sm transition" style={{ borderColor: active ? '#8a6d3b' : '#d6cdbf', background: active ? '#f0e8d8' : '#fff', color: '#3a2e22' }}>{label}</button>; }
function ConditionalFollowUps({ q, answers, onChange }: { q: RsvpQuestion; answers: Record<string, AnswerValue>; onChange: (id: string, value: AnswerValue) => void }) { const active = (q.conditional_sub_questions || []).filter((sub) => answers[q.id] === sub.option_value); return <div className="space-y-3 mt-4">{active.map((sub) => <div key={sub.field_key}><label className="admin-label">{sub.label}</label><input className="admin-input" value={typeof answers[`${q.id}_${sub.field_key}`] === 'string' ? answers[`${q.id}_${sub.field_key}`] as string : ''} onChange={(event) => onChange(`${q.id}_${sub.field_key}`, event.target.value)} placeholder={sub.placeholder || ''} /></div>)}</div>; }
