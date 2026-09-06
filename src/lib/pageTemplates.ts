export interface PageBorderTemplate {
  value: string;
  label: string;
  hint: string;
  type: 'none' | 'simple' | 'double' | 'corner' | 'arch' | 'botanical' | 'filigree' | 'dotted' | 'ornate' | 'vintage_lace' | 'floral_side';
  preview: { borderColor: string; borderRadius: string; accent: string };
  defaultColor: string;
  defaultThickness: number;
  padding: string;
  showCorners?: boolean;
  showGoldDots?: boolean;
}

export const PAGE_BORDER_TEMPLATES: PageBorderTemplate[] = [
  {
    value: 'plain',
    label: 'Plain',
    hint: 'No border',
    type: 'none',
    preview: { borderColor: '#e6ddcd', borderRadius: '0px', accent: '#c9b896' },
    defaultColor: '#c9a96e',
    defaultThickness: 1,
    padding: '0px',
  },
  {
    value: 'thin_gold',
    label: 'Thin Line',
    hint: 'Simple elegant single-line border',
    type: 'simple',
    preview: { borderColor: '#c9a96e', borderRadius: '4px', accent: '#c9a96e' },
    defaultColor: '#c9a96e',
    defaultThickness: 1,
    padding: '14px',
  },
  {
    value: 'double_gold',
    label: 'Double Line',
    hint: 'Classic two-line border with gap',
    type: 'double',
    preview: { borderColor: '#c9a96e', borderRadius: '4px', accent: '#c9a96e' },
    defaultColor: '#c9a96e',
    defaultThickness: 2,
    padding: '16px',
  },
  {
    value: 'corner_elegant',
    label: 'Corner Accents',
    hint: 'Minimal border with decorative corner brackets',
    type: 'corner',
    preview: { borderColor: '#c9a96e', borderRadius: '2px', accent: '#c9a96e' },
    defaultColor: '#c9a96e',
    defaultThickness: 1,
    padding: '16px',
  },
  {
    value: 'arch_elegant',
    label: 'Arch Line',
    hint: 'Elegant arched top border with side lines',
    type: 'arch',
    preview: { borderColor: '#c9a96e', borderRadius: '0px', accent: '#c9a96e' },
    defaultColor: '#c9a96e',
    defaultThickness: 1,
    padding: '18px',
  },
  {
    value: 'botanical_emerald',
    label: 'Botanical Emerald',
    hint: 'Emerald leaf SVG corners with thin frame',
    type: 'botanical',
    preview: { borderColor: '#065f46', borderRadius: '4px', accent: '#065f46' },
    defaultColor: '#065f46',
    defaultThickness: 1,
    padding: '20px',
    showCorners: true,
    showGoldDots: false,
  },
  {
    value: 'botanical_rose',
    label: 'Watercolor Rose',
    hint: 'Rose petal SVG corners with thin frame',
    type: 'botanical',
    preview: { borderColor: '#be185d', borderRadius: '4px', accent: '#be185d' },
    defaultColor: '#be185d',
    defaultThickness: 1,
    padding: '20px',
    showCorners: true,
    showGoldDots: false,
  },
  {
    value: 'botanical_gold',
    label: 'Gilded Botanical',
    hint: 'Gold-toned botanical SVG corners with frame',
    type: 'botanical',
    preview: { borderColor: '#b8860b', borderRadius: '4px', accent: '#b8860b' },
    defaultColor: '#b8860b',
    defaultThickness: 1,
    padding: '20px',
    showCorners: true,
    showGoldDots: true,
  },
  {
    value: 'filigree_gold',
    label: 'Filigree',
    hint: 'Ornate filigree corner flourishes with thin border',
    type: 'filigree',
    preview: { borderColor: '#c9a96e', borderRadius: '2px', accent: '#c9a96e' },
    defaultColor: '#c9a96e',
    defaultThickness: 1,
    padding: '20px',
  },
  {
    value: 'dotted_gold',
    label: 'Dotted Line',
    hint: 'Dashed/dotted border for a delicate look',
    type: 'dotted',
    preview: { borderColor: '#c9a96e', borderRadius: '4px', accent: '#c9a96e' },
    defaultColor: '#c9a96e',
    defaultThickness: 2,
    padding: '14px',
  },
  {
    value: 'ornate_black',
    label: 'Black & Gold Luxe',
    hint: 'Bold dark border with gold inner accent line',
    type: 'ornate',
    preview: { borderColor: '#2a2420', borderRadius: '2px', accent: '#c9a96e' },
    defaultColor: '#2a2420',
    defaultThickness: 3,
    padding: '14px',
  },
  {
    value: 'vintage_lace_rose',
    label: 'Vintage Lace',
    hint: 'Ornate dusty-rose floral lace corners with double inset lines',
    type: 'vintage_lace',
    preview: { borderColor: '#c9a0a0', borderRadius: '2px', accent: '#c9a0a0' },
    defaultColor: '#c9a0a0',
    defaultThickness: 1,
    padding: '28px',
  },
  {
    value: 'vintage_lace_gold',
    label: 'Vintage Gold Lace',
    hint: 'Intricate gold floral lace corners with double inset lines',
    type: 'vintage_lace',
    preview: { borderColor: '#c9a96e', borderRadius: '2px', accent: '#c9a96e' },
    defaultColor: '#c9a96e',
    defaultThickness: 1,
    padding: '28px',
  },
  {
    value: 'vintage_lace_ivory',
    label: 'Ivory Lace',
    hint: 'Soft ivory vintage lace corners with double inset lines',
    type: 'vintage_lace',
    preview: { borderColor: '#d4c5a9', borderRadius: '2px', accent: '#d4c5a9' },
    defaultColor: '#d4c5a9',
    defaultThickness: 1,
    padding: '28px',
  },
  {
    value: 'floral_side_rose',
    label: 'Floral Cascade Rose',
    hint: 'Extravagant cascading roses & leaves along both sides',
    type: 'floral_side',
    preview: { borderColor: '#c8828c', borderRadius: '2px', accent: '#c8828c' },
    defaultColor: '#c8828c',
    defaultThickness: 1,
    padding: '0px',
  },
  {
    value: 'floral_side_wisteria',
    label: 'Wisteria Garden',
    hint: 'Lavender wisteria blossoms cascading down the sides',
    type: 'floral_side',
    preview: { borderColor: '#9678b0', borderRadius: '2px', accent: '#9678b0' },
    defaultColor: '#9678b0',
    defaultThickness: 1,
    padding: '0px',
  },
  {
    value: 'floral_side_garden',
    label: 'English Garden',
    hint: 'Wild garden flowers with delphiniums along the frame',
    type: 'floral_side',
    preview: { borderColor: '#7882a0', borderRadius: '2px', accent: '#7882a0' },
    defaultColor: '#7882a0',
    defaultThickness: 1,
    padding: '0px',
  },
  {
    value: 'floral_side_wildflower',
    label: 'Golden Wildflower',
    hint: 'Sunlit golden wildflowers cascading down both sides',
    type: 'floral_side',
    preview: { borderColor: '#b89560', borderRadius: '2px', accent: '#b89560' },
    defaultColor: '#b89560',
    defaultThickness: 1,
    padding: '0px',
  },
];

