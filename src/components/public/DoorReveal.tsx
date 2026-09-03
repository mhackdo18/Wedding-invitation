import { useState, useEffect, useRef } from 'react';
import type { SiteSettings } from '@/types';
import { stackFor } from '@/lib/fonts';
import { useScrollLock } from '@/lib/useScrollLock';

type DoorPhase = 'closed' | 'opening' | 'done';
export type DoorStyle = 'classic' | 'arched' | 'paneled' | 'rustic' | 'modern' | 'curtain' | 'curtain-side' | 'royal' | 'glass' | 'velvet' | 'wrought-iron' | 'marble' | 'cathedral' | 'lace' | 'gilded' | 'stone' | 'bamboo';

export const DOOR_STYLES: { value: DoorStyle; label: string }[] = [
  { value: 'classic', label: 'Classic' },
  { value: 'arched', label: 'Arched' },
  { value: 'paneled', label: 'Paneled' },
  { value: 'rustic', label: 'Rustic' },
  { value: 'modern', label: 'Modern' },
  { value: 'curtain', label: 'Curtain' },
  { value: 'curtain-side', label: 'Curtain (Side)' },
  { value: 'royal', label: 'Royal' },
  { value: 'glass', label: 'Glass' },
  { value: 'velvet', label: 'Velvet' },
  { value: 'wrought-iron', label: 'Wrought Iron' },
  { value: 'marble', label: 'Marble' },
  { value: 'cathedral', label: 'Cathedral' },
  { value: 'lace', label: 'Lace' },
  { value: 'gilded', label: 'Gilded' },
  { value: 'stone', label: 'Stone' },
  { value: 'bamboo', label: 'Bamboo' },
];

export const DOOR_SPEEDS: { value: string; label: string; duration: number }[] = [
  { value: 'slow', label: 'Slow', duration: 3400 },
  { value: 'normal', label: 'Normal', duration: 2200 },
  { value: 'fast', label: 'Fast', duration: 1200 },
];

function getSpeedDuration(speed: string): number {
  const found = DOOR_SPEEDS.find((s) => s.value === speed);
  return found ? found.duration : 2200;
}

