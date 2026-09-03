import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Guest, WeddingEvent, RsvpQuestion, SiteSettings, TypeStyle, ConditionalSubQuestion } from '@/types';
import { typeStyle } from '@/lib/typography';
import { Check, ChevronRight, ChevronLeft, Loader2, Clock } from 'lucide-react';
import { SiteMonogram } from '@/components/public/SiteMonogram';
import { isRsvpClosed } from '@/lib/timezone';

const FIELD_MAPPINGS: Record<string, string> = {
  dietary: 'dietary',
  message: 'song_requests',
};

interface RsvpWizardProps { guests: Guest[]; events: WeddingEvent[]; questions: RsvpQuestion[]; settings: SiteSettings; typo: Record<string, TypeStyle>; embedded?: boolean; onGuestsUpdate?: (guests: Guest[]) => void; }
type AnswerValue = string | boolean | { first_name: string; last_name: string };

type WizardStep =
  | { type: 'question'; question: RsvpQuestion; questionIndex: number }
  | { type: 'followup'; sub: ConditionalSubQuestion; parentQuestion: RsvpQuestion; questionIndex: number; keyPath: string };

function normalizeAnswerForCompare(answer: AnswerValue | undefined): string | undefined {
  if (typeof answer === 'object' && answer !== null) return 'yes';
  return answer as string | undefined;
}

function isSubActive(sub: ConditionalSubQuestion, parentAnswer: AnswerValue | undefined, memberTags: string[]): boolean {
  if (sub.option_value === '__always__') {
    if (sub.guest_tags?.length && !sub.guest_tags.some((tag) => memberTags.includes(tag))) return false;
    return true;
  }
  if (normalizeAnswerForCompare(parentAnswer) !== sub.option_value) return false;
  if (sub.guest_tags?.length && !sub.guest_tags.some((tag) => memberTags.includes(tag))) return false;
  return true;
}

function buildSubSteps(
  subs: ConditionalSubQuestion[],
  parentQuestion: RsvpQuestion,
  questionIndex: number,
  parentKeyPath: string,
  answers: Record<string, AnswerValue>,
  memberTags: string[],
): WizardStep[] {
  const steps: WizardStep[] = [];
  for (const sub of subs) {
    const keyPath = `${parentKeyPath}__${sub.field_key}`;
    const parentAnswer = answers[parentKeyPath];
    if (!isSubActive(sub, parentAnswer, memberTags)) continue;
    steps.push({ type: 'followup', sub, parentQuestion, questionIndex, keyPath });
    if (sub.conditional_sub_questions?.length) {
      steps.push(...buildSubSteps(sub.conditional_sub_questions, parentQuestion, questionIndex, keyPath, answers, memberTags));
    }
  }
  return steps;
}

function flattenFollowupData(
  subs: ConditionalSubQuestion[],
  parentKeyPath: string,
  answers: Record<string, AnswerValue>,
  memberTags: string[],
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const sub of subs) {
    const keyPath = `${parentKeyPath}__${sub.field_key}`;
    const fv = answers[keyPath];
    if (!isSubActive(sub, answers[parentKeyPath] !== undefined ? answers[parentKeyPath] : undefined, memberTags)) continue;
    if (fv === undefined) continue;
    const nestedData = sub.conditional_sub_questions?.length
      ? flattenFollowupData(sub.conditional_sub_questions, keyPath, answers, memberTags)
      : {};
    data[sub.field_key] = Object.keys(nestedData).length > 0
      ? { value: fv, __followups: nestedData }
      : fv;
  }
  return data;
}

function isFollowUpComplete(sub: ConditionalSubQuestion, value: AnswerValue | undefined) {
  if (!sub.required) return true;
  if (sub.question_type === 'terms') return value === true;
  if (sub.question_type === 'plus_one' || sub.question_type === 'proxy') {
    if (value === 'no' || value === 'No') return true;
    return typeof value === 'object' && value.first_name.trim() !== '' && value.last_name.trim() !== '';
  }
  return value !== undefined && value !== '';
}

