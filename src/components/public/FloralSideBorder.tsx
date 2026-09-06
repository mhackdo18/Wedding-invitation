import type { ReactNode } from 'react';

interface FloralSideBorderProps {
  children: ReactNode;
  className?: string;
  borderColor: string;
  borderThickness: number;
  padding?: string;
  variant: 'rose' | 'wisteria' | 'garden' | 'wildflower';
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

interface VariantConfig {
  flowerFill: string;
  flowerFillDeep: string;
  flowerStroke: string;
  leafFill: string;
  leafStroke: string;
  stemStroke: string;
  budFill: string;
  centerFill: string;
  accentDot: string;
}

const VARIANT_CONFIGS: Record<FloralSideBorderProps['variant'], VariantConfig> = {
  rose: {
    flowerFill: 'rgba(200,130,140,0.28)',
    flowerFillDeep: 'rgba(180,100,115,0.38)',
    flowerStroke: 'rgba(150,70,85,0.55)',
    leafFill: 'rgba(90,130,80,0.22)',
    leafStroke: 'rgba(60,100,55,0.5)',
    stemStroke: 'rgba(80,110,70,0.55)',
    budFill: 'rgba(190,110,120,0.35)',
    centerFill: 'rgba(220,180,100,0.6)',
    accentDot: 'rgba(200,160,90,0.5)',
  },
  wisteria: {
    flowerFill: 'rgba(150,120,180,0.24)',
    flowerFillDeep: 'rgba(120,90,160,0.36)',
    flowerStroke: 'rgba(100,70,140,0.5)',
    leafFill: 'rgba(80,120,90,0.2)',
    leafStroke: 'rgba(55,95,60,0.48)',
    stemStroke: 'rgba(90,100,75,0.5)',
    budFill: 'rgba(130,100,170,0.32)',
    centerFill: 'rgba(230,210,150,0.55)',
    accentDot: 'rgba(180,160,200,0.45)',
  },
  garden: {
    flowerFill: 'rgba(160,170,200,0.24)',
    flowerFillDeep: 'rgba(120,140,180,0.34)',
    flowerStroke: 'rgba(90,110,150,0.5)',
    leafFill: 'rgba(100,140,90,0.22)',
    leafStroke: 'rgba(65,105,60,0.48)',
    stemStroke: 'rgba(85,115,75,0.5)',
    budFill: 'rgba(140,155,185,0.32)',
    centerFill: 'rgba(230,200,120,0.55)',
    accentDot: 'rgba(200,175,110,0.45)',
  },
  wildflower: {
    flowerFill: 'rgba(180,160,90,0.26)',
    flowerFillDeep: 'rgba(160,130,60,0.36)',
    flowerStroke: 'rgba(130,100,40,0.52)',
    leafFill: 'rgba(95,125,75,0.22)',
    leafStroke: 'rgba(60,95,55,0.48)',
    stemStroke: 'rgba(80,110,65,0.5)',
    budFill: 'rgba(170,145,75,0.34)',
    centerFill: 'rgba(220,190,100,0.58)',
    accentDot: 'rgba(200,170,80,0.48)',
  },
};

function RoseFlower({ cx, cy, scale, cfg }: { cx: number; cy: number; scale: number; cfg: VariantConfig }) {
  const s = scale;
  return (
    <g transform={`translate(${cx},${cy}) scale(${s})`}>
      {/* Outer petals */}
      <path d="M 0 -14 Q 10 -12 12 -4 Q 14 4 8 10 Q 0 14 -8 10 Q -14 4 -12 -4 Q -10 -12 0 -14 Z"
        fill={cfg.flowerFillDeep} stroke={cfg.flowerStroke} strokeWidth="0.5" />
      {/* Middle petal ring */}
      <path d="M 0 -10 Q 7 -8 9 -2 Q 10 4 5 8 Q 0 10 -5 8 Q -10 4 -9 -2 Q -7 -8 0 -10 Z"
        fill={cfg.flowerFill} stroke={cfg.flowerStroke} strokeWidth="0.4" />
      {/* Inner spiral petals */}
      <path d="M 0 -6 Q 4 -5 5 -1 Q 5 3 2 5 Q 0 6 -2 5 Q -5 3 -5 -1 Q -4 -5 0 -6 Z"
        fill={cfg.flowerFillDeep} stroke={cfg.flowerStroke} strokeWidth="0.3" opacity="0.7" />
      <path d="M 0 -3 Q 2 -2 3 0 Q 2 2 0 3 Q -2 2 -3 0 Q -2 -2 0 -3 Z"
        fill={cfg.flowerFill} stroke={cfg.flowerStroke} strokeWidth="0.25" />
      <circle cx="0" cy="0" r="1.5" fill={cfg.centerFill} />
    </g>
  );
}

function SmallBlossom({ cx, cy, scale, cfg }: { cx: number; cy: number; scale: number; cfg: VariantConfig }) {
  const s = scale;
  return (
    <g transform={`translate(${cx},${cy}) scale(${s})`}>
      {[0, 72, 144, 216, 288].map((deg) => (
        <ellipse
          key={deg}
          cx="0" cy="-5" rx="2.5" ry="4"
          fill={cfg.flowerFill}
          stroke={cfg.flowerStroke}
          strokeWidth="0.3"
          transform={`rotate(${deg})`}
        />
      ))}
      <circle cx="0" cy="0" r="1.8" fill={cfg.centerFill} />
    </g>
  );
}

function Leaf({ cx, cy, angle, length, cfg }: { cx: number; cy: number; angle: number; length: number; cfg: VariantConfig }) {
  return (
    <g transform={`translate(${cx},${cy}) rotate(${angle})`}>
      <path d={`M 0 0 Q ${length * 0.3} -${length * 0.2} ${length} 0 Q ${length * 0.3} ${length * 0.2} 0 0 Z`}
        fill={cfg.leafFill} stroke={cfg.leafStroke} strokeWidth="0.4" />
      <path d={`M 0 0 L ${length} 0`} fill="none" stroke={cfg.leafStroke} strokeWidth="0.3" opacity="0.5" />
    </g>
  );
}

function Bud({ cx, cy, angle, cfg }: { cx: number; cy: number; angle: number; cfg: VariantConfig }) {
  return (
    <g transform={`translate(${cx},${cy}) rotate(${angle})`}>
      <path d="M 0 0 Q 3 -4 0 -8 Q -3 -4 0 0 Z" fill={cfg.budFill} stroke={cfg.flowerStroke} strokeWidth="0.3" />
      <path d="M -2 0 Q 0 -2 2 0" fill="none" stroke={cfg.leafStroke} strokeWidth="0.3" />
    </g>
  );
}

function FloralSideSvg({ cfg, flip, className = '' }: { cfg: VariantConfig; flip?: boolean; className?: string }) {
  const transform = flip ? 'scaleX(-1)' : '';
  return (
    <svg
      viewBox="0 0 80 400"
      preserveAspectRatio="xMidYMid stretch"
      className={`absolute pointer-events-none ${className}`}
      style={{ transform, transformOrigin: '40px 200px' }}
      width="80"
      height="100%"
      aria-hidden="true"
    >
      {/* Main curving stem */}
      <path d="M 30 0 Q 45 40 35 80 Q 20 120 40 160 Q 55 200 35 240 Q 20 280 40 320 Q 50 360 32 400"
        fill="none" stroke={cfg.stemStroke} strokeWidth="1.6" strokeLinecap="round" />

      {/* Secondary thinner stem */}
      <path d="M 45 20 Q 55 60 42 100 Q 30 140 48 180 Q 60 220 42 260 Q 30 300 48 340 Q 55 380 40 400"
        fill="none" stroke={cfg.stemStroke} strokeWidth="1" strokeLinecap="round" opacity="0.6" />

      {/* Leaves along main stem */}
      <Leaf cx={36} cy={30} angle={-35} length={14} cfg={cfg} />
      <Leaf cx={30} cy={55} angle={160} length={12} cfg={cfg} />
      <Leaf cx={38} cy={95} angle={-20} length={16} cfg={cfg} />
      <Leaf cx={28} cy={120} angle={170} length={13} cfg={cfg} />
      <Leaf cx={42} cy={150} angle={-40} length={15} cfg={cfg} />
      <Leaf cx={30} cy={180} angle={155} length={14} cfg={cfg} />
      <Leaf cx={40} cy={210} angle={-25} length={16} cfg={cfg} />
      <Leaf cx={28} cy={240} angle={165} length={12} cfg={cfg} />
      <Leaf cx={42} cy={270} angle={-35} length={14} cfg={cfg} />
      <Leaf cx={30} cy={300} angle={160} length={15} cfg={cfg} />
      <Leaf cx={40} cy={330} angle={-20} length={13} cfg={cfg} />
      <Leaf cx={32} cy={360} angle={170} length={14} cfg={cfg} />
      <Leaf cx={38} cy={385} angle={-30} length={12} cfg={cfg} />

      {/* Rose flowers — large */}
      <RoseFlower cx={38} cy={50} scale={1.2} cfg={cfg} />
      <RoseFlower cx={32} cy={145} scale={1} cfg={cfg} />
      <RoseFlower cx={40} cy={230} scale={1.3} cfg={cfg} />
      <RoseFlower cx={35} cy={325} scale={1} cfg={cfg} />

      {/* Small blossoms scattered */}
      <SmallBlossom cx={48} cy={85} scale={0.8} cfg={cfg} />
      <SmallBlossom cx={28} cy={195} scale={0.7} cfg={cfg} />
      <SmallBlossom cx={48} cy={280} scale={0.85} cfg={cfg} />
      <SmallBlossom cx={28} cy={365} scale={0.7} cfg={cfg} />

      {/* Buds */}
      <Bud cx={42} cy={18} angle={-20} cfg={cfg} />
      <Bud cx={36} cy={110} angle={30} cfg={cfg} />
      <Bud cx={44} cy={260} angle={-15} cfg={cfg} />
      <Bud cx={34} cy={350} angle={25} cfg={cfg} />

      {/* Small accent dots */}
      <circle cx="50" cy="35" r="1" fill={cfg.accentDot} />
      <circle cx="25" cy="70" r="0.8" fill={cfg.accentDot} />
      <circle cx="52" cy="130" r="1" fill={cfg.accentDot} />
      <circle cx="22" cy="165" r="0.8" fill={cfg.accentDot} />
      <circle cx="50" cy="215" r="1" fill={cfg.accentDot} />
      <circle cx="24" cy="250" r="0.8" fill={cfg.accentDot} />
      <circle cx="52" cy="310" r="1" fill={cfg.accentDot} />
      <circle cx="22" cy="345" r="0.8" fill={cfg.accentDot} />

      {/* Tendril curls */}
      <path d="M 35 70 Q 48 72 50 80 Q 48 86 42 84" fill="none" stroke={cfg.stemStroke} strokeWidth="0.6" opacity="0.45" />
      <path d="M 38 160 Q 52 162 54 170 Q 52 176 46 174" fill="none" stroke={cfg.stemStroke} strokeWidth="0.6" opacity="0.45" />
      <path d="M 36 245 Q 50 247 52 255 Q 50 261 44 259" fill="none" stroke={cfg.stemStroke} strokeWidth="0.6" opacity="0.45" />
      <path d="M 38 330 Q 52 332 54 340 Q 52 346 46 344" fill="none" stroke={cfg.stemStroke} strokeWidth="0.6" opacity="0.45" />
    </svg>
  );
}

function TopCornerFloral({ cfg, flip, className = '' }: { cfg: VariantConfig; flip?: boolean; className?: string }) {
  const transform = flip ? 'scaleX(-1)' : '';
  return (
    <svg
      viewBox="0 0 120 80"
      className={`absolute pointer-events-none ${className}`}
      style={{ transform }}
      width="120"
      height="80"
      aria-hidden="true"
    >
      <path d="M 5 5 Q 30 10 45 28 Q 58 45 55 65" fill="none" stroke={cfg.stemStroke} strokeWidth="1.4" strokeLinecap="round" />
      <Leaf cx={20} cy={14} angle={-30} length={12} cfg={cfg} />
      <Leaf cx={35} cy={25} angle={-45} length={14} cfg={cfg} />
      <Leaf cx={45} cy={40} angle={20} length={11} cfg={cfg} />
      <RoseFlower cx={30} cy={20} scale={0.9} cfg={cfg} />
      <SmallBlossom cx={50} cy={45} scale={0.6} cfg={cfg} />
      <Bud cx={15} cy={10} angle={-15} cfg={cfg} />
    </svg>
  );
}

function BottomCornerFloral({ cfg, flip, className = '' }: { cfg: VariantConfig; flip?: boolean; className?: string }) {
  const transform = flip ? 'scaleX(-1)' : '';
  return (
    <svg
      viewBox="0 0 120 80"
      className={`absolute pointer-events-none ${className}`}
      style={{ transform }}
      width="120"
      height="80"
      aria-hidden="true"
    >
      <path d="M 5 75 Q 30 70 45 52 Q 58 35 55 15" fill="none" stroke={cfg.stemStroke} strokeWidth="1.4" strokeLinecap="round" />
      <Leaf cx={20} cy={66} angle={30} length={12} cfg={cfg} />
      <Leaf cx={35} cy={55} angle={45} length={14} cfg={cfg} />
      <Leaf cx={45} cy={40} angle={-20} length={11} cfg={cfg} />
      <RoseFlower cx={30} cy={60} scale={0.9} cfg={cfg} />
      <SmallBlossom cx={50} cy={35} scale={0.6} cfg={cfg} />
      <Bud cx={15} cy={70} angle={15} cfg={cfg} />
    </svg>
  );
}

export function FloralSideBorder({
  children,
  className = '',
  borderColor,
  borderThickness,
  padding = '0px',
  variant,
}: FloralSideBorderProps) {
  const t = Math.max(0.5, borderThickness);
  const cfg = VARIANT_CONFIGS[variant];
  const sideWidth = 70;

  return (
    <div className={`relative ${className}`} style={{ padding: `${padding}`, background: 'transparent', border: `${t}px solid ${hexToRgba(borderColor, 0.3)}`, borderRadius: '2px' }}>
      {/* Left floral side */}
      <div className="absolute pointer-events-none" style={{ top: 0, left: 0, width: `${sideWidth}px`, height: '100%', overflow: 'hidden' }}>
        <FloralSideSvg cfg={cfg} className="top-0 left-0" />
      </div>
      {/* Right floral side (mirrored) */}
      <div className="absolute pointer-events-none" style={{ top: 0, right: 0, width: `${sideWidth}px`, height: '100%', overflow: 'hidden' }}>
        <FloralSideSvg cfg={cfg} flip className="top-0 right-0" />
      </div>

      {/* Top-left corner floral */}
      <TopCornerFloral cfg={cfg} className="top-0 left-0" />
      {/* Top-right corner floral */}
      <TopCornerFloral cfg={cfg} flip className="top-0 right-0" />
      {/* Bottom-left corner floral */}
      <BottomCornerFloral cfg={cfg} className="bottom-0 left-0" />
      {/* Bottom-right corner floral */}
      <BottomCornerFloral cfg={cfg} flip className="bottom-0 right-0" />

      {/* Thin inner accent line */}
      <div className="absolute pointer-events-none" style={{
        inset: `${sideWidth * 0.3}px`,
        border: `${Math.max(0.5, t * 0.5)}px solid ${hexToRgba(borderColor, 0.2)}`,
        borderRadius: '1px',
      }} />

      <div style={{ position: 'relative', zIndex: 1, paddingLeft: `${sideWidth - 10}px`, paddingRight: `${sideWidth - 10}px` }}>
        {children}
      </div>
    </div>
  );
}
