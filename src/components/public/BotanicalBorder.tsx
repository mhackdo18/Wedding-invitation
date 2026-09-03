import type { ReactNode } from 'react';

export type BotanicalStyle = 'emerald' | 'rose' | 'gold' | 'sage' | 'ivory';

interface BotanicalBorderProps {
  style?: BotanicalStyle;
  children: ReactNode;
  className?: string;
  showCorners?: boolean;
  showGoldDots?: boolean;
  showGeometricFrame?: boolean;
  background?: string;
  borderRadius?: string;
  padding?: string;
}

const STYLE_CONFIG: Record<BotanicalStyle, {
  leafFill: string;
  leafStroke: string;
  petalFill: string;
  petalStroke: string;
  branchStroke: string;
  goldDot: string;
  goldGlow: string;
  frameBorder: string;
  innerFrameStroke: string;
}> = {
  emerald: {
    leafFill: 'rgba(6,95,70,0.18)',
    leafStroke: 'rgba(6,78,59,0.42)',
    petalFill: 'rgba(16,185,129,0.14)',
    petalStroke: 'rgba(4,120,87,0.38)',
    branchStroke: 'rgba(78,124,90,0.45)',
    goldDot: 'rgba(252,211,77,0.85)',
    goldGlow: 'rgba(217,119,6,0.5)',
    frameBorder: 'rgba(245,158,11,0.45)',
    innerFrameStroke: 'rgba(245,158,11,0.6)',
  },
  rose: {
    leafFill: 'rgba(190,100,100,0.16)',
    leafStroke: 'rgba(150,60,60,0.38)',
    petalFill: 'rgba(244,114,182,0.22)',
    petalStroke: 'rgba(190,24,93,0.42)',
    branchStroke: 'rgba(180,120,120,0.42)',
    goldDot: 'rgba(252,211,77,0.8)',
    goldGlow: 'rgba(217,119,6,0.45)',
    frameBorder: 'rgba(245,158,11,0.4)',
    innerFrameStroke: 'rgba(245,158,11,0.55)',
  },
  gold: {
    leafFill: 'rgba(180,140,60,0.16)',
    leafStroke: 'rgba(150,110,40,0.38)',
    petalFill: 'rgba(252,211,77,0.18)',
    petalStroke: 'rgba(180,130,50,0.42)',
    branchStroke: 'rgba(160,120,50,0.4)',
    goldDot: 'rgba(252,211,77,0.9)',
    goldGlow: 'rgba(217,119,6,0.6)',
    frameBorder: 'rgba(245,158,11,0.55)',
    innerFrameStroke: 'rgba(245,158,11,0.7)',
  },
  sage: {
    leafFill: 'rgba(100,130,100,0.16)',
    leafStroke: 'rgba(70,100,70,0.38)',
    petalFill: 'rgba(150,180,150,0.14)',
    petalStroke: 'rgba(90,120,90,0.36)',
    branchStroke: 'rgba(100,120,100,0.4)',
    goldDot: 'rgba(252,211,77,0.75)',
    goldGlow: 'rgba(217,119,6,0.4)',
    frameBorder: 'rgba(180,160,120,0.4)',
    innerFrameStroke: 'rgba(180,160,120,0.55)',
  },
  ivory: {
    leafFill: 'rgba(200,180,150,0.14)',
    leafStroke: 'rgba(160,140,110,0.32)',
    petalFill: 'rgba(230,220,200,0.16)',
    petalStroke: 'rgba(180,160,130,0.34)',
    branchStroke: 'rgba(170,150,120,0.36)',
    goldDot: 'rgba(252,211,77,0.8)',
    goldGlow: 'rgba(217,119,6,0.45)',
    frameBorder: 'rgba(245,158,11,0.42)',
    innerFrameStroke: 'rgba(245,158,11,0.58)',
  },
};