function validateAllSubs(
  subs: ConditionalSubQuestion[],
  parentKeyPath: string,
  answers: Record<string, AnswerValue>,
  memberTags: string[],
): string | null {
  for (const sub of subs) {
    const keyPath = `${parentKeyPath}__${sub.field_key}`;
    if (!isSubActive(sub, answers[parentKeyPath] !== undefined ? answers[parentKeyPath] : undefined, memberTags)) continue;
    const fv = answers[keyPath];
    if (!isFollowUpComplete(sub, fv)) return sub.label || 'this question';
    if (sub.conditional_sub_questions?.length) {
      const nestedErr = validateAllSubs(sub.conditional_sub_questions, keyPath, answers, memberTags);
      if (nestedErr) return nestedErr;
    }
  }
  return null;
}

function parseFollowupAnswers(
  questionId: string,
  followups: Record<string, unknown>,
  parentKeyPath: string,
  saved: Record<string, AnswerValue>,
) {
  for (const [fk, fv] of Object.entries(followups)) {
    const keyPath = `${parentKeyPath}__${fk}`;
    if (fv && typeof fv === 'object' && !Array.isArray(fv)) {
      const fo = fv as { value?: unknown; __followups?: Record<string, unknown> };
      if (fo.value !== undefined) saved[keyPath] = fo.value as AnswerValue;
      if (fo.__followups) parseFollowupAnswers(questionId, fo.__followups, keyPath, saved);
    } else {
      saved[keyPath] = fv as AnswerValue;
    }
  }
}

