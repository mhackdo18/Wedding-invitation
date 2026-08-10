import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Guest, WeddingEvent, RsvpQuestion, SiteSettings, TypeStyle } from '@/types';
import { typeStyle } from '@/lib/typography';
import { Check, ChevronRight, ChevronLeft, Loader2, PartyPopper } from 'lucide-react';

interface RsvpWizardProps {
  guests: Guest[];
  events: WeddingEvent[];
  questions: RsvpQuestion[];
  settings: SiteSettings;
  typo: Record<string, TypeStyle>;
  embedded?: boolean;
}

export default function RsvpWizard({ guests, events, questions, settings, typo, embedded }: RsvpWizardProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [proxyMode, setProxyMode] = useState<'self' | 'partner' | 'plusone'>('self');
  const [plusOneFirst, setPlusOneFirst] = useState('');
  const [plusOneLast, setPlusOneLast] = useState('');
  const [plusOneAnswers, setPlusOneAnswers] = useState<Record<string, { yes: boolean; name: string }>>({});
  const [termsAccepted, setTermsAccepted] = useState<Record<string, boolean>>({});

  const primaryGuest = guests[0];
  const visibleQuestions = questions.filter((q) => {
    if (!q.guest_tags || q.guest_tags.length === 0) return true;
    return q.guest_tags.some((tag) => (primaryGuest?.tags || []).includes(tag));
  });

  const setAnswer = (questionId: string, value: string, guestId?: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], [guestId || 'party']: value },
    }));
  };

  const getAnswer = (questionId: string, guestId?: string): string => {
    return answers[questionId]?.[guestId || 'party'] || '';
  };

  // Steps: 0=proxy, 1=party confirm, 2..N+1=questions, N+2=final details
  const totalSteps = visibleQuestions.length + 3;
  const next = () => { setError(''); setStep((s) => Math.min(s + 1, totalSteps - 1)); };
  const back = () => { setError(''); setStep((s) => Math.max(s - 1, 0)); };

  const submit = async () => {
    // Check terms
    for (const q of visibleQuestions) {
      if (q.question_type === 'terms' && q.required && !termsAccepted[q.id]) {
        setError('Please accept the terms and conditions to continue.');
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      for (const g of guests) {
        const attendance: Record<string, string> = {};
        let hasYes = false;
        let hasNo = false;

        // Process all questions for this guest
        for (const q of visibleQuestions) {
          const ans = getAnswer(q.id, g.id) || getAnswer(q.id);

          if (q.is_attendance && q.event_id && ans) {
            attendance[q.event_id] = ans;
            if (ans === 'yes') hasYes = true;
            if (ans === 'no') hasNo = true;
          }

          // Save to rsvp_answers table
          if (ans) {
            await supabase.from('rsvp_answers').upsert(
              { guest_id: g.id, question_id: q.id, answer: ans },
              { onConflict: 'guest_id,question_id' }
            );

            // Also save to guest_event_rsvps for attendance questions
            if (q.is_attendance && q.event_id) {
              await supabase.from('guest_event_rsvps').upsert(
                { guest_id: g.id, event_id: q.event_id, status: ans },
                { onConflict: 'guest_id,event_id' }
              );
            }
          }
        }

        // Determine overall status
        let overallStatus = 'pending';
        if (hasYes) overallStatus = 'confirmed';
        else if (hasNo && !hasYes) overallStatus = 'declined';

        // If no attendance questions exist but guest submitted, mark as confirmed
        const hasAttendanceQ = visibleQuestions.some((q) => q.is_attendance);
        if (!hasAttendanceQ) overallStatus = 'confirmed';

        // Get dietary / notes / plus-one from final step
        const dietary = getAnswer(`dietary_${g.id}`) || g.dietary || null;
        const plusOneName = getAnswer(`plus_one_${g.id}`) || g.plus_one_name || null;
        const notes = getAnswer(`notes_${g.id}`) || g.notes || null;

        // Update guest record
        const { error: updateErr } = await supabase.from('guests').update({
          rsvp_status: overallStatus,
          attendance,
          dietary,
          plus_one_name: plusOneName,
          notes,
          proxy_guest_name: proxyMode !== 'self' ? primaryGuest?.name : null,
        }).eq('id', g.id);

        if (updateErr) {
          throw new Error(`Could not save RSVP for ${g.name}. Please try again.`);
        }
      }

      // Auto-create plus-one guests and auto-party
      const plusOneNames: { name: string; forGuest: Guest }[] = [];

      if (proxyMode === 'plusone' && plusOneFirst.trim() && plusOneLast.trim()) {
        plusOneNames.push({ name: `${plusOneFirst.trim()} ${plusOneLast.trim()}`, forGuest: primaryGuest });
      }

      for (const g of guests) {
        const po = plusOneAnswers[g.id];
        if (po?.yes && po.name.trim()) {
          plusOneNames.push({ name: po.name.trim(), forGuest: g });
        }
      }

      for (const { name, forGuest } of plusOneNames) {
        let partyId = forGuest.party_id;

        // Auto-create party if guest has no party
        if (!partyId) {
          const partyName = `${forGuest.name}'s Party`;
          const token = partyName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).slice(2, 8);
          const { data: newParty } = await supabase.from('parties').insert({ name: partyName, guest_token: token }).select().single();
          if (newParty) {
            partyId = newParty.id;
            // Assign the original guest to this party as leader
            await supabase.from('guests').update({ party_id: partyId, is_party_leader: true }).eq('id', forGuest.id);
          }
        }

        // Insert the plus-one guest into the same party
        await supabase.from('guests').insert({
          name,
          party_size: 1,
          rsvp_status: 'confirmed',
          party_id: partyId,
          tags: ['plus-one'],
          plus_one_allowed: false,
          is_party_leader: false,
          proxy_guest_name: forGuest.name || null,
        });

        // Update original guest's plus_one_name
        await supabase.from('guests').update({ plus_one_name: name }).eq('id', forGuest.id);
      }

      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Done ----
  if (done) {
    return (
      <div className="px-6 py-10 text-center">
        <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3" style={{ background: '#e8dfc8' }}>
          <PartyPopper size={28} style={{ color: '#5a7a4a' }} />
        </div>
        <h2 style={{ fontFamily: 'var(--heading-font)', fontSize: 26, color: '#5a4430', margin: 0 }}>Thank you!</h2>
        <p style={{ fontSize: 15, color: '#6b5d4f', marginTop: 6 }}>
          Your RSVP has been received. We can&apos;t wait to celebrate with you.
        </p>
        {!embedded && (
          <button onClick={() => window.location.hash = '/'} className="mt-5 btn-ghost inline-flex items-center gap-1.5">
            <ChevronLeft size={14} /> Back to Invitation
          </button>
        )}
      </div>
    );
  }

  if (guests.length === 0) {
    return (
      <div className="px-6 py-10 text-center">
        <p style={{ fontSize: 15, color: '#8a7a66' }}>No guests found for this invitation.</p>
      </div>
    );
  }

  const isPerGuest = guests.length > 1;

  // ---- Step 0: Who are you RSVPing for ----
  if (step === 0) {
    return (
      <div className="px-6 py-8">
        <div className="text-center mb-5">
          <h2 style={{ ...typeStyle(typo.rsvpTitle), fontFamily: 'var(--heading-font)', fontSize: 28, color: '#5a4430', margin: 0 }}>RSVP</h2>
          {settings.rsvp_intro && <p style={{ fontSize: 14, color: '#8a7a66', marginTop: 6 }}>{settings.rsvp_intro}</p>}
        </div>
        <div className="max-w-sm mx-auto">
          <h3 style={{ fontFamily: 'var(--heading-font)', fontSize: 20, color: '#5a4430', textAlign: 'center', margin: '0 0 16px' }}>
            Who are you RSVPing for?
          </h3>
          <div className="space-y-2">
            <ProxyOption label="Myself" desc="I'm responding for myself" selected={proxyMode === 'self'} onClick={() => setProxyMode('self')} />
            {guests.length > 1 && <ProxyOption label="My partner / family" desc={`RSVP for ${guests.length} party members`} selected={proxyMode === 'partner'} onClick={() => setProxyMode('partner')} />}
            {primaryGuest?.plus_one_allowed && !primaryGuest?.plus_one_name && <ProxyOption label="Myself and My Plus One" desc="I'd like to bring a guest" selected={proxyMode === 'plusone'} onClick={() => setProxyMode('plusone')} />}
          </div>
          {proxyMode === 'plusone' && (
            <div className="mt-4 rounded-lg border p-3 space-y-2" style={{ borderColor: '#d6cdbf', background: '#fff' }}>
              <p className="text-xs font-semibold text-[#5a4430]">Plus-One Details</p>
              <div className="grid grid-cols-2 gap-2">
                <input className="admin-input text-sm" placeholder="First name" value={plusOneFirst} onChange={(e) => setPlusOneFirst(e.target.value)} />
                <input className="admin-input text-sm" placeholder="Last name" value={plusOneLast} onChange={(e) => setPlusOneLast(e.target.value)} />
              </div>
            </div>
          )}
          <div className="text-center mt-5">
            <button onClick={next} className="btn-primary inline-flex items-center gap-1.5">
              Continue <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Step 1: Party confirm ----
  if (step === 1) {
    return (
      <div className="px-6 py-8">
        <div className="text-center mb-5">
          <h2 style={{ ...typeStyle(typo.rsvpTitle), fontFamily: 'var(--heading-font)', fontSize: 28, color: '#5a4430', margin: 0 }}>RSVP</h2>
        </div>
        <div className="max-w-sm mx-auto space-y-2">
          {guests.map((g) => (
            <div key={g.id} className="rounded-lg border p-3 flex items-center gap-2" style={{ borderColor: '#d6cdbf', background: '#fff' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#f0e8d8' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#5a4430' }}>{g.name.charAt(0)}</span>
              </div>
              <span style={{ fontSize: 14, color: '#3a2e22', fontWeight: 500 }}>{g.name}</span>
              {g.plus_one_allowed && <span className="text-xs text-[#a07c4a]">+1 allowed</span>}
            </div>
          ))}
        </div>
        <div className="text-center mt-5">
          <button onClick={next} className="btn-primary inline-flex items-center gap-1.5">
            Begin RSVP <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ---- Steps 2..N+1: Questions ----
  const questionIndex = step - 2;
  if (questionIndex >= 0 && questionIndex < visibleQuestions.length) {
    const q = visibleQuestions[questionIndex];

    return (
      <div className="px-6 py-8">
        <div className="max-w-sm mx-auto">
          <ProgressBar step={step} total={totalSteps} />
          <p className="text-xs text-[#a07c4a] mb-1 text-center">Step {questionIndex + 1} of {visibleQuestions.length}</p>

          <h3 style={{ fontFamily: 'var(--heading-font)', fontSize: 22, color: '#5a4430', textAlign: 'center', margin: '0 0 6px' }}>
            {q.label}
          </h3>
          {q.sub_question && (
            <p className="text-center text-xs mb-4" style={{ color: '#8a7a66' }}>{q.sub_question}</p>
          )}

          <div className="mt-5">
            {q.is_attendance ? (
              <AttendanceQuestion q={q} guests={guests} isPerGuest={isPerGuest} getAnswer={getAnswer} setAnswer={setAnswer} onAutoNext={!isPerGuest ? next : undefined} />
            ) : q.question_type === 'plus_one' ? (
              <PlusOneQuestion q={q} guests={guests} isPerGuest={isPerGuest} getAnswer={getAnswer} setAnswer={setAnswer} plusOneAnswers={plusOneAnswers} setPlusOneAnswers={setPlusOneAnswers} />
            ) : q.question_type === 'yes_no' || q.question_type === 'proxy' ? (
              <YesNoQuestion q={q} guests={guests} isPerGuest={isPerGuest} getAnswer={getAnswer} setAnswer={setAnswer} />
            ) : q.question_type === 'terms' ? (
              <TermsQuestion q={q} accepted={!!termsAccepted[q.id]} onAccept={(v) => setTermsAccepted((prev) => ({ ...prev, [q.id]: v }))} />
            ) : q.question_type === 'dietary' ? (
              <GenericQuestion q={q} guests={guests} isPerGuest={isPerGuest} getAnswer={getAnswer} setAnswer={setAnswer} inputType="text" placeholder="e.g. Vegetarian, no nuts..." />
            ) : q.question_type === 'multiple_choice' ? (
              <MultipleChoiceQuestion q={q} guests={guests} isPerGuest={isPerGuest} getAnswer={getAnswer} setAnswer={setAnswer} />
            ) : (
              <GenericQuestion q={q} guests={guests} isPerGuest={isPerGuest} getAnswer={getAnswer} setAnswer={setAnswer} inputType={q.input_type || 'text'} />
            )}
          </div>

          {error && <p className="text-sm text-center mt-3" style={{ color: '#b03a3a' }}>{error}</p>}
          <div className="flex justify-between mt-6">
            <button onClick={back} className="btn-ghost flex items-center gap-1"><ChevronLeft size={16} /> Back</button>
            <button onClick={next} className="btn-primary flex items-center gap-1">Next <ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Final step: dietary + notes + submit ----
  return (
    <div className="px-6 py-8">
      <div className="max-w-sm mx-auto">
        <ProgressBar step={step} total={totalSteps} />
        <p className="text-xs text-[#a07c4a] mb-1 text-center">Final Step</p>
        <h3 style={{ fontFamily: 'var(--heading-font)', fontSize: 22, color: '#5a4430', textAlign: 'center', margin: '0 0 20px' }}>
          Anything else we should know?
        </h3>

        <div className="space-y-4">
          {guests.map((g) => (
            <div key={g.id} className="rounded-lg border p-3" style={{ borderColor: '#d6cdbf', background: '#fff' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#5a4430', marginBottom: 8 }}>{g.name}</p>
              {g.plus_one_allowed && (
                <div className="mb-2">
                  <label className="admin-label">Plus-one name</label>
                  <input className="admin-input" placeholder="Guest name" value={getAnswer(`plus_one_${g.id}`)} onChange={(e) => setAnswer(`plus_one_${g.id}`, e.target.value)} />
                </div>
              )}
              <div className="mb-2">
                <label className="admin-label">Dietary restrictions</label>
                <input className="admin-input" placeholder="Allergies, preferences..." value={getAnswer(`dietary_${g.id}`)} onChange={(e) => setAnswer(`dietary_${g.id}`, e.target.value)} />
              </div>
              <div>
                <label className="admin-label">Notes</label>
                <input className="admin-input" placeholder="Anything else..." value={getAnswer(`notes_${g.id}`)} onChange={(e) => setAnswer(`notes_${g.id}`, e.target.value)} />
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-center mt-3" style={{ color: '#b03a3a' }}>{error}</p>}
        <div className="flex justify-between mt-6">
          <button onClick={back} className="btn-ghost flex items-center gap-1"><ChevronLeft size={16} /> Back</button>
          <button onClick={submit} disabled={submitting} className="btn-primary flex items-center gap-1.5">
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Check size={16} /> Submit RSVP</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Sub-components ----

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1 mb-5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex-1 h-1 rounded-full" style={{ background: i < step ? '#8a6d3b' : i === step ? '#c9b896' : '#e6ddcd' }} />
      ))}
    </div>
  );
}

function AttendanceQuestion({ q, guests, isPerGuest, getAnswer, setAnswer, onAutoNext }: {
  q: RsvpQuestion; guests: Guest[]; isPerGuest: boolean;
  getAnswer: (qid: string, gid?: string) => string;
  setAnswer: (qid: string, val: string, gid?: string) => void;
  onAutoNext?: () => void;
}) {
  if (isPerGuest) {
    return (
      <div className="space-y-3">
        {guests.map((g) => (
          <div key={g.id} className="rounded-lg border p-3" style={{ borderColor: '#d6cdbf', background: '#fff' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#5a4430', marginBottom: 8 }}>{g.name}</p>
            <YesNoButtons
              yes={q.yes_text || 'Joyfully Accepts'}
              no={q.no_text || 'Regretfully Declines'}
              value={getAnswer(q.id, g.id)}
              onChange={(v) => setAnswer(q.id, v, g.id)}
            />
          </div>
        ))}
      </div>
    );
  }
  return (
    <YesNoButtons
      yes={q.yes_text || 'Joyfully Accepts'}
      no={q.no_text || 'Regretfully Declines'}
      value={getAnswer(q.id)}
      onChange={(v) => { setAnswer(q.id, v); if (onAutoNext) setTimeout(onAutoNext, 200); }}
    />
  );
}

function YesNoQuestion({ q, guests, isPerGuest, getAnswer, setAnswer }: {
  q: RsvpQuestion; guests: Guest[]; isPerGuest: boolean;
  getAnswer: (qid: string, gid?: string) => string;
  setAnswer: (qid: string, val: string, gid?: string) => void;
}) {
  if (isPerGuest) {
    return (
      <div className="space-y-3">
        {guests.map((g) => (
          <div key={g.id} className="rounded-lg border p-3" style={{ borderColor: '#d6cdbf', background: '#fff' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#5a4430', marginBottom: 8 }}>{g.name}</p>
            <YesNoButtons
              yes={q.yes_label || q.yes_text || 'Yes'}
              no={q.no_label || q.no_text || 'No'}
              value={getAnswer(q.id, g.id)}
              onChange={(v) => setAnswer(q.id, v, g.id)}
            />
          </div>
        ))}
      </div>
    );
  }
  return (
    <YesNoButtons
      yes={q.yes_label || q.yes_text || 'Yes'}
      no={q.no_label || q.no_text || 'No'}
      value={getAnswer(q.id)}
      onChange={(v) => setAnswer(q.id, v)}
    />
  );
}

function PlusOneQuestion({ q, guests, isPerGuest, getAnswer, setAnswer, plusOneAnswers, setPlusOneAnswers }: {
  q: RsvpQuestion; guests: Guest[]; isPerGuest: boolean;
  getAnswer: (qid: string, gid?: string) => string;
  setAnswer: (qid: string, val: string, gid?: string) => void;
  plusOneAnswers: Record<string, { yes: boolean; name: string }>;
  setPlusOneAnswers: React.Dispatch<React.SetStateAction<Record<string, { yes: boolean; name: string }>>>;
}) {
  const renderRow = (key: string, guest?: Guest) => {
    const val = getAnswer(q.id, guest?.id);
    const po = plusOneAnswers[key] || { yes: false, name: '' };
    return (
      <div key={key} className="rounded-lg border p-3" style={{ borderColor: '#d6cdbf', background: '#fff' }}>
        {guest && <p style={{ fontSize: 14, fontWeight: 600, color: '#5a4430', marginBottom: 8 }}>{guest.name}</p>}
        <YesNoButtons
          yes={q.yes_label || q.yes_text || "Yes, I'll bring a plus one"}
          no={q.no_label || q.no_text || 'No plus one'}
          value={val}
          onChange={(v) => {
            setAnswer(q.id, v, guest?.id);
            setPlusOneAnswers((prev) => ({ ...prev, [key]: { yes: v === 'yes', name: v === 'yes' ? (prev[key]?.name || '') : '' } }));
          }}
        />
        {val === 'yes' && (
          <div className="mt-3">
            <label className="admin-label">Plus one name</label>
            <input className="w-full rounded-lg border px-3 py-2 text-sm bg-white/70" style={{ borderColor: '#d6cdbf' }}
              placeholder="Enter their full name" value={po.name}
              onChange={(e) => setPlusOneAnswers((prev) => ({ ...prev, [key]: { yes: true, name: e.target.value } }))} />
          </div>
        )}
      </div>
    );
  };

  if (isPerGuest) {
    return <div className="space-y-3">{guests.map((g) => renderRow(g.id, g))}</div>;
  }
  return renderRow('party');
}

function MultipleChoiceQuestion({ q, guests, isPerGuest, getAnswer, setAnswer }: {
  q: RsvpQuestion; guests: Guest[]; isPerGuest: boolean;
  getAnswer: (qid: string, gid?: string) => string;
  setAnswer: (qid: string, val: string, gid?: string) => void;
}) {
  const renderOptions = (guestId?: string) => (
    <div className="flex flex-wrap gap-2">
      {(q.options || []).map((opt) => {
        const val = getAnswer(q.id, guestId);
        return (
          <button key={opt} onClick={() => setAnswer(q.id, opt, guestId)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition"
            style={{ background: val === opt ? '#8a6d3b' : 'transparent', color: val === opt ? '#fff' : '#6b5d4f', border: `1px solid ${val === opt ? 'transparent' : '#d6cdbf'}` }}>
            {opt}
          </button>
        );
      })}
    </div>
  );

  if (isPerGuest) {
    return (
      <div className="space-y-3">
        {guests.map((g) => (
          <div key={g.id} className="rounded-lg border p-3" style={{ borderColor: '#d6cdbf', background: '#fff' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#5a4430', marginBottom: 8 }}>{g.name}</p>
            {renderOptions(g.id)}
          </div>
        ))}
      </div>
    );
  }
  return renderOptions();
}

function GenericQuestion({ q, guests, isPerGuest, getAnswer, setAnswer, inputType, placeholder }: {
  q: RsvpQuestion; guests: Guest[]; isPerGuest: boolean;
  getAnswer: (qid: string, gid?: string) => string;
  setAnswer: (qid: string, val: string, gid?: string) => void;
  inputType?: string; placeholder?: string;
}) {
  const cls = 'w-full rounded-lg border px-3 py-2 text-sm bg-white/70';
  const border = { borderColor: '#d6cdbf' };

  const renderInput = (guestId?: string) => {
    const val = getAnswer(q.id, guestId);
    if (inputType === 'number') return <input type="number" min={1} className={cls} style={border} value={val} onChange={(e) => setAnswer(q.id, e.target.value, guestId)} placeholder={placeholder} />;
    if (inputType === 'textarea') return <textarea className={cls} style={border} rows={3} value={val} onChange={(e) => setAnswer(q.id, e.target.value, guestId)} placeholder={placeholder} />;
    return <input className={cls} style={border} value={val} onChange={(e) => setAnswer(q.id, e.target.value, guestId)} placeholder={placeholder} />;
  };

  if (isPerGuest) {
    return (
      <div className="space-y-3">
        {guests.map((g) => (
          <div key={g.id} className="rounded-lg border p-3" style={{ borderColor: '#d6cdbf', background: '#fff' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#5a4430', marginBottom: 8 }}>{g.name}</p>
            {renderInput(g.id)}
          </div>
        ))}
      </div>
    );
  }
  return renderInput();
}

function TermsQuestion({ q, accepted, onAccept }: { q: RsvpQuestion; accepted: boolean; onAccept: (v: boolean) => void }) {
  return (
    <div className="space-y-3">
      {q.terms_body && (
        <div className="rounded-lg border p-4 max-h-48 overflow-y-auto text-xs leading-relaxed" style={{ borderColor: '#d6cdbf', background: '#faf6ee', color: '#6b5d4f', whiteSpace: 'pre-wrap' }}>
          {q.terms_body}
        </div>
      )}
      <label className="flex items-start gap-3 cursor-pointer rounded-lg border p-3 transition" style={{ borderColor: accepted ? '#5a7a4a' : '#d6cdbf', background: accepted ? 'rgba(90,122,74,0.04)' : '#fff' }}>
        <input type="checkbox" checked={accepted} onChange={(e) => onAccept(e.target.checked)} className="accent-[#8a6d3b] mt-0.5 w-4 h-4" />
        <span className="text-sm" style={{ color: '#3a2e22' }}>{q.accept_label || 'I accept the terms and conditions'}</span>
      </label>
    </div>
  );
}

function YesNoButtons({ yes, no, value, onChange }: {
  yes: string; no: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <button onClick={() => onChange('yes')} className="w-full py-2 rounded-lg text-sm font-semibold transition"
        style={{ background: value === 'yes' ? '#5a7a4a' : '#f0e8d8', color: value === 'yes' ? '#fff' : '#5a4430', border: `2px solid ${value === 'yes' ? '#5a7a4a' : '#d6cdbf'}` }}>
        {yes}
      </button>
      <button onClick={() => onChange('no')} className="w-full py-2 rounded-lg text-sm font-semibold transition"
        style={{ background: value === 'no' ? '#b03a3a' : '#f0e8d8', color: value === 'no' ? '#fff' : '#5a4430', border: `2px solid ${value === 'no' ? '#b03a3a' : '#d6cdbf'}` }}>
        {no}
      </button>
    </div>
  );
}

function ProxyOption({ label, desc, selected, onClick }: { label: string; desc: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left rounded-lg border p-3 transition"
      style={{ borderColor: selected ? '#8a6d3b' : '#d6cdbf', background: selected ? 'rgba(138,109,59,0.06)' : '#fff' }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: selected ? '#8a6d3b' : '#5a4430' }}>{label}</span>
      <span style={{ fontSize: 12, color: '#8a7a66', display: 'block', marginTop: 2 }}>{desc}</span>
    </button>
  );
}
