import { useEffect, useState } from 'react';
import type { SiteSettings, TypeStyle } from '@/types';
import { typeStyle, fluidFontSize } from '@/lib/typography';
import { stackFor } from '@/lib/fonts';

function resolveTypo(
  typoStyle: TypeStyle | undefined,
  fallback: { font?: string; size?: number | string; weight?: number; color?: string },
): React.CSSProperties {
  const s = typeStyle(typoStyle);
  const result: React.CSSProperties = {};
  if (s.fontFamily) result.fontFamily = s.fontFamily;
  else if (fallback.font) result.fontFamily = fallback.font;
  if (s.fontSize) result.fontSize = s.fontSize;
  else if (fallback.size != null) {
    if (typeof fallback.size === 'number') result.fontSize = fluidFontSize(fallback.size);
    else result.fontSize = fallback.size;
  }
  if (s.fontWeight) result.fontWeight = s.fontWeight;
  else if (fallback.weight != null) result.fontWeight = fallback.weight;
  if (s.color) result.color = s.color;
  else if (fallback.color) result.color = fallback.color;
  return result;
}

export default function WelcomePage({
  settings, typo, onRsvp,
}: { settings: SiteSettings; typo: Record<string, TypeStyle>; onRsvp: () => void }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const target = settings.wedding_date ? new Date(settings.wedding_date).getTime() : 0;
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  const dateStr = settings.wedding_date
    ? new Date(settings.wedding_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const layout = settings.welcome_layout || 'centered';

  const pretitleText = settings.hero_pretitle_text ?? 'Together with their families';
  const marriedText = settings.hero_married_text ?? 'ARE GETTING MARRIED';

  const isDarkLayout = ['centered', 'fullscreen', 'magazine', 'dark_luxe'].includes(layout);

  // Resolve all typography styles with layout-appropriate fallbacks
  const titleStyle = resolveTypo(typo.heroTitle, {
    font: 'var(--heading-font)',
    size: isDarkLayout ? 'clamp(2.5rem, 8vw, 5rem)' : 42,
    weight: 600,
    color: isDarkLayout ? '#fff' : '#5a4430',
  });

  const ampStyle = resolveTypo(typo.heroAmpersand, {
    font: "'Great Vibes, cursive'",
    size: isDarkLayout ? 'clamp(2rem, 6vw, 3.5rem)' : 36,
    color: isDarkLayout ? 'rgba(255,240,210,0.9)' : '#b5462f',
  });

  const pretitleStyle = resolveTypo(typo.heroPretitle, {
    size: 11,
    weight: 400,
    color: isDarkLayout ? '#f0e0c8' : '#a07c4a',
  });

  const marriedStyle = resolveTypo(typo.heroMarried, {
    size: 11,
    weight: 600,
    color: isDarkLayout ? '#c9a96e' : '#a07c4a',
  });

  const dateStyle = resolveTypo(typo.heroDate, {
    size: isDarkLayout ? 14 : 15,
    color: isDarkLayout ? 'rgba(255,225,170,0.85)' : '#6b5d4f',
  });

  const venueStyle = resolveTypo(typo.heroVenue, {
    size: isDarkLayout ? 12 : 13,
    color: isDarkLayout ? 'rgba(255,225,170,0.65)' : '#8a7a66',
  });

  const countdownStyle = typeStyle(typo.countdown);
  const countdownColor = countdownStyle.color || (isDarkLayout ? '#fff' : '#5a4430');
  const countdownLabelColor = countdownStyle.color || (isDarkLayout ? 'rgba(255,230,180,0.8)' : '#a07c4a');

  const countdown = target > 0 && (
    <div className="flex justify-center gap-3 mt-6">
      <CountdownUnit value={days} label="Days" light={isDarkLayout} style={countdownStyle} color={countdownColor} labelColor={countdownLabelColor} />
      <CountdownUnit value={hours} label="Hours" light={isDarkLayout} style={countdownStyle} color={countdownColor} labelColor={countdownLabelColor} />
      <CountdownUnit value={mins} label="Mins" light={isDarkLayout} style={countdownStyle} color={countdownColor} labelColor={countdownLabelColor} />
      <CountdownUnit value={secs} label="Secs" light={isDarkLayout} style={countdownStyle} color={countdownColor} labelColor={countdownLabelColor} />
    </div>
  );

  const rsvpDeadlineStyle = typeStyle(typo.rsvpDeadline);
  const rsvpDeadline = settings.rsvp_deadline ? (
    <div className="mt-3">
      <p className="text-sm font-semibold" style={{ color: '#8a6d3b', ...rsvpDeadlineStyle }}>
        RSVP DEADLINE
      </p>
      <p className="text-sm font-semibold" style={{ color: '#8a6d3b', ...rsvpDeadlineStyle }}>
        {new Date(settings.rsvp_deadline).toLocaleDateString([], { dateStyle: 'long' })}
      </p>
    </div>
  ) : null;

  const ctaButton = settings.show_rsvp_button !== false ? (
    <div className="mt-6 flex flex-col items-center">
      {rsvpDeadline}
      <button onClick={onRsvp} className="mt-2 font-semibold transition hover:opacity-90" style={{ background: settings.cta_bg_color, color: settings.cta_text_color, borderRadius: settings.cta_radius, padding: '10px 28px', fontSize: 15 }}>
        {settings.cta_text}
      </button>
    </div>
  ) : rsvpDeadline ? <div className="mt-6">{rsvpDeadline}</div> : null;

  // Render names block — adapts to light/dark layouts
  const renderNames = (variant: 'stacked' | 'inline' = 'stacked', extraTitleStyle?: React.CSSProperties) => {
    const ts = { ...titleStyle, ...extraTitleStyle };
    if (variant === 'inline') {
      return (
        <p style={{ ...ts, lineHeight: 1.1, textShadow: isDarkLayout ? '0 2px 30px rgba(0,0,0,0.5)' : undefined }}>
          {settings.partner1_name} <span style={{ ...ampStyle }}>&amp;</span> {settings.partner2_name}
        </p>
      );
    }
    return (
      <>
        <h1 style={{ ...ts, margin: '10px 0 4px', lineHeight: 1.1, textShadow: isDarkLayout ? '0 2px 20px rgba(0,0,0,0.4)' : undefined }}>
          {settings.partner1_name}
        </h1>
        <p style={{ ...ampStyle, margin: 0 }}>&amp;</p>
        <h1 style={{ ...ts, margin: '4px 0 14px', lineHeight: 1.1, textShadow: isDarkLayout ? '0 2px 20px rgba(0,0,0,0.4)' : undefined }}>
          {settings.partner2_name}
        </h1>
      </>
    );
  };

  // --- Centered Overlay ---
  if (layout === 'centered') {
    return (
      <header className="relative overflow-hidden" style={{ minHeight: 460 }}>
        {settings.hero_image_url && (
          <>
            <div className="absolute inset-0" style={{ backgroundImage: `url(${settings.hero_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.38)' }} />
          </>
        )}
        <div className="relative text-center px-6 py-16 flex flex-col items-center justify-center" style={{ minHeight: 460 }}>
          {pretitleText && <p style={{ ...pretitleStyle, letterSpacing: '0.3em', textTransform: 'uppercase' }}>{pretitleText}</p>}
          {renderNames('stacked', { fontSize: titleStyle.fontSize || 'clamp(2.5rem, 8vw, 5rem)' })}
          {dateStr && <p style={{ ...dateStyle, marginTop: 8 }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ ...venueStyle, marginTop: 2 }}>{settings.venue_line}</p>}
          {countdown}
          {ctaButton}
        </div>
      </header>
    );
  }

  // --- Split ---
  if (layout === 'split') {
    return (
      <header className="flex flex-col sm:flex-row" style={{ minHeight: 380 }}>
        {settings.hero_image_url && (
          <div className="sm:w-1/2" style={{ backgroundImage: `url(${settings.hero_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: 220 }} />
        )}
        <div className={`px-8 py-12 text-center flex flex-col items-center justify-center ${settings.hero_image_url ? 'sm:w-1/2' : 'w-full'}`}>
          {pretitleText && <p style={{ ...pretitleStyle, letterSpacing: '0.3em', textTransform: 'uppercase' }}>{pretitleText}</p>}
          {renderNames('stacked')}
          {dateStr && <p style={{ ...dateStyle, marginTop: 8 }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ ...venueStyle, marginTop: 2 }}>{settings.venue_line}</p>}
          {countdown}
          {ctaButton}
        </div>
      </header>
    );
  }

  // --- Minimalist Frame ---
  if (layout === 'minimalist') {
    return (
      <header className="px-8 py-14 text-center">
        <div className="border-t border-b py-10" style={{ borderColor: 'rgba(120,90,60,0.2)' }}>
          {pretitleText && <p style={{ ...pretitleStyle, letterSpacing: '0.4em', textTransform: 'uppercase' }}>{pretitleText}</p>}
          <h1 style={{ ...titleStyle, margin: '12px 0', lineHeight: 1.1 }}>
            {settings.partner1_name}<br />
            <span style={{ ...ampStyle, fontSize: ampStyle.fontSize || 28 }}>&amp;</span><br />
            {settings.partner2_name}
          </h1>
          {dateStr && <p style={{ ...dateStyle }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ ...venueStyle, marginTop: 2 }}>{settings.venue_line}</p>}
          {countdown}
          {ctaButton}
        </div>
      </header>
    );
  }

  // --- Fullscreen Cinematic ---
  if (layout === 'fullscreen') {
    return (
      <header className="relative overflow-hidden flex items-end justify-center" style={{ minHeight: '80vh' }}>
        {settings.hero_image_url && (
          <div className="absolute inset-0" style={{ backgroundImage: `url(${settings.hero_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,6,3,0.75) 0%, rgba(10,6,3,0.1) 55%, transparent 100%)' }} />
        <div className="relative text-center px-6 pb-14 flex flex-col items-center">
          {pretitleText && <p style={{ ...pretitleStyle, letterSpacing: '0.3em', textTransform: 'uppercase', textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>{pretitleText}</p>}
          {renderNames('inline', { fontSize: titleStyle.fontSize || 'clamp(3rem, 10vw, 6rem)', lineHeight: 1.1 })}
          {marriedText && (
            <div className="flex items-center justify-center gap-3 mt-3">
              <span className="h-px w-10" style={{ background: 'rgba(255,255,255,0.3)' }} />
              <span style={{ ...marriedStyle, letterSpacing: '0.2em' }}>{marriedText}</span>
              <span className="h-px w-10" style={{ background: 'rgba(255,255,255,0.3)' }} />
            </div>
          )}
          {dateStr && <p style={{ ...dateStyle, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 8 }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ ...venueStyle, marginTop: 4 }}>{settings.venue_line}</p>}
          {settings.show_rsvp_button !== false && (
            <div className="mt-6">
              <button onClick={onRsvp} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', color: settings.cta_text_color || '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: settings.cta_radius, padding: '10px 28px', fontSize: 14, fontWeight: 600, letterSpacing: '0.08em' }}>
                {settings.cta_text}
              </button>
            </div>
          )}
          {countdown}
        </div>
      </header>
    );
  }

  // --- Magazine ---
  if (layout === 'magazine') {
    return (
      <header className="relative overflow-hidden" style={{ minHeight: 440 }}>
        {settings.hero_image_url && (
          <div className="absolute inset-0" style={{ backgroundImage: `url(${settings.hero_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        )}
        <div className="absolute bottom-0 left-0 right-0 px-8 py-8" style={{ background: 'linear-gradient(to top, rgba(10,6,3,0.88) 0%, rgba(10,6,3,0.55) 65%, transparent 100%)' }}>
          {pretitleText && <p style={{ ...pretitleStyle, letterSpacing: '0.35em', textTransform: 'uppercase', marginBottom: 6 }}>{pretitleText}</p>}
          {renderNames('inline', { fontSize: titleStyle.fontSize || 'clamp(2rem, 6vw, 3.5rem)', lineHeight: 1.1, margin: 0 })}
          <div className="flex items-center gap-4">
            {dateStr && <p style={{ ...dateStyle, letterSpacing: '0.05em' }}>{dateStr}</p>}
            {settings.venue_line && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>·</span>}
            {settings.venue_line && <p style={{ ...venueStyle }}>{settings.venue_line}</p>}
          </div>
          <div className="flex items-center gap-4 mt-4">
            {settings.show_rsvp_button !== false && <button onClick={onRsvp} style={{ background: settings.cta_bg_color, color: settings.cta_text_color, borderRadius: settings.cta_radius, padding: '8px 20px', fontSize: 13, fontWeight: 600 }}>{settings.cta_text}</button>}
            {countdown}
          </div>
        </div>
      </header>
    );
  }

  // --- Vintage Stationery ---
  if (layout === 'vintage') {
    return (
      <header className="px-8 py-12 text-center" style={{ background: 'linear-gradient(135deg, #fdf9f0 0%, #f5ece0 100%)' }}>
        <div className="max-w-sm mx-auto px-8 py-10 relative" style={{ border: '2px solid rgba(160,124,74,0.35)' }}>
          {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
            <span key={i} className={`absolute ${pos} w-5 h-5 text-[#c9b896] text-lg`} style={{ lineHeight: 1, transform: i > 1 ? 'rotate(180deg)' : i === 1 ? 'scaleX(-1)' : '' }}>❧</span>
          ))}
          {pretitleText && <p style={{ ...pretitleStyle, letterSpacing: '0.45em', textTransform: 'uppercase', marginBottom: 12 }}>{pretitleText}</p>}
          <p style={{ fontFamily: "'Great Vibes, cursive'", fontSize: 14, color: '#c9b896', letterSpacing: '0.05em', marginBottom: 6 }}>The marriage of</p>
          <h1 style={{ ...titleStyle, lineHeight: 1.15, margin: '8px 0' }}>{settings.partner1_name}</h1>
          <p style={{ ...ampStyle }}>&amp;</p>
          <h1 style={{ ...titleStyle, lineHeight: 1.15, margin: '8px 0 16px' }}>{settings.partner2_name}</h1>
          <div className="flex items-center justify-center gap-2 my-4">
            <span className="h-px flex-1" style={{ background: 'rgba(160,124,74,0.3)' }} />
            <span style={{ color: '#c9b896', fontSize: 14 }}>✦</span>
            <span className="h-px flex-1" style={{ background: 'rgba(160,124,74,0.3)' }} />
          </div>
          {dateStr && <p style={{ ...dateStyle, letterSpacing: '0.06em' }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ ...venueStyle, marginTop: 4 }}>{settings.venue_line}</p>}
          {countdown}
          {ctaButton}
        </div>
      </header>
    );
  }

  // --- Botanical ---
  if (layout === 'botanical') {
    return (
      <header className="flex flex-col sm:flex-row" style={{ minHeight: 400, background: '#f5f0e8' }}>
        {settings.hero_image_url && (
          <div className="w-full sm:w-2/5 relative overflow-hidden" style={{ minHeight: 200 }}>
            <div className="absolute inset-0" style={{ backgroundImage: `url(${settings.hero_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div className="absolute inset-0" style={{ background: 'rgba(50,70,40,0.15)' }} />
          </div>
        )}
        <div className={`px-10 py-12 flex flex-col justify-center ${settings.hero_image_url ? 'sm:w-3/5' : 'w-full'}`}>
          {pretitleText && <p style={{ ...pretitleStyle, letterSpacing: '0.45em', textTransform: 'uppercase', marginBottom: 10 }}>{pretitleText}</p>}
          <div className="flex items-end gap-3">
            <div>
              <h1 style={{ ...titleStyle, lineHeight: 1.1 }}>{settings.partner1_name}</h1>
              <div className="flex items-center gap-2 my-1">
                <span className="h-px w-6" style={{ background: '#8a7a60' }} />
                <span style={{ ...ampStyle, fontSize: ampStyle.fontSize || 22 }}>&amp;</span>
                <span className="h-px w-6" style={{ background: '#8a7a60' }} />
              </div>
              <h1 style={{ ...titleStyle, lineHeight: 1.1 }}>{settings.partner2_name}</h1>
            </div>
          </div>
          {dateStr && <p style={{ ...dateStyle, marginTop: 16, letterSpacing: '0.04em' }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ ...venueStyle, marginTop: 4 }}>{settings.venue_line}</p>}
          {countdown}
          {ctaButton}
        </div>
      </header>
    );
  }

  // --- Elegant Frame ---
  if (layout === 'elegant_frame') {
    return (
      <header className="px-8 py-14 text-center" style={{ background: 'linear-gradient(135deg, #fbf7f0 0%, #f3ebde 100%)' }}>
        <div className="max-w-md mx-auto px-10 py-12" style={{ border: '1px solid rgba(160,124,74,0.5)', outline: '1px solid rgba(160,124,74,0.25)', outlineOffset: '6px' }}>
          {pretitleText && <p style={{ ...pretitleStyle, letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 14 }}>{pretitleText}</p>}
          <h1 style={{ ...titleStyle, lineHeight: 1.15, margin: '6px 0' }}>{settings.partner1_name}</h1>
          <p style={{ ...ampStyle }}>&amp;</p>
          <h1 style={{ ...titleStyle, lineHeight: 1.15, margin: '6px 0 16px' }}>{settings.partner2_name}</h1>
          <div className="flex items-center justify-center gap-2 my-4">
            <span className="h-px w-10" style={{ background: 'rgba(160,124,74,0.4)' }} />
            <span style={{ color: '#c9b896', fontSize: 12 }}>✦</span>
            <span className="h-px w-10" style={{ background: 'rgba(160,124,74,0.4)' }} />
          </div>
          {dateStr && <p style={{ ...dateStyle, letterSpacing: '0.06em' }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ ...venueStyle, marginTop: 4 }}>{settings.venue_line}</p>}
          {countdown}
          {ctaButton}
        </div>
      </header>
    );
  }

  // --- Watercolor Wash ---
  if (layout === 'watercolor') {
    return (
      <header className="px-8 py-16 text-center" style={{ background: 'linear-gradient(135deg, #fef6f8 0%, #f3f0fa 50%, #eef6f8 100%)' }}>
        {pretitleText && <p style={{ ...pretitleStyle, letterSpacing: '0.35em', textTransform: 'uppercase' }}>{pretitleText}</p>}
        <h1 style={{ ...titleStyle, margin: '10px 0 4px', lineHeight: 1.1 }}>{settings.partner1_name}</h1>
        <p style={{ ...ampStyle, fontSize: ampStyle.fontSize || 'clamp(1.8rem, 5vw, 2.8rem)' }}>&amp;</p>
        <h1 style={{ ...titleStyle, margin: '4px 0 14px', lineHeight: 1.1 }}>{settings.partner2_name}</h1>
        {dateStr && <p style={{ ...dateStyle }}>{dateStr}</p>}
        {settings.venue_line && <p style={{ ...venueStyle, marginTop: 2 }}>{settings.venue_line}</p>}
        {countdown}
        {ctaButton}
      </header>
    );
  }

  // --- Modern Minimal ---
  if (layout === 'modern_minimal') {
    return (
      <header className="px-8 py-20 text-center" style={{ background: '#fff' }}>
        {pretitleText && <p style={{ ...pretitleStyle, letterSpacing: '0.5em', textTransform: 'uppercase', marginBottom: 18 }}>{pretitleText}</p>}
        <h1 style={{ ...titleStyle, fontWeight: titleStyle.fontWeight || 700, margin: '4px 0', letterSpacing: '-0.02em', lineHeight: 1.05 }}>{settings.partner1_name}</h1>
        <p style={{ ...ampStyle, fontSize: ampStyle.fontSize || 16, margin: '6px 0' }}>&amp;</p>
        <h1 style={{ ...titleStyle, fontWeight: titleStyle.fontWeight || 700, margin: '4px 0 24px', letterSpacing: '-0.02em', lineHeight: 1.05 }}>{settings.partner2_name}</h1>
        <div className="flex items-center justify-center gap-3 my-4">
          <span className="h-px w-12" style={{ background: '#ddd' }} />
          {marriedText && <span style={{ ...marriedStyle, letterSpacing: '0.2em' }}>{marriedText}</span>}
          <span className="h-px w-12" style={{ background: '#ddd' }} />
        </div>
        {dateStr && <p style={{ ...dateStyle }}>{dateStr}</p>}
        {settings.venue_line && <p style={{ ...venueStyle, marginTop: 2 }}>{settings.venue_line}</p>}
        {countdown}
        {ctaButton}
      </header>
    );
  }

  // --- Script Focus ---
  if (layout === 'script_focus') {
    const scriptFont = typo.heroTitle?.fontFamily ? stackFor(typo.heroTitle.fontFamily) : "'Great Vibes, cursive'";
    return (
      <header className="px-8 py-20 text-center" style={{ background: 'var(--page-color)' }}>
        <p style={{ ...titleStyle, fontFamily: scriptFont, fontSize: titleStyle.fontSize || 'clamp(3.5rem, 12vw, 7rem)', lineHeight: 1.05, margin: '0 0 8px' }}>{settings.partner1_name}</p>
        <p style={{ ...ampStyle, fontSize: ampStyle.fontSize || 14, letterSpacing: '0.3em', textTransform: 'uppercase', margin: '8px 0' }}>&amp;</p>
        <p style={{ ...titleStyle, fontFamily: scriptFont, fontSize: titleStyle.fontSize || 'clamp(3.5rem, 12vw, 7rem)', lineHeight: 1.05, margin: '0 0 20px' }}>{settings.partner2_name}</p>
        {dateStr && <p style={{ ...dateStyle }}>{dateStr}</p>}
        {settings.venue_line && <p style={{ ...venueStyle, marginTop: 2 }}>{settings.venue_line}</p>}
        {countdown}
        {ctaButton}
      </header>
    );
  }

  // --- Photo Collage ---
  if (layout === 'photo_collage') {
    const imgs = [settings.hero_image_url, settings.footer_monogram_url].filter(Boolean) as string[];
    return (
      <header className="px-6 py-12 text-center" style={{ background: 'var(--page-color)' }}>
        {imgs.length > 0 && (
          <div className="grid grid-cols-3 gap-1 max-w-md mx-auto mb-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden" style={{ background: '#e0d4be' }}>
                {imgs[i % imgs.length] && <img src={imgs[i % imgs.length]} alt="" className="w-full h-full object-cover" />}
              </div>
            ))}
          </div>
        )}
        {pretitleText && <p style={{ ...pretitleStyle, letterSpacing: '0.3em', textTransform: 'uppercase' }}>{pretitleText}</p>}
        <h1 style={{ ...titleStyle, margin: '8px 0', lineHeight: 1.1 }}>
          {settings.partner1_name} <span style={{ ...ampStyle }}>&amp;</span> {settings.partner2_name}
        </h1>
        {dateStr && <p style={{ ...dateStyle, marginTop: 6 }}>{dateStr}</p>}
        {settings.venue_line && <p style={{ ...venueStyle, marginTop: 2 }}>{settings.venue_line}</p>}
        {countdown}
        {ctaButton}
      </header>
    );
  }

  // --- Dark Luxe ---
  if (layout === 'dark_luxe') {
    return (
      <header className="px-8 py-16 text-center relative overflow-hidden" style={{ background: '#0a0a0a', minHeight: 400 }}>
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: settings.hero_image_url ? `url(${settings.hero_image_url})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="relative">
          {pretitleText && <p style={{ ...pretitleStyle, letterSpacing: '0.4em', textTransform: 'uppercase' }}>{pretitleText}</p>}
          <h1 style={{ ...titleStyle, margin: '12px 0', lineHeight: 1.1, textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>{settings.partner1_name}</h1>
          <p style={{ ...ampStyle, fontSize: ampStyle.fontSize || 32 }}>&amp;</p>
          <h1 style={{ ...titleStyle, margin: '12px 0', lineHeight: 1.1, textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>{settings.partner2_name}</h1>
          <div className="flex items-center justify-center gap-3 my-4">
            <span className="h-px w-10" style={{ background: 'rgba(201,169,110,0.5)' }} />
            {marriedText && <span style={{ ...marriedStyle, letterSpacing: '0.25em' }}>{marriedText}</span>}
            <span className="h-px w-10" style={{ background: 'rgba(201,169,110,0.5)' }} />
          </div>
          {dateStr && <p style={{ ...dateStyle, letterSpacing: '0.05em' }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ ...venueStyle, marginTop: 2 }}>{settings.venue_line}</p>}
          {countdown}
          {ctaButton}
        </div>
      </header>
    );
  }

  // --- Floral Border ---
  if (layout === 'floral_border') {
    return (
      <header className="px-8 py-14 text-center relative" style={{ background: 'linear-gradient(135deg, #f8f5ef 0%, #f0ebe0 100%)' }}>
        <div className="absolute top-3 left-3 text-2xl" style={{ color: '#8a9a6a' }}>❀</div>
        <div className="absolute top-3 right-3 text-2xl" style={{ color: '#8a9a6a', transform: 'scaleX(-1)' }}>❀</div>
        <div className="absolute bottom-3 left-3 text-2xl" style={{ color: '#8a9a6a', transform: 'scaleY(-1)' }}>❀</div>
        <div className="absolute bottom-3 right-3 text-2xl" style={{ color: '#8a9a6a', transform: 'scale(-1,-1)' }}>❀</div>
        <div className="max-w-sm mx-auto px-8 py-10">
          {pretitleText && <p style={{ ...pretitleStyle, letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 12 }}>{pretitleText}</p>}
          <h1 style={{ ...titleStyle, margin: '8px 0', lineHeight: 1.15 }}>{settings.partner1_name}</h1>
          <p style={{ ...ampStyle }}>&amp;</p>
          <h1 style={{ ...titleStyle, margin: '8px 0 16px', lineHeight: 1.15 }}>{settings.partner2_name}</h1>
          {dateStr && <p style={{ ...dateStyle }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ ...venueStyle, marginTop: 4 }}>{settings.venue_line}</p>}
          {countdown}
          {ctaButton}
        </div>
      </header>
    );
  }

  // --- Diagonal Split ---
  if (layout === 'split_diagonal') {
    return (
      <header className="relative overflow-hidden flex flex-col sm:flex-row" style={{ minHeight: 400 }}>
        {settings.hero_image_url && (
          <div className="sm:w-1/2 relative" style={{ backgroundImage: `url(${settings.hero_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: 200, clipPath: 'polygon(0 0, 100% 0, 75% 100%, 0% 100%)' }} />
        )}
        <div className={`px-10 py-12 flex flex-col justify-center ${settings.hero_image_url ? 'sm:w-1/2' : 'w-full'}`}>
          {pretitleText && <p style={{ ...pretitleStyle, letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 10 }}>{pretitleText}</p>}
          <h1 style={{ ...titleStyle, lineHeight: 1.1, margin: '4px 0' }}>{settings.partner1_name}</h1>
          <p style={{ ...ampStyle, fontSize: ampStyle.fontSize || 24, margin: '4px 0' }}>&amp;</p>
          <h1 style={{ ...titleStyle, lineHeight: 1.1, margin: '4px 0 16px' }}>{settings.partner2_name}</h1>
          {dateStr && <p style={{ ...dateStyle }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ ...venueStyle, marginTop: 2 }}>{settings.venue_line}</p>}
          {countdown}
          {ctaButton}
        </div>
      </header>
    );
  }

  // --- Names on Top ---
  if (layout === 'names_top') {
    return (
      <header className="relative overflow-hidden flex flex-col" style={{ minHeight: 600 }}>
        <div className="relative text-center px-6 pt-10 pb-4" style={{ background: 'transparent' }}>
          {pretitleText && <p style={{ ...pretitleStyle, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8 }}>{pretitleText}</p>}
          <h1 style={{ ...titleStyle, margin: 0, lineHeight: 1.1 }}>
            {settings.partner1_name} <span style={{ ...ampStyle, fontSize: '0.7em' }}>&amp;</span> {settings.partner2_name}
          </h1>
        </div>
        {settings.hero_image_url && (
          <div className="relative flex-1" style={{ minHeight: 380, backgroundImage: `url(${settings.hero_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        )}
        <div className="relative text-center px-6 pt-5 pb-8" style={{ background: 'transparent' }}>
          {dateStr && <p style={{ ...dateStyle, letterSpacing: '0.04em' }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ ...venueStyle, marginTop: 2 }}>{settings.venue_line}</p>}
          {countdown}
          {ctaButton}
        </div>
      </header>
    );
  }

  // --- Invitation Cover ---
  if (layout === 'invitation_cover') {
    return (
      <header className="relative overflow-hidden text-center" style={{ background: '#f8f8f6' }}>
        <div className="relative overflow-hidden" style={{ height: 'clamp(390px, 62vh, 620px)', borderRadius: '0 0 45% 45% / 0 0 14% 14%' }}>
          {settings.hero_image_url ? (
            <div className="absolute inset-0" style={{ backgroundImage: `url(${settings.hero_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          ) : <div className="absolute inset-0" style={{ background: '#d9d5ca' }} />}
        </div>
        <div className="px-7 pb-10 pt-8">
          {pretitleText && <p style={{ ...pretitleStyle, fontSize: pretitleStyle.fontSize || 13, letterSpacing: '0.06em' }}>{pretitleText}</p>}
          <div className="mt-3">
            <p style={{ ...titleStyle, fontSize: titleStyle.fontSize || 'clamp(2.5rem, 11vw, 4rem)', lineHeight: 0.95 }}>{settings.partner1_name}</p>
            <p style={{ ...ampStyle, fontFamily: ampStyle.fontFamily || "'Great Vibes, cursive'", fontSize: ampStyle.fontSize || 25, lineHeight: 1 }}>&amp;</p>
            <p style={{ ...titleStyle, fontSize: titleStyle.fontSize || 'clamp(2.5rem, 11vw, 4rem)', lineHeight: 0.95 }}>{settings.partner2_name}</p>
          </div>
          {marriedText && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <span className="h-px w-8" style={{ background: 'rgba(108,37,40,0.4)' }} />
              <span style={{ ...marriedStyle, letterSpacing: '0.2em' }}>{marriedText}</span>
              <span className="h-px w-8" style={{ background: 'rgba(108,37,40,0.4)' }} />
            </div>
          )}
          {dateStr && <p style={{ ...dateStyle, letterSpacing: '0.04em', marginTop: 10 }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ ...venueStyle, marginTop: 4 }}>{settings.venue_line}</p>}
          {countdown}
          {ctaButton}
        </div>
      </header>
    );
  }

  // --- Classic Card (default) ---
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
        {pretitleText && <p style={{ ...pretitleStyle, letterSpacing: '0.3em', textTransform: 'uppercase' }}>{pretitleText}</p>}
        {renderNames('stacked')}
        <div className="flex items-center justify-center gap-3 my-3">
          <span className="h-px w-10" style={{ background: ampStyle.color || titleStyle.color || '#c9b896' }} />
          {marriedText && <span style={{ ...marriedStyle, letterSpacing: '0.2em' }}>{marriedText}</span>}
          <span className="h-px w-10" style={{ background: ampStyle.color || titleStyle.color || '#c9b896' }} />
        </div>
        {dateStr && <p style={{ ...dateStyle, marginTop: 8 }}>{dateStr}</p>}
        {settings.venue_line && <p style={{ ...venueStyle, marginTop: 2 }}>{settings.venue_line}</p>}
        {countdown}
        {ctaButton}
      </div>
    </header>
  );
}

function CountdownUnit({ value, label, light, style, color, labelColor }: { value: number; label: string; light?: boolean; style?: React.CSSProperties; color?: string; labelColor?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ background: light ? 'rgba(255,255,255,0.18)' : 'rgba(138,109,59,0.10)', border: `1px solid ${light ? 'rgba(255,255,255,0.3)' : 'rgba(138,109,59,0.2)'}` }}>
        <span style={{ fontFamily: style?.fontFamily || 'var(--heading-font)', fontSize: style?.fontSize || 24, fontWeight: style?.fontWeight || 600, color: color || (light ? '#fff' : '#5a4430') }}>
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: labelColor || (light ? 'rgba(255,230,180,0.8)' : '#a07c4a'), marginTop: 4 }}>
        {label}
      </span>
    </div>
  );
}
