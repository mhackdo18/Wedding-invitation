import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Guest, SeatingTable, SeatAssignment } from '@/types';
import { Search, Armchair, MapPin, X } from 'lucide-react';
import HeroImage from '@/components/public/HeroImage';
import { Reveal } from '@/components/public/Reveal';

export default function FindYourTable({ heroImageUrl, animEnabled }: { heroImageUrl?: string; animEnabled?: boolean }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ guest: Guest; table: SeatingTable | null; seat: number | null }>>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Guest[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIdx, setSuggestionIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = async (text: string) => {
    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const { data } = await supabase
      .from('guests')
      .select('*')
      .ilike('name', `%${text.trim()}%`)
      .eq('rsvp_status', 'confirmed')
      .order('name')
      .limit(8);
    setSuggestions((data as Guest[]) || []);
  };

  const onQueryChange = (text: string) => {
    setQuery(text);
    setSearched(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 200);
  };

  const runSearch = async (name?: string) => {
    const searchText = (name ?? query).trim();
    if (!searchText) return;
    setShowSuggestions(false);
    setQuery(searchText);
    setLoading(true);
    setSearched(true);

    const { data: guests } = await supabase
      .from('guests')
      .select('*')
      .ilike('name', `%${searchText}%`)
      .order('name');

    const confirmed = (guests as Guest[] || []).filter((g) => g.rsvp_status === 'confirmed');

    if (confirmed.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    const guestIds = confirmed.map((g) => g.id);
    const { data: assignments } = await supabase
      .from('seat_assignments')
      .select('*, table:seating_tables(*)')
      .in('guest_id', guestIds);

    const assignmentMap = new Map<string, { table: SeatingTable; seat: number }>();
    (assignments as unknown as (SeatAssignment & { table: SeatingTable })[] || []).forEach((a) => {
      assignmentMap.set(a.guest_id, { table: a.table, seat: a.seat_number });
    });

    setResults(confirmed.map((g) => ({
      guest: g,
      table: assignmentMap.get(g.id)?.table || null,
      seat: assignmentMap.get(g.id)?.seat || null,
    })));
    setLoading(false);
  };

  const pickSuggestion = (g: Guest) => {
    runSearch(g.name);
  };

  const onKeyNav = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') runSearch();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestionIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestionIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && suggestionIdx >= 0) {
      e.preventDefault();
      pickSuggestion(suggestions[suggestionIdx]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSuggestionIdx(-1);
    }
  };

  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <section className="px-6 py-8">
      <div className="text-center mb-5">
        <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3" style={{ background: '#f0e8d8' }}>
          <Armchair size={22} style={{ color: '#a07c4a' }} />
        </div>
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="h-px w-8" style={{ background: '#c9b896' }} />
          <h2 style={{ fontFamily: 'var(--heading-font)', fontSize: 26, color: '#5a4430', margin: 0 }}>
            Find Your Table
          </h2>
          <span className="h-px w-8" style={{ background: '#c9b896' }} />
        </div>
        <p style={{ fontSize: 13, color: '#8a7a66', marginTop: 4 }}>
          Type your name to see where you&apos;re seated
        </p>
      </div>

      <HeroImage url={heroImageUrl || ''} alt="Find Your Table" />

      <div ref={containerRef} className="relative max-w-sm mx-auto">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a07c4a]" />
        <input
          className="w-full rounded-full border pl-10 pr-24 py-3 text-sm bg-white/80 outline-none focus:border-[#b59a6b]"
          style={{ borderColor: '#d6cdbf' }}
          placeholder="Enter your name..."
          value={query}
          onChange={(e) => { onQueryChange(e.target.value); setShowSuggestions(true); setSuggestionIdx(-1); }}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          onKeyDown={onKeyNav}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setSearched(false); setSuggestions([]); setShowSuggestions(false); }}
            className="absolute right-20 top-1/2 -translate-y-1/2 text-[#8a7a66] hover:text-[#5a4430]"
          >
            <X size={16} />
          </button>
        )}
        <button
          onClick={() => runSearch()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition"
          style={{ background: '#a07c4a' }}
        >
          Search
        </button>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border bg-white shadow-lg overflow-hidden" style={{ borderColor: '#d6cdbf' }}>
            {suggestions.map((g, i) => (
              <button
                key={g.id}
                onClick={() => pickSuggestion(g)}
                className={`w-full text-left px-4 py-2.5 text-sm transition ${i === suggestionIdx ? 'bg-[#faf6ee]' : 'bg-white'}`}
              >
                <span className="text-[#3a2e22]">{g.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-sm mx-auto mt-5 space-y-3">
        {loading && <p className="text-center text-sm text-[#8a7a66]">Searching...</p>}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-[#8a7a66]">No match found for &ldquo;{query}&rdquo;</p>
            <p className="text-xs text-[#a07c4a] mt-1">Make sure you have confirmed your RSVP. Only confirmed guests appear in the seating chart.</p>
          </div>
        )}

        {!loading && results.map((r, idx) => (
          <Reveal key={r.guest.id} enabled={!!animEnabled} animation="fade-up" delay={idx * 60}>
          <div className="rounded-xl border p-4" style={{ borderColor: '#d6cdbf', background: '#fff' }}>
            <p style={{ fontFamily: 'var(--heading-font)', fontSize: 18, color: '#5a4430', margin: '0 0 8px 0' }}>
              {r.guest.name}
            </p>
            <div className="flex items-center gap-2">
              {r.table ? (
                <span className="inline-flex items-center gap-2 font-semibold" style={{ color: '#5a7a4a', fontSize: 22 }}>
                  <MapPin size={18} /> {r.table.name}
                </span>
              ) : (
                <span className="text-sm text-[#b5722f]">Your seat hasn&apos;t been assigned yet</span>
              )}
            </div>
            {r.guest.dietary && (
              <p className="text-xs mt-1.5" style={{ color: '#8a7a66' }}>
                Dietary: {r.guest.dietary}
              </p>
            )}
          </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