export function DoorStylePreview({ style, color }: { style: DoorStyle; color: string }) {
  const adjust = (hex: string, amount: number): string => {
    if (!hex || !hex.startsWith('#')) return hex;
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
    const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
    return `rgb(${r}, ${g}, ${b})`;
  };

  const base = color || '#FAFAFA';
  const highlight = adjust(base, 18);
  const shadow = adjust(base, -40);
  const deep = adjust(base, -62);
  const gradient = `linear-gradient(155deg, ${highlight} 0%, ${adjust(base, -12)} 40%, ${shadow} 100%)`;
  const seamW = 2;

  // Curtain previews — fabric with pleats (shared by both curtain styles)
  if (style === 'curtain' || style === 'curtain-side') {
    const curtainGradient = `linear-gradient(180deg, ${adjust(base, -20)} 0%, ${adjust(base, 8)} 50%, ${adjust(base, -30)} 100%)`;
    const pleats: React.ReactNode[] = [];
    for (let i = 0; i < 4; i++) {
      const x = 10 + i * 10;
      pleats.push(
        <div key={`pleat-${i}`} style={{ position: 'absolute', top: 0, bottom: 0, left: x, width: 1.5, background: deep, opacity: 0.25 }} />,
      );
    }
    // Rod at top
    return (
      <div style={{ width: 48, height: 56, position: 'relative', overflow: 'hidden', borderRadius: 2 }}>
        <div style={{ position: 'absolute', top: 2, left: 2, right: 2, height: 2, background: deep, borderRadius: 1, opacity: 0.5 }} />
        <div style={{ position: 'absolute', top: 4, left: 0, right: 0, bottom: 0, display: 'flex' }}>
          <div style={{ width: '50%', background: curtainGradient, position: 'relative' }}>
            {pleats}
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: seamW, background: deep, opacity: 0.35 }} />
          </div>
          <div style={{ width: '50%', background: curtainGradient, position: 'relative' }}>
            {pleats}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: seamW, background: deep, opacity: 0.35 }} />
          </div>
        </div>
      </div>
    );
  }

  const archRadius = style === 'arched' ? 14 : 0;
  const borderStyle =
    style === 'rustic' ? '2px solid rgba(0,0,0,0.15)' :
    style === 'modern' ? 'none' :
    style === 'royal' ? `2px solid ${adjust(base, -30)}` :
    style === 'glass' ? 'none' :
    style === 'velvet' ? 'none' :
    style === 'wrought-iron' ? 'none' :
    style === 'marble' ? 'none' :
    style === 'cathedral' ? `1px solid ${deep}` :
    style === 'lace' ? 'none' :
    style === 'gilded' ? `2px solid ${adjust(base, -20)}` :
    style === 'stone' ? 'none' :
    style === 'bamboo' ? 'none' :
    `1px solid ${deep}`;

  // Style-specific gradients for 3D depth
  let styleGradient = gradient;
  let styleBoxShadow = 'none';
  let styleBorderRadius = `${archRadius}px ${archRadius}px 2px 2px`;
  let extraDecor: React.ReactNode[] = [];

  if (style === 'royal') {
    const goldTone = adjust(base, -20);
    styleGradient = `linear-gradient(155deg, ${highlight} 0%, ${adjust(base, -8)} 30%, ${shadow} 100%)`;
    styleBoxShadow = `inset 0 2px 4px ${highlight}, inset 0 -2px 4px ${deep}`;
    extraDecor.push(
      <div key="r-ornament" style={{ position: 'absolute', top: '15%', left: '15%', right: '15%', height: '70%', border: `1px solid ${adjust(base, -25)}`, borderRadius: 3, opacity: 0.3 }} />,
      <div key="r-jewel" style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 6, height: 6, borderRadius: '50%', background: adjust(base, -40), opacity: 0.5 }} />,
    );
  }
  if (style === 'glass') {
    const glassLight = adjust(base, 30);
    styleGradient = `linear-gradient(135deg, ${glassLight} 0%, ${adjust(base, -5)} 40%, ${adjust(base, -25)} 100%)`;
    styleBoxShadow = `inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -1px 2px rgba(0,0,0,0.1)`;
    extraDecor.push(
      <div key="g-shine" style={{ position: 'absolute', top: '5%', left: '10%', width: '30%', height: '90%', background: `linear-gradient(120deg, transparent, rgba(255,255,255,0.25), transparent)`, borderRadius: 4 }} />,
    );
  }
  if (style === 'velvet') {
    styleGradient = `linear-gradient(155deg, ${adjust(base, -5)} 0%, ${adjust(base, -25)} 50%, ${adjust(base, -45)} 100%)`;
    styleBoxShadow = `inset 0 2px 6px ${highlight}, inset 0 -2px 4px ${deep}`;
    extraDecor.push(
      <div key="v-sheen" style={{ position: 'absolute', top: '20%', left: '20%', width: '60%', height: '60%', background: `radial-gradient(ellipse at center, ${adjust(base, 10)} 0%, transparent 70%)`, opacity: 0.3 }} />,
    );
  }
  if (style === 'wrought-iron') {
    const ironDark = adjust(base, -55);
    styleGradient = `linear-gradient(155deg, ${adjust(base, -30)} 0%, ${ironDark} 50%, ${adjust(base, -70)} 100%)`;
    styleBoxShadow = `inset 0 1px 2px ${adjust(base, -20)}, inset 0 -1px 3px rgba(0,0,0,0.3)`;
    extraDecor.push(
      <div key="wi-scroll" style={{ position: 'absolute', top: '25%', left: '20%', right: '20%', height: '50%', border: `1px solid ${adjust(base, -40)}`, borderRadius: 8, opacity: 0.4 }} />,
      <div key="wi-bar" style={{ position: 'absolute', top: '48%', left: '15%', right: '15%', height: '2px', background: adjust(base, -45), opacity: 0.5 }} />,
    );
  }
  if (style === 'marble') {
    const marbleVein = adjust(base, -20);
    styleGradient = `linear-gradient(145deg, ${highlight} 0%, ${adjust(base, -8)} 50%, ${adjust(base, -18)} 100%)`;
    styleBoxShadow = `inset 0 2px 4px ${highlight}, inset 0 -1px 3px ${deep}`;
    extraDecor.push(
      <div key="m-vein1" style={{ position: 'absolute', top: '10%', left: '5%', width: '90%', height: '1px', background: marbleVein, opacity: 0.25, transform: 'rotate(-15deg)' }} />,
      <div key="m-vein2" style={{ position: 'absolute', top: '45%', left: '5%', width: '90%', height: '1px', background: marbleVein, opacity: 0.2, transform: 'rotate(10deg)' }} />,
      <div key="m-vein3" style={{ position: 'absolute', top: '75%', left: '5%', width: '90%', height: '1px', background: marbleVein, opacity: 0.15, transform: 'rotate(-5deg)' }} />,
    );
  }
  if (style === 'cathedral') {
    styleGradient = `linear-gradient(160deg, ${highlight} 0%, ${adjust(base, -10)} 45%, ${shadow} 100%)`;
    styleBoxShadow = `inset 0 3px 6px ${highlight}, inset 0 -3px 6px ${deep}`;
    extraDecor.push(
      <div key="c-arch" style={{ position: 'absolute', top: '8%', left: '20%', right: '20%', height: '30%', border: `1px solid ${deep}`, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottom: 'none', opacity: 0.2 }} />,
      <div key="c-col" style={{ position: 'absolute', top: '40%', bottom: '8%', left: '25%', right: '25%', border: `1px solid ${deep}`, opacity: 0.15 }} />,
    );
  }
  if (style === 'lace') {
    styleGradient = `linear-gradient(155deg, ${adjust(base, 10)} 0%, ${base} 50%, ${adjust(base, -15)} 100%)`;
    styleBoxShadow = `inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 2px ${deep}`;
    extraDecor.push(
      <div key="l-dot1" style={{ position: 'absolute', top: '15%', left: '20%', width: 3, height: 3, borderRadius: '50%', background: deep, opacity: 0.3 }} />,
      <div key="l-dot2" style={{ position: 'absolute', top: '15%', right: '20%', width: 3, height: 3, borderRadius: '50%', background: deep, opacity: 0.3 }} />,
      <div key="l-dot3" style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', border: `1px solid ${deep}`, opacity: 0.3 }} />,
      <div key="l-dot4" style={{ position: 'absolute', bottom: '15%', left: '20%', width: 3, height: 3, borderRadius: '50%', background: deep, opacity: 0.3 }} />,
      <div key="l-dot5" style={{ position: 'absolute', bottom: '15%', right: '20%', width: 3, height: 3, borderRadius: '50%', background: deep, opacity: 0.3 }} />,
    );
  }
  if (style === 'gilded') {
    const gold1 = adjust(base, 25);
    const gold2 = adjust(base, -15);
    styleGradient = `linear-gradient(150deg, ${gold1} 0%, ${adjust(base, 5)} 35%, ${gold2} 70%, ${adjust(base, 15)} 100%)`;
    styleBoxShadow = `inset 0 2px 5px ${gold1}, inset 0 -2px 4px ${deep}, 0 0 4px ${adjust(base, 10)}`;
    extraDecor.push(
      <div key="gi-frame" style={{ position: 'absolute', top: '10%', left: '12%', right: '12%', bottom: '10%', border: `1px solid ${adjust(base, -10)}`, borderRadius: 3, opacity: 0.35 }} />,
      <div key="gi-inner" style={{ position: 'absolute', top: '16%', left: '18%', right: '18%', bottom: '16%', border: `1px solid ${adjust(base, 20)}`, borderRadius: 2, opacity: 0.2 }} />,
    );
  }
  if (style === 'stone') {
    const stoneDark = adjust(base, -35);
    styleGradient = `linear-gradient(160deg, ${adjust(base, -5)} 0%, ${adjust(base, -20)} 50%, ${stoneDark} 100%)`;
    styleBoxShadow = `inset 0 2px 4px ${highlight}, inset 0 -2px 5px ${deep}`;
    extraDecor.push(
      <div key="s-mortar1" style={{ position: 'absolute', top: '33%', left: 0, right: 0, height: '1px', background: stoneDark, opacity: 0.3 }} />,
      <div key="s-mortar2" style={{ position: 'absolute', top: '66%', left: 0, right: 0, height: '1px', background: stoneDark, opacity: 0.3 }} />,
      <div key="s-mortar3" style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '1px', background: stoneDark, opacity: 0.25 }} />,
    );
  }
  if (style === 'bamboo') {
    const bambooLight = adjust(base, 15);
    styleGradient = `linear-gradient(90deg, ${bambooLight} 0%, ${adjust(base, -5)} 50%, ${adjust(base, -25)} 100%)`;
    styleBoxShadow = `inset 1px 0 3px ${highlight}, inset -1px 0 3px ${deep}`;
    extraDecor.push(
      <div key="b-node1" style={{ position: 'absolute', top: '25%', left: 0, right: 0, height: '2px', background: deep, opacity: 0.35 }} />,
      <div key="b-node2" style={{ position: 'absolute', top: '55%', left: 0, right: 0, height: '2px', background: deep, opacity: 0.35 }} />,
      <div key="b-node3" style={{ position: 'absolute', top: '80%', left: 0, right: 0, height: '2px', background: deep, opacity: 0.3 }} />,
    );
  }

  const panels: React.ReactNode[] = [];
  if (style === 'paneled') {
    panels.push(
      <div key="p1" style={{ position: 'absolute', top: '12%', left: '15%', right: '15%', height: '30%', border: `1px solid ${deep}`, borderRadius: 2, opacity: 0.2 }} />,
      <div key="p2" style={{ position: 'absolute', bottom: '12%', left: '15%', right: '15%', height: '30%', border: `1px solid ${deep}`, borderRadius: 2, opacity: 0.2 }} />,
    );
  }
  if (style === 'rustic') {
    panels.push(
      <div key="r1" style={{ position: 'absolute', top: '8%', left: '20%', right: '20%', height: '2px', background: deep, opacity: 0.2 }} />,
      <div key="r2" style={{ position: 'absolute', top: '35%', left: '20%', right: '20%', height: '2px', background: deep, opacity: 0.2 }} />,
      <div key="r3" style={{ position: 'absolute', top: '62%', left: '20%', right: '20%', height: '2px', background: deep, opacity: 0.2 }} />,
    );
  }
  if (style === 'modern') {
    panels.push(
      <div key="m1" style={{ position: 'absolute', top: '15%', left: '25%', width: '1px', bottom: '15%', background: deep, opacity: 0.15 }} />,
    );
  }
  if (style === 'arched') {
    panels.push(
      <div key="a1" style={{ position: 'absolute', top: '5%', left: '12%', right: '12%', height: '20%', border: `1px solid ${deep}`, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderBottom: 'none', opacity: 0.15 }} />,
    );
  }

  return (
    <div style={{ width: 48, height: 56, borderRadius: styleBorderRadius, overflow: 'hidden', display: 'flex', position: 'relative', border: borderStyle, boxShadow: styleBoxShadow }}>
      <div style={{ width: '50%', background: styleGradient, position: 'relative' }}>
        {extraDecor}
        {panels}
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: seamW, background: deep, opacity: 0.4 }} />
      </div>
      <div style={{ width: '50%', background: styleGradient, position: 'relative' }}>
        {extraDecor}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: seamW, background: deep, opacity: 0.4 }} />
      </div>
    </div>
  );
}

