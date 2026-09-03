import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { SiteSettings } from '@/types';
import { Lock, Loader2 } from 'lucide-react';
import { SiteMonogram } from '@/components/public/SiteMonogram';
import { stackFor } from '@/lib/fonts';

const SESSION_KEY = 'wedding-pw-granted';

export function isPasswordGranted(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

export function grantPassword() {
  sessionStorage.setItem(SESSION_KEY, '1');
}

export function revokePassword() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function usePasswordGate(settings: SiteSettings | null): { gateOpen: boolean; loading: boolean } {
  const [gateOpen, setGateOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!settings) return;
    if (!settings.password_enabled || isPasswordGranted()) {
      setGateOpen(true);
    }
    setLoading(false);
  }, [settings]);

  return { gateOpen, loading };
}

export default function PasswordGate({ settings, onGranted }: { settings: SiteSettings; onGranted: () => void }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError('');
    setTimeout(() => {
      if (pw === settings.public_password) {
        grantPassword();
        onGranted();
      } else {
        setError('Incorrect password. Please try again.');
      }
      setChecking(false);
    }, 300);
  };

  const titleFont = settings.gate_title_font ? stackFor(settings.gate_title_font) : 'var(--heading-font)';
  const titleColor = settings.gate_title_color || '#5a4430';
  const btnBg = settings.gate_button_bg_color || settings.cta_bg_color || '#8a6d3b';
  const btnText = settings.gate_button_text_color || settings.cta_text_color || '#fff';
  const btnRadius = settings.gate_button_radius ?? 8;
  const pageBg = settings.bg_color || '#f4efe6';
  const cardBg = settings.page_color || '#fffaf2';

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: pageBg }}>
      <div className="rounded-xl p-8 max-w-sm w-full text-center" style={{ background: cardBg }}>
        <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: 'rgba(138,109,59,0.10)' }}>
          <Lock size={24} style={{ color: titleColor }} />
        </div>
        <h1 style={{ fontFamily: titleFont, fontSize: 28, color: titleColor, margin: '0 0 4px' }}>
          {settings.partner1_name} &amp; {settings.partner2_name}
        </h1>
        <p style={{ fontSize: 13, color: titleColor, opacity: 0.7, marginBottom: 20 }}>
          Enter the password to view our wedding invitation
        </p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            autoFocus
            className="w-full rounded-lg border px-4 py-3 text-sm outline-none text-center"
            style={{ borderColor: 'rgba(120,90,60,0.2)', background: 'rgba(255,255,255,0.6)', color: titleColor }}
            placeholder="Password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          {error && <p style={{ fontSize: 13, color: '#b03a3a' }}>{error}</p>}
          <button
            type="submit"
            disabled={checking || !pw.trim()}
            className="w-full font-semibold py-3 transition disabled:opacity-50"
            style={{ background: btnBg, color: btnText, borderRadius: btnRadius }}
          >
            {checking ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Enter Site'}
          </button>
        </form>
        <SiteMonogram settings={settings} size={14} className="mx-auto mt-6" />
      </div>
    </div>
  );
}

export function useSettingsPassword(): { settings: SiteSettings | null; loading: boolean; gateOpen: boolean; reload: () => void } {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [gateOpen, setGateOpen] = useState(false);
  const { gateOpen: gate, loading: gateLoading } = usePasswordGate(settings);

  const load = async () => {
    const { data } = await supabase.from('site_settings').select('*').order('created_at').limit(1).maybeSingle();
    setSettings(data as SiteSettings | null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setGateOpen(gate); }, [gate]);

  return { settings, loading: loading || gateLoading, gateOpen, reload: load };
}