function FloralCornerSvg({ config, flip, className = '' }: { config: typeof STYLE_CONFIG.emerald; flip?: 'x' | 'y' | 'xy'; className?: string }) {
  const transform = flip === 'xy' ? 'scale(-1,-1)' : flip === 'x' ? 'scaleX(-1)' : flip === 'y' ? 'scaleY(-1)' : '';
  return (
    <svg
      viewBox="0 0 120 120"
      className={`absolute pointer-events-none ${className}`}
      style={{ transform }}
      width="120"
      height="120"
      aria-hidden="true"
    >
      {/* Main branch */}
      <path
        d="M 8 8 Q 30 12 42 28 Q 54 44 58 62 Q 60 72 58 82"
        fill="none"
        stroke={config.branchStroke}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Leaves */}
      <path d="M 18 10 Q 28 4 38 14 Q 30 22 18 10 Z" fill={config.leafFill} stroke={config.leafStroke} strokeWidth="0.8" />
      <path d="M 28 18 Q 40 14 48 26 Q 38 32 28 18 Z" fill={config.leafFill} stroke={config.leafStroke} strokeWidth="0.8" />
      <path d="M 38 28 Q 52 26 58 40 Q 48 46 38 28 Z" fill={config.leafFill} stroke={config.leafStroke} strokeWidth="0.8" />
      <path d="M 44 42 Q 58 42 62 56 Q 52 62 44 42 Z" fill={config.leafFill} stroke={config.leafStroke} strokeWidth="0.8" />
      <path d="M 50 56 Q 64 58 66 72 Q 56 76 50 56 Z" fill={config.leafFill} stroke={config.leafStroke} strokeWidth="0.8" />
      {/* Petals / small flowers */}
      <ellipse cx="34" cy="20" rx="4" ry="6" fill={config.petalFill} stroke={config.petalStroke} strokeWidth="0.6" transform="rotate(-30 34 20)" />
      <ellipse cx="48" cy="34" rx="3.5" ry="5.5" fill={config.petalFill} stroke={config.petalStroke} strokeWidth="0.6" transform="rotate(-20 48 34)" />
      <ellipse cx="58" cy="50" rx="3" ry="5" fill={config.petalFill} stroke={config.petalStroke} strokeWidth="0.6" transform="rotate(-15 58 50)" />
      {/* Small berries / dots */}
      <circle cx="40" cy="14" r="1.8" fill={config.goldDot} opacity="0.7" />
      <circle cx="54" cy="30" r="1.5" fill={config.goldDot} opacity="0.6" />
      <circle cx="62" cy="48" r="1.3" fill={config.goldDot} opacity="0.5" />
    </svg>
  );
}

function GoldDots({ config }: { config: typeof STYLE_CONFIG.emerald }) {
  const dots = [
    { top: '15%', left: '85%', size: 3, delay: '0s' },
    { top: '25%', left: '12%', size: 2, delay: '0.5s' },
    { top: '45%', left: '92%', size: 2.5, delay: '1s' },
    { top: '65%', left: '8%', size: 3, delay: '1.5s' },
    { top: '80%', left: '88%', size: 2, delay: '2s' },
    { top: '35%', left: '50%', size: 1.5, delay: '0.8s' },
    { top: '70%', left: '45%', size: 2, delay: '1.3s' },
    { top: '10%', left: '40%', size: 2, delay: '0.3s' },
  ];
  return (
    <>
      {dots.map((d, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            top: d.top,
            left: d.left,
            width: d.size,
            height: d.size,
            background: config.goldDot,
            boxShadow: `0 0 8px ${config.goldGlow}`,
            opacity: 0.6,
          }}
        />
      ))}
    </>
  );
}

export function BotanicalBorder({
  style = 'emerald',
  children,
  className = '',
  showCorners = true,
  showGoldDots = true,
  showGeometricFrame = true,
  background,
  borderRadius = '4px',
  padding = '20px',
}: BotanicalBorderProps) {
  const config = STYLE_CONFIG[style];

  return (
    <div
      className={`relative ${className}`}
      style={{
        background: background || `linear-gradient(to bottom, #FAF8F5, #F4EFEA, #EAE3DC)`,
        borderRadius,
        padding,
        overflow: 'hidden',
      }}
    >
      {/* Soft radial light effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.5) 0%, transparent 70%)',
        }}
      />

      {/* Outer geometric frame */}
      {showGeometricFrame && (
        <div
          className="absolute pointer-events-none"
          style={{
            inset: '10px',
            border: `1px solid ${config.frameBorder}`,
            borderRadius: '2px',
          }}
        />
      )}

      {/* Inner geometric accent lines (asymmetric) */}
      {showGeometricFrame && (
        <>
          <div
            className="absolute pointer-events-none"
            style={{
              top: '14px',
              left: '14px',
              width: '40px',
              height: '40px',
              borderTop: `1.5px solid ${config.innerFrameStroke}`,
              borderLeft: `1.5px solid ${config.innerFrameStroke}`,
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: '14px',
              right: '14px',
              width: '40px',
              height: '40px',
              borderBottom: `1.5px solid ${config.innerFrameStroke}`,
              borderRight: `1.5px solid ${config.innerFrameStroke}`,
            }}
          />
        </>
      )}

      {/* Botanical corner SVGs */}
      {showCorners && (
        <>
          <FloralCornerSvg config={config} className="top-0 left-0" />
          <FloralCornerSvg config={config} flip="xy" className="bottom-0 right-0" />
        </>
      )}

      {/* Gold foil dots */}
      {showGoldDots && <GoldDots config={config} />}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}
