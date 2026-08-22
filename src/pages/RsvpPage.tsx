import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSiteSettings, applySettingsVars } from '@/lib/useSiteSettings';
import { navigate } from '@/lib/router';
import { typeStyle } from '@/lib/typography';
import type { WeddingEvent, RsvpQuestion, SiteSettings, TypeStyle, Guest } from '@/types';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import RsvpWizard from '@/components/public/RsvpWizard';

export default function RsvpPage() {
  const { settings, loading } = useSiteSettings();
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [questions, setQuestions] = useState<RsvpQuestion[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [foundGuests, setFoundGuests] = useState<Guest[]>([]);
  const [searched, setSearched] = useState(false);
  const [selectedGuests, setSelectedGuests] = useState<Guest[] | null>(null);

  useEffect(() => { applySettingsVars(settings); }, [settings]);

  useEffect(() => {
    (async () => {
      const { data: ev } = await supabase.from('events').select('*, venue:venues(*)').order('display_order');
      const main = (ev as unknown as WeddingEvent[] || []).filter((e) => !e.parent_id);
      setEvents(main);
      const { data: q } = await supabase.from('rsvp_questions').select('*').order('display_order');
      setQuestions(q as RsvpQuestion[] || []);
    })();
  }, []);

  const searchGuest = async () => {
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first && !last) return;
    setSearched(true);

    // Build exact full-name match (case-insensitive)
    const fullName = `${first} ${last}`.trim();
    let data: Guest[] | null = null;

    if (first && last) {
      // Exact match on "First Last"
      const res = await supabase.from('guests').select('*').ilike('name', fullName).order('name');
      data = res.data as Guest[] || [];
    } else if (first) {
      // Only first name given — exact match on first name
      // Match names where the first word equals the search term
      const res = await supabase.from('guests').select('*').ilike('name', `${first} %`).order('name');
      data = res.data as Guest[] || [];
      // Also try exact match (single-name guests)
      const exact = await supabase.from('guests').select('*').ilike('name', first).order('name');
      if (exact.data) data = [...(data || []), ...(exact.data as Guest[])];
    } else {
      // Only last name — match names ending with last name
      const res = await supabase.from('guests').select('*').ilike('name', `% ${last}`).order('name');
      data = res.data as Guest[] || [];
    }

    setFoundGuests(data || []);
  };

  const selectGuest = async (g: Guest) => {
    let partyGuests: Guest[] = [g];
    if (g.party_id) {
      const { data: members } = await supabase.from('guests').select('*').eq('party_id', g.party_id).order('name');
      if (members && members.length > 0) partyGuests = members as Guest[];
    }
    setSelectedGuests(partyGuests);
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-color)' }}>
        <Loader2 className="animate-spin" style={{ color: '#8a6d3b' }} />
      </div>
    );
  }

  const typo = settings.typography || {};
  const rsvpDeadlinePassed = settings.rsvp_deadline
    ? new Date(settings.rsvp_deadline).getTime() < Date.now()
    : false;
  const rsvpDeadlineStr = settings.rsvp_deadline
    ? new Date(settings.rsvp_deadline).toLocaleDateString([], { dateStyle: 'long' })
    : '';

  // If RSVP deadline has passed, show closed message
  if (rsvpDeadlinePassed) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-color)' }}>
        <div className="mx-auto embossed-card scroll-edge fade-up" style={{ maxWidth: 'var(--page-width)', fontFamily: 'var(--body-font)' }}>
          <div className="px-6 pt-8 pb-4 text-center">
            <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-xs mb-4" style={{ color: '#8a7a66' }}>
              <ArrowLeft size={12} /> Back
            </button>
            <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 32, color: '#5a4430', margin: 0, ...typeStyle(typo.rsvpTitle) }}>
              RSVP
            </h1>
          </div>
          <div className="px-6 pb-10 text-center">
            <p className="text-base sm:text-lg font-semibold mb-2" style={{ color: '#8a6d3b' }}>
              RSVP has closed
            </p>
            <p className="text-sm" style={{ color: '#8a7a66' }}>
              The RSVP deadline of {rsvpDeadlineStr} has passed. If you need to update your response, please contact the couple directly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If a guest is selected, show the wizard
  if (selectedGuests) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-color)' }}>
        <div className="mx-auto embossed-card scroll-edge fade-up" style={{ maxWidth: 'var(--page-width)', fontFamily: 'var(--body-font)' }}>
          <div className="px-6 pt-6">
            <button onClick={() => setSelectedGuests(null)} className="inline-flex items-center gap-1.5 text-xs" style={{ color: '#8a7a66' }}>
              <ArrowLeft size={12} /> Back to search
            </button>
          </div>
          {rsvpDeadlineStr && (
            <div className="text-center pt-4">
              <p className="text-base sm:text-lg font-semibold" style={{ color: '#8a6d3b' }}>
                RSVP DEADLINE
              </p>
              <p className="text-base sm:text-lg font-semibold" style={{ color: '#8a6d3b' }}>
                {rsvpDeadlineStr}
              </p>
            </div>
          )}
          <RsvpWizard
            guests={selectedGuests}
            events={events}
            questions={questions}
            settings={settings}
            typo={typo}
          />
          <div className="h-8" />
        </div>
      </div>
    );
  }

  // Guest search step
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-color)' }}>
      <div className="mx-auto embossed-card scroll-edge fade-up" style={{ maxWidth: 'var(--page-width)', fontFamily: 'var(--body-font)' }}>
        <div className="px-6 pt-8 pb-4 text-center">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-xs mb-4" style={{ color: '#8a7a66' }}>
            <ArrowLeft size={12} /> Back
          </button>
          <h1 style={{ ...typeStyle(typo.rsvpTitle), fontFamily: 'var(--heading-font)', fontSize: 32, color: '#5a4430', margin: 0 }}>
            RSVP
          </h1>
          <p style={{ fontSize: 14, color: '#8a7a66', marginTop: 6 }}>{settings.rsvp_intro}</p>
          {rsvpDeadlineStr && (
            <div className="mt-3">
              <p className="text-base sm:text-lg font-semibold" style={{ color: '#8a6d3b' }}>
                RSVP DEADLINE
              </p>
              <p className="text-base sm:text-lg font-semibold" style={{ color: '#8a6d3b' }}>
                {rsvpDeadlineStr}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 pb-8">
          <p className="text-center text-sm mb-4" style={{ color: '#5a4430' }}>Find your name to begin:</p>
          <div className="max-w-sm mx-auto">
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <input
                  className="w-full rounded-full border pl-4 pr-4 py-3 text-sm bg-white/80 outline-none focus:border-[#b59a6b]"
                  style={{ borderColor: '#d6cdbf' }}
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchGuest()}
                />
              </div>
              <div className="relative">
                <input
                  className="w-full rounded-full border pl-4 pr-4 py-3 text-sm bg-white/80 outline-none focus:border-[#b59a6b]"
                  style={{ borderColor: '#d6cdbf' }}
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchGuest()}
                />
              </div>
            </div>
            <div className="text-center mt-3">
              <button onClick={searchGuest} className="btn-primary inline-flex items-center gap-1.5">
                <Search size={16} /> Search
              </button>
            </div>
          </div>

          {searched && (
            <div className="max-w-sm mx-auto mt-4 space-y-2">
              {foundGuests.length === 0 ? (
                <p className="text-center text-sm text-[#8a7a66]">
                  No match found. Please make sure your first and last name match exactly as on your invitation, or check with the couple.
                </p>
              ) : (
                foundGuests.map((g) => (
                  <button key={g.id} onClick={() => selectGuest(g)}
                    className="w-full text-left rounded-lg border p-3 transition hover:border-[#8a6d3b]"
                    style={{ borderColor: '#d6cdbf', background: '#fff' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#5a4430' }}>{g.name}</span>
                    {g.party_id && <span className="text-xs text-[#a07c4a] block">RSVP for your full party</span>}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
