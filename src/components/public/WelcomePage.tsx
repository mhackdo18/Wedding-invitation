import { useEffect, useState } from 'react';
import type { SiteSettings, TypeStyle } from '@/types';
import { typeStyle } from '@/lib/typography';
import { stackFor } from '@/lib/fonts';

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

  const countdownStyle = typeStyle(typo.countdown);
  const countdownColor = countdownStyle.color || (['centered', 'fullscreen', 'magazine'].includes(layout) ? '#fff' : '#5a4430');
  const countdownLabelColor = countdownStyle.color || (['centered', 'fullscreen', 'magazine'].includes(layout) ? 'rgba(255,230,180,0.8)' : '#a07c4a');

  const countdown = target > 0 && (
    <div className="flex justify-center gap-3 mt-6">
      <CountdownUnit value={days} label="Days" light={['centered', 'fullscreen', 'magazine'].includes(layout)} style={countdownStyle} color={countdownColor} labelColor={countdownLabelColor} />
      <CountdownUnit value={hours} label="Hours" light={['centered', 'fullscreen', 'magazine'].includes(layout)} style={countdownStyle} color={countdownColor} labelColor={countdownLabelColor} />
      <CountdownUnit value={mins} label="Mins" light={['centered', 'fullscreen', 'magazine'].includes(layout)} style={countdownStyle} color={countdownColor} labelColor={countdownLabelColor} />
      <CountdownUnit value={secs} label="Secs" light={['centered', 'fullscreen', 'magazine'].includes(layout)} style={countdownStyle} color={countdownColor} labelColor={countdownLabelColor} />
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

  const heroTitleStyle = typeStyle(typo.heroTitle);
  const heroTitleFont = heroTitleStyle.fontFamily || 'var(--heading-font)';
  const heroTitleSize = heroTitleStyle.fontSize || 48;
  const heroTitleColor = heroTitleStyle.color || '#5a4430';
  const heroTitleWeight = heroTitleStyle.fontWeight || 600;

  const pretitleText = settings.hero_pretitle_text ?? 'Together with their families';
  const marriedText = settings.hero_married_text ?? 'ARE GETTING MARRIED';
  const marriedStyle = typeStyle(typo.heroMarried);
  const ampBase = typeStyle(typo.heroAmpersand);

  const names = (
    <>
      <h1 style={{ fontFamily: heroTitleFont, fontSize: heroTitleSize, fontWeight: heroTitleWeight, color: heroTitleColor, margin: '10px 0 4px', lineHeight: 1.1 }}>
        {settings.partner1_name}
      </h1>
      <p style={{ fontFamily: 'Great Vibes, cursive', fontSize: 40, color: '#b5462f', margin: 0, ...ampBase }}>&amp;</p>
      <h1 style={{ fontFamily: heroTitleFont, fontSize: heroTitleSize, fontWeight: heroTitleWeight, color: heroTitleColor, margin: '4px 0 14px', lineHeight: 1.1 }}>
        {settings.partner2_name}
      </h1>
    </>
  );

  const namesLight = (
    <>
      <h1 style={{ fontFamily: heroTitleFont, fontSize: 'clamp(2.5rem, 8vw, 5rem)', fontWeight: heroTitleWeight, color: heroTitleStyle.color || '#fff', margin: '10px 0 4px', lineHeight: 1.05, textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
        {settings.partner1_name}
      </h1>
      <p style={{ fontFamily: 'Great Vibes, cursive', fontSize: 'clamp(2rem, 6vw, 3.5rem)', color: 'rgba(255,240,210,0.9)', margin: 0, ...ampBase }}>&amp;</p>
      <h1 style={{ fontFamily: heroTitleFont, fontSize: 'clamp(2.5rem, 8vw, 5rem)', fontWeight: heroTitleWeight, color: heroTitleStyle.color || '#fff', margin: '4px 0 14px', lineHeight: 1.05, textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
        {settings.partner2_name}
      </h1>
    </>
  );

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
          {pretitleText && <p style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#f0e0c8' }}>{pretitleText}</p>}
          {namesLight}
          {dateStr && <p style={{ fontSize: 15, color: '#f0e0c8', marginTop: 8, ...typeStyle(typo.heroDate) }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ fontSize: 13, color: '#d8c8a8', marginTop: 2, ...typeStyle(typo.heroVenue) }}>{settings.venue_line}</p>}
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
          {pretitleText && <p style={{ ...typeStyle(typo.heroPretitle), fontSize: typo.heroPretitle?.fontSize || 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: typo.heroPretitle?.color || '#a07c4a' }}>{pretitleText}</p>}
          {names}
          {dateStr && <p style={{ fontSize: typo.heroDate?.fontSize || 15, color: typo.heroDate?.color || '#6b5d4f', marginTop: 8, ...typeStyle(typo.heroDate) }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ fontSize: typo.heroVenue?.fontSize || 13, color: typo.heroVenue?.color || '#8a7a66', marginTop: 2, ...typeStyle(typo.heroVenue) }}>{settings.venue_line}</p>}
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
          {pretitleText && <p style={{ ...typeStyle(typo.heroPretitle), fontSize: typo.heroPretitle?.fontSize || 11, letterSpacing: '0.4em', textTransform: 'uppercase', color: typo.heroPretitle?.color || '#a07c4a' }}>{pretitleText}</p>}
          <h1 style={{ ...typeStyle(typo.heroTitle), fontFamily: heroTitleFont, fontSize: typo.heroTitle?.fontSize || 40, fontWeight: heroTitleWeight, color: heroTitleColor, margin: '12px 0', lineHeight: 1.1 }}>
            {settings.partner1_name}<br />
            <span style={{ fontFamily: 'Great Vibes, cursive', fontSize: 28, color: '#b5462f', ...ampBase }}>&amp;</span><br />
            {settings.partner2_name}
          </h1>
          {dateStr && <p style={{ fontSize: 14, color: '#6b5d4f', ...typeStyle(typo.heroDate) }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ fontSize: 12, color: '#8a7a66', marginTop: 2, ...typeStyle(typo.heroVenue) }}>{settings.venue_line}</p>}
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
          <p style={{ fontFamily: 'Great Vibes, cursive', fontSize: 'clamp(3rem, 10vw, 6rem)', color: 'rgba(255,245,225,0.95)', lineHeight: 1.1, textShadow: '0 2px 30px rgba(0,0,0,0.5)' }}>
            {settings.partner1_name} <span style={{ ...ampBase }}>&amp;</span> {settings.partner2_name}
          </p>
          {dateStr && <p style={{ fontSize: 13, color: 'rgba(255,225,170,0.85)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 8, ...typeStyle(typo.heroDate) }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ fontSize: 12, color: 'rgba(255,225,170,0.65)', marginTop: 4, ...typeStyle(typo.heroVenue) }}>{settings.venue_line}</p>}
          {settings.show_rsvp_button !== false && (
            <div className="mt-6">
              <button onClick={onRsvp} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: settings.cta_radius, padding: '10px 28px', fontSize: 14, fontWeight: 600, letterSpacing: '0.08em' }}>
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
          {pretitleText && <p style={{ fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,215,150,0.75)', marginBottom: 6 }}>{pretitleText}</p>}
          <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 'clamp(2rem, 6vw, 3.5rem)', color: '#fff', lineHeight: 1.1, marginBottom: 4 }}>
            {settings.partner1_name} <span style={{ fontFamily: 'Great Vibes, cursive', color: 'rgba(255,215,150,0.8)', ...ampBase }}>&amp;</span> {settings.partner2_name}
          </h1>
          <div className="flex items-center gap-4">
            {dateStr && <p style={{ fontSize: 13, color: 'rgba(255,225,170,0.8)', letterSpacing: '0.05em', ...typeStyle(typo.heroDate) }}>{dateStr}</p>}
            {settings.venue_line && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>·</span>}
            {settings.venue_line && <p style={{ fontSize: 12, color: 'rgba(255,225,170,0.6)', ...typeStyle(typo.heroVenue) }}>{settings.venue_line}</p>}
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
          {/* Corner ornaments */}
          {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
            <span key={i} className={`absolute ${pos} w-5 h-5 text-[#c9b896] text-lg`} style={{ lineHeight: 1, transform: i > 1 ? 'rotate(180deg)' : i === 1 ? 'scaleX(-1)' : '' }}>❧</span>
          ))}
          {pretitleText && <p style={{ fontSize: 10, letterSpacing: '0.45em', textTransform: 'uppercase', color: '#a07c4a', marginBottom: 12 }}>{pretitleText}</p>}
          <p style={{ fontFamily: 'Great Vibes, cursive', fontSize: 14, color: '#c9b896', letterSpacing: '0.05em', marginBottom: 6 }}>The marriage of</p>
          <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 36, color: '#5a4430', lineHeight: 1.15, margin: '8px 0' }}>{settings.partner1_name}</h1>
          <p style={{ fontFamily: 'Great Vibes, cursive', fontSize: 28, color: '#b5462f', ...ampBase }}>&amp;</p>
          <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 36, color: '#5a4430', lineHeight: 1.15, margin: '8px 0 16px' }}>{settings.partner2_name}</h1>
          <div className="flex items-center justify-center gap-2 my-4">
            <span className="h-px flex-1" style={{ background: 'rgba(160,124,74,0.3)' }} />
            <span style={{ color: '#c9b896', fontSize: 14 }}>✦</span>
            <span className="h-px flex-1" style={{ background: 'rgba(160,124,74,0.3)' }} />
          </div>
          {dateStr && <p style={{ fontSize: 13, color: '#6b5d4f', letterSpacing: '0.06em', ...typeStyle(typo.heroDate) }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ fontSize: 12, color: '#8a7a66', marginTop: 4, ...typeStyle(typo.heroVenue) }}>{settings.venue_line}</p>}
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
          {pretitleText && <p style={{ fontSize: 10, letterSpacing: '0.45em', textTransform: 'uppercase', color: '#7a8a60', marginBottom: 10 }}>{pretitleText}</p>}
          <div className="flex items-end gap-3">
            <div>
              <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 'clamp(2rem, 5vw, 3.2rem)', color: '#3a3020', lineHeight: 1.1 }}>{settings.partner1_name}</h1>
              <div className="flex items-center gap-2 my-1">
                <span className="h-px w-6" style={{ background: '#8a7a60' }} />
                <span style={{ fontFamily: 'Great Vibes, cursive', fontSize: 22, color: '#7a6a4a', ...ampBase }}>&amp;</span>
                <span className="h-px w-6" style={{ background: '#8a7a60' }} />
              </div>
              <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 'clamp(2rem, 5vw, 3.2rem)', color: '#3a3020', lineHeight: 1.1 }}>{settings.partner2_name}</h1>
            </div>
          </div>
          {dateStr && <p style={{ fontSize: 13, color: '#7a6a50', marginTop: 16, letterSpacing: '0.04em', ...typeStyle(typo.heroDate) }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ fontSize: 12, color: '#8a7a66', marginTop: 4, ...typeStyle(typo.heroVenue) }}>{settings.venue_line}</p>}
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
          {pretitleText && <p style={{ fontSize: 10, letterSpacing: '0.4em', textTransform: 'uppercase', color: '#a07c4a', marginBottom: 14 }}>{pretitleText}</p>}
          <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 38, color: '#5a4430', lineHeight: 1.15, margin: '6px 0' }}>{settings.partner1_name}</h1>
          <p style={{ fontFamily: 'Great Vibes, cursive', fontSize: 30, color: '#b5462f', ...ampBase }}>&amp;</p>
          <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 38, color: '#5a4430', lineHeight: 1.15, margin: '6px 0 16px' }}>{settings.partner2_name}</h1>
          <div className="flex items-center justify-center gap-2 my-4">
            <span className="h-px w-10" style={{ background: 'rgba(160,124,74,0.4)' }} />
            <span style={{ color: '#c9b896', fontSize: 12 }}>✦</span>
            <span className="h-px w-10" style={{ background: 'rgba(160,124,74,0.4)' }} />
          </div>
          {dateStr && <p style={{ fontSize: 13, color: '#6b5d4f', letterSpacing: '0.06em', ...typeStyle(typo.heroDate) }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ fontSize: 12, color: '#8a7a66', marginTop: 4, ...typeStyle(typo.heroVenue) }}>{settings.venue_line}</p>}
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
        {pretitleText && <p style={{ fontSize: 11, letterSpacing: '0.35em', textTransform: 'uppercase', color: '#9a7a90' }}>{pretitleText}</p>}
        <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 'clamp(2.2rem, 6vw, 3.6rem)', color: '#5a4060', margin: '10px 0 4px', lineHeight: 1.1 }}>{settings.partner1_name}</h1>
        <p style={{ fontFamily: 'Great Vibes, cursive', fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', color: '#b07a9a', ...ampBase }}>&amp;</p>
        <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 'clamp(2.2rem, 6vw, 3.6rem)', color: '#5a4060', margin: '4px 0 14px', lineHeight: 1.1 }}>{settings.partner2_name}</h1>
        {dateStr && <p style={{ fontSize: 14, color: '#7a6a80', ...typeStyle(typo.heroDate) }}>{dateStr}</p>}
        {settings.venue_line && <p style={{ fontSize: 12, color: '#9a8a90', marginTop: 2, ...typeStyle(typo.heroVenue) }}>{settings.venue_line}</p>}
        {countdown}
        {ctaButton}
      </header>
    );
  }

  // --- Modern Minimal ---
  if (layout === 'modern_minimal') {
    return (
      <header className="px-8 py-20 text-center" style={{ background: '#fff' }}>
        {pretitleText && <p style={{ fontSize: 10, letterSpacing: '0.5em', textTransform: 'uppercase', color: '#999', marginBottom: 18 }}>{pretitleText}</p>}
        <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 'clamp(2rem, 6vw, 3.4rem)', fontWeight: 700, color: '#222', margin: '4px 0', letterSpacing: '-0.02em', lineHeight: 1.05 }}>{settings.partner1_name}</h1>
        <p style={{ fontSize: 16, color: '#bbb', margin: '6px 0', ...ampBase }}>&amp;</p>
        <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 'clamp(2rem, 6vw, 3.4rem)', fontWeight: 700, color: '#222', margin: '4px 0 24px', letterSpacing: '-0.02em', lineHeight: 1.05 }}>{settings.partner2_name}</h1>
        <div className="flex items-center justify-center gap-3 my-4">
          <span className="h-px w-12" style={{ background: '#ddd' }} />
          {marriedText && <span style={{ ...marriedStyle, fontSize: marriedStyle.fontSize || 11, letterSpacing: '0.2em', color: marriedStyle.color || '#999' }}>{marriedText}</span>}
          <span className="h-px w-12" style={{ background: '#ddd' }} />
        </div>
        {dateStr && <p style={{ fontSize: 14, color: '#666', ...typeStyle(typo.heroDate) }}>{dateStr}</p>}
        {settings.venue_line && <p style={{ fontSize: 12, color: '#999', marginTop: 2, ...typeStyle(typo.heroVenue) }}>{settings.venue_line}</p>}
        {countdown}
        {ctaButton}
      </header>
    );
  }

  // --- Script Focus ---
  if (layout === 'script_focus') {
    return (
      <header className="px-8 py-20 text-center" style={{ background: 'var(--page-color)' }}>
        <p style={{ fontFamily: 'Great Vibes, cursive', fontSize: 'clamp(3.5rem, 12vw, 7rem)', color: '#b5462f', lineHeight: 1.05, margin: '0 0 8px' }}>{settings.partner1_name}</p>
        <p style={{ fontSize: 14, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#a07c4a', margin: '8px 0', ...ampBase }}>&amp;</p>
        <p style={{ fontFamily: 'Great Vibes, cursive', fontSize: 'clamp(3.5rem, 12vw, 7rem)', color: '#b5462f', lineHeight: 1.05, margin: '0 0 20px' }}>{settings.partner2_name}</p>
        {dateStr && <p style={{ fontSize: 14, color: '#6b5d4f', ...typeStyle(typo.heroDate) }}>{dateStr}</p>}
        {settings.venue_line && <p style={{ fontSize: 12, color: '#8a7a66', marginTop: 2, ...typeStyle(typo.heroVenue) }}>{settings.venue_line}</p>}
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
        {pretitleText && <p style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#a07c4a' }}>{pretitleText}</p>}
        <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 'clamp(2rem, 6vw, 3.2rem)', color: '#5a4430', margin: '8px 0', lineHeight: 1.1 }}>
          {settings.partner1_name} <span style={{ fontFamily: 'Great Vibes, cursive', color: '#b5462f', ...ampBase }}>&amp;</span> {settings.partner2_name}
        </h1>
        {dateStr && <p style={{ fontSize: 14, color: '#6b5d4f', marginTop: 6, ...typeStyle(typo.heroDate) }}>{dateStr}</p>}
        {settings.venue_line && <p style={{ fontSize: 12, color: '#8a7a66', marginTop: 2, ...typeStyle(typo.heroVenue) }}>{settings.venue_line}</p>}
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
          {pretitleText && <p style={{ fontSize: 10, letterSpacing: '0.4em', textTransform: 'uppercase', color: '#c9a96e' }}>{pretitleText}</p>}
          <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 'clamp(2.2rem, 6vw, 3.8rem)', color: '#f0e0c8', margin: '12px 0', lineHeight: 1.1, textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>{settings.partner1_name}</h1>
          <p style={{ fontFamily: 'Great Vibes, cursive', fontSize: 32, color: '#c9a96e', ...ampBase }}>&amp;</p>
          <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 'clamp(2.2rem, 6vw, 3.8rem)', color: '#f0e0c8', margin: '12px 0', lineHeight: 1.1, textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>{settings.partner2_name}</h1>
          <div className="flex items-center justify-center gap-3 my-4">
            <span className="h-px w-10" style={{ background: 'rgba(201,169,110,0.5)' }} />
            {marriedText && <span style={{ ...marriedStyle, fontSize: marriedStyle.fontSize || 10, letterSpacing: '0.25em', color: marriedStyle.color || '#c9a96e' }}>{marriedText}</span>}
            <span className="h-px w-10" style={{ background: 'rgba(201,169,110,0.5)' }} />
          </div>
          {dateStr && <p style={{ fontSize: 13, color: '#c9a96e', letterSpacing: '0.05em', ...typeStyle(typo.heroDate) }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ fontSize: 12, color: 'rgba(201,169,110,0.7)', marginTop: 2, ...typeStyle(typo.heroVenue) }}>{settings.venue_line}</p>}
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
          {pretitleText && <p style={{ fontSize: 10, letterSpacing: '0.4em', textTransform: 'uppercase', color: '#7a8a60', marginBottom: 12 }}>{pretitleText}</p>}
          <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 36, color: '#3a4030', margin: '8px 0', lineHeight: 1.15 }}>{settings.partner1_name}</h1>
          <p style={{ fontFamily: 'Great Vibes, cursive', fontSize: 28, color: '#8a9a6a', ...ampBase }}>&amp;</p>
          <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 36, color: '#3a4030', margin: '8px 0 16px', lineHeight: 1.15 }}>{settings.partner2_name}</h1>
          {dateStr && <p style={{ fontSize: 13, color: '#5a6a50', ...typeStyle(typo.heroDate) }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ fontSize: 12, color: '#7a8a6a', marginTop: 4, ...typeStyle(typo.heroVenue) }}>{settings.venue_line}</p>}
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
          {pretitleText && <p style={{ fontSize: 10, letterSpacing: '0.4em', textTransform: 'uppercase', color: '#a07c4a', marginBottom: 10 }}>{pretitleText}</p>}
          <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 'clamp(2rem, 5vw, 3.2rem)', color: '#5a4430', lineHeight: 1.1, margin: '4px 0' }}>{settings.partner1_name}</h1>
          <p style={{ fontFamily: 'Great Vibes, cursive', fontSize: 24, color: '#b5462f', margin: '4px 0', ...ampBase }}>&amp;</p>
          <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 'clamp(2rem, 5vw, 3.2rem)', color: '#5a4430', lineHeight: 1.1, margin: '4px 0 16px' }}>{settings.partner2_name}</h1>
          {dateStr && <p style={{ fontSize: 13, color: '#6b5d4f', ...typeStyle(typo.heroDate) }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ fontSize: 12, color: '#8a7a66', marginTop: 2, ...typeStyle(typo.heroVenue) }}>{settings.venue_line}</p>}
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
        {/* Names at top */}
        <div className="relative text-center px-6 pt-10 pb-4" style={{ background: 'var(--page-color)' }}>
          {pretitleText && <p style={{ ...typeStyle(typo.heroPretitle), fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: typo.heroPretitle?.color || '#a07c4a', marginBottom: 8 }}>{pretitleText}</p>}
          <h1 style={{ ...typeStyle(typo.heroTitle), fontFamily: typo.heroTitle?.fontFamily ? stackFor(typo.heroTitle.fontFamily) : 'var(--heading-font)', fontSize: typo.heroTitle?.fontSize || 'clamp(2rem, 6vw, 3.5rem)', fontWeight: typo.heroTitle?.fontWeight || 600, color: typo.heroTitle?.color || '#5a4430', margin: 0, lineHeight: 1.1 }}>
            {settings.partner1_name} <span style={{ fontFamily: 'Great Vibes, cursive', color: '#b5462f', fontSize: '0.7em', ...ampBase }}>&amp;</span> {settings.partner2_name}
          </h1>
        </div>

        {/* Hero image in center */}
        {settings.hero_image_url && (
          <div className="relative flex-1" style={{ minHeight: 380, backgroundImage: `url(${settings.hero_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        )}

        {/* Dates and countdown at bottom */}
        <div className="relative text-center px-6 pt-5 pb-8" style={{ background: 'var(--page-color)' }}>
          {dateStr && <p style={{ fontSize: typo.heroDate?.fontSize || 15, color: typo.heroDate?.color || '#6b5d4f', letterSpacing: '0.04em', ...typeStyle(typo.heroDate) }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ fontSize: typo.heroVenue?.fontSize || 13, color: typo.heroVenue?.color || '#8a7a66', marginTop: 2, ...typeStyle(typo.heroVenue) }}>{settings.venue_line}</p>}
          {countdown}
          {ctaButton}
        </div>
      </header>
    );
  }

  // --- Invitation Cover ---
  if (layout === 'invitation_cover') {
    const coverTitleStyle = { ...typeStyle(typo.heroTitle), fontFamily: heroTitleFont, color: '#3d2528' };
    return (
      <header className="relative overflow-hidden text-center" style={{ background: '#f8f8f6', color: '#3d2528' }}>
        <div className="relative overflow-hidden" style={{ height: 'clamp(390px, 62vh, 620px)', borderRadius: '0 0 45% 45% / 0 0 14% 14%' }}>
          {settings.hero_image_url ? (
            <div className="absolute inset-0" style={{ backgroundImage: `url(${settings.hero_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          ) : <div className="absolute inset-0" style={{ background: '#d9d5ca' }} />}
        </div>
        <div className="px-7 pb-10 pt-8">
          {pretitleText && <p style={{ fontFamily: heroTitleFont, fontSize: 13, color: '#6c2528', letterSpacing: '0.06em' }}>{pretitleText}</p>}
          <div className="mt-3" style={{ color: '#3d2528' }}>
            <p style={{ ...coverTitleStyle, fontSize: 'clamp(2.5rem, 11vw, 4rem)', lineHeight: 0.95 }}>{settings.partner1_name}</p>
            <p style={{ fontFamily: 'Great Vibes, cursive', fontSize: 25, lineHeight: 1, color: '#6c2528' }}>&amp;</p>
            <p style={{ ...coverTitleStyle, fontSize: 'clamp(2.5rem, 11vw, 4rem)', lineHeight: 0.95 }}>{settings.partner2_name}</p>
          </div>
          {marriedText && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <span className="h-px w-8" style={{ background: 'rgba(108,37,40,0.4)' }} />
              <span style={{ ...marriedStyle, fontSize: marriedStyle.fontSize || 10, letterSpacing: '0.2em', color: marriedStyle.color || '#6c2528' }}>{marriedText}</span>
              <span className="h-px w-8" style={{ background: 'rgba(108,37,40,0.4)' }} />
            </div>
          )}
          {dateStr && <p style={{ fontSize: 14, color: typo.heroDate?.color || '#6b5d4f', letterSpacing: '0.04em', marginTop: 10, ...typeStyle(typo.heroDate) }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ fontSize: 12, color: typo.heroVenue?.color || '#8a7a66', marginTop: 4, ...typeStyle(typo.heroVenue) }}>{settings.venue_line}</p>}
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
        {pretitleText && <p style={{ ...typeStyle(typo.heroPretitle), fontSize: typo.heroPretitle?.fontSize || 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: typo.heroPretitle?.color || '#a07c4a' }}>{pretitleText}</p>}
        {names}
        <div className="flex items-center justify-center gap-3 my-3">
          <span className="h-px w-10" style={{ background: typo.heroMarried?.color || typo.heroTitle?.color || '#c9b896' }} />
          {marriedText && <span style={{ ...marriedStyle, fontSize: marriedStyle.fontSize || 11, letterSpacing: '0.2em', color: marriedStyle.color || '#a07c4a' }}>{marriedText}</span>}
          <span className="h-px w-10" style={{ background: typo.heroMarried?.color || typo.heroTitle?.color || '#c9b896' }} />
        </div>
        {dateStr && <p style={{ fontSize: typo.heroDate?.fontSize || 15, color: typo.heroDate?.color || '#6b5d4f', marginTop: 8, ...typeStyle(typo.heroDate) }}>{dateStr}</p>}
        {settings.venue_line && <p style={{ fontSize: typo.heroVenue?.fontSize || 13, color: typo.heroVenue?.color || '#8a7a66', marginTop: 2, ...typeStyle(typo.heroVenue) }}>{settings.venue_line}</p>}
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
