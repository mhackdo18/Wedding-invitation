import type { ReactNode } from 'react';

interface VintageLaceBorderProps {
  children: ReactNode;
  className?: string;
  borderColor: string;
  borderThickness: number;
  padding?: string;
  accentColor?: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

function LaceCornerSvg({ color, flip, className = '' }: { color: string; flip?: 'x' | 'y' | 'xy'; className?: string }) {
  const transform = flip === 'xy' ? 'scale(-1,-1)' : flip === 'x' ? 'scaleX(-1)' : flip === 'y' ? 'scaleY(-1)' : '';
  const fill = hexToRgba(color, 0.12);
  const stroke = hexToRgba(color, 0.55);
  const strokeDeep = hexToRgba(color, 0.75);
  const dot = hexToRgba(color, 0.5);

  return (
    <svg
      viewBox="0 0 160 160"
      className={`absolute pointer-events-none ${className}`}
      style={{ transform, transformOrigin: '80px 80px' }}
      width="160"
      height="160"
      aria-hidden="true"
    >
      {/* Main curving stem from corner inward */}
      <path d="M 6 6 Q 28 8 44 22 Q 60 36 68 54 Q 74 68 72 82 Q 70 92 64 100"
        fill="none" stroke={strokeDeep} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M 6 6 Q 8 28 22 44 Q 36 60 54 68 Q 68 74 82 72 Q 92 70 100 64"
        fill="none" stroke={strokeDeep} strokeWidth="1.4" strokeLinecap="round" />

      {/* Scroll flourishes */}
      <path d="M 24 24 Q 36 18 42 30 Q 38 40 28 36 Q 22 30 24 24 Z"
        fill={fill} stroke={stroke} strokeWidth="0.7" />
      <path d="M 36 36 Q 48 30 54 42 Q 50 52 40 48 Q 34 42 36 36 Z"
        fill={fill} stroke={stroke} strokeWidth="0.7" />

      {/* Lace leaf clusters along the stem */}
      <path d="M 16 12 Q 24 6 32 14 Q 26 22 16 12 Z"
        fill={fill} stroke={stroke} strokeWidth="0.6" />
      <path d="M 28 20 Q 38 16 44 26 Q 36 32 28 20 Z"
        fill={fill} stroke={stroke} strokeWidth="0.6" />
      <path d="M 40 30 Q 52 28 56 40 Q 46 46 40 30 Z"
        fill={fill} stroke={stroke} strokeWidth="0.6" />
      <path d="M 50 42 Q 62 42 64 54 Q 54 60 50 42 Z"
        fill={fill} stroke={stroke} strokeWidth="0.6" />
      <path d="M 58 54 Q 70 56 70 68 Q 60 72 58 54 Z"
        fill={fill} stroke={stroke} strokeWidth="0.6" />

      {/* Mirror leaf clusters */}
      <path d="M 12 16 Q 6 24 14 32 Q 22 26 12 16 Z"
        fill={fill} stroke={stroke} strokeWidth="0.6" />
      <path d="M 20 28 Q 16 38 26 44 Q 32 36 20 28 Z"
        fill={fill} stroke={stroke} strokeWidth="0.6" />
      <path d="M 30 40 Q 28 52 40 56 Q 46 46 30 40 Z"
        fill={fill} stroke={stroke} strokeWidth="0.6" />
      <path d="M 42 50 Q 42 62 54 64 Q 60 54 42 50 Z"
        fill={fill} stroke={stroke} strokeWidth="0.6" />
      <path d="M 54 58 Q 56 70 68 70 Q 72 60 54 58 Z"
        fill={fill} stroke={stroke} strokeWidth="0.6" />

      {/* Flower blossoms */}
      <g transform="translate(48,48)">
        <ellipse cx="0" cy="-6" rx="4" ry="6" fill={fill} stroke={stroke} strokeWidth="0.5" />
        <ellipse cx="6" cy="0" rx="6" ry="4" fill={fill} stroke={stroke} strokeWidth="0.5" />
        <ellipse cx="0" cy="6" rx="4" ry="6" fill={fill} stroke={stroke} strokeWidth="0.5" />
        <ellipse cx="-6" cy="0" rx="6" ry="4" fill={fill} stroke={stroke} strokeWidth="0.5" />
        <circle cx="0" cy="0" r="2.5" fill={dot} />
      </g>
      <g transform="translate(70,70)">
        <ellipse cx="0" cy="-5" rx="3.5" ry="5" fill={fill} stroke={stroke} strokeWidth="0.5" />
        <ellipse cx="5" cy="0" rx="5" ry="3.5" fill={fill} stroke={stroke} strokeWidth="0.5" />
        <ellipse cx="0" cy="5" rx="3.5" ry="5" fill={fill} stroke={stroke} strokeWidth="0.5" />
        <ellipse cx="-5" cy="0" rx="5" ry="3.5" fill={fill} stroke={stroke} strokeWidth="0.5" />
        <circle cx="0" cy="0" r="2" fill={dot} />
      </g>

      {/* Small dots scattered for lace texture */}
      <circle cx="34" cy="18" r="1.2" fill={dot} />
      <circle cx="18" cy="34" r="1.2" fill={dot} />
      <circle cx="56" cy="38" r="1" fill={dot} />
      <circle cx="38" cy="56" r="1" fill={dot} />
      <circle cx="68" cy="62" r="0.8" fill={dot} />
      <circle cx="62" cy="68" r="0.8" fill={dot} />

      {/* Decorative scalloped arc near corner */}
      <path d="M 10 10 Q 18 18 26 10 M 10 10 Q 18 18 10 26"
        fill="none" stroke={stroke} strokeWidth="0.6" opacity="0.5" />
      <path d="M 14 14 Q 20 20 14 26 M 14 14 Q 20 20 26 14"
        fill="none" stroke={stroke} strokeWidth="0.5" opacity="0.4" />
    </svg>
  );
}

export function VintageLaceBorder({
  children,
  className = '',
  borderColor,
  borderThickness,
  padding = '28px',
  accentColor,
}: VintageLaceBorderProps) {
  const t = Math.max(0.5, borderThickness);
  const accent = accentColor || borderColor;
  const innerOffset = Math.max(6, t * 4 + 4);
  const cornerSize = 160;

  return (
    <div className={`relative ${className}`} style={{ padding, background: 'transparent' }}>
      {/* Four ornate lace corners — responsive, pointer-events-none */}
      <LaceCornerSvg color={borderColor} className="top-0 left-0" />
      <LaceCornerSvg color={borderColor} flip="x" className="top-0 right-0" />
      <LaceCornerSvg color={borderColor} flip="y" className="bottom-0 left-0" />
      <LaceCornerSvg color={borderColor} flip="xy" className="bottom-0 right-0" />

      {/* Double inset border lines — outer */}
      <div className="absolute pointer-events-none" style={{
        inset: 0,
        border: `${t}px solid ${borderColor}`,
        borderRadius: '2px',
        opacity: 0.7,
      }} />
      {/* Inner accent line */}
      <div className="absolute pointer-events-none" style={{
        inset: `${innerOffset}px`,
        border: `${Math.max(0.5, t * 0.6)}px solid ${accent}`,
        borderRadius: '1px',
        opacity: 0.5,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}