export default function DoorReveal({
  open,
  opening = false,
  onDone,
  settings,
}: {
  open: boolean;
  opening?: boolean;
  onDone: () => void;
  settings: SiteSettings;
}) {
  const [phase, setPhase] = useState<DoorPhase>('closed');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useScrollLock(open);

  const speedDuration = getSpeedDuration(settings.door_animation_speed || 'normal');

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (!open) {
      setPhase('closed');
      return;
    }
    if (!opening) {
      setPhase('closed');
      return;
    }

    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      timers.current = [setTimeout(() => finish(), 400)];
    } else {
      const doneDelay = 450 + speedDuration + 200;
      timers.current = [
        setTimeout(() => setPhase('opening'), 450),
        setTimeout(() => finish(), doneDelay),
      ];
    }

    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, opening, speedDuration]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const finish = () => {
    timers.current.forEach(clearTimeout);
    setPhase('done');
    onDone();
  };

  const doorStyle = (settings.door_style || 'classic') as DoorStyle;
  const doorColor = settings.door_color || settings.invitation_envelope_color || settings.env_color || '#FAFAFA';
  const nameFont = stackFor(settings.door_name_font || 'Great Vibes');
  const dateFont = stackFor(settings.door_date_font || 'Cormorant Garamond');
  const nameColor = settings.door_name_color || null;
  const dateColor = settings.door_date_color || null;
  const monogramColor = settings.door_monogram_color || null;
  const nameSize = settings.door_name_size || 1;
  const dateSize = settings.door_date_size || 1;
  const monogramSize = settings.door_monogram_size || 1;

  const adjust = (hex: string, amount: number): string => {
    if (!hex || !hex.startsWith('#')) return hex;
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
    const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
    return `rgb(${r}, ${g}, ${b})`;
  };

  const doorBase = adjust(doorColor, -12);
  const doorHighlight = adjust(doorColor, 18);
  const doorShadow = adjust(doorColor, -40);
  const doorDeep = adjust(doorColor, -62);

  const doorGradient = `linear-gradient(155deg, ${doorHighlight} 0%, ${doorBase} 40%, ${doorShadow} 100%)`;
  const curtainGradient = `linear-gradient(180deg, ${adjust(doorColor, -20)} 0%, ${adjust(doorColor, 8)} 50%, ${adjust(doorColor, -30)} 100%)`;

  // Style-specific gradients + 3D shadows for full-size door panels
  const styleGradientMap: Partial<Record<DoorStyle, string>> = {
    royal: `linear-gradient(155deg, ${doorHighlight} 0%, ${doorBase} 30%, ${doorShadow} 100%)`,
    glass: `linear-gradient(135deg, ${adjust(doorColor, 30)} 0%, ${doorBase} 40%, ${adjust(doorColor, -25)} 100%)`,
    velvet: `linear-gradient(155deg, ${adjust(doorColor, -5)} 0%, ${adjust(doorColor, -25)} 50%, ${adjust(doorColor, -45)} 100%)`,
    'wrought-iron': `linear-gradient(155deg, ${adjust(doorColor, -30)} 0%, ${adjust(doorColor, -55)} 50%, ${adjust(doorColor, -70)} 100%)`,
    marble: `linear-gradient(145deg, ${doorHighlight} 0%, ${doorBase} 50%, ${adjust(doorColor, -18)} 100%)`,
    cathedral: `linear-gradient(160deg, ${doorHighlight} 0%, ${doorBase} 45%, ${doorShadow} 100%)`,
    lace: `linear-gradient(155deg, ${adjust(doorColor, 10)} 0%, ${doorColor} 50%, ${adjust(doorColor, -15)} 100%)`,
    gilded: `linear-gradient(150deg, ${adjust(doorColor, 25)} 0%, ${adjust(doorColor, 5)} 35%, ${adjust(doorColor, -15)} 70%, ${adjust(doorColor, 15)} 100%)`,
    stone: `linear-gradient(160deg, ${adjust(doorColor, -5)} 0%, ${adjust(doorColor, -20)} 50%, ${adjust(doorColor, -35)} 100%)`,
    bamboo: `linear-gradient(90deg, ${adjust(doorColor, 15)} 0%, ${doorBase} 50%, ${adjust(doorColor, -25)} 100%)`,
  };
  const activeGradient = styleGradientMap[doorStyle] || doorGradient;

  // 3D embossed shadow per style
  const styleShadowMap: Partial<Record<DoorStyle, string>> = {
    royal: `inset -6px 0 18px ${doorDeep}, inset 2px 0 4px ${doorHighlight}, inset 0 4px 8px ${doorHighlight}, inset 0 -4px 8px ${doorDeep}`,
    glass: `inset -6px 0 18px ${doorDeep}, inset 2px 0 6px rgba(255,255,255,0.4), inset 0 2px 4px rgba(255,255,255,0.3)`,
    velvet: `inset -6px 0 22px ${doorDeep}, inset 2px 0 6px ${doorHighlight}, inset 0 6px 12px ${doorDeep}, inset 0 -4px 10px ${doorDeep}`,
    'wrought-iron': `inset -6px 0 18px rgba(0,0,0,0.4), inset 2px 0 4px ${adjust(doorColor, -20)}, inset 0 3px 6px rgba(0,0,0,0.3)`,
    marble: `inset -6px 0 18px ${doorDeep}, inset 2px 0 4px ${doorHighlight}, inset 0 3px 6px ${doorHighlight}, inset 0 -2px 4px ${doorDeep}`,
    cathedral: `inset -6px 0 18px ${doorDeep}, inset 2px 0 4px ${doorHighlight}, inset 0 5px 10px ${doorHighlight}, inset 0 -5px 10px ${doorDeep}`,
    lace: `inset -4px 0 12px ${doorDeep}, inset 2px 0 3px rgba(255,255,255,0.5), inset 0 1px 3px rgba(255,255,255,0.4)`,
    gilded: `inset -6px 0 18px ${doorDeep}, inset 2px 0 6px ${adjust(doorColor, 25)}, inset 0 3px 6px ${adjust(doorColor, 25)}, inset 0 -3px 5px ${doorDeep}, 0 0 8px ${adjust(doorColor, 10)}`,
    stone: `inset -6px 0 18px ${doorDeep}, inset 2px 0 4px ${doorHighlight}, inset 0 3px 6px ${doorHighlight}, inset 0 -3px 6px ${doorDeep}`,
    bamboo: `inset 2px 0 4px ${doorHighlight}, inset -2px 0 4px ${doorDeep}, inset 0 2px 3px ${doorHighlight}`,
  };
  const activeBoxShadow = styleShadowMap[doorStyle] || `inset -6px 0 18px ${doorDeep}, inset 2px 0 3px ${doorHighlight}`;

  const isOpening = phase === 'opening' || phase === 'done';
  const isDone = phase === 'done';

  const transitionTiming = `transform ${speedDuration}ms cubic-bezier(0.25, 0.8, 0.3, 1)`;
  const fadeTiming = 'opacity 0.6s ease';

  const archRadius = doorStyle === 'arched' ? 120 : 0;
  const showNames = settings.door_show_names !== false;
  const showDate = settings.door_show_date !== false;
  const showMonogram = settings.door_show_monogram !== false;

  // Clamp helper for size multipliers
  const clampSize = (v: number) => Math.max(0.3, Math.min(3, v));

  // === Curtain style (rises up) ===
  if (doorStyle === 'curtain') {
    const curtainTransform = isOpening ? 'translateY(-100%)' : 'translateY(0)';
    return (
      <div
        className="fixed inset-0 z-40"
        style={{
          opacity: isDone ? 0 : 1,
          transition: fadeTiming,
          pointerEvents: isDone ? 'none' : 'auto',
        }}
        onClick={finish}
      >
        {/* Curtain rod */}
        <div className="absolute top-0 left-0 right-0" style={{ height: 8, background: doorDeep, zIndex: 2 }} />

        {/* Left curtain half */}
        <div
          className="absolute top-0 left-0 overflow-hidden"
          style={{
            width: '50%',
            height: '100%',
            background: curtainGradient,
            transform: curtainTransform,
            transformOrigin: 'top center',
            transition: transitionTiming,
            willChange: 'transform',
            boxShadow: `inset -6px 0 18px ${doorDeep}`,
          }}
        >
          <CurtainPleats side="left" doorDeep={doorDeep} doorShadow={doorShadow} />
        </div>

        {/* Right curtain half */}
        <div
          className="absolute top-0 right-0 overflow-hidden"
          style={{
            width: '50%',
            height: '100%',
            background: curtainGradient,
            transform: curtainTransform,
            transformOrigin: 'top center',
            transition: transitionTiming,
            willChange: 'transform',
            boxShadow: `inset 6px 0 18px ${doorDeep}`,
          }}
        >
          <CurtainPleats side="right" doorDeep={doorDeep} doorShadow={doorShadow} />
        </div>

        {/* Center seam overlay */}
        <div
          className="absolute left-1/2 top-0 bottom-0 pointer-events-none flex flex-col items-center justify-center"
          style={{
            transform: 'translateX(-50%)',
            width: 'min(90vw, 360px)',
            opacity: isOpening ? 0 : 1,
            transition: 'opacity 0.6s ease',
            zIndex: 3,
          }}
        >
          {showMonogram && (
            settings.monogram_url ? (
              <img
                src={settings.monogram_url}
                alt="Monogram"
                className="object-contain mb-4"
                style={{
                  width: `calc(5rem * ${clampSize(monogramSize)})`,
                  height: `calc(5rem * ${clampSize(monogramSize)})`,
                  filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))',
                }}
              />
            ) : (
              <span
                className="mb-4"
                style={{
                  fontFamily: nameFont,
                  fontSize: `clamp(${3 * clampSize(monogramSize)}rem, ${9 * clampSize(monogramSize)}vw, ${5 * clampSize(monogramSize)}rem)`,
                  color: monogramColor || doorDeep,
                  opacity: 0.7,
                  lineHeight: 1,
                }}
              >
                {settings.seal_style === 'heart' ? '\u2764' : '&'}
              </span>
            )
          )}
          {showNames && (
            <p
              className="text-center"
              style={{
                fontFamily: nameFont,
                fontSize: `clamp(${1.5 * clampSize(nameSize)}rem, ${5 * clampSize(nameSize)}vw, ${2.25 * clampSize(nameSize)}rem)`,
                color: nameColor || doorShadow,
                lineHeight: 1.2,
                opacity: 0.85,
              }}
            >
              {settings.partner1_name} &amp; {settings.partner2_name}
            </p>
          )}
          {showDate && settings.wedding_date && (
            <p
              className="mt-3 text-center tracking-wide"
              style={{
                fontFamily: dateFont,
                fontSize: `clamp(${0.7 * clampSize(dateSize)}rem, ${2.5 * clampSize(dateSize)}vw, ${0.85 * clampSize(dateSize)}rem)`,
                color: dateColor || doorShadow,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                opacity: 0.6,
              }}
            >
              {new Date(settings.wedding_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
          <div className="mt-6 flex items-center gap-2" style={{ opacity: 0.5 }}>
            <span className="h-px w-8" style={{ background: doorShadow }} />
            <span style={{ color: doorShadow, fontSize: 10, letterSpacing: '0.2em' }}>OPENING</span>
            <span className="h-px w-8" style={{ background: doorShadow }} />
          </div>
        </div>
      </div>
    );
  }

  // === Curtain-side style (slides apart horizontally) ===
  if (doorStyle === 'curtain-side') {
    const leftCurtainTransform = isOpening ? 'translateX(-100%)' : 'translateX(0)';
    const rightCurtainTransform = isOpening ? 'translateX(100%)' : 'translateX(0)';
    return (
      <div
        className="fixed inset-0 z-40 flex"
        style={{
          opacity: isDone ? 0 : 1,
          transition: fadeTiming,
          pointerEvents: isDone ? 'none' : 'auto',
        }}
        onClick={finish}
      >
        {/* Curtain rod across the top */}
        <div className="absolute top-0 left-0 right-0" style={{ height: 8, background: doorDeep, zIndex: 2 }} />

        {/* Left curtain half */}
        <div
          className="relative h-full overflow-hidden"
          style={{
            width: '50%',
            background: curtainGradient,
            transform: leftCurtainTransform,
            transformOrigin: 'left center',
            transition: transitionTiming,
            willChange: 'transform',
            boxShadow: `inset -6px 0 18px ${doorDeep}, inset 2px 0 3px ${doorHighlight}`,
          }}
        >
          <CurtainPleats side="left" doorDeep={doorDeep} doorShadow={doorShadow} />
          <div className="absolute right-0 top-0 bottom-0 w-2 pointer-events-none" style={{
            background: `linear-gradient(to right, transparent, ${doorDeep})`,
            opacity: 0.5,
          }} />
        </div>

        {/* Right curtain half */}
        <div
          className="relative h-full overflow-hidden"
          style={{
            width: '50%',
            background: curtainGradient,
            transform: rightCurtainTransform,
            transformOrigin: 'right center',
            transition: transitionTiming,
            willChange: 'transform',
            boxShadow: `inset 6px 0 18px ${doorDeep}, inset -2px 0 3px ${doorHighlight}`,
          }}
        >
          <CurtainPleats side="right" doorDeep={doorDeep} doorShadow={doorShadow} />
          <div className="absolute left-0 top-0 bottom-0 w-2 pointer-events-none" style={{
            background: `linear-gradient(to left, transparent, ${doorDeep})`,
            opacity: 0.5,
          }} />
        </div>

        {/* Center seam overlay */}
        <div
          className="absolute left-1/2 top-0 bottom-0 pointer-events-none flex flex-col items-center justify-center"
          style={{
            transform: 'translateX(-50%)',
            width: 'min(90vw, 360px)',
            opacity: isOpening ? 0 : 1,
            transition: 'opacity 0.6s ease',
          }}
        >
          {showMonogram && (
            settings.monogram_url ? (
              <img
                src={settings.monogram_url}
                alt="Monogram"
                className="object-contain mb-4"
                style={{
                  width: `calc(5rem * ${clampSize(monogramSize)})`,
                  height: `calc(5rem * ${clampSize(monogramSize)})`,
                  filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))',
                }}
              />
            ) : (
              <span
                className="mb-4"
                style={{
                  fontFamily: nameFont,
                  fontSize: `clamp(${3 * clampSize(monogramSize)}rem, ${9 * clampSize(monogramSize)}vw, ${5 * clampSize(monogramSize)}rem)`,
                  color: monogramColor || doorDeep,
                  opacity: 0.7,
                  lineHeight: 1,
                }}
              >
                {settings.seal_style === 'heart' ? '\u2764' : '&'}
              </span>
            )
          )}
          {showNames && (
            <p
              className="text-center"
              style={{
                fontFamily: nameFont,
                fontSize: `clamp(${1.5 * clampSize(nameSize)}rem, ${5 * clampSize(nameSize)}vw, ${2.25 * clampSize(nameSize)}rem)`,
                color: nameColor || doorShadow,
                lineHeight: 1.2,
                opacity: 0.85,
              }}
            >
              {settings.partner1_name} &amp; {settings.partner2_name}
            </p>
          )}
          {showDate && settings.wedding_date && (
            <p
              className="mt-3 text-center tracking-wide"
              style={{
                fontFamily: dateFont,
                fontSize: `clamp(${0.7 * clampSize(dateSize)}rem, ${2.5 * clampSize(dateSize)}vw, ${0.85 * clampSize(dateSize)}rem)`,
                color: dateColor || doorShadow,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                opacity: 0.6,
              }}
            >
              {new Date(settings.wedding_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
          <div className="mt-6 flex items-center gap-2" style={{ opacity: 0.5 }}>
            <span className="h-px w-8" style={{ background: doorShadow }} />
            <span style={{ color: doorShadow, fontSize: 10, letterSpacing: '0.2em' }}>OPENING</span>
            <span className="h-px w-8" style={{ background: doorShadow }} />
          </div>
        </div>
      </div>
    );
  }

  // === Door styles (slide open) ===
  const slideDistance = '100%';
  const leftTransform = isOpening ? `translateX(-${slideDistance})` : 'translateX(0)';
  const rightTransform = isOpening ? `translateX(${slideDistance})` : 'translateX(0)';

  return (
    <div
      className="fixed inset-0 z-40 flex"
      style={{
        opacity: isDone ? 0 : 1,
        transition: fadeTiming,
        pointerEvents: isDone ? 'none' : 'auto',
      }}
      onClick={finish}
    >
      {/* Left door */}
      <div
        className="relative h-full overflow-hidden"
        style={{
          width: '50%',
          background: activeGradient,
          borderRadius: doorStyle === 'arched' ? `${archRadius}px 0 0 0` : 0,
          boxShadow: activeBoxShadow,
          transform: leftTransform,
          transformOrigin: 'left center',
          transition: transitionTiming,
          willChange: 'transform',
          borderLeft: doorStyle === 'rustic' ? '3px solid rgba(0,0,0,0.12)' : 'none',
        }}
      >
        <DoorPanel
          side="left"
          style={doorStyle}
          doorShadow={doorShadow}
          doorDeep={doorDeep}
          doorHighlight={doorHighlight}
          doorColor={doorColor}
        />
        <div className="absolute right-0 top-0 bottom-0 w-2 pointer-events-none" style={{
          background: `linear-gradient(to right, transparent, ${doorDeep})`,
          opacity: 0.5,
        }} />
      </div>

      {/* Right door */}
      <div
        className="relative h-full overflow-hidden"
        style={{
          width: '50%',
          background: activeGradient,
          borderRadius: doorStyle === 'arched' ? `0 ${archRadius}px 0 0` : 0,
          boxShadow: activeBoxShadow,
          transform: rightTransform,
          transformOrigin: 'right center',
          transition: transitionTiming,
          willChange: 'transform',
          borderRight: doorStyle === 'rustic' ? '3px solid rgba(0,0,0,0.12)' : 'none',
        }}
      >
        <DoorPanel
          side="right"
          style={doorStyle}
          doorShadow={doorShadow}
          doorDeep={doorDeep}
          doorHighlight={doorHighlight}
          doorColor={doorColor}
        />
        <div className="absolute left-0 top-0 bottom-0 w-2 pointer-events-none" style={{
          background: `linear-gradient(to left, transparent, ${doorDeep})`,
          opacity: 0.5,
        }} />
      </div>

      {/* Center seam overlay — visible while closed */}
      <div
        className="absolute left-1/2 top-0 bottom-0 pointer-events-none flex flex-col items-center justify-center"
        style={{
          transform: 'translateX(-50%)',
          width: 'min(90vw, 360px)',
          opacity: isOpening ? 0 : 1,
          transition: 'opacity 0.6s ease',
        }}
      >
        {showMonogram && (
          settings.monogram_url ? (
            <img
              src={settings.monogram_url}
              alt="Monogram"
              className="object-contain mb-4"
              style={{
                width: `calc(5rem * ${clampSize(monogramSize)})`,
                height: `calc(5rem * ${clampSize(monogramSize)})`,
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))',
              }}
            />
          ) : (
            <span
              className="mb-4"
              style={{
                fontFamily: nameFont,
                fontSize: `clamp(${3 * clampSize(monogramSize)}rem, ${9 * clampSize(monogramSize)}vw, ${5 * clampSize(monogramSize)}rem)`,
                color: monogramColor || doorDeep,
                opacity: 0.7,
                lineHeight: 1,
              }}
            >
              {settings.seal_style === 'heart' ? '\u2764' : '&'}
            </span>
          )
        )}
        {showNames && (
          <p
            className="text-center"
            style={{
              fontFamily: nameFont,
              fontSize: `clamp(${1.5 * clampSize(nameSize)}rem, ${5 * clampSize(nameSize)}vw, ${2.25 * clampSize(nameSize)}rem)`,
              color: nameColor || doorShadow,
              lineHeight: 1.2,
              opacity: 0.85,
            }}
          >
            {settings.partner1_name} &amp; {settings.partner2_name}
          </p>
        )}
        {showDate && settings.wedding_date && (
          <p
            className="mt-3 text-center tracking-wide"
            style={{
              fontFamily: dateFont,
              fontSize: `clamp(${0.7 * clampSize(dateSize)}rem, ${2.5 * clampSize(dateSize)}vw, ${0.85 * clampSize(dateSize)}rem)`,
              color: dateColor || doorShadow,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: 0.6,
            }}
          >
            {new Date(settings.wedding_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}
        <div className="mt-6 flex items-center gap-2" style={{ opacity: 0.5 }}>
          <span className="h-px w-8" style={{ background: doorShadow }} />
          <span style={{ color: doorShadow, fontSize: 10, letterSpacing: '0.2em' }}>OPENING</span>
          <span className="h-px w-8" style={{ background: doorShadow }} />
        </div>
      </div>
    </div>
  );
}

function CurtainPleats({ side, doorDeep, doorShadow }: { side: 'left' | 'right'; doorDeep: string; doorShadow: string }) {
  const isLeft = side === 'left';
  const pleats: React.ReactNode[] = [];
  for (let i = 0; i < 8; i++) {
    const pct = (i / 8) * 100;
    pleats.push(
      <div key={`pleat-${i}`} className="absolute pointer-events-none" style={{
        top: 0, bottom: 0,
        left: `${pct}%`,
        width: 1.5,
        background: doorDeep,
        opacity: 0.18,
      }} />,
    );
  }
  // Scalloped bottom edge shadow
  return (
    <>
      {pleats}
      {/* Inner edge gather shadow */}
      <div className="absolute pointer-events-none" style={{
        [isLeft ? 'right' : 'left']: 0,
        top: 0, bottom: 0,
        width: 30,
        background: `linear-gradient(to ${isLeft ? 'left' : 'right'}, ${doorDeep}, transparent)`,
        opacity: 0.3,
      }} />
      {/* Rod gather shadows at top */}
      <div className="absolute pointer-events-none" style={{
        top: 0, left: 0, right: 0, height: 20,
        background: `linear-gradient(to bottom, ${doorShadow}, transparent)`,
        opacity: 0.4,
      }} />
    </>
  );
}

function adjustColor(hex: string, amount: number): string {
  if (!hex || !hex.startsWith('#')) return hex;
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

function DoorPanel({
  side,
  style,
  doorShadow,
  doorDeep,
  doorHighlight,
  doorColor,
}: {
  side: 'left' | 'right';
  style: DoorStyle;
  doorShadow: string;
  doorDeep: string;
  doorHighlight: string;
  doorColor: string;
}) {
  const isLeft = side === 'left';
  const adjust = adjustColor;

  const decorativeElements: React.ReactNode[] = [];

  if (style === 'classic') {
    decorativeElements.push(
      <div key="border" className="absolute pointer-events-none" style={{
        top: '6%', bottom: '6%',
        left: isLeft ? '8%' : '4%',
        right: isLeft ? '4%' : '8%',
        border: `1px solid ${doorDeep}`,
        opacity: 0.12,
      }} />,
      <div key="flourish" className="absolute top-1/2 flex flex-col items-center" style={{
        [isLeft ? 'right' : 'left']: '7%',
        transform: 'translateY(-50%)',
        opacity: 0.25,
      }}>
        <span className="h-12 w-px" style={{ background: doorShadow }} />
        <span style={{ color: doorShadow, fontSize: 14, margin: '4px 0' }}>&#10022;</span>
        <span className="h-12 w-px" style={{ background: doorShadow }} />
      </div>,
    );
  }

  if (style === 'arched') {
    decorativeElements.push(
      <div key="arch-frame" className="absolute pointer-events-none" style={{
        top: '4%', bottom: '6%',
        left: isLeft ? '8%' : '4%',
        right: isLeft ? '4%' : '8%',
        border: `1px solid ${doorDeep}`,
        borderTopLeftRadius: isLeft ? 80 : 0,
        borderTopRightRadius: isLeft ? 0 : 80,
        borderBottom: 'none',
        opacity: 0.15,
      }} />,
      <div key="arch-flourish" className="absolute pointer-events-none" style={{
        top: '20%',
        [isLeft ? 'right' : 'left']: '7%',
        transform: 'translateY(-50%)',
        opacity: 0.2,
      }}>
        <span style={{ color: doorShadow, fontSize: 18 }}>&#10086;</span>
      </div>,
    );
  }

  if (style === 'paneled') {
    decorativeElements.push(
      <div key="panel1" className="absolute pointer-events-none" style={{
        top: '10%', left: '12%', right: '12%', height: '32%',
        border: `1px solid ${doorDeep}`,
        borderRadius: 4,
        opacity: 0.18,
      }} />,
      <div key="panel2" className="absolute pointer-events-none" style={{
        bottom: '10%', left: '12%', right: '12%', height: '32%',
        border: `1px solid ${doorDeep}`,
        borderRadius: 4,
        opacity: 0.18,
      }} />,
    );
  }

  if (style === 'rustic') {
    decorativeElements.push(
      <div key="plank1" className="absolute pointer-events-none" style={{
        top: '8%', left: '20%', right: '20%', height: '2px',
        background: doorDeep, opacity: 0.2,
      }} />,
      <div key="plank2" className="absolute pointer-events-none" style={{
        top: '30%', left: '20%', right: '20%', height: '2px',
        background: doorDeep, opacity: 0.2,
      }} />,
      <div key="plank3" className="absolute pointer-events-none" style={{
        top: '52%', left: '20%', right: '20%', height: '2px',
        background: doorDeep, opacity: 0.2,
      }} />,
      <div key="plank4" className="absolute pointer-events-none" style={{
        top: '74%', left: '20%', right: '20%', height: '2px',
        background: doorDeep, opacity: 0.2,
      }} />,
      <div key="iron" className="absolute pointer-events-none" style={{
        top: '45%', [isLeft ? 'right' : 'left']: '5%',
        width: 6, height: 30, background: doorDeep, borderRadius: 3, opacity: 0.3,
      }} />,
    );
  }

  if (style === 'modern') {
    decorativeElements.push(
      <div key="line" className="absolute pointer-events-none" style={{
        top: '15%', bottom: '15%',
        [isLeft ? 'left' : 'right']: '25%',
        width: '1px',
        background: doorDeep, opacity: 0.15,
      }} />,
      <div key="handle" className="absolute pointer-events-none" style={{
        top: '50%', [isLeft ? 'right' : 'left']: '6%',
        width: 3, height: 24, background: doorDeep, borderRadius: 2, opacity: 0.25,
        transform: 'translateY(-50%)',
      }} />,
    );
  }

  if (style === 'royal') {
    decorativeElements.push(
      <div key="royal-frame" className="absolute pointer-events-none" style={{
        top: '6%', bottom: '6%',
        left: isLeft ? '8%' : '4%',
        right: isLeft ? '4%' : '8%',
        border: `2px solid ${doorDeep}`,
        borderRadius: 6,
        opacity: 0.25,
        boxShadow: `inset 0 2px 4px ${doorHighlight}`,
      }} />,
      <div key="royal-crown" className="absolute pointer-events-none" style={{
        top: '14%',
        [isLeft ? 'right' : 'left']: '10%',
        transform: 'translateY(-50%)',
        opacity: 0.3,
      }}>
        <span style={{ color: doorShadow, fontSize: 28 }}>&#10086;</span>
      </div>,
      <div key="royal-jewel" className="absolute pointer-events-none" style={{
        top: '50%',
        [isLeft ? 'right' : 'left']: '8%',
        transform: 'translateY(-50%)',
        width: 12, height: 12, borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, ${doorHighlight}, ${doorDeep})`,
        opacity: 0.45,
        boxShadow: `0 0 6px ${doorShadow}`,
      }} />,
    );
  }

  if (style === 'glass') {
    decorativeElements.push(
      <div key="glass-shine" className="absolute pointer-events-none" style={{
        top: '5%',
        [isLeft ? 'left' : 'right']: '10%',
        width: '35%', height: '90%',
        background: 'linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
        borderRadius: 8,
        opacity: 0.6,
      }} />,
      <div key="glass-frost" className="absolute pointer-events-none" style={{
        top: '10%', bottom: '10%',
        left: isLeft ? '12%' : '5%',
        right: isLeft ? '5%' : '12%',
        border: `1px solid rgba(255,255,255,0.2)`,
        borderRadius: 4,
        opacity: 0.3,
      }} />,
      <div key="glass-handle" className="absolute pointer-events-none" style={{
        top: '50%',
        [isLeft ? 'right' : 'left']: '5%',
        transform: 'translateY(-50%)',
        width: 4, height: 40, borderRadius: 2,
        background: `linear-gradient(to bottom, ${doorHighlight}, ${doorDeep})`,
        opacity: 0.35,
      }} />,
    );
  }

  if (style === 'velvet') {
    decorativeElements.push(
      <div key="velvet-sheen" className="absolute pointer-events-none" style={{
        top: '15%',
        [isLeft ? 'left' : 'right']: '15%',
        width: '70%', height: '70%',
        background: `radial-gradient(ellipse at center, ${adjust(doorColor, 10)} 0%, transparent 65%)`,
        opacity: 0.25,
      }} />,
      <div key="velvet-pleats" className="absolute pointer-events-none" style={{
        top: '8%', bottom: '8%',
        [isLeft ? 'left' : 'right']: '12%',
        width: '76%',
      }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={`vp-${i}`} className="absolute" style={{
            top: 0, bottom: 0,
            left: `${i * 20}%`,
            width: 2,
            background: `linear-gradient(to bottom, transparent, ${doorDeep}, transparent)`,
            opacity: 0.12,
          }} />
        ))}
      </div>,
      <div key="velvet-tassel" className="absolute pointer-events-none" style={{
        top: '50%',
        [isLeft ? 'right' : 'left']: '6%',
        transform: 'translateY(-50%)',
        width: 5, height: 35, borderRadius: 3,
        background: `linear-gradient(to bottom, ${doorShadow}, ${doorDeep})`,
        opacity: 0.4,
      }} />,
    );
  }

  if (style === 'wrought-iron') {
    decorativeElements.push(
      <div key="iron-scroll" className="absolute pointer-events-none" style={{
        top: '20%', bottom: '20%',
        left: isLeft ? '12%' : '5%',
        right: isLeft ? '5%' : '12%',
        border: `2px solid ${adjust(doorColor, -40)}`,
        borderRadius: 12,
        opacity: 0.4,
      }} />,
      <div key="iron-scroll2" className="absolute pointer-events-none" style={{
        top: '35%', bottom: '35%',
        left: isLeft ? '20%' : '12%',
        right: isLeft ? '12%' : '20%',
        border: `1px solid ${adjust(doorColor, -50)}`,
        borderRadius: 8,
        opacity: 0.3,
      }} />,
      <div key="iron-cross" className="absolute pointer-events-none" style={{
        top: '50%',
        [isLeft ? 'right' : 'left']: '8%',
        transform: 'translateY(-50%)',
        opacity: 0.35,
      }}>
        <div style={{ width: 2, height: 40, background: adjust(doorColor, -45), margin: '0 auto' }} />
        <div style={{ height: 2, width: 40, background: adjust(doorColor, -45), position: 'absolute', top: '50%', left: '-19px', transform: 'translateY(-50%)' }} />
      </div>,
    );
  }

  if (style === 'marble') {
    decorativeElements.push(
      <div key="marble-vein-a" className="absolute pointer-events-none" style={{
        top: '8%', left: 0, right: 0, height: '1px',
        background: `linear-gradient(90deg, transparent, ${adjust(doorColor, -20)}, transparent)`,
        opacity: 0.3, transform: 'rotate(-8deg)',
      }} />,
      <div key="marble-vein-b" className="absolute pointer-events-none" style={{
        top: '35%', left: 0, right: 0, height: '1px',
        background: `linear-gradient(90deg, transparent, ${adjust(doorColor, -15)}, transparent)`,
        opacity: 0.25, transform: 'rotate(5deg)',
      }} />,
      <div key="marble-vein-c" className="absolute pointer-events-none" style={{
        top: '62%', left: 0, right: 0, height: '1px',
        background: `linear-gradient(90deg, transparent, ${adjust(doorColor, -22)}, transparent)`,
        opacity: 0.2, transform: 'rotate(-3deg)',
      }} />,
      <div key="marble-vein-d" className="absolute pointer-events-none" style={{
        bottom: '12%', left: 0, right: 0, height: '1px',
        background: `linear-gradient(90deg, transparent, ${adjust(doorColor, -18)}, transparent)`,
        opacity: 0.2, transform: 'rotate(10deg)',
      }} />,
    );
  }

  if (style === 'cathedral') {
    decorativeElements.push(
      <div key="cath-arch" className="absolute pointer-events-none" style={{
        top: '5%',
        left: isLeft ? '10%' : '5%',
        right: isLeft ? '5%' : '10%',
        height: '35%',
        border: `2px solid ${doorDeep}`,
        borderTopLeftRadius: isLeft ? 100 : 0,
        borderTopRightRadius: isLeft ? 0 : 100,
        borderBottom: 'none',
        opacity: 0.2,
      }} />,
      <div key="cath-col" className="absolute pointer-events-none" style={{
        top: '42%', bottom: '6%',
        left: isLeft ? '15%' : '8%',
        right: isLeft ? '8%' : '15%',
        border: `1px solid ${doorDeep}`,
        opacity: 0.15,
      }} />,
      <div key="cath-cross" className="absolute pointer-events-none" style={{
        top: '18%',
        [isLeft ? 'right' : 'left']: '12%',
        transform: 'translateY(-50%)',
        opacity: 0.25,
      }}>
        <div style={{ width: 2, height: 30, background: doorShadow, margin: '0 auto' }} />
        <div style={{ height: 2, width: 18, background: doorShadow, position: 'absolute', top: '35%', left: '-8px' }} />
      </div>,
    );
  }

  if (style === 'lace') {
    decorativeElements.push(
      <div key="lace-border" className="absolute pointer-events-none" style={{
        top: '5%', bottom: '5%',
        left: isLeft ? '8%' : '4%',
        right: isLeft ? '4%' : '8%',
        border: `1px solid ${doorDeep}`,
        borderRadius: 4,
        opacity: 0.15,
      }} />,
      <div key="lace-pattern" className="absolute pointer-events-none" style={{
        top: '15%', bottom: '15%',
        left: isLeft ? '15%' : '8%',
        right: isLeft ? '8%' : '15%',
      }}>
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => (
            <div key={`ld-${row}-${col}`} className="absolute" style={{
              top: `${row * 33}%`,
              left: `${col * 33}%`,
              width: 8, height: 8, borderRadius: '50%',
              border: `1px solid ${doorDeep}`,
              opacity: 0.2,
            }} />
          ))
        )}
      </div>,
    );
  }

  if (style === 'gilded') {
    decorativeElements.push(
      <div key="gild-outer" className="absolute pointer-events-none" style={{
        top: '5%', bottom: '5%',
        left: isLeft ? '8%' : '4%',
        right: isLeft ? '4%' : '8%',
        border: `2px solid ${adjust(doorColor, -10)}`,
        borderRadius: 5,
        opacity: 0.35,
        boxShadow: `inset 0 2px 4px ${adjust(doorColor, 25)}, 0 0 4px ${adjust(doorColor, 15)}`,
      }} />,
      <div key="gild-inner" className="absolute pointer-events-none" style={{
        top: '12%', bottom: '12%',
        left: isLeft ? '14%' : '8%',
        right: isLeft ? '8%' : '14%',
        border: `1px solid ${adjust(doorColor, 20)}`,
        borderRadius: 3,
        opacity: 0.25,
      }} />,
      <div key="gild-orn" className="absolute pointer-events-none" style={{
        top: '50%',
        [isLeft ? 'right' : 'left']: '8%',
        transform: 'translateY(-50%)',
        opacity: 0.3,
      }}>
        <span style={{ color: adjust(doorColor, 15), fontSize: 24 }}>&#10022;</span>
      </div>,
    );
  }

  if (style === 'stone') {
    decorativeElements.push(
      <div key="stone-row1" className="absolute pointer-events-none" style={{
        top: '33%', left: 0, right: 0, height: '2px',
        background: adjust(doorColor, -35), opacity: 0.3,
        boxShadow: `0 1px 0 ${doorHighlight}`,
      }} />,
      <div key="stone-row2" className="absolute pointer-events-none" style={{
        top: '66%', left: 0, right: 0, height: '2px',
        background: adjust(doorColor, -35), opacity: 0.3,
        boxShadow: `0 1px 0 ${doorHighlight}`,
      }} />,
      <div key="stone-mid" className="absolute pointer-events-none" style={{
        top: 0, bottom: 0,
        left: '50%', width: '1px',
        background: adjust(doorColor, -35), opacity: 0.25,
      }} />,
      <div key="stone-keystone" className="absolute pointer-events-none" style={{
        top: '5%',
        [isLeft ? 'right' : 'left']: '8%',
        transform: 'translateY(-50%)',
        width: 20, height: 14,
        background: `linear-gradient(to bottom, ${doorHighlight}, ${doorBase})`,
        opacity: 0.3,
        borderRadius: 2,
        boxShadow: `inset 0 1px 2px ${doorHighlight}, inset 0 -1px 2px ${doorDeep}`,
      }} />,
    );
  }

  if (style === 'bamboo') {
    decorativeElements.push(
      <div key="bamboo-node1" className="absolute pointer-events-none" style={{
        top: '25%', left: 0, right: 0, height: '3px',
        background: `linear-gradient(to right, ${doorDeep}, ${adjust(doorColor, -20)}, ${doorDeep})`,
        opacity: 0.4,
        boxShadow: `0 1px 0 ${doorHighlight}`,
      }} />,
      <div key="bamboo-node2" className="absolute pointer-events-none" style={{
        top: '55%', left: 0, right: 0, height: '3px',
        background: `linear-gradient(to right, ${doorDeep}, ${adjust(doorColor, -20)}, ${doorDeep})`,
        opacity: 0.4,
        boxShadow: `0 1px 0 ${doorHighlight}`,
      }} />,
      <div key="bamboo-node3" className="absolute pointer-events-none" style={{
        bottom: '10%', left: 0, right: 0, height: '3px',
        background: `linear-gradient(to right, ${doorDeep}, ${adjust(doorColor, -20)}, ${doorDeep})`,
        opacity: 0.35,
        boxShadow: `0 1px 0 ${doorHighlight}`,
      }} />,
      <div key="bamboo-stalk" className="absolute pointer-events-none" style={{
        top: '8%', bottom: '8%',
        [isLeft ? 'left' : 'right']: '20%',
        width: '1px',
        background: `linear-gradient(to bottom, ${doorHighlight}, ${doorDeep})`,
        opacity: 0.2,
      }} />,
    );
  }

  return (
    <>
      <div
        className="absolute pointer-events-none"
        style={{
          top: '5%', bottom: '5%',
          [isLeft ? 'left' : 'right']: '6%',
          width: '2px',
          background: `linear-gradient(to bottom, transparent, ${doorShadow}, transparent)`,
          opacity: 0.3,
        }}
      />
      {decorativeElements}
    </>
  );
}
