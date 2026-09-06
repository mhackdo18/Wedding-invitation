import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { SiteSettings } from '@/types';
import { getCardBg, getOuterBg } from './pageTemplates';

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('*')
        .order('created_at')
        .limit(1)
        .maybeSingle();
      if (active) {
        setSettings(data as SiteSettings | null);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return { settings, loading, setSettings };
}

const FIT_TO_CSS: Record<string, string> = {
  cover: 'cover',
  contain: 'contain',
  fill: '100% 100%',
  center: 'auto',
  repeat: 'auto',
};

function bgPositionCss(pos: string): string {
  const map: Record<string, string> = {
    center: 'center',
    top: 'top',
    bottom: 'bottom',
    left: 'left',
    right: 'right',
    'top-left': 'top left',
    'top-right': 'top right',
    'bottom-left': 'bottom left',
    'bottom-right': 'bottom right',
  };
  return map[pos] || 'center';
}

function buildBgLayerVars(prefix: string, bg: ReturnType<typeof getCardBg>) {
  const root = document.documentElement.style;
  if (bg.url) {
    root.setProperty(`--${prefix}-bg-image`, `url(${bg.url})`);
    root.setProperty(`--${prefix}-bg-size`, FIT_TO_CSS[bg.fit] || 'cover');
    root.setProperty(`--${prefix}-bg-position`, bgPositionCss(bg.position));
    root.setProperty(`--${prefix}-bg-repeat`, bg.fit === 'repeat' ? 'repeat' : 'no-repeat');
    root.setProperty(`--${prefix}-bg-opacity`, String(bg.opacity / 100));
    root.setProperty(`--${prefix}-bg-blur`, bg.blur > 0 ? `blur(${bg.blur}px)` : 'none');
    root.setProperty(`--${prefix}-bg-overlay`, bg.overlayColor || 'transparent');
    root.setProperty(`--${prefix}-bg-overlay-opacity`, String(bg.overlayOpacity / 100));
  } else {
    root.removeProperty(`--${prefix}-bg-image`);
    root.removeProperty(`--${prefix}-bg-size`);
    root.removeProperty(`--${prefix}-bg-position`);
    root.removeProperty(`--${prefix}-bg-repeat`);
    root.removeProperty(`--${prefix}-bg-opacity`);
    root.removeProperty(`--${prefix}-bg-blur`);
    root.removeProperty(`--${prefix}-bg-overlay`);
    root.removeProperty(`--${prefix}-bg-overlay-opacity`);
  }
}

export function applySettingsVars(s: SiteSettings | null) {
  if (!s) return;
  const root = document.documentElement.style;
  root.setProperty('--page-color', s.page_color);
  root.setProperty('--bg-color', s.bg_color);
  root.setProperty('--page-width', `${s.page_width}px`);
  root.setProperty('--heading-font', s.heading_font);
  root.setProperty('--body-font', s.body_font);
  buildBgLayerVars('card', getCardBg(s.typography));
  buildBgLayerVars('outer', getOuterBg(s.typography));
}
