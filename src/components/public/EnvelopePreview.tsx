import { useState, useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import type { SiteSettings } from '@/types';
import { stackFor } from '@/lib/fonts';

type Phase = 'closed' | 'releasing' | 'opening' | 'rising' | 'open';

interface Props {
  settings: SiteSettings;
  fullscreen?: boolean;
  onClose?: () => void;
}

export default function EnvelopePreview({ settings, fullscreen, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('closed');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const handleOpen = () => {
    if (phase !== 'closed') return;
    timers.current.forEach(clearTimeout);
    setPhase('releasing');
    timers.current = [
      setTimeout(() => setPhase('opening'), 240),
      setTimeout(() => setPhase('rising'), 1300),
      setTimeout(() => setPhase('open'), 3000),
    ];
  };

  const handleClose = () => { timers.current.forEach(clearTimeout); setPhase('closed'); };

  // ---- Color utilities ----
  const adjustColor = (hex: string, amount: number): string => {
    if (!hex || !hex.startsWith('#')) return hex;
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
    const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
    return `rgb(${r}, ${g}, ${b})`;
  };
  const withAlpha = (color: string, opacity: number): string => {
    const ch = color?.match(/\d+(?:\.\d+)?/g);
    if (ch && ch.length >= 3) return `rgba(${ch[0]}, ${ch[1]}, ${ch[2]}, ${opacity})`;
    return color;
  };
  const isLightColor = (hex: string): boolean => {
    if (!hex || !hex.startsWith('#')) return true;
    const num = parseInt(hex.slice(1), 16);
    const r = (num >> 16) & 0xff; const g = (num >> 8) & 0xff; const b = num & 0xff;
    return (r * 299 + g * 587 + b * 114) / 1000 > 140;
  };

  // ---- Envelope colors ----
  const env = settings.invitation_envelope_color || '#FAFAFA';
  const envIsLight = isLightColor(env);
  const envHighlight = adjustColor(env, 22);
  const envShadow = adjustColor(env, -30);
  const envDeepShadow = adjustColor(env, -58);
  const envGradient = `linear-gradient(145deg, ${envHighlight} 0%, ${env} 36%, ${envShadow} 72%, ${envDeepShadow} 100%)`;
  const linerColor = settings.env_liner_color || env;
  const linerBg = settings.env_liner_pattern === 'stripes'
    ? `repeating-linear-gradient(45deg, ${linerColor}, ${linerColor} 8px, ${adjustColor(linerColor, -8)} 8px, ${adjustColor(linerColor, -8)} 16px)`
    : linerColor;

  // ---- Wax seal colors ----
  const waxBase = settings.invitation_wax_seal_color || '#C5A059';
  const waxLight = adjustColor(waxBase, 38);
  const waxDark = adjustColor(waxBase, -42);

  // ---- Textures ----
  const grainTexture = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='500'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='500' height='500' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;
  const fiberTexture = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='500'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.018 0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='500' height='500' filter='url(%23f)' opacity='0.25'/%3E%3C/svg%3E")`;

  const useTextures = typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches;

  // ---- Phase flags ----
  const isOpen = phase === 'open';
  const isReleasing = phase === 'releasing';
  const isFlapLifted = ['opening', 'rising', 'open'].includes(phase);
  const sealVisible = phase === 'closed' || phase === 'releasing';
  const showSeal = phase === 'closed';

  const flapTransform = phase === 'opening' ? 'rotateX(108deg)' : isFlapLifted ? 'rotateX(172deg)' : 'rotateX(0deg)';

  const paperMotion = phase === 'rising'
    ? { opacity: 1, transform: 'translateY(-72px) scale(0.94)' }
    : phase === 'open'
    ? { opacity: 1, transform: 'translateY(0) scale(1)' }
    : { opacity: 0, transform: 'translateY(80px) scale(0.9)' };

  // ---- Flap name ----
  const showFlapName = settings.invitation_flap_show_name !== false;
  const flapNameText = settings.invitation_flap_name_text || 'Sample Guest';
  const nameFont = settings.invitation_flap_name_font || 'Great Vibes';
  const nameColor = settings.invitation_flap_name_color || adjustColor(env, -45);

  // ---- Letter paper ----
  const paperBg = settings.invitation_paper_background_color || '#fffef8';
  const paperText = settings.invitation_paper_text_color || '#5a4430';
  const paperBorderColor = settings.invitation_paper_border_color || '#e6ddcd';
  const headingFont = settings.invitation_paper_heading_font || 'Great Vibes';
  const headingColor = settings.invitation_paper_heading_color || settings.invitation_paper_text_color || '#5a4430';
  const bodyFont = settings.invitation_paper_body_font || 'Cormorant Garamond';
  const weddingDate = settings.wedding_date ? new Date(settings.wedding_date) : null;
  const rsvpDeadlineDate = settings.rsvp_deadline ? new Date(settings.rsvp_deadline) : null;
  const rsvpDeadlineStr = rsvpDeadlineDate
    ? rsvpDeadlineDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';
  const bodyText = (settings.invitation_paper_body || `Dear Guest,\n\nWe joyfully request the pleasure of your company as we celebrate our union.`)
    .replace(/\{\{guest_name\}\}/g, 'Sample Guest')
    .replace(/\{\{name_on_card\}\}/g, 'Sample Name')
    .replace(/\{\{partner1_name\}\}/g, settings.partner1_name)
    .replace(/\{\{partner2_name\}\}/g, settings.partner2_name)
    .replace(/\{\{rsvp_deadline\}\}/g, rsvpDeadlineStr)
    .replace(/\{\{wedding_date\}\}/g, weddingDate ? weddingDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '')
    .replace(/\{\{party_name\}\}/g, 'The Smith Family')
    .replace(/\{\{gate_password\}\}/g, settings.public_password || '')
    .replace(/\{\{rsvp_link\}\}/g, '#');
  const buttons = settings.invitation_paper_buttons || [];
  const initials = `${(settings.partner1_name || 'A')[0]}${(settings.partner2_name || 'B')[0]}`;

  const container = fullscreen
    ? 'min-h-screen flex flex-col items-center justify-center px-4 py-8'
    : 'flex flex-col items-center justify-center px-4 py-8 min-h-[420px]';

  return (
    <div className={container}>
      <div className="relative w-full max-w-sm" style={{ minHeight: fullscreen ? 'calc(100svh - 4rem)' : 400 }}>
        {/* ---- Envelope ---- */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{
            opacity: isOpen ? 0 : 1,
            transform: isOpen ? 'scale(0.88) translateY(15px)' : 'scale(1)',
            transition: 'opacity 0.5s ease 0.4s, transform 0.5s ease 0.4s',
            pointerEvents: isOpen ? 'none' : 'auto',
          }}
        >
          {showSeal && (
            <p className="text-center mb-4 text-xs fade-up" style={{ color: '#c9b896', letterSpacing: '0.12em', fontFamily: stackFor(headingFont) }}>
              {settings.env_greeting || 'You are cordially invited'}
            </p>
          )}

          <div className="relative w-full" style={{ height: 240 }}>
            {/* Shadow */}
            <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: 2, boxShadow: '0 24px 50px rgba(0,0,0,0.25), 0 8px 20px rgba(0,0,0,0.12)' }} />
            {/* Lower edge */}
            <div className="absolute inset-x-[2px] -bottom-[5px] h-3 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${envShadow}, ${envDeepShadow})` }} />
            {/* Body */}
            <div className="absolute inset-0" style={{ background: envGradient, border: `1px solid ${withAlpha(envDeepShadow, 0.34)}`, borderRadius: 2, boxShadow: `inset 2px 2px 2px ${withAlpha(envHighlight, 0.68)}, inset -3px -3px 5px ${withAlpha(envDeepShadow, 0.3)}` }} />
            {/* Grain */}
            {useTextures && <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: grainTexture, opacity: envIsLight ? 0.1 : 0.06, mixBlendMode: 'multiply' }} />}
            {useTextures && <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: fiberTexture, opacity: envIsLight ? 0.05 : 0.03, mixBlendMode: 'multiply' }} />}
            {/* Pocket V */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: envGradient, clipPath: 'polygon(0 0, 50% 58%, 100% 0, 100% 100%, 0 100%)' }} />
            {/* Pocket shadow */}
            <div className="absolute inset-0 pointer-events-none" style={{ clipPath: 'polygon(0 0, 50% 58%, 100% 0)', background: `linear-gradient(to bottom, ${withAlpha(envShadow, 0.34)} 0%, transparent 45%)` }} />
            {/* Crease lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0 0 L50 58 L100 0" fill="none" stroke={withAlpha(envDeepShadow, envIsLight ? 0.44 : 0.36)} strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
              <path d="M0 100 L50 58 L100 100" fill="none" stroke={withAlpha(envDeepShadow, 0.34)} strokeWidth="0.68" vectorEffect="non-scaling-stroke" />
            </svg>
            {/* Liner (shows when flap lifts) */}
            <div className="absolute inset-0 pointer-events-none" style={{ clipPath: 'polygon(4% 2%, 96% 2%, 50% 55%)', background: linerBg, opacity: isFlapLifted ? 1 : 0, transform: isFlapLifted ? 'translateY(1px)' : 'translateY(-5px)', transition: 'opacity 0.48s ease 0.35s, transform 0.78s cubic-bezier(0.22, 0.8, 0.27, 1) 0.25s' }} />

            {/* Flap */}
            <div className="absolute inset-x-0 top-0" style={{ height: '100%', perspective: 1450, perspectiveOrigin: '50% 8%' }}>
              <div className="w-full h-full origin-top relative" style={{ transform: flapTransform, transformStyle: 'preserve-3d', transition: phase === 'opening' ? 'transform 1.05s cubic-bezier(0.16, 0.86, 0.28, 1)' : 'transform 1s cubic-bezier(0.22, 0.8, 0.26, 1.08)' }}>
                {/* Flap face */}
                <div className="w-full h-full absolute inset-0" style={{ background: envGradient, clipPath: 'polygon(0 0, 100% 0, 50% 58%)', boxShadow: `inset 0 -10px 19px ${withAlpha(envDeepShadow, 0.42)}`, backfaceVisibility: 'hidden' }}>
                  {useTextures && <div className="absolute inset-0 pointer-events-none" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 58%)', backgroundImage: grainTexture, opacity: 0.08, mixBlendMode: 'multiply' }} />}
                  {/* Guest name on flap */}
                  {showFlapName && flapNameText && (
                    <div className="absolute inset-x-0 top-[14%] text-center pointer-events-none">
                      <p style={{ fontFamily: stackFor(nameFont), fontSize: 'clamp(1.1rem, 4vw, 1.6rem)', color: nameColor, lineHeight: 1.2, letterSpacing: '0.01em', opacity: 0.85 }}>
                        {flapNameText}
                      </p>
                    </div>
                  )}
                </div>

                {/* Wax seal */}
                <div className="absolute left-1/2 top-[58%] z-40" style={{ transform: `translate(-50%, -50%) translateZ(5px) rotate(${isReleasing ? '-3deg' : '0deg'}) scale(${isReleasing ? 0.88 : sealVisible ? 1 : 0.6})`, opacity: sealVisible ? 1 : 0, transition: 'opacity 0.32s ease, transform 0.28s cubic-bezier(0.3, 1.4, 0.5, 1)', pointerEvents: sealVisible ? 'auto' : 'none', backfaceVisibility: 'hidden' }}>
                  <button onClick={handleOpen} type="button" className="group cursor-pointer bg-transparent border-0 p-0">
                    <div className="relative transition-transform duration-300 group-hover:scale-110 group-active:scale-95" style={{ width: 72, height: 72 }}>
                      <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle at 38% 28%, ${waxLight} 0%, ${waxBase} 45%, ${waxDark} 100%)`, boxShadow: `inset 0 4px 8px ${withAlpha(waxLight, 0.53)}, inset 0 -10px 18px rgba(0,0,0,0.5), 0 8px 18px rgba(0,0,0,0.3)` }} />
                      <div className="absolute inset-[10px] rounded-full flex items-center justify-center overflow-hidden" style={{ boxShadow: 'inset 0 5px 10px rgba(0,0,0,0.55)', background: `radial-gradient(circle at 42% 36%, ${waxBase} 0%, ${waxDark} 100%)` }}>
                        {settings.invitation_wax_seal_image_url ? (
                          <img src={settings.invitation_wax_seal_image_url} alt="Monogram" className="w-full h-full object-cover" style={{ filter: 'contrast(1.25) brightness(0.68)' }} />
                        ) : (
                          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 20, fontFamily: stackFor(nameFont), textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{initials}</span>
                        )}
                      </div>
                      {/* Glint */}
                      <div className="absolute top-2 left-4 w-8 h-3.5 rounded-full opacity-30 pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.8), transparent 70%)', filter: useTextures ? 'blur(2px)' : 'none' }} />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {showSeal && (
            <p className="text-center mt-5 text-xs fade-up" style={{ color: '#c9b896', letterSpacing: '0.15em' }}>TAP THE SEAL TO OPEN</p>
          )}
        </div>

        {/* ---- Letter paper ---- */}
        <div className="w-full" style={{
          ...paperMotion,
          pointerEvents: isOpen ? 'auto' : 'none',
          willChange: 'transform, opacity',
          transition: phase === 'rising'
            ? 'opacity 0.28s ease, transform 1.55s cubic-bezier(0.16, 0.88, 0.27, 1)'
            : 'opacity 0.4s ease, transform 0.76s cubic-bezier(0.22, 0.78, 0.3, 1)',
        }}>
          <div className="overflow-hidden flex flex-col" style={{ maxHeight: fullscreen ? 'calc(100svh - 6rem)' : 380, background: paperBg, border: `1px solid ${paperBorderColor}`, borderRadius: 4, boxShadow: '0 24px 48px rgba(25,18,10,0.22), 0 5px 12px rgba(25,18,10,0.12)' }}>
            <div className="flex-1 min-h-0 p-6 flex flex-col text-center overflow-y-auto items-center thin-scroll">
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="h-px w-8" style={{ background: 'rgba(181,154,107,0.3)' }} />
                <span style={{ color: '#b59a6b', fontSize: 12 }}>&#10022;</span>
                <span className="h-px w-8" style={{ background: 'rgba(181,154,107,0.3)' }} />
              </div>
              {settings.invitation_paper_show_names !== false && (
                <>
                  <h2 className="leading-tight mb-1 w-full" style={{ fontFamily: stackFor(headingFont), fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', color: headingColor }}>{settings.partner1_name}</h2>
                  <p className="text-xl italic mb-1" style={{ fontFamily: stackFor(headingFont), color: headingColor }}>&amp;</p>
                  <h2 className="leading-tight mb-4 w-full" style={{ fontFamily: stackFor(headingFont), fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', color: headingColor }}>{settings.partner2_name}</h2>
                </>
              )}
              {weddingDate && (
                <p style={{ fontSize: 11, color: paperText, opacity: 0.7, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                  {weddingDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
              {rsvpDeadlineDate && (
                <p style={{ fontSize: 10, color: paperText, opacity: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                  RSVP by {rsvpDeadlineStr}
                </p>
              )}
              <div className="h-px w-12 mx-auto my-3" style={{ background: 'rgba(181,154,107,0.3)' }} />
              <div className="text-sm mb-4 leading-relaxed w-full text-left [&_p]:mb-2 [&_p:last-child]:mb-0" style={{ fontFamily: stackFor(bodyFont), color: paperText, opacity: 0.85 }} dangerouslySetInnerHTML={{ __html: bodyText }} />
              {buttons.length > 0 && (
                <div className="flex flex-col gap-2 w-full mt-auto pt-2">
                  {buttons.map((btn, i) => (
                    <div key={i} className="px-5 py-2 text-center text-xs font-semibold tracking-widest" style={{ border: `1px solid ${withAlpha(paperText, 0.3)}`, borderRadius: 3, color: paperText, letterSpacing: '0.1em' }}>{btn.label}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {isOpen && (
            <button onClick={handleClose} className="mt-4 mx-auto flex items-center gap-1.5 text-xs transition-colors fade-up" style={{ color: '#c9b896', letterSpacing: '0.08em' }}>
              <RotateCcw size={13} /> Close Invitation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
