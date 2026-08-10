import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { SiteSettings } from '@/types';

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

export function applySettingsVars(s: SiteSettings | null) {
  if (!s) return;
  const root = document.documentElement.style;
  root.setProperty('--page-color', s.page_color);
  root.setProperty('--bg-color', s.bg_color);
  root.setProperty('--page-width', `${s.page_width}px`);
  root.setProperty('--heading-font', s.heading_font);
  root.setProperty('--body-font', s.body_font);
}