export function getBorderTemplate(value: string | null | undefined): PageBorderTemplate {
  return PAGE_BORDER_TEMPLATES.find((t) => t.value === value) || PAGE_BORDER_TEMPLATES[0];
}

export function hasBorderTemplate(value: string | null | undefined): boolean {
  return !!value && value !== 'plain';
}

const BORDER_KEY = '_borderTemplate';
const BORDER_COLOR_KEY = '_borderColor';
const BORDER_THICKNESS_KEY = '_borderThickness';

export function getBorderFromTypography(typography: Record<string, unknown> | null | undefined): string | null {
  if (!typography) return null;
  const v = (typography as Record<string, unknown>)[BORDER_KEY];
  return typeof v === 'string' ? v : null;
}

export function setBorderInTypography(
  typography: Record<string, unknown> | null | undefined,
  borderValue: string,
): Record<string, unknown> {
  return { ...(typography || {}), [BORDER_KEY]: borderValue };
}

export function getBorderColorFromTypography(typography: Record<string, unknown> | null | undefined): string | null {
  if (!typography) return null;
  const v = (typography as Record<string, unknown>)[BORDER_COLOR_KEY];
  return typeof v === 'string' ? v : null;
}

export function setBorderColorInTypography(
  typography: Record<string, unknown> | null | undefined,
  color: string,
): Record<string, unknown> {
  return { ...(typography || {}), [BORDER_COLOR_KEY]: color };
}

export function getBorderThicknessFromTypography(typography: Record<string, unknown> | null | undefined): number | null {
  if (!typography) return null;
  const v = (typography as Record<string, unknown>)[BORDER_THICKNESS_KEY];
  return typeof v === 'number' ? v : null;
}

export function setBorderThicknessInTypography(
  typography: Record<string, unknown> | null | undefined,
  thickness: number,
): Record<string, unknown> {
  return { ...(typography || {}), [BORDER_THICKNESS_KEY]: thickness };
}

// ===== Card & Outer Background Photos (stored in typography JSON) =====

export interface BgPhotoConfig {
  url: string | null;
  fit: 'cover' | 'contain' | 'fill' | 'center' | 'repeat';
  position: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity: number;
  blur: number;
  overlayColor: string | null;
  overlayOpacity: number;
}

const CARD_BG_KEY = '_cardBg';
const OUTER_BG_KEY = '_outerBg';

const BG_DEFAULT: BgPhotoConfig = {
  url: null,
  fit: 'cover',
  position: 'center',
  opacity: 100,
  blur: 0,
  overlayColor: null,
  overlayOpacity: 0,
};

export function getCardBg(typography: Record<string, unknown> | null | undefined): BgPhotoConfig {
  if (!typography) return { ...BG_DEFAULT };
  const raw = (typography as Record<string, unknown>)[CARD_BG_KEY];
  if (!raw || typeof raw !== 'object') return { ...BG_DEFAULT };
  return { ...BG_DEFAULT, ...(raw as Partial<BgPhotoConfig>) };
}

export function setCardBg(
  typography: Record<string, unknown> | null | undefined,
  bg: Partial<BgPhotoConfig>,
): Record<string, unknown> {
  return { ...(typography || {}), [CARD_BG_KEY]: { ...getCardBg(typography), ...bg } };
}

export function getOuterBg(typography: Record<string, unknown> | null | undefined): BgPhotoConfig {
  if (!typography) return { ...BG_DEFAULT };
  const raw = (typography as Record<string, unknown>)[OUTER_BG_KEY];
  if (!raw || typeof raw !== 'object') return { ...BG_DEFAULT };
  return { ...BG_DEFAULT, ...(raw as Partial<BgPhotoConfig>) };
}

export function setOuterBg(
  typography: Record<string, unknown> | null | undefined,
  bg: Partial<BgPhotoConfig>,
): Record<string, unknown> {
  return { ...(typography || {}), [OUTER_BG_KEY]: { ...getOuterBg(typography), ...bg } };
}
