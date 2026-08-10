import { useEffect, useState } from 'react';
import type { SiteSettings, TypeStyle } from '@/types';
import { typeStyle } from '@/lib/typography';

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

  const countdown = target > 0 && (
    <div className="flex justify-center gap-3 mt-6">
      <CountdownUnit value={days} label="Days" light={['centered', 'fullscreen', 'magazine'].includes(layout)} />
      <CountdownUnit value={hours} label="Hours" light={['centered', 'fullscreen', 'magazine'].includes(layout)} />
      <CountdownUnit value={mins} label="Mins" light={['centered', 'fullscreen', 'magazine'].includes(layout)} />
      <CountdownUnit value={secs} label="Secs" light={['centered', 'fullscreen', 'magazine'].includes(layout)} />
    </div>
  );

  const ctaButton = (
    <button onClick={onRsvp} className="mt-6 font-semibold transition hover:opacity-90" style={{ background: settings.cta_bg_color, color: settings.cta_text_color, borderRadius: settings.cta_radius, padding: '10px 28px', fontSize: 15 }}>
      {settings.cta_text}
    </button>
  );

  const names = (
    <>
      <h1 style={{ ...typeStyle(typo.heroTitle), fontFamily: 'var(--heading-font)', fontSize: 48, color: '#5a4430', margin: '10px 0 4px', lineHeight: 1.1 }}>
        {settings.partner1_name}
      </h1>
      <p style={{ fontFamily: 'Great Vibes, cursive', fontSize: 40, color: '#b5462f', margin: 0 }}>&amp;</p>
      <h1 style={{ ...typeStyle(typo.heroTitle), fontFamily: 'var(--heading-font)', fontSize: 48, color: '#5a4430', margin: '4px 0 14px', lineHeight: 1.1 }}>
        {settings.partner2_name}
      </h1>
    </>
  );

  const namesLight = (
    <>
      <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 'clamp(2.5rem, 8vw, 5rem)', color: '#fff', margin: '10px 0 4px', lineHeight: 1.05, textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
        {settings.partner1_name}
      </h1>
      <p style={{ fontFamily: 'Great Vibes, cursive', fontSize: 'clamp(2rem, 6vw, 3.5rem)', color: 'rgba(255,240,210,0.9)', margin: 0 }}>&amp;</p>
      <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 'clamp(2.5rem, 8vw, 5rem)', color: '#fff', margin: '4px 0 14px', lineHeight: 1.05, textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
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
          <p style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#f0e0c8' }}>Together with their families</p>
          {namesLight}
          {dateStr && <p style={{ fontSize: 15, color: '#f0e0c8', marginTop: 8 }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ fontSize: 13, color: '#d8c8a8', marginTop: 2 }}>{settings.venue_line}</p>}
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
          <p style={{ ...typeStyle(typo.heroPretitle), fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#a07c4a' }}>Together with their families</p>
          {names}
          {dateStr && <p style={{ ...typeStyle(typo.heroDate), fontSize: 15, color: '#6b5d4f', marginTop: 8 }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ fontSize: 13, color: '#8a7a66', marginTop: 2 }}>{settings.venue_line}</p>}
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
          <p style={{ fontSize: 11, letterSpacing: '0.4em', textTransform: 'uppercase', color: '#a07c4a' }}>We Invite You</p>
          <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 40, color: '#5a4430', margin: '12px 0', lineHeight: 1.1 }}>
            {settings.partner1_name}<br />
            <span style={{ fontFamily: 'Great Vibes, cursive', fontSize: 28, color: '#b5462f' }}>&amp;</span><br />
            {settings.partner2_name}
          </h1>
          {dateStr && <p style={{ fontSize: 14, color: '#6b5d4f' }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ fontSize: 12, color: '#8a7a66', marginTop: 2 }}>{settings.venue_line}</p>}
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
            {settings.partner1_name} &amp; {settings.partner2_name}
          </p>
          {dateStr && <p style={{ fontSize: 13, color: 'rgba(255,225,170,0.85)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 8 }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ fontSize: 12, color: 'rgba(255,225,170,0.65)', marginTop: 4 }}>{settings.venue_line}</p>}
          <div className="mt-6">
            <button onClick={onRsvp} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: settings.cta_radius, padding: '10px 28px', fontSize: 14, fontWeight: 600, letterSpacing: '0.08em' }}>
              {settings.cta_text}
            </button>
          </div>
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
          <p style={{ fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,215,150,0.75)', marginBottom: 6 }}>The Wedding of</p>
          <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 'clamp(2rem, 6vw, 3.5rem)', color: '#fff', lineHeight: 1.1, marginBottom: 4 }}>
            {settings.partner1_name} <span style={{ fontFamily: 'Great Vibes, cursive', color: 'rgba(255,215,150,0.8)' }}>&amp;</span> {settings.partner2_name}
          </h1>
          <div className="flex items-center gap-4">
            {dateStr && <p style={{ fontSize: 13, color: 'rgba(255,225,170,0.8)', letterSpacing: '0.05em' }}>{dateStr}</p>}
            {settings.venue_line && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>·</span>}
            {settings.venue_line && <p style={{ fontSize: 12, color: 'rgba(255,225,170,0.6)' }}>{settings.venue_line}</p>}
          </div>
          <div className="flex items-center gap-4 mt-4">
            <button onClick={onRsvp} style={{ background: settings.cta_bg_color, color: settings.cta_text_color, borderRadius: settings.cta_radius, padding: '8px 20px', fontSize: 13, fontWeight: 600 }}>{settings.cta_text}</button>
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
          <p style={{ fontSize: 10, letterSpacing: '0.45em', textTransform: 'uppercase', color: '#a07c4a', marginBottom: 12 }}>Together with their families</p>
          <p style={{ fontFamily: 'Great Vibes, cursive', fontSize: 14, color: '#c9b896', letterSpacing: '0.05em', marginBottom: 6 }}>The marriage of</p>
          <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 36, color: '#5a4430', lineHeight: 1.15, margin: '8px 0' }}>{settings.partner1_name}</h1>
          <p style={{ fontFamily: 'Great Vibes, cursive', fontSize: 28, color: '#b5462f' }}>&amp;</p>
          <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 36, color: '#5a4430', lineHeight: 1.15, margin: '8px 0 16px' }}>{settings.partner2_name}</h1>
          <div className="flex items-center justify-center gap-2 my-4">
            <span className="h-px flex-1" style={{ background: 'rgba(160,124,74,0.3)' }} />
            <span style={{ color: '#c9b896', fontSize: 14 }}>✦</span>
            <span className="h-px flex-1" style={{ background: 'rgba(160,124,74,0.3)' }} />
          </div>
          {dateStr && <p style={{ fontSize: 13, color: '#6b5d4f', letterSpacing: '0.06em' }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ fontSize: 12, color: '#8a7a66', marginTop: 4 }}>{settings.venue_line}</p>}
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
          <p style={{ fontSize: 10, letterSpacing: '0.45em', textTransform: 'uppercase', color: '#7a8a60', marginBottom: 10 }}>You are invited to celebrate</p>
          <div className="flex items-end gap-3">
            <div>
              <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 'clamp(2rem, 5vw, 3.2rem)', color: '#3a3020', lineHeight: 1.1 }}>{settings.partner1_name}</h1>
              <div className="flex items-center gap-2 my-1">
                <span className="h-px w-6" style={{ background: '#8a7a60' }} />
                <span style={{ fontFamily: 'Great Vibes, cursive', fontSize: 22, color: '#7a6a4a' }}>&amp;</span>
                <span className="h-px w-6" style={{ background: '#8a7a60' }} />
              </div>
              <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 'clamp(2rem, 5vw, 3.2rem)', color: '#3a3020', lineHeight: 1.1 }}>{settings.partner2_name}</h1>
            </div>
          </div>
          {dateStr && <p style={{ fontSize: 13, color: '#7a6a50', marginTop: 16, letterSpacing: '0.04em' }}>{dateStr}</p>}
          {settings.venue_line && <p style={{ fontSize: 12, color: '#8a7a66', marginTop: 4 }}>{settings.venue_line}</p>}
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
        <p style={{ ...typeStyle(typo.heroPretitle), fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#a07c4a' }}>Together with their families</p>
        {names}
        <div className="flex items-center justify-center gap-3 my-3">
          <span className="h-px w-10" style={{ background: '#c9b896' }} />
          <span style={{ fontSize: 11, letterSpacing: '0.2em', color: '#a07c4a' }}>ARE GETTING MARRIED</span>
          <span className="h-px w-10" style={{ background: '#c9b896' }} />
        </div>
        {dateStr && <p style={{ ...typeStyle(typo.heroDate), fontSize: 15, color: '#6b5d4f', marginTop: 8 }}>{dateStr}</p>}
        {settings.venue_line && <p style={{ fontSize: 13, color: '#8a7a66', marginTop: 2 }}>{settings.venue_line}</p>}
        {countdown}
        {ctaButton}
      </div>
    </header>
  );
}

function CountdownUnit({ value, label, light }: { value: number; label: string; light?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ background: light ? 'rgba(255,255,255,0.18)' : 'rgba(138,109,59,0.10)', border: `1px solid ${light ? 'rgba(255,255,255,0.3)' : 'rgba(138,109,59,0.2)'}` }}>
        <span style={{ fontFamily: 'var(--heading-font)', fontSize: 24, fontWeight: 600, color: light ? '#fff' : '#5a4430' }}>
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: light ? 'rgba(255,230,180,0.8)' : '#a07c4a', marginTop: 4 }}>
        {label}
      </span>
    </div>
  );
}
