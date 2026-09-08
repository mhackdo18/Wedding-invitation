import type { TypeStyle } from '@/types';
import { stackFor } from './fonts';

/**
 * Converts a pixel font size into a fluid clamp() value that scales
 * proportionally with viewport width.
 *
 * The target px value is the "desktop" size. On smaller screens the font
 * shrinks down to a minimum of 12px (0.75rem) to preserve readability.
 * The preferred (vw) value is tuned so the size reaches the target around
 * a 1200px viewport and scales smoothly below that.
 */
export function fluidFontSize(px: number): string {
  const minPx = Math.max(12, Math.round(px * 0.65));
  const vw = (px / 1200) * 100;
  return `clamp(${minPx}px, ${vw.toFixed(2)}vw + ${Math.round(minPx * 0.3)}px, ${px}px)`;
}

export function typeStyle(s: TypeStyle | undefined): React.CSSProperties {
  if (!s) return {};
  const style: React.CSSProperties = {};
  if (s.fontFamily) style.fontFamily = stackFor(s.fontFamily);
  if (s.fontSize) style.fontSize = fluidFontSize(s.fontSize);
  if (s.fontWeight) style.fontWeight = s.fontWeight;
  if (s.color) style.color = s.color;
  return style;
}

/**
 * Like typeStyle but emits the raw pixel value without fluid scaling.
 * Use for elements where exact pixel sizing is needed (e.g. icon-only
 * counters, envelope seal text).
 */
export function typeStyleFixed(s: TypeStyle | undefined): React.CSSProperties {
  if (!s) return {};
  const style: React.CSSProperties = {};
  if (s.fontFamily) style.fontFamily = stackFor(s.fontFamily);
  if (s.fontSize) style.fontSize = `${s.fontSize}px`;
  if (s.fontWeight) style.fontWeight = s.fontWeight;
  if (s.color) style.color = s.color;
  return style;
}

/**
 * Converts a pixel value to a fluid clamp() string for use in inline styles.
 * Scales from 65% of target on mobile up to full target on desktop.
 * Minimum is 12px to preserve readability.
 */
export function fluidPx(px: number): string {
  return fluidFontSize(px);
}

export function getTypography(settings: Record<string, TypeStyle>, key: string): TypeStyle | undefined {
  return settings[key];
}
