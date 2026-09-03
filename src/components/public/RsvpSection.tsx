import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { WeddingEvent, RsvpQuestion, SiteSettings, TypeStyle, Guest } from '@/types';
import { typeStyle } from '@/lib/typography';
import { Check, Loader2, Clock } from 'lucide-react';
import { isRsvpClosed } from '@/lib/timezone';

export default function RsvpSection({
  events, questions, settings, typo,
}: {
  events: WeddingEvent[];
  questions: RsvpQuestion[];
  settings: SiteSettings;
  typo: Record<string, TypeStyle>;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [eventStatus, setEventStatus] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const rsvpClosed = isRsvpClosed(settings.rsvp_deadline, settings.timezone);
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    if (!form.name || !form.name.trim()) { setError('Please enter your name.'); return; }
    const required = questions.filter((q) => q.required);
    for (const q of required) {
      if (!form[q.field_key] || !String(form[q.field_key]).trim()) {
        setError(`Please answer: ${q.label}`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const partySize = parseInt(form.party_size || '1', 10) || 1;
      const attendingAny = Object.values(eventStatus).some((s) => s === 'yes');

      const guestData: Partial<Guest> = {
        name: form.name.trim(),
        email: form.email || null,
        phone: form.phone || null,
        party_size: partySize,
        rsvp_status: attendingAny ? 'confirmed' : 'declined',
        attendance: eventStatus,
        dietary: form.dietary || null,
        plus_one_name: form.plus_one_name || null,
        song_requests: form.song_requests || null,
        notes: form.notes || null,
      };

      const { data: g, error: ge } = await supabase.from('guests').insert(guestData).select().single();
      if (ge) throw ge;

      for (const ev of events) {
        const st = eventStatus[ev.id];
        if (st) {
          await supabase.from('guest_event_rsvps').upsert({
            guest_id: g.id, event_id: ev.id, status: st,
          }, { onConflict: 'guest_id,event_id' });
        }
      }

      for (const q of questions) {
        const ans = form[q.field_key];
        if (ans && String(ans).trim()) {
          await supabase.from('rsvp_answers').upsert({
            guest_id: g.id, question_id: q.id, answer: String(ans),
          }, { onConflict: 'guest_id,question_id' });
        }
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (rsvpClosed) {
    return (
      <section className="px-6 py-10 text-center" style={{ borderTop: '1px solid rgba(120,90,60,0.15)' }}>
        <Clock size={36} className="mx-auto mb-3" style={{ color: '#b03a3a' }} />
        <h2 style={{ fontFamily: 'var(--heading-font)', fontSize: 26, color: '#5a4430', margin: 0 }}>
          RSVP Has Closed
        </h2>
        <p style={{ fontSize: 14, color: '#8a7a66', marginTop: 8 }}>
          The RSVP deadline has passed. If you need to update your response, please contact the couple directly.
        </p>
      </section>
    );
  }

  if (done) {
    return (
      <section className="px-6 py-10 text-center" style={{ borderTop: '1px solid rgba(120,90,60,0.15)' }}>
        <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3" style={{ background: '#e8dfc8' }}>
          <Check size={28} style={{ color: '#5a7a4a' }} />
        </div>
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="h-px w-8" style={{ background: typo.rsvpTitle?.color || '#c9b896' }} />
          <h2 style={{ fontFamily: 'var(--heading-font)', fontSize: 26, color: '#5a4430', margin: 0, ...typeStyle(typo.rsvpTitle) }}>Thank you!</h2>
          <span className="h-px w-8" style={{ background: typo.rsvpTitle?.color || '#c9b896' }} />
        </div>
        <p style={{ fontSize: 15, color: '#6b5d4f', marginTop: 6 }}>
          {settings.rsvp_thank_you_message || 'Your response has been received. We can\u2019t wait to celebrate with you.'}
        </p>
      </section>
    );
  }

  return (
    <section className="px-6 py-8" id="rsvp" style={{ borderTop: '1px solid rgba(120,90,60,0.15)' }}>
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="h-px w-8" style={{ background: typo.rsvpTitle?.color || '#c9b896' }} />
          <h2 style={{ fontFamily: 'var(--heading-font)', fontSize: 26, color: '#5a4430', margin: 0, ...typeStyle(typo.rsvpTitle) }}>
            RSVP
          </h2>
          <span className="h-px w-8" style={{ background: typo.rsvpTitle?.color || '#c9b896' }} />
        </div>
        <p style={{ fontSize: 13, color: '#8a7a66', marginTop: 4 }}>
          {settings.rsvp_intro}
        </p>

      </div>

      <div className="space-y-3">
        <Field label="Full Name *">
          <input className="w-full rounded-lg border px-3 py-2 text-sm bg-white/70" style={{ borderColor: '#d6cdbf' }} value={form.name || ''} onChange={(e) => update('name', e.target.value)} placeholder="Your name" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email">
            <input className="w-full rounded-lg border px-3 py-2 text-sm bg-white/70" style={{ borderColor: '#d6cdbf' }} value={form.email || ''} onChange={(e) => update('email', e.target.value)} placeholder="you@email.com" />
          </Field>
          <Field label="Phone">
            <input className="w-full rounded-lg border px-3 py-2 text-sm bg-white/70" style={{ borderColor: '#d6cdbf' }} value={form.phone || ''} onChange={(e) => update('phone', e.target.value)} placeholder="Phone" />
          </Field>
        </div>

        {events.length > 0 && (
          <Field label="Which events will you attend?">
            <div className="space-y-2">
              {events.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: '#d6cdbf', background: '#fff' }}>
                  <span style={{ fontSize: 14, color: '#5a4430' }}>{ev.title}</span>
                  <div className="flex gap-1.5">
                    {['yes', 'no'].map((st) => (
                      <button key={st} onClick={() => setEventStatus((s) => ({ ...s, [ev.id]: st }))}
                        className="px-3 py-1 rounded-full text-xs font-semibold transition"
                        style={{
                          background: eventStatus[ev.id] === st ? (st === 'yes' ? '#5a7a4a' : '#b03a3a') : 'transparent',
                          color: eventStatus[ev.id] === st ? '#fff' : '#8a7a66',
                          border: `1px solid ${eventStatus[ev.id] === st ? 'transparent' : '#d6cdbf'}`,
                        }}>
                        {st === 'yes' ? 'Attending' : 'Not'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Field>
        )}

        {questions.map((q) => (
          <Field key={q.id} label={q.label + (q.required ? ' *' : '')}>
            <QuestionInput q={q} value={form[q.field_key] || ''} onChange={(v) => update(q.field_key, v)} />
          </Field>
        ))}

        {error && <p className="text-sm" style={{ color: '#b03a3a' }}>{error}</p>}

        <button onClick={submit} disabled={submitting}
          className="w-full py-3 rounded-lg font-semibold text-white transition flex items-center justify-center gap-2"
          style={{ background: '#8a6d3b' }}>
          {submitting ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : 'Send RSVP'}
        </button>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: '#6b5d4f', letterSpacing: '0.02em' }}>{label}</label>
      {children}
    </div>
  );
}

function QuestionInput({ q, value, onChange }: { q: RsvpQuestion; value: string; onChange: (v: string) => void }) {
  const inputCls = 'w-full rounded-lg border px-3 py-2 text-sm bg-white/70';
  const borderStyle = { borderColor: '#d6cdbf' };

  if (q.input_type === 'radio' || q.input_type === 'select') {
    return (
      <div className="flex flex-wrap gap-2">
        {q.options.map((opt) => (
          <button key={opt} onClick={() => onChange(opt)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition"
            style={{
              background: value === opt ? '#8a6d3b' : 'transparent',
              color: value === opt ? '#fff' : '#6b5d4f',
              border: `1px solid ${value === opt ? 'transparent' : '#d6cdbf'}`,
            }}>
            {opt}
          </button>
        ))}
      </div>
    );
  }
  if (q.input_type === 'number') {
    return <input type="number" min={1} className={inputCls} style={borderStyle} value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  if (q.input_type === 'textarea') {
    return <textarea className={inputCls} style={borderStyle} rows={3} value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  return <input className={inputCls} style={borderStyle} value={value} onChange={(e) => onChange(e.target.value)} />;
}
