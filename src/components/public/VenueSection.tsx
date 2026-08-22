import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Venue, TypeStyle } from '@/types';
import { typeStyle } from '@/lib/typography';
import { MapPin, Navigation } from 'lucide-react';

export default function VenueSection({ typo }: { typo?: Record<string, TypeStyle> }) {
  const [venues, setVenues] = useState<Venue[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('venues').select('*').order('name');
      setVenues(data as Venue[] || []);
    })();
  }, []);

  if (!venues.length) return null;

  const t = typo || {};

  const getDirections = (v: Venue) => {
    if (v.map_url) {
      window.open(v.map_url, '_blank');
    } else {
      const q = v.address || v.name;
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank');
    }
  };

  return (
    <section className="px-6 py-8" style={{ borderTop: '1px solid rgba(120,90,60,0.15)' }}>
      <div className="text-center mb-5">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="h-px w-8" style={{ background: t.scheduleTitle?.color || '#c9b896' }} />
          <h2 style={{ fontFamily: 'var(--heading-font)', fontSize: 26, color: '#5a4430', margin: 0, ...typeStyle(t.scheduleTitle) }}>
            Venues
          </h2>
          <span className="h-px w-8" style={{ background: t.scheduleTitle?.color || '#c9b896' }} />
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {venues.map((v) => (
          <div key={v.id} className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #e6ddcd' }}>
            {v.photo_url && (
              <img src={v.photo_url} alt={v.name} className="w-full max-h-56 object-cover" />
            )}
            <div className="p-4">
              <h3 style={{ fontFamily: 'var(--heading-font)', fontSize: 20, color: '#5a4430', margin: 0, ...typeStyle(t.venueName) }}>
                {v.name}
              </h3>
              {v.address && (
                <p className="flex items-center gap-1.5 mt-1.5" style={{ fontSize: 13, color: '#8a7a66', ...typeStyle(t.venueLocation) }}>
                  <MapPin size={13} /> {v.address}
                </p>
              )}
              {v.description && (
                <p style={{ fontSize: 13, lineHeight: 1.6, color: '#6b5d4f', marginTop: 6, ...typeStyle(t.venueDescription) }}>
                  {v.description}
                </p>
              )}
              <button onClick={() => getDirections(v)} className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition hover:opacity-80" style={{ background: 'rgba(90,122,74,0.12)', color: '#5a7a4a' }}>
                <Navigation size={12} /> Get Directions
                </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
