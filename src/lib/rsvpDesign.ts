import type { CSSProperties } from 'react';
import type { TypeStyle } from '@/types';
import { stackFor } from '@/lib/fonts';
import { fluidFontSize } from '@/lib/typography';

export type RsvpTextElement =
  | 'pretitle'
  | 'title'
  | 'intro'
  | 'instruction'
  | 'guestName'
  | 'guestStatus'
  | 'questionMeta'
  | 'questionTitle'
  | 'questionHint'
  | 'requiredLabel'
  | 'thankYouTitle'
  | 'thankYouMessage';

export interface RsvpButtonStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  backgroundColor: string;
  borderColor: string;
  borderRadius: number;
  size: 'small' | 'medium' | 'large';
}

export interface RsvpDesign {
  text: Partial<Record<RsvpTextElement, TypeStyle>>;
  pageBackgroundColor: string;
  cardBackgroundColor: string;
  cardBorderColor: string;
  inputBackgroundColor: string;
  inputBorderColor: string;
  button: Partial<RsvpButtonStyle>;
}

export const DEFAULT_RSVP_DESIGN: RsvpDesign = {
  text: {
    pretitle: { fontFamily: 'Montserrat', fontSize: 10, fontWeight: 500, color: '#a07c4a' },
    title: { fontFamily: 'Cormorant Garamond', fontSize: 32, fontWeight: 500, color: '#3a2e22' },
    intro: { fontFamily: 'Montserrat', fontSize: 14, fontWeight: 400, color: '#6b5d4f' },
    instruction: { fontFamily: 'Montserrat', fontSize: 14, fontWeight: 400, color: '#5a4430' },
    guestName: { fontFamily: 'Montserrat', fontSize: 14, fontWeight: 600, color: '#3a2e22' },
    guestStatus: { fontFamily: 'Montserrat', fontSize: 10, fontWeight: 500, color: '#a07c4a' },
    questionMeta: { fontFamily: 'Montserrat', fontSize: 12, fontWeight: 400, color: '#a07c4a' },
    questionTitle: { fontFamily: 'Cormorant Garamond', fontSize: 24, fontWeight: 500, color: '#5a4430' },
    questionHint: { fontFamily: 'Montserrat', fontSize: 14, fontWeight: 400, color: '#8a7a66' },
    requiredLabel: { fontFamily: 'Montserrat', fontSize: 12, fontWeight: 400, color: '#a07c4a' },
    thankYouTitle: { fontFamily: 'Cormorant Garamond', fontSize: 30, fontWeight: 500, color: '#5a4430' },
    thankYouMessage: { fontFamily: 'Montserrat', fontSize: 14, fontWeight: 400, color: '#5a4430' },
  },
  pageBackgroundColor: '#e9dfd0',
  cardBackgroundColor: '#fbf7f0',
  cardBorderColor: '#d6cdbf',
  inputBackgroundColor: '#ffffff',
  inputBorderColor: '#d6cdbf',
  button: {
    fontFamily: 'Montserrat',
    fontSize: 13,
    fontWeight: 500,
    color: '#ffffff',
    backgroundColor: '#8a6d3b',
    borderColor: '#8a6d3b',
    borderRadius: 999,
    size: 'medium',
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function resolveRsvpDesign(value: unknown): RsvpDesign {
  const input = isRecord(value) ? value : {};
  const textInput = isRecord(input.text) ? input.text : {};
  const buttonInput = isRecord(input.button) ? input.button : {};
  const text = { ...DEFAULT_RSVP_DESIGN.text };
  (Object.keys(DEFAULT_RSVP_DESIGN.text) as RsvpTextElement[]).forEach((key) => {
    if (isRecord(textInput[key])) text[key] = { ...DEFAULT_RSVP_DESIGN.text[key], ...textInput[key] } as TypeStyle;
  });
  return {
    ...DEFAULT_RSVP_DESIGN,
    ...input,
    text,
    button: { ...DEFAULT_RSVP_DESIGN.button, ...buttonInput } as RsvpButtonStyle,
  } as RsvpDesign;
}

export function rsvpTextStyle(design: RsvpDesign, key: RsvpTextElement): CSSProperties {
  const style = design.text[key] || {};
  return {
    ...(style.fontFamily ? { fontFamily: stackFor(style.fontFamily) } : {}),
    ...(style.fontSize ? { fontSize: fluidFontSize(style.fontSize) } : {}),
    ...(style.fontWeight ? { fontWeight: style.fontWeight } : {}),
    ...(style.color ? { color: style.color } : {}),
  };
}

export function rsvpButtonStyle(design: RsvpDesign): CSSProperties {
  const button: RsvpButtonStyle = { ...DEFAULT_RSVP_DESIGN.button, ...design.button } as RsvpButtonStyle;
  const padding = button.size === 'small' ? '8px 14px' : button.size === 'large' ? '14px 22px' : '11px 18px';
  return {
    fontFamily: stackFor(button.fontFamily),
    fontSize: fluidFontSize(button.fontSize),
    fontWeight: button.fontWeight,
    color: button.color,
    background: button.backgroundColor,
    border: `1px solid ${button.borderColor}`,
    borderRadius: button.borderRadius,
    padding,
    lineHeight: 1.2,
    transition: 'transform 160ms ease, filter 160ms ease, opacity 160ms ease',
  };
}
