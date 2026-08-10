import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Guest, SeatingTable, SeatAssignment } from '@/types';
import { Search, Armchair, MapPin, X } from 'lucide-react';

export default function FindYourTable() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ guest: Guest; table: SeatingTable | null; seat: number | null }>>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    const { data: guests } = await supabase
      .from('guests')
      .select('*')
      .ilike('name', `%${query.trim()}%`)
      .order('name');

    if (!guests || guests.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    const guestIds = guests.map((g) => g.id);
    const { data: assignments } = await supabase
      .from('seat_assignments')
      .select('*, table:seating_tables(*)')
      .in('guest_id', guestIds);

    const assignmentMap = new Map<string, { table: SeatingTable; seat: number }>();
    (assignments as unknown as (SeatAssignment & { table: SeatingTable })[] || []).forEach((a) => {
      assignmentMap.set(a.guest_id, { table: a.table, seat: a.seat_number });
    });

    setResults(guests.map((g) => ({
      guest: g as Guest,
      table: assignmentMap.get(g.id)?.table || null,
      seat: assignmentMap.get(g.id)?.seat || null,
    })));
    setLoading(false);
  };

  return (
    <section className="px-6 py-8">
      <div className="text-center mb-5">
        <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3" style={{ background: '#f0e8d8' }}>
          <Armchair size={22} style={{ color: '#a07c4a' }} />
        </div>
        <h2 style={{ fontFamily: 'var(--heading-font)', fontSize: 26, color: '#5a4430', margin: 0 }}>
          Find Your Table
        </h2>
        <p style={{ fontSize: 13, color: '#8a7a66', marginTop: 4 }}>
          Type your name to see where you&apos;re seated
        </p>
      </div>

      <div className="relative max-w-sm mx-auto">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a07c4a]" />
        <input
          className="w-full rounded-full border pl-10 pr-10 py-3 text-sm bg-white/80 outline-none focus:border-[#b59a6b]"
          style={{ borderColor: '#d6cdbf' }}
          placeholder="Enter your name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setSearched(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a7a66]">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="max-w-sm mx-auto mt-5 space-y-3">
        {loading && <p className="text-center text-sm text-[#8a7a66]">Searching...</p>}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-[#8a7a66]">No match found for &ldquo;{query}&rdquo;</p>
            <p className="text-xs text-[#a07c4a] mt-1">Try searching with just your first or last name</p>
          </div>
        )}

        {!loading && results.map((r) => (
          <div key={r.guest.id} className="rounded-xl border p-4" style={{ borderColor: '#d6cdbf', background: '#fff' }}>
            <p style={{ fontFamily: 'var(--heading-font)', fontSize: 18, color: '#5a4430', margin: 0 }}>
              {r.guest.name}
            </p>
            {r.guest.plus_one_name && (
              <p className="text-xs text-[#8a7a66] mt-0.5">Guest: {r.guest.plus_one_name}</p>
            )}
            <div className="mt-2 flex items-center gap-2">
              {r.table ? (
                <>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#5a7a4a' }}>
                    <MapPin size={14} /> {r.table.name}
                  </span>
                  {r.seat !== null && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#e8dfc8', color: '#5a4430' }}>
                      Seat #{r.seat}
                    </span>
                  )}
                </>
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
        ))}
      </div>
    </section>
  );
}
