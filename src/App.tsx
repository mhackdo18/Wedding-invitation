import { useEffect, useState } from 'react';
import { useRoute } from './lib/router';
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

  const isAdmin = route.path.startsWith('admin');
  const isCoordinator = route.path === 'coordinator';

  if (!isAdmin && !isCoordinator && settings?.password_enabled && !pwGranted) {
    if (settingsLoading) return null;
    return <PasswordGate settings={settings} onGranted={() => setPwGranted(true)} />;
  }

  if (route.path === 'invitation') {
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
  return <PublicSite />;
}
