import { useEffect, useState } from 'react';
import { useRoute, navigate } from './lib/router';
import { useFontLoader } from './lib/useFontLoader';
import { supabase } from './lib/supabase';
import type { SiteSettings } from './types';
import PasswordGate, { isPasswordGranted } from './components/public/PasswordGate';
import PublicSite from './pages/PublicSite';
import RsvpPage from './pages/RsvpPage';
import GuestPortal from './pages/GuestPortal';
import InvitationPage from './pages/InvitationPage';
import AdminAuth from './admin/AdminAuth';
import CoordinatorPage from './pages/CoordinatorPage';
import FindYourTable from './components/public/FindYourTable';
import { applySettingsVars } from './lib/useSiteSettings';
import { SiteMonogram } from '@/components/public/SiteMonogram';

export default function App() {
  const route = useRoute();
  useFontLoader();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [pwGranted, setPwGranted] = useState(isPasswordGranted());

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('site_settings').select('*').order('created_at').limit(1).maybeSingle();
      setSettings(data as SiteSettings | null);
      setSettingsLoading(false);
    })();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.path]);

  useEffect(() => {
    if (!settings) return;
    const iconUrl = settings.site_monogram_url || settings.monogram_url || '/favicon.svg';
    const title = settings.partner1_name && settings.partner2_name
      ? `${settings.partner1_name} & ${settings.partner2_name}`
      : 'Our Wedding Invitation';
    const description = 'You are cordially invited to celebrate our wedding day with us.';

    document.title = title;
    document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((link) => {
      link.href = iconUrl;
    });
    document.querySelectorAll<HTMLMetaElement>('meta[property="og:title"], meta[name="twitter:title"]').forEach((meta) => {
      meta.content = title;
    });
    document.querySelectorAll<HTMLMetaElement>('meta[property="og:description"], meta[name="twitter:description"], meta[name="description"]').forEach((meta) => {
      meta.content = description;
    });
    document.querySelectorAll<HTMLMetaElement>('meta[property="og:image"], meta[name="twitter:image"]').forEach((meta) => {
      meta.content = iconUrl;
    });
    document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute('content', window.location.href);
  }, [settings]);

  const isAdmin = route.path.startsWith('admin');
  const isCoordinator = route.path === 'coordinator';

  const isInvitation = route.path === 'invitation';
  const isGuestPortal = route.path === 'guest-portal';
  const isFindTable = route.path === 'find-table';

  if (!isAdmin && !isCoordinator && settingsLoading) return null;
  if (!isAdmin && !isCoordinator && !isGuestPortal && !isFindTable && settings?.password_enabled && !pwGranted) {
    return <PasswordGate settings={settings} onGranted={() => setPwGranted(true)} />;
  }

  if (isInvitation) {
    return <InvitationPage token={route.params.token} />;
  }
  if (isAdmin) {
    const section = route.path === 'admin' ? 'dashboard' : route.path.slice(6);
    return <AdminAuth section={section} />;
  }
  if (isCoordinator) {
    return <CoordinatorPage />;
  }
  if (route.path === 'rsvp') {
    return <RsvpPage />;
  }
  if (route.path === 'guest-portal') {
    return <GuestPortal />;
  }
  if (isFindTable) {
    return <StandaloneFindTable settings={settings} />;
  }
  return <PublicSite />;
}

function StandaloneFindTable({ settings }: { settings: SiteSettings | null }) {
  useEffect(() => { applySettingsVars(settings); }, [settings]);
  if (!settings) return null;
  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--bg-color)' }}>
      <div className="mx-auto embossed-card scroll-edge fade-up" style={{ maxWidth: 'var(--page-width)', fontFamily: 'var(--body-font)' }}>
        <nav className="sticky top-0 z-20 flex items-center justify-between px-4 py-2.5 border-b" style={{ background: 'var(--page-color)', borderColor: 'rgba(120,90,60,0.12)' }}>
          <button onClick={() => navigate('/')} className="flex items-center shrink-0" aria-label="Back to welcome">
            <SiteMonogram settings={settings} size={36} />
          </button>
        </nav>
        <FindYourTable />
        <div className="text-center pb-6">
        </div>
        <footer className="text-center py-8" style={{ background: settings.footer_bg_color && settings.footer_bg_color !== 'transparent' ? settings.footer_bg_color : 'transparent' }}>
          {settings.footer_monogram_url ? (
            <img src={settings.footer_monogram_url} alt="Monogram" className="w-16 h-16 rounded-full object-cover mx-auto mb-3" />
          ) : (
            <SiteMonogram settings={settings} size={16} className="mx-auto mb-2" />
          )}
          <p style={{ fontSize: 13, color: '#8a7a66' }}>
            {settings.partner1_name} &amp; {settings.partner2_name}
          </p>
        </footer>
      </div>
    </div>
  );
}
