export interface PageBorderTemplate {
  value: string;
  label: string;
  hint: string;
  preview: { background: string; border: string; borderRadius: string; accent: string };
  wrapper: { background: string; border: string; borderRadius: string; padding: string; boxShadow: string };
  innerPadding: string;
  showCorners?: boolean;
  showGoldDots?: boolean;
  showGeometricFrame?: boolean;
  cornerOrnaments?: boolean;
  ornamentColor?: string;
}

export const PAGE_BORDER_TEMPLATES: PageBorderTemplate[] = [
  {
    value: 'plain',
    label: 'Plain',
    hint: 'No decorative border or background',
    preview: { background: '#fffdf8', border: '1px solid #e6ddcd', borderRadius: '6px', accent: '#c9b896' },
    wrapper: { background: 'transparent', border: 'none', borderRadius: '0px', padding: '0px', boxShadow: 'none' },
    innerPadding: '0px',
  },
  {
    value: 'botanical_emerald',
    label: 'Botanical Emerald',
    hint: 'Emerald leaves, gold foil dots, geometric gold frame on textured canvas',
    preview: { background: 'linear-gradient(to bottom, #FAF8F5, #F4EFEA, #EAE3DC)', border: '1px solid rgba(245,158,11,0.45)', borderRadius: '4px', accent: '#065f46' },
    wrapper: { background: 'linear-gradient(to bottom, #FAF8F5 0%, #F4EFEA 50%, #EAE3DC 100%)', border: 'none', borderRadius: '4px', padding: '20px', boxShadow: '0 2px 16px rgba(6,95,70,0.08)' },
    innerPadding: '12px',
    showCorners: true,
    showGoldDots: true,
    showGeometricFrame: true,
  },
  {
    value: 'botanical_rose',
    label: 'Watercolor Rose',
    hint: 'Soft rose petals, botanical branches, gold accents on warm canvas',
    preview: { background: 'linear-gradient(to bottom, #FDF5F3, #F8EFEF, #F2E5E8)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '4px', accent: '#be185d' },
    wrapper: { background: 'linear-gradient(to bottom, #FDF5F3 0%, #F8EFEF 50%, #F2E5E8 100%)', border: 'none', borderRadius: '4px', padding: '20px', boxShadow: '0 2px 16px rgba(190,24,93,0.06)' },
    innerPadding: '12px',
    showCorners: true,
    showGoldDots: true,
    showGeometricFrame: true,
  },
  {
    value: 'botanical_gold',
    label: 'Gilded Gold',
    hint: 'Gold-toned botanicals with shimmering foil dots on warm ivory',
    preview: { background: 'linear-gradient(to bottom, #FBF7EE, #F5EFE0, #EDE4D0)', border: '1px solid rgba(245,158,11,0.55)', borderRadius: '4px', accent: '#b8860b' },
    wrapper: { background: 'linear-gradient(to bottom, #FBF7EE 0%, #F5EFE0 50%, #EDE4D0 100%)', border: 'none', borderRadius: '4px', padding: '20px', boxShadow: '0 2px 18px rgba(184,134,11,0.1)' },
    innerPadding: '12px',
    showCorners: true,
    showGoldDots: true,
    showGeometricFrame: true,
  },
  {
    value: 'botanical_sage',
    label: 'Sage Garden',
    hint: 'Muted sage leaves with soft gold frame on natural canvas',
    preview: { background: 'linear-gradient(to bottom, #F6F5F0, #F0EFE8, #E8E7E0)', border: '1px solid rgba(180,160,120,0.4)', borderRadius: '4px', accent: '#647064' },
    wrapper: { background: 'linear-gradient(to bottom, #F6F5F0 0%, #F0EFE8 50%, #E8E7E0 100%)', border: 'none', borderRadius: '4px', padding: '20px', boxShadow: '0 2px 14px rgba(100,112,100,0.08)' },
    innerPadding: '12px',
    showCorners: true,
    showGoldDots: true,
    showGeometricFrame: true,
  },
  {
    value: 'botanical_ivory',
    label: 'Ivory Minimal',
    hint: 'Subtle ivory botanicals with delicate gold frame on warm white',
    preview: { background: 'linear-gradient(to bottom, #FEFCF8, #FAF7F0, #F4F0E8)', border: '1px solid rgba(245,158,11,0.42)', borderRadius: '4px', accent: '#a89878' },
    wrapper: { background: 'linear-gradient(to bottom, #FEFCF8 0%, #FAF7F0 50%, #F4F0E8 100%)', border: 'none', borderRadius: '4px', padding: '20px', boxShadow: '0 2px 12px rgba(168,152,120,0.08)' },
    innerPadding: '12px',
    showCorners: true,
    showGoldDots: true,
    showGeometricFrame: true,
  },
  {
    value: 'elegant_gold',
    label: 'Classic Gold',
    hint: 'Thin gold double border on cream paper',
    preview: { background: '#fdf9f0', border: '2px solid #c9a96e', borderRadius: '4px', accent: '#c9a96e' },
    wrapper: { background: '#fdf9f0', border: '2px solid #c9a96e', borderRadius: '4px', padding: '14px', boxShadow: '0 2px 12px rgba(201,169,110,0.12)' },
    innerPadding: '10px',
  },
  {
    value: 'marble_black',
    label: 'Black & Gold Luxe',
    hint: 'Dark border with gold accent on cream',
    preview: { background: '#fbf8f3', border: '3px solid #2a2420', borderRadius: '2px', accent: '#c9a96e' },
    wrapper: { background: '#fbf8f3', border: '3px solid #2a2420', borderRadius: '2px', padding: '14px', boxShadow: '0 4px 20px rgba(42,36,32,0.18)' },
    innerPadding: '10px',
  },
];

export function getBorderTemplate(value: string | null | undefined): PageBorderTemplate {
  return PAGE_BORDER_TEMPLATES.find((t) => t.value === value) || PAGE_BORDER_TEMPLATES[0];
}

export function hasBorderTemplate(value: string | null | undefined): boolean {
  return !!value && value !== 'plain';
}

const BORDER_KEY = '_borderTemplate';

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
