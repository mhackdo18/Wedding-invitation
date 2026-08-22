import type { SiteSettings, TypeStyle } from '@/types';
import { typeStyle } from '@/lib/typography';

export default function Hero({
  settings, typo,
}: { settings: SiteSettings; typo: Record<string, TypeStyle> }) {
  const dateStr = settings.wedding_date
    ? new Date(settings.wedding_date).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : '';

  return (
    <header className="text-center px-6 pt-12 pb-8 relative overflow-hidden">
      {settings.hero_image_url && (
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: `url(${settings.hero_image_url})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          maskImage: 'linear-gradient(to bottom, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)',
        }} />
      )}
      <div className="relative">
        <p style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#a07c4a', ...typeStyle(typo.heroPretitle) }}>
          Together with their families
        </p>
        <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 48, color: '#5a4430', margin: '10px 0 4px', lineHeight: 1.1, ...typeStyle(typo.heroTitle) }}>
          {settings.partner1_name}
        </h1>
        <p style={{ fontFamily: 'Great Vibes, cursive', fontSize: 40, color: '#b5462f', margin: 0 }}>
          &amp;
        </p>
        <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 48, color: '#5a4430', margin: '4px 0 14px', lineHeight: 1.1, ...typeStyle(typo.heroTitle) }}>
          {settings.partner2_name}
        </h1>
        <div className="flex items-center justify-center gap-3 my-3">
          <span className="h-px w-10" style={{ background: '#c9b896' }} />
          <span style={{ fontSize: 11, letterSpacing: '0.2em', color: '#a07c4a' }}>ARE GETTING MARRIED</span>
          <span className="h-px w-10" style={{ background: '#c9b896' }} />
        </div>
        {dateStr && (
          <p style={{ fontSize: 15, color: '#6b5d4f', marginTop: 8, ...typeStyle(typo.heroDate) }}>
            {dateStr}
          </p>
        )}
        {settings.venue_line && (
          <p style={{ fontSize: 13, color: '#8a7a66', marginTop: 2, ...typeStyle(typo.heroVenue) }}>
            {settings.venue_line}
          </p>
        )}
      </div>
    </header>
  );
}
