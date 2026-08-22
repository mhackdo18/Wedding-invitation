import type { TypeStyle } from '@/types';
import { stackFor } from './fonts';

export function typeStyle(s: TypeStyle | undefined): React.CSSProperties {
  if (!s) return {};
  const style: React.CSSProperties = {};
  if (s.fontFamily) style.fontFamily = stackFor(s.fontFamily);
  if (s.fontSize) style.fontSize = `${s.fontSize}px`;
  if (s.fontWeight) style.fontWeight = s.fontWeight;
  if (s.color) style.color = s.color;
  return style;
}

export function getTypography(settings: Record<string, TypeStyle>, key: string): TypeStyle | undefined {
  return settings[key];
}