export default function RsvpWizard({ guests, events, questions, settings, typo, embedded, onGuestsUpdate }: RsvpWizardProps) {
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

  const wizardSteps = useMemo<WizardStep[]>(() => {
    const steps: WizardStep[] = [];
    const memberTags = member?.tags || [];
    visibleQuestions.forEach((q, qIndex) => {
      steps.push({ type: 'question', question: q, questionIndex: qIndex });
      steps.push(...buildSubSteps(q.conditional_sub_questions || [], q, qIndex, q.id, answers, memberTags));
    });
    return steps;
  }, [visibleQuestions, answers, member]);

  useEffect(() => {
    if (step > wizardSteps.length - 1) {
      setStep(Math.max(0, wizardSteps.length - 1));
    }
  }, [step, wizardSteps.length]);

  const currentStep = wizardSteps[step];
  const isFollowUpStep = currentStep?.type === 'followup';
  const currentQuestion = currentStep?.type === 'question' ? currentStep.question : currentStep?.type === 'followup' ? currentStep.parentQuestion : undefined;
  const currentValue = currentQuestion ? answers[currentQuestion.id] : undefined;
  const currentFollowUp = currentStep?.type === 'followup' ? currentStep.sub : undefined;
  const currentFollowUpValue = currentFollowUp && currentStep?.type === 'followup' ? answers[currentStep.keyPath] : undefined;

  useEffect(() => {
    if (!member) return;
    const loadAnswers = async () => {
      const { data } = await supabase.from('rsvp_answers').select('question_id, answer').eq('guest_id', member.id);
      const saved: Record<string, AnswerValue> = {};
      (data || []).forEach((answer: { question_id: string; answer: string | null }) => {
        if (answer.answer) {
          try {
            const parsed = JSON.parse(answer.answer);
            if (parsed && typeof parsed === 'object' && parsed.__followups) {
              parseFollowupAnswers(answer.question_id, parsed.__followups as Record<string, unknown>, answer.question_id, saved);
              if (parsed.value !== undefined) saved[answer.question_id] = parsed.value as AnswerValue;
            } else {
              saved[answer.question_id] = answer.answer;
            }
          } catch {
            saved[answer.question_id] = answer.answer;
          }
        }
      });
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
    if (isRsvpClosed(settings.rsvp_deadline, settings.timezone)) {
      setError('The RSVP deadline has passed and submissions are now closed.');
      return;
    }
    setSubmitting(true); setError('');
    try {
      let hasProxy = false;
      const attendance: Record<string, string> = {};
      let hasYes = false;
      let hasAttendance = false;
      let proxyName: string | null = null;
      let plusOneName: string | null = null;
      const attendanceEventIds: string[] = [];
      const mappedFields: Record<string, string> = {};
      for (const q of visibleQuestions) {
        const value = answers[q.id];
        if (!isComplete(q, value)) throw new Error(`Please answer: ${q.label}`);
        if (q.is_attendance && typeof value === 'string') {
          const targetEventIds = q.event_ids?.length
            ? (q.event_ids.includes('__all__') ? events.map((e) => e.id) : q.event_ids)
            : q.event_id ? [q.event_id] : [];
          for (const eid of targetEventIds) {
            attendance[eid] = value;
            hasAttendance = true;
            if (value === 'yes') hasYes = true;
            if (!attendanceEventIds.includes(eid)) attendanceEventIds.push(eid);
          }
        }
        if (q.question_type === 'proxy' && typeof value === 'object') {
          proxyName = `${value.first_name.trim()} ${value.last_name.trim()}`; hasProxy = true; hasYes = true; hasAttendance = true;
          const targetEventIds = q.event_ids?.length
            ? (q.event_ids.includes('__all__') ? events.map((e) => e.id) : q.event_ids)
            : q.event_id ? [q.event_id] : events.map((e) => e.id);
          for (const eid of targetEventIds) {
            attendance[eid] = 'yes';
            if (!attendanceEventIds.includes(eid)) attendanceEventIds.push(eid);
          }
        }
        if (q.question_type === 'plus_one' && typeof value === 'object') plusOneName = `${value.first_name.trim()} ${value.last_name.trim()}`;
        if (q.question_type === 'dietary' && typeof value === 'string' && value.trim()) mappedFields.dietary = value.trim();

        const activeSubs = (q.conditional_sub_questions || []).filter((sub) => {
          if (sub.option_value === '__always__') {
            if (sub.guest_tags?.length && !sub.guest_tags.some((tag) => (member.tags || []).includes(tag))) return false;
            return true;
          }
          if (normalizeAnswerForCompare(value) !== sub.option_value) return false;
          if (sub.guest_tags?.length && !sub.guest_tags.some((tag) => (member.tags || []).includes(tag))) return false;
          return true;
        });

        const memberTags = member.tags || [];
        const subErr = validateAllSubs(activeSubs, q.id, answers, memberTags);
        if (subErr) throw new Error(`Please answer: ${subErr}`);

        const followupData = flattenFollowupData(activeSubs, q.id, answers, memberTags);

        const scanSubsForPerson = (subs: ConditionalSubQuestion[], parentKeyPath: string) => {
          for (const sub of subs) {
            const keyPath = `${parentKeyPath}__${sub.field_key}`;
            if (!isSubActive(sub, answers[parentKeyPath], memberTags)) continue;
            if (sub.question_type === 'plus_one' && typeof answers[keyPath] === 'object' && answers[keyPath] !== null) {
              const po = answers[keyPath] as { first_name: string; last_name: string };
              if (po.first_name.trim() && po.last_name.trim() && !plusOneName) {
                plusOneName = `${po.first_name.trim()} ${po.last_name.trim()}`;
              }
            }
            if (sub.question_type === 'proxy' && typeof answers[keyPath] === 'object' && answers[keyPath] !== null) {
              const px = answers[keyPath] as { first_name: string; last_name: string };
              if (px.first_name.trim() && px.last_name.trim() && !proxyName) {
                proxyName = `${px.first_name.trim()} ${px.last_name.trim()}`;
                hasProxy = true; hasYes = true; hasAttendance = true;
                const targetEventIds = sub.event_ids?.length
                  ? (sub.event_ids.includes('__all__') ? events.map((e) => e.id) : sub.event_ids)
                  : events.map((e) => e.id);
                for (const eid of targetEventIds) {
                  attendance[eid] = 'yes';
                  if (!attendanceEventIds.includes(eid)) attendanceEventIds.push(eid);
                }
              }
            }
            if (sub.question_type === 'dietary' && typeof answers[keyPath] === 'string' && (answers[keyPath] as string).trim() && !mappedFields.dietary) {
              mappedFields.dietary = (answers[keyPath] as string).trim();
            }
            if (sub.conditional_sub_questions?.length) scanSubsForPerson(sub.conditional_sub_questions, keyPath);
          }
        };
        scanSubsForPerson(activeSubs, q.id);

        if (value !== undefined) {
          const answerPayload = Object.keys(followupData).length > 0
            ? JSON.stringify({ value, __followups: followupData })
            : typeof value === 'object' ? JSON.stringify(value) : String(value);
          const { error: answerError } = await supabase.from('rsvp_answers').upsert({ guest_id: member.id, question_id: q.id, answer: answerPayload }, { onConflict: 'guest_id,question_id' });
          if (answerError) throw answerError;
        }
        if (q.is_attendance && typeof value === 'string') {
          const targetEventIds = q.event_ids?.length
            ? (q.event_ids.includes('__all__') ? events.map((e) => e.id) : q.event_ids)
            : q.event_id ? [q.event_id] : [];
          for (const eid of targetEventIds) {
            const { error: rsvpError } = await supabase.from('guest_event_rsvps').upsert({ guest_id: member.id, event_id: eid, status: value }, { onConflict: 'guest_id,event_id' });
            if (rsvpError) throw rsvpError;
          }
        }
      }
      const status = hasAttendance ? (hasYes ? 'confirmed' : 'declined') : 'pending';

      if (status === 'confirmed' && hasProxy && !attendanceEventIds.length) {
        const allEventIds = (events.length > 0 ? events : []).map((e) => e.id);
        for (const eventId of allEventIds) {
          attendance[eventId] = 'yes';
          if (!attendanceEventIds.includes(eventId)) attendanceEventIds.push(eventId);
        }
      }
      if (status === 'pending' || status === 'declined') {
        const allEventIds = (events.length > 0 ? events : []).map((e) => e.id);
        for (const eventId of allEventIds) {
          const { error: rsvpError } = await supabase.from('guest_event_rsvps').upsert({ guest_id: member.id, event_id: eventId, status: 'no' }, { onConflict: 'guest_id,event_id' });
          if (rsvpError) throw rsvpError;
        }
      }
      if (status === 'confirmed' && attendanceEventIds.length) {
        for (const eventId of attendanceEventIds) {
          const { error: rsvpError } = await supabase.from('guest_event_rsvps').upsert({ guest_id: member.id, event_id: eventId, status: 'yes' }, { onConflict: 'guest_id,event_id' });
          if (rsvpError) throw rsvpError;
        }
      }

      const { error: guestError } = await supabase.from('guests').update({ rsvp_status: status, attendance, proxy_guest_name: proxyName, plus_one_name: plusOneName, rsvp_submitted_at: new Date().toISOString(), ...mappedFields }).eq('id', member.id);
      if (guestError) throw guestError;
      if (status !== 'confirmed') {
        await supabase.from('seat_assignments').delete().eq('guest_id', member.id);
      }
      let partyId = member.party_id;
      if (plusOneName && status !== 'declined') {
        if (!partyId) {
          const { data: party, error: partyError } = await supabase.from('parties').insert({ name: `${member.name}'s Party` }).select().single();
          if (partyError) throw partyError;
          partyId = party.id;
          await supabase.from('guests').update({ party_id: partyId, is_party_leader: true }).eq('id', member.id);
        }
        const { data: existingPlusOnes } = await supabase
          .from('guests')
          .select('id')
          .eq('party_id', partyId)
          .contains('tags', ['plus-one']);
        let plusOneId: string;
        if (existingPlusOnes && existingPlusOnes.length > 0) {
          const existingPlusOne = existingPlusOnes[0];
          const extraPlusOnes = existingPlusOnes.slice(1);
          for (const extra of extraPlusOnes) {
            await supabase.from('rsvp_answers').delete().eq('guest_id', extra.id);
            await supabase.from('guest_event_rsvps').delete().eq('guest_id', extra.id);
            await supabase.from('seat_assignments').delete().eq('guest_id', extra.id);
            await supabase.from('guests').delete().eq('id', extra.id);
          }
          const { error: plusOneUpdateError } = await supabase
            .from('guests')
            .update({ name: plusOneName, rsvp_status: 'confirmed', proxy_guest_name: member.name })
            .eq('id', existingPlusOne.id);
          if (plusOneUpdateError) throw plusOneUpdateError;
          plusOneId = existingPlusOne.id;
        } else {
          const { data: newPlusOne, error: plusOneError } = await supabase.from('guests').insert({ name: plusOneName, party_id: partyId, party_size: 1, rsvp_status: 'confirmed', tags: ['plus-one'], plus_one_allowed: false, is_party_leader: false, proxy_guest_name: member.name }).select().single();
          if (plusOneError) throw plusOneError;
          plusOneId = newPlusOne.id;
        }

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
      } else {
        if (member.party_id) {
          const { data: oldPlusOnes } = await supabase
            .from('guests')
            .select('id')
            .eq('party_id', member.party_id)
            .contains('tags', ['plus-one']);
          if (oldPlusOnes && oldPlusOnes.length > 0) {
            for (const op of oldPlusOnes) {
              await supabase.from('rsvp_answers').delete().eq('guest_id', op.id);
              await supabase.from('guest_event_rsvps').delete().eq('guest_id', op.id);
              await supabase.from('seat_assignments').delete().eq('guest_id', op.id);
              await supabase.from('guests').delete().eq('id', op.id);
            }
          }
        }
        await supabase.from('guests').update({ plus_one_name: null }).eq('id', member.id);
      }
      const refreshPartyId = partyId || member.party_id || '';
      const { data: refreshedParty } = await supabase.from('guests').select('id, name, email, phone, party_id, party_size, rsvp_status, attendance, dietary, plus_one_name, plus_one_allowed, song_requests, notes, tags, is_party_leader, proxy_guest_name, name_on_card, rsvp_submitted_at').eq('party_id', refreshPartyId).order('name', { ascending: true });
      setView('done');
      setStatusOverrides((prev) => ({ ...prev, [member.id]: status }));
      if (refreshedParty && refreshedParty.length > 0) { onGuestsUpdate?.(refreshedParty as Guest[]); }
    } catch (submissionError) { setError(submissionError instanceof Error ? submissionError.message : 'Unable to save your RSVP.'); }
    finally { setSubmitting(false); }
  };

  if (guests.length === 0) return <div className="px-6 py-10 text-center text-[#8a7a66]">No guests found for this invitation.</div>;
  if (isRsvpClosed(settings.rsvp_deadline, settings.timezone)) {
    return (
      <div className="px-6 py-16 text-center">
        <Clock size={40} className="mx-auto mb-4" style={{ color: '#b03a3a' }} />
        <h2 style={{ fontFamily: 'var(--heading-font)', fontSize: 28, color: '#5a4430', margin: 0 }}>
          RSVP Has Closed
        </h2>
        <p className="text-sm mt-3" style={{ color: '#8a7a66' }}>
          The RSVP deadline has passed. If you need to update your response, please contact the couple directly.
        </p>
      </div>
    );
  }
  if (view === 'done') return <DoneView hasParty={partyMembers.length > 1} onAnother={finish} embedded={embedded} settings={settings} />;
  if (view === 'party') return <PartyView members={partyMembers} onSelect={begin} />;
  if (!currentStep || !member) return <div className="px-6 py-10 text-center text-[#8a7a66]">RSVP questions will appear here soon.</div>;

  const last = step === wizardSteps.length - 1;
  const stepIncomplete = isFollowUpStep
    ? !isFollowUpComplete(currentFollowUp!, currentFollowUpValue)
    : !isComplete(currentQuestion!, currentValue);

  const next = () => {
    if (isFollowUpStep) {
      if (!isFollowUpComplete(currentFollowUp!, currentFollowUpValue)) { setError('Please answer this required question before continuing.'); return; }
    } else {
      if (!isComplete(currentQuestion!, currentValue)) { setError('Please answer this required question before continuing.'); return; }
    }
    setError('');
    last ? void submit() : setStep((value) => value + 1);
  };

  const heading = isFollowUpStep ? currentFollowUp!.label : currentQuestion!.label;
  const subQuestion = isFollowUpStep ? currentFollowUp!.sub_question : currentQuestion!.sub_question;
  const required = isFollowUpStep ? currentFollowUp!.required : currentQuestion!.required;

  return <div className="px-6 py-8"><div className="max-w-lg mx-auto"><ProgressBar step={step} total={wizardSteps.length} /><p className="text-xs text-[#a07c4a] text-center mb-2">RSVPing for: {member.name}</p><p className="text-xs text-[#a07c4a] text-center mb-4">Question {step + 1} of {wizardSteps.length}</p><h2 style={{ fontFamily: 'var(--heading-font)', fontSize: 'clamp(20px, 4vw, 24px)', lineHeight: 1.2, color: '#5a4430', textAlign: 'center', margin: '0 0 6px', ...typeStyle(typo.rsvpTitle) }}>{heading}</h2>{subQuestion && <p className="text-center italic text-sm sm:text-base mb-3 text-[#8a7a66]">{subQuestion}</p>}{isFollowUpStep ? <FollowUpInput sub={currentFollowUp!} typo={typo} value={currentFollowUpValue} onChange={(value) => setAnswer(currentStep.type === 'followup' ? currentStep.keyPath : '', value)} /> : <QuestionInput q={currentQuestion!} value={currentValue} onChange={(value) => setAnswer(currentQuestion!.id, value)} />}<p className="text-xs text-center mt-4 text-[#a07c4a]">{required ? 'Required' : 'Optional'}</p>{error && <p className="text-sm text-center mt-2 text-[#b03a3a]">{error}</p>}<div className="flex justify-between mt-6"><button onClick={() => step === 0 ? finish() : setStep((value) => value - 1)} className="btn-ghost flex items-center gap-1"><ChevronLeft size={16} /> Back</button><button onClick={next} disabled={submitting || stepIncomplete} className="btn-primary flex items-center gap-1 disabled:opacity-40">{submitting ? <Loader2 size={16} className="animate-spin" /> : last ? <><Check size={16} /> Submit</> : <>Next <ChevronRight size={16} /></>}</button></div></div></div>;
}

function PartyView({ members, onSelect }: { members: Guest[]; onSelect: (guest: Guest) => void }) { return <div className="px-6 py-12"><div className="max-w-md mx-auto"><div className="text-center mb-8"><p className="text-[10px] tracking-[0.3em] uppercase text-[#a07c4a]">{members.length > 1 ? 'RSVP' : 'RSVP'}</p><h2 className="text-4xl text-[#3a2e22]" style={{ fontFamily: 'var(--heading-font)' }}>{members.length > 1 ? 'RSVP for Your Party' : 'RSVP for Your Self'}</h2><p className="text-sm text-[#6b5d4f] mt-2">{members.length > 1 ? 'Choose one member at a time. You can RSVP for another member after saving.' : 'Choose your name to begin.'}</p></div><div className="space-y-2">{members.map((guest) => <div key={guest.id} className="flex items-center justify-between border p-3" style={{ borderColor: '#d6cdbf' }}><div><p className="font-medium text-[#3a2e22]">{guest.name}</p><p className="text-[10px] uppercase tracking-wider text-[#a07c4a]">{guest.rsvp_status === 'confirmed' ? 'Confirmed' : guest.rsvp_status === 'declined' ? 'Declined' : 'Pending'}</p></div><button onClick={() => onSelect(guest)} className="text-xs uppercase tracking-wider text-[#8a6d3b]">{guest.rsvp_status === 'pending' ? 'RSVP' : 'Edit'}</button></div>)}</div></div></div>; }
function DoneView({ hasParty, onAnother, embedded, settings }: { hasParty: boolean; onAnother: () => void; embedded?: boolean; settings: SiteSettings }) {
  const heroUrl = settings.rsvp_hero_image_url || null;
  const title = settings.rsvp_thank_you_title || 'Thank you';
  const message = settings.rsvp_thank_you_message || 'Your RSVP has been received.';
  const fontFamily = settings.rsvp_thank_you_font ? `var(--font-${settings.rsvp_thank_you_font.replace(/\s+/g, '-').toLowerCase()})` : 'var(--heading-font)';
  const fontSize = settings.rsvp_thank_you_font_size ?? 30;
  const textColor = settings.rsvp_thank_you_text_color || '#5a4430';
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto mb-4 overflow-hidden" style={{ maxWidth: 360 }}>
        {heroUrl ? (
          <img src={heroUrl} alt="" className="w-full h-48 object-cover rounded-lg" />
        ) : (
          <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center overflow-hidden" style={{ background: '#e8dfc8' }}>
            <SiteMonogram settings={settings} size={28} />
          </div>
        )}
      </div>
      <h2 style={{ fontFamily, fontSize, color: textColor, margin: 0 }}>{title}</h2>
      <p className="text-sm mt-2" style={{ color: textColor, fontFamily }}>{message}</p>
      {hasParty && <div className="mt-5"><button onClick={onAnother} className="btn-ghost">RSVP for Another Member</button><p className="text-xs mt-2 text-[#8a7a66]">RSVP your party or your Plus One</p></div>}
      {!embedded && <button onClick={() => { window.location.hash = '/'; }} className="btn-ghost block mx-auto mt-3">Back to Invitation</button>}
    </div>
  );
}
function ProgressBar({ step, total }: { step: number; total: number }) { return <div className="flex gap-1 mb-5">{Array.from({ length: total }).map((_, index) => <div key={index} className="h-1 flex-1 rounded" style={{ background: index <= step ? '#8a6d3b' : '#e6ddcd' }} />)}</div>; }
function QuestionInput({ q, value, onChange }: { q: RsvpQuestion; value: AnswerValue | undefined; onChange: (value: AnswerValue) => void }) { const textValue = typeof value === 'string' ? value : ''; if (q.question_type === 'terms') return <div className="space-y-3">{q.terms_body && <div className="border p-4 text-sm text-[#3a2e22] leading-relaxed prose-tc" style={{ borderColor: '#d6cdbf', background: '#faf8f3' }} dangerouslySetInnerHTML={{ __html: q.terms_body }} />}<label className="flex gap-3 border p-4 text-sm text-[#3a2e22]" style={{ borderColor: value === true ? '#5a7a4a' : '#d6cdbf' }}><input type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} className="mt-1 accent-[#8a6d3b]" />{q.accept_label || 'I accept the terms and conditions'}</label></div>; if (q.question_type === 'yes_no' || q.is_attendance) return <div className="flex flex-col gap-2"><AnswerButton active={value === 'yes'} label={q.yes_label || q.yes_text || 'Yes'} onClick={() => onChange('yes')} /><AnswerButton active={value === 'no'} label={q.no_label || q.no_text || 'No'} onClick={() => onChange('no')} /></div>; if (q.question_type === 'multiple_choice') return <div className="space-y-2">{(q.options || []).map((option) => <AnswerButton key={option} active={value === option} label={option} onClick={() => onChange(option)} />)}</div>; if (q.question_type === 'plus_one' || q.question_type === 'proxy') { const person = typeof value === 'object' ? value : { first_name: '', last_name: '' }; return <div><div className="flex gap-2 mb-3"><AnswerButton active={typeof value === 'object'} label={q.yes_label || 'Yes'} onClick={() => onChange(person)} /><AnswerButton active={value === 'no'} label={q.no_label || 'No'} onClick={() => onChange('no')} /></div>{typeof value === 'object' && <div className="grid grid-cols-2 gap-2"><input className="admin-input" placeholder={`${q.question_type === 'proxy' ? 'Proxy' : 'Plus one'} first name`} value={person.first_name} onChange={(event) => onChange({ ...person, first_name: event.target.value })} /><input className="admin-input" placeholder="Last name" value={person.last_name} onChange={(event) => onChange({ ...person, last_name: event.target.value })} /></div>}</div>; } if (q.question_type === 'message') return <textarea className="admin-input" rows={6} value={textValue} onChange={(event) => onChange(event.target.value)} placeholder="Write your message to the couple..." autoFocus />; if (q.input_type === 'textarea') return <textarea className="admin-input" rows={4} value={textValue} onChange={(event) => onChange(event.target.value)} />; return <input className="admin-input" type={q.input_type === 'number' ? 'number' : 'text'} value={textValue} onChange={(event) => onChange(event.target.value)} autoFocus />; }
function AnswerButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) { return <button onClick={onClick} className="w-full border px-4 py-3 text-sm transition" style={{ borderColor: active ? '#8a6d3b' : '#d6cdbf', background: active ? '#f0e8d8' : '#fff', color: '#3a2e22' }}>{label}</button>; }

function FollowUpInput({ sub, value, onChange }: { sub: ConditionalSubQuestion; typo: Record<string, TypeStyle>; value: AnswerValue | undefined; onChange: (value: AnswerValue) => void }) {
  const followUpQ: RsvpQuestion = {
    id: '', label: sub.label, field_key: sub.field_key, input_type: sub.input_type,
    options: sub.options, required: sub.required, display_order: 0,
    event_id: null, column_name: sub.column_name, yes_text: sub.yes_text,
    no_text: sub.no_text, is_attendance: false, guest_tags: sub.guest_tags,
    question_type: sub.question_type, sub_question: sub.sub_question || null,
    yes_label: sub.yes_label || null, no_label: sub.no_label || null,
    terms_body: sub.terms_body || null, accept_label: sub.accept_label || null,
    conditional_sub_questions: [], created_at: '',
  };

  return <QuestionInput q={followUpQ} value={value} onChange={onChange} />;
}
