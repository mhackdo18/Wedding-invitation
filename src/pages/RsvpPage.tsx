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
  const [searchName, setSearchName] = useState('');
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
    if (!searchName.trim()) return;
    setSearched(true);
    const { data } = await supabase.from('guests').select('*').ilike('name', `%${searchName.trim()}%`).order('name');
    setFoundGuests(data as Guest[] || []);
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
        </div>

        <div className="px-6 pb-8">
          <p className="text-center text-sm mb-4" style={{ color: '#5a4430' }}>Find your name to begin:</p>
          <div className="relative max-w-sm mx-auto">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a07c4a]" />
            <input
              className="w-full rounded-full border pl-10 pr-4 py-3 text-sm bg-white/80 outline-none focus:border-[#b59a6b]"
              style={{ borderColor: '#d6cdbf' }}
              placeholder="Enter your name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchGuest()}
            />
          </div>

          {searched && (
            <div className="max-w-sm mx-auto mt-4 space-y-2">
              {foundGuests.length === 0 ? (
                <p className="text-center text-sm text-[#8a7a66]">
                  No match found. Try searching with just your first or last name, or check with the couple.
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
