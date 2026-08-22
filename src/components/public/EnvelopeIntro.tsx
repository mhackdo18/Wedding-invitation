import { useState, useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import type { SiteSettings } from '@/types';
import { stackFor } from '@/lib/fonts';

type Phase = 'closed' | 'releasing' | 'opening' | 'rising' | 'open';

export default function EnvelopeIntro({
  open, onClose, settings, guestName, partyName,
}: { open: boolean; onClose: () => void; settings: SiteSettings; guestName?: string; partyName?: string }) {
  const [phase, setPhase] = useState<Phase>('closed');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (open) setPhase('closed');
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [open]);

  if (!open) return null;

  const displayName = (guestName || partyName || 'Guest').trim();
  const initials = `${(settings.partner1_name || 'A')[0] || ''}${(settings.partner2_name || 'B')[0] || ''}`;

  const rsvpDeadline = settings.rsvp_deadline
    ? new Date(settings.rsvp_deadline).toLocaleDateString([], { dateStyle: 'long' })
    : '';
  const weddingDateStr = settings.wedding_date
    ? new Date(settings.wedding_date).toLocaleDateString([], { dateStyle: 'long' })
    : '';

  const nameOnCard = (guestName || '').trim();

  const replaceTags = (text: string) =>
    text
      .replace(/\{\{guest_name\}\}/g, displayName)
      .replace(/\{\{name_on_card\}\}/g, nameOnCard || displayName)
      .replace(/\{\{party_name\}\}/g, partyName || '')
      .replace(/\{\{partner1_name\}\}/g, settings.partner1_name)
      .replace(/\{\{partner2_name\}\}/g, settings.partner2_name)
      .replace(/\{\{partner_name\}\}/g, `${settings.partner1_name} & ${settings.partner2_name}`)
      .replace(/\{\{wedding_date\}\}/g, weddingDateStr)
      .replace(/\{\{rsvp_deadline\}\}/g, rsvpDeadline)
      .replace(/\{\{gate_password\}\}/g, settings.public_password || '')
      .replace(/\{\{rsvp_link\}\}/g, '');

  const fillLetterBody = (body: string) => replaceTags(body);

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

  const handleClose = () => {
    timers.current.forEach(clearTimeout);
    setPhase('closed');
  };

  const handleCtaClick = () => {
    if (settings.env_cta_type === 'external' && settings.env_cta_link) {
      window.open(settings.env_cta_link, '_blank');
    } else {
      onClose();
    }
  };

  // --- Color utilities ---
  const adjustColor = (hex: string, amount: number): string => {
    if (!hex || !hex.startsWith('#')) return hex;
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
    const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
    return `rgb(${r}, ${g}, ${b})`;
  };

  const withAlpha = (color: string, opacity: number): string => {
    const channels = color?.match(/\d+(?:\.\d+)?/g);
    if (channels && channels.length >= 3) {
      return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${opacity})`;
    }
    return color;
  };

  const isLightColor = (hex: string): boolean => {
    if (!hex || !hex.startsWith('#')) return true;
    const num = parseInt(hex.slice(1), 16);
    const r = (num >> 16) & 0xff;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    return (r * 299 + g * 587 + b * 114) / 1000 > 140;
  };

  // --- Envelope colors ---
  const env = settings.invitation_envelope_color || settings.env_color || '#FAFAFA';
  const envIsLight = isLightColor(env);
  const envHighlight = adjustColor(env, 22);
  const envShadow = adjustColor(env, -30);
  const envDeepShadow = adjustColor(env, -58);
  const envGradient = `linear-gradient(145deg, ${envHighlight} 0%, ${env} 36%, ${envShadow} 72%, ${envDeepShadow} 100%)`;
  const linerGradient = `linear-gradient(165deg, ${envHighlight} 0%, ${env} 54%, ${envShadow} 100%)`;

  // --- Wax seal colors ---
  const waxBase = settings.invitation_wax_seal_color || settings.seal_color || '#C5A059';
  const waxLight = adjustColor(waxBase, 38);
  const waxDark = adjustColor(waxBase, -42);

  // --- Liner pattern ---
  const linerBg = settings.env_liner_pattern === 'stripes'
    ? `repeating-linear-gradient(45deg, ${settings.env_liner_color}, ${settings.env_liner_color} 8px, ${adjustColor(settings.env_liner_color, -8)} 8px, ${adjustColor(settings.env_liner_color, -8)} 16px)`
    : settings.env_liner_pattern === 'dots'
    ? `radial-gradient(${adjustColor(settings.env_liner_color, -15)} 1.5px, transparent 1.5px)`
    : settings.env_liner_color;

  // --- Textures ---
  const grainTexture = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='500'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='500' height='500' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;
  const fiberTexture = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='500'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.018 0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='500' height='500' filter='url(%23f)' opacity='0.25'/%3E%3C/svg%3E")`;

  // Disable expensive textures on small screens for smoother performance
  const useTextures = typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches;

  // --- Phase flags ---
  const isOpen = phase === 'open';
  const isReleasing = phase === 'releasing';
  const isOpening = phase === 'opening' || phase === 'rising';
  const isFlapLifted = isOpening || isOpen;
  const sealVisible = phase === 'closed' || phase === 'releasing';
  const showSeal = phase === 'closed';

  const flapTransform = phase === 'opening'
    ? 'rotateX(108deg)'
    : isFlapLifted
      ? 'rotateX(172deg)'
      : 'rotateX(0deg)';

  const paperMotion = phase === 'rising'
    ? { opacity: 1, transform: 'translateY(clamp(-88px, -18vw, -64px)) scale(0.94)' }
    : phase === 'open'
      ? { opacity: 1, transform: 'translateY(0) scale(1)' }
      : { opacity: 0, transform: 'translateY(clamp(70px, 24vw, 96px)) scale(0.9)' };

  const letterFontStack = stackFor(settings.invitation_paper_body_font || 'Cormorant Garamond');
  const letterTextColor = settings.invitation_paper_text_color || '#5a4430';
  const headingFontStack = stackFor(settings.invitation_paper_heading_font || 'Great Vibes');
  const headingColor = settings.invitation_paper_heading_color || settings.invitation_paper_text_color || '#5a4430';
  const paperBg = settings.invitation_paper_background_color || '#fffef8';
  const paperBorder = settings.invitation_paper_border_color || 'rgba(180,160,130,0.4)';

  const showFlapName = settings.invitation_flap_show_name !== false;
  const flapNameTemplate = settings.invitation_flap_name_text || '';
  const flapNameText = flapNameTemplate.trim()
    ? replaceTags(flapNameTemplate)
    : (guestName || partyName || 'Guest');
  const flapNameFont = settings.invitation_flap_name_font || 'Great Vibes';
  const flapNameColor = settings.invitation_flap_name_color || adjustColor(env, -45);
  const weddingDate = settings.wedding_date ? new Date(settings.wedding_date) : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-3 py-5 sm:px-4 sm:py-8 overflow-x-hidden" style={{ background: 'rgba(40,28,18,0.82)', backdropFilter: useTextures ? 'blur(6px)' : 'none' }}>
      <div className="relative w-full max-w-md min-h-[calc(100svh-2.5rem)] sm:min-h-[520px] flex items-center justify-center">
        {/* ---- Envelope ---- */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{
            opacity: isOpen ? 0 : 1,
            transform: isOpen ? 'scale(0.88) translateY(15px)' : 'scale(1) translateY(0)',
            transition: 'opacity 0.5s ease 0.4s, transform 0.5s ease 0.4s',
            pointerEvents: isOpen ? 'none' : 'auto',
          }}
        >
          {showSeal && (
            <div className="text-center mb-5 max-w-xs fade-up">
              <p style={{ fontFamily: 'var(--heading-font)', fontSize: 15, color: '#f0e0c8', lineHeight: 1.6 }}>
                {settings.env_greeting || 'You are cordially invited to celebrate our wedding'}
              </p>
            </div>
          )}

          <div className="relative h-[min(78vw,20rem)] sm:h-80 w-full max-w-sm">
            {/* Contact shadow */}
            <div className="absolute -inset-x-5 -bottom-6 h-12 rounded-[50%] pointer-events-none" style={{
              background: 'radial-gradient(ellipse at center, rgba(20,16,12,0.26) 0%, rgba(20,16,12,0.1) 38%, transparent 74%)',
              filter: useTextures ? 'blur(8px)' : 'none',
              transform: isOpening ? 'scaleX(0.9) translateY(-5px)' : 'scaleX(1)',
              transition: 'transform 1.35s ease',
            }} />

            {/* Drop shadow */}
            <div className="absolute inset-0 pointer-events-none" style={{
              borderRadius: '2px',
              boxShadow: '0 30px 64px rgba(0,0,0,0.28), 0 12px 28px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.12)',
            }} />

            {/* Lower edge thickness */}
            <div className="absolute inset-x-[2px] -bottom-[5px] h-3 pointer-events-none" style={{
              background: `linear-gradient(to bottom, ${envShadow}, ${envDeepShadow})`,
              boxShadow: `0 4px 5px ${withAlpha(envDeepShadow, 0.34)}`,
            }} />

            {/* Envelope body */}
            <div className="absolute inset-0" style={{
              background: envGradient,
              border: `1px solid ${withAlpha(envDeepShadow, envIsLight ? 0.34 : 0.44)}`,
              borderRadius: '2px',
              boxShadow: `inset 2px 2px 2px ${withAlpha(envHighlight, 0.68)}, inset -3px -3px 5px ${withAlpha(envDeepShadow, 0.3)}, inset 0 -2px 0 ${withAlpha(envDeepShadow, 0.32)}`,
            }} />

            {/* Highlight overlay */}
            <div className="absolute inset-[1px] pointer-events-none" style={{
              background: `linear-gradient(135deg, ${withAlpha(envHighlight, 0.36)} 0%, transparent 27%, ${withAlpha(envDeepShadow, 0.13)} 68%, transparent 100%)`,
              mixBlendMode: envIsLight ? 'screen' : 'soft-light',
            }} />

            {/* Paper grain */}
            {useTextures && (
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: grainTexture,
                opacity: envIsLight ? 0.1 : 0.06,
                mixBlendMode: 'multiply',
              }} />
            )}
            {useTextures && (
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: fiberTexture,
                opacity: envIsLight ? 0.05 : 0.03,
                mixBlendMode: 'multiply',
              }} />
            )}

            {/* Top edge highlight */}
            <div className="absolute inset-x-0 top-0 h-[2px] pointer-events-none" style={{
              background: `linear-gradient(to right, transparent, ${envHighlight}, transparent)`,
              boxShadow: `0 1px 0 ${withAlpha(envDeepShadow, 0.16)}`,
              opacity: 0.78,
            }} />

            {/* Pocket V-shape */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: envGradient,
              clipPath: 'polygon(0 0, 50% 58%, 100% 0, 100% 100%, 0 100%)',
              boxShadow: `inset 0 8px 20px ${withAlpha(envDeepShadow, 0.24)}, inset 0 -4px 9px ${withAlpha(envDeepShadow, 0.13)}`,
            }} />

            {/* Pocket inner shadow */}
            <div className="absolute inset-0 pointer-events-none" style={{
              clipPath: 'polygon(0 0, 50% 58%, 100% 0)',
              background: `linear-gradient(to bottom, ${withAlpha(envShadow, 0.34)} 0%, transparent 45%)`,
            }} />

            {/* Side flap gradients */}
            <div className="absolute inset-y-0 left-0 w-1/2 pointer-events-none" style={{
              background: `linear-gradient(to right, ${withAlpha(envShadow, 0.25)} 0%, transparent 60%)`,
              clipPath: 'polygon(0 0, 100% 58%, 50% 100%, 0 100%)',
            }} />
            <div className="absolute inset-y-0 right-0 w-1/2 pointer-events-none" style={{
              background: `linear-gradient(to left, ${withAlpha(envShadow, 0.25)} 0%, transparent 60%)`,
              clipPath: 'polygon(100% 0, 0 58%, 50% 100%, 100% 100%)',
            }} />

            {/* Crease lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 0 L50 58 L100 0" fill="none" stroke={withAlpha(envDeepShadow, envIsLight ? 0.44 : 0.36)} strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
              <path d="M0 1.2 L50 59.2 L100 1.2" fill="none" stroke={withAlpha(envHighlight, envIsLight ? 0.62 : 0.28)} strokeWidth="0.42" vectorEffect="non-scaling-stroke" />
              <path d="M0 100 L50 58 L100 100" fill="none" stroke={withAlpha(envDeepShadow, 0.34)} strokeWidth="0.68" vectorEffect="non-scaling-stroke" />
            </svg>

            {/* Interior lining */}
            <div className="absolute inset-0 pointer-events-none" style={{
              clipPath: 'polygon(4% 2%, 96% 2%, 50% 55%)',
              background: linerBg,
              boxShadow: `inset 0 -12px 18px ${withAlpha(envDeepShadow, 0.3)}, inset 0 1px 0 ${withAlpha(envHighlight, 0.28)}`,
              opacity: isFlapLifted ? 1 : 0,
              transform: isFlapLifted ? 'translateY(1px) scaleY(1)' : 'translateY(-5px) scaleY(0.96)',
              transformOrigin: 'top center',
              transition: 'opacity 0.48s ease 0.35s, transform 0.78s cubic-bezier(0.22, 0.8, 0.27, 1) 0.25s',
            }} />

            {/* Flap shadow on pocket */}
            <div className="absolute inset-0 pointer-events-none" style={{
              clipPath: 'polygon(0 0, 100% 0, 50% 58%)',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.22), transparent 62%)',
              opacity: isFlapLifted ? 0.58 : 0,
              filter: useTextures ? 'blur(4px)' : 'none',
              transform: isFlapLifted ? 'translateY(7px)' : 'translateY(0)',
              transition: 'opacity 0.6s ease, transform 0.95s ease',
            }} />

            {/* Guest name on flap (visible when closed) */}
            {showSeal && showFlapName && flapNameText && flapNameText !== 'Guest' && (
              <div className="absolute inset-x-0 top-[14%] text-center pointer-events-none z-30">
                <p style={{
                  fontFamily: stackFor(flapNameFont),
                  fontSize: 'clamp(1.4rem, 5vw, 1.9rem)',
                  color: flapNameColor,
                  lineHeight: 1.2,
                  letterSpacing: '0.01em',
                  WebkitTextStroke: `0.2px ${withAlpha(envDeepShadow, 0.2)}`,
                  paintOrder: 'stroke fill',
                  opacity: 0.7,
                }}>
                  {flapNameText}
                </p>
              </div>
            )}

            {/* Flap — 3D context */}
            <div className="absolute inset-x-0 top-0" style={{ height: '100%', perspective: '1450px', perspectiveOrigin: '50% 8%' }}>
              <div
                className="w-full h-full origin-top relative"
                style={{
                  transform: flapTransform,
                  transformStyle: 'preserve-3d',
                  willChange: 'transform',
                  transition: phase === 'opening'
                    ? 'transform 1.05s cubic-bezier(0.16, 0.86, 0.28, 1)'
                    : 'transform 1s cubic-bezier(0.22, 0.8, 0.26, 1.08)',
                }}
              >
                {/* Flap front face */}
                <div className="w-full h-full absolute inset-0" style={{
                  background: envGradient,
                  clipPath: 'polygon(0 0, 100% 0, 50% 58%)',
                  boxShadow: `inset 0 -10px 19px ${withAlpha(envDeepShadow, 0.42)}, inset 0 2px 1px ${withAlpha(envHighlight, 0.66)}, inset 2px 0 3px ${withAlpha(envHighlight, 0.2)}, inset 0 -3px 5px rgba(0,0,0,0.12)`,
                  backfaceVisibility: 'hidden',
                }}>
                  {/* Flap grain */}
                  {useTextures && (
                    <div className="absolute inset-0 pointer-events-none" style={{
                      clipPath: 'polygon(0 0, 100% 0, 50% 58%)',
                      backgroundImage: grainTexture,
                      opacity: envIsLight ? 0.1 : 0.06,
                      mixBlendMode: 'multiply',
                    }} />
                  )}
                  {/* Flap fiber */}
                  {useTextures && (
                    <div className="absolute inset-0 pointer-events-none" style={{
                      clipPath: 'polygon(0 0, 100% 0, 50% 58%)',
                      backgroundImage: fiberTexture,
                      opacity: envIsLight ? 0.05 : 0.03,
                      mixBlendMode: 'multiply',
                    }} />
                  )}
                  {/* Flap top edge */}
                  <div className="absolute inset-x-0 top-0 h-px pointer-events-none" style={{
                    background: `linear-gradient(to right, transparent, ${envHighlight}, transparent)`,
                    opacity: 0.5,
                  }} />
                  {/* Flap crease lines */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                    {useTextures && <defs>
                      <filter id="flapCreaseShadow" x="-30%" y="-30%" width="160%" height="160%">
                        <feDropShadow dx="0" dy="1.2" stdDeviation="0.6" floodColor="#000" floodOpacity="0.5" />
                      </filter>
                    </defs>}
                    <line x1="0" y1="0" x2="50" y2="58" stroke={envIsLight ? 'rgba(70,70,70,0.5)' : 'rgba(0,0,0,0.5)'} strokeWidth="0.5" vectorEffect="non-scaling-stroke" filter={useTextures ? 'url(#flapCreaseShadow)' : undefined} />
                    <line x1="100" y1="0" x2="50" y2="58" stroke={envIsLight ? 'rgba(70,70,70,0.5)' : 'rgba(0,0,0,0.5)'} strokeWidth="0.5" vectorEffect="non-scaling-stroke" filter={useTextures ? 'url(#flapCreaseShadow)' : undefined} />
                  </svg>
                </div>

                {/* Wax seal */}
                <div
                  className="absolute left-1/2 top-[58%] z-40"
                  style={{
                    transform: `translate(-50%, -50%) translateZ(5px) rotate(${isReleasing ? '-3deg' : '0deg'}) scale(${isReleasing ? 0.88 : sealVisible ? 1 : 0.6})`,
                    opacity: sealVisible ? 1 : 0,
                    transition: 'opacity 0.32s ease, transform 0.28s cubic-bezier(0.3, 1.4, 0.5, 1)',
                    pointerEvents: sealVisible ? 'auto' : 'none',
                    backfaceVisibility: 'hidden',
                  }}
                >
                  <button onClick={handleOpen} type="button" aria-label="Open invitation" className="group cursor-pointer bg-transparent border-0 p-0">
                    <div className="relative transition-transform duration-300 group-hover:scale-110 group-active:scale-95" style={{ width: 'clamp(4.75rem, 23vw, 6rem)', height: 'clamp(4.75rem, 23vw, 6rem)' }}>
                      {/* Wax body */}
                      <div className="absolute inset-0 rounded-full" style={{
                        background: `radial-gradient(circle at 38% 28%, ${waxLight} 0%, ${waxBase} 45%, ${waxDark} 100%)`,
                        boxShadow: [
                          `inset 0 4px 8px ${withAlpha(waxLight, 0.53)}`,
                          'inset 0 -10px 18px rgba(0,0,0,0.5)',
                          'inset 5px 0 10px rgba(0,0,0,0.15)',
                          'inset -5px 0 10px rgba(0,0,0,0.15)',
                          '0 8px 18px rgba(0,0,0,0.3)',
                        ].join(', '),
                      }} />
                      {/* Debossed inner circle */}
                      <div className="absolute inset-[10px] rounded-full flex items-center justify-center overflow-hidden" style={{
                        boxShadow: 'inset 0 5px 10px rgba(0,0,0,0.55), inset 0 -2px 5px rgba(255,255,255,0.12)',
                        background: `radial-gradient(circle at 42% 36%, ${waxBase} 0%, ${waxDark} 100%)`,
                      }}>
                        {settings.monogram_url ? (
                          <img src={settings.monogram_url} alt="Monogram" className="w-full h-full object-cover" style={{ filter: 'contrast(1.25) brightness(0.68) drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
                        ) : (
                          <span style={{ color: 'rgba(255,255,255,0.75)', textShadow: '0 1px 2px rgba(0,0,0,0.5), 0 -1px 1px rgba(255,255,255,0.12)', fontSize: 24, fontFamily: headingFontStack }}>
                            {settings.seal_style === 'monogram' ? '&' : settings.seal_style === 'heart' ? '\u2764' : settings.seal_style === 'star' ? '\u2726' : initials}
                          </span>
                        )}
                      </div>
                      {/* Specular highlight */}
                      <div className="absolute top-3 left-5 w-9 h-4 rounded-full opacity-30 pointer-events-none" style={{
                        background: 'radial-gradient(ellipse, rgba(255,255,255,0.8), transparent 70%)',
                        filter: useTextures ? 'blur(2px)' : 'none',
                      }} />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {showSeal && (
            <p className="text-center mt-5 sm:mt-7 text-xs fade-up" style={{ color: '#c9b896', letterSpacing: '0.15em' }}>
              TAP THE SEAL TO OPEN
            </p>
          )}
        </div>

        {/* ---- Letter paper ---- */}
        <div
          className="w-full"
          style={{
            ...paperMotion,
            pointerEvents: isOpen ? 'auto' : 'none',
            willChange: 'transform, opacity',
            transition: phase === 'rising'
              ? 'opacity 0.28s ease, transform 1.55s cubic-bezier(0.16, 0.88, 0.27, 1)'
              : 'opacity 0.4s ease, transform 0.76s cubic-bezier(0.22, 0.78, 0.3, 1)',
          }}
        >
          <div className="overflow-hidden flex flex-col h-[calc(100svh-5rem)] sm:h-auto" style={{
            maxHeight: 'calc(100svh - 5rem)',
            background: paperBg,
            border: `1px solid ${paperBorder}`,
            borderRadius: 4,
            boxShadow: '0 24px 48px rgba(25, 18, 10, 0.24), 0 5px 12px rgba(25, 18, 10, 0.13), inset 0 1px 0 rgba(255,255,255,0.56)',
          }}>
            <div className="flex-1 min-h-0 p-6 sm:p-10 flex flex-col text-center overflow-y-auto items-center w-full">
              {/* Decorative top */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="h-px w-8" style={{ background: 'rgba(181,154,107,0.3)' }} />
                <span style={{ color: '#b59a6b', fontSize: 12 }}>&#10022;</span>
                <span className="h-px w-8" style={{ background: 'rgba(181,154,107,0.3)' }} />
              </div>

              {/* Partner names */}
              {settings.invitation_paper_show_names !== false && (
                <>
                  <h2 className="leading-tight mb-1 w-full" style={{ fontFamily: headingFontStack, fontSize: 'clamp(1.8rem, 6vw, 2.5rem)', color: headingColor }}>
                    {settings.partner1_name}
                  </h2>
                  <p className="text-xl italic mb-1" style={{ fontFamily: headingFontStack, color: headingColor }}>&amp;</p>
                  <h2 className="leading-tight mb-4 w-full" style={{ fontFamily: headingFontStack, fontSize: 'clamp(1.8rem, 6vw, 2.5rem)', color: headingColor }}>
                    {settings.partner2_name}
                  </h2>
                </>
              )}

              {/* Date and venue */}
              {weddingDate && (
                <div className="mb-4 w-full">
                  <p style={{ fontSize: 12, color: '#8a7a66', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {weddingDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  {settings.venue_line && (
                    <p style={{ fontSize: 14, color: '#8a7a66', marginTop: 4 }}>{settings.venue_line}</p>
                  )}
                </div>
              )}

              <div className="h-px w-16 mx-auto my-4" style={{ background: 'rgba(181,154,107,0.3)' }} />

              {/* Letter body */}
              <div
                className="text-sm mb-6 leading-relaxed w-full [&_p]:mb-2 [&_p:last-child]:mb-0"
                style={{ fontFamily: letterFontStack, color: letterTextColor, opacity: 0.85 }}
                dangerouslySetInnerHTML={{ __html: fillLetterBody(settings.invitation_paper_body || `Dear ${displayName},\n\nWe joyfully request the pleasure of your company as we celebrate our union.`) }}
              />

              {/* CTA button */}
              <div className="flex flex-col gap-2.5 w-full mt-auto pt-4">
                <button
                  onClick={handleCtaClick}
                  className="px-6 py-2.5 transition-all hover:tracking-widest"
                  style={{
                    background: 'transparent',
                    color: '#5a4430',
                    border: '1px solid rgba(90,68,48,0.3)',
                    borderRadius: 4,
                    fontSize: 13,
                    letterSpacing: '0.1em',
                    fontWeight: 600,
                  }}
                >
                  {settings.env_button_text || 'Explore Invitation'}
                </button>
              </div>

              {/* Decorative bottom */}
              <div className="flex items-center justify-center gap-3 mt-6 w-full">
                <span className="h-px w-8" style={{ background: 'rgba(181,154,107,0.2)' }} />
                <span style={{ color: 'rgba(181,154,107,0.5)', fontSize: 12 }}>&#10022;</span>
                <span className="h-px w-8" style={{ background: 'rgba(181,154,107,0.2)' }} />
              </div>
            </div>
          </div>

          {/* Close / replay */}
          {isOpen && (
            <button
              onClick={handleClose}
              className="mt-5 mx-auto flex items-center gap-1.5 transition-colors fade-up"
              style={{ color: '#c9b896', fontSize: 12, letterSpacing: '0.08em' }}
            >
              <RotateCcw size={14} /> Close Invitation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

