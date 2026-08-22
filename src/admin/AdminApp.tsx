import { useState } from 'react';
import { navigate } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, Palette, Calendar, MapPin, ClipboardList, Users, Armchair, Mail, Menu, X, Heart, Image, Settings as SettingsIcon, Crown, LogOut } from 'lucide-react';
import Dashboard from './sections/Dashboard';
import PageBuilder from './sections/PageBuilder';
import EventManager from './sections/EventManager';
import VenuesManager from './sections/VenuesManager';
import RsvpBuilder from './sections/RsvpBuilder';
import GuestList from './sections/GuestList';
import SeatingChart from './sections/SeatingChart';
import InvitationDesigner from './sections/InvitationDesigner';
import GalleryManager from './sections/GalleryManager';
import Settings from './sections/Settings';
import EntourageManager from './sections/EntourageManager';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'page-builder', label: 'Page Builder', icon: Palette },
  { key: 'gallery', label: 'Gallery', icon: Image },
  { key: 'events', label: 'Events', icon: Calendar },
  { key: 'venues', label: 'Venues', icon: MapPin },
  { key: 'rsvp-builder', label: 'RSVP Builder', icon: ClipboardList },
  { key: 'guests', label: 'Guest List', icon: Users },
  { key: 'entourage', label: 'Entourage', icon: Crown },
  { key: 'seating', label: 'Seating Chart', icon: Armchair },
  { key: 'invitation', label: 'Invitation', icon: Mail },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function AdminApp({ section }: { section: string }) {
  const [mobileNav, setMobileNav] = useState(false);
  const active = NAV.find((n) => n.key === section) ? section : 'dashboard';

  const go = (key: string) => {
    navigate(`/admin/${key}`);
    setMobileNav(false);
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#f4efe6', fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r" style={{ background: '#faf6ee', borderColor: '#e6ddcd' }}>
        <BrandHeader />
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((n) => (
            <button key={n.key} onClick={() => go(n.key)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition"
              style={{
                background: active === n.key ? '#8a6d3b' : 'transparent',
                color: active === n.key ? '#fff' : '#6b5d4f',
              }}>
              <n.icon size={16} /> {n.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: '#e6ddcd' }}>
          <button onClick={() => navigate('/')} className="w-full flex items-center justify-center gap-1.5 text-xs text-[#8a7a66] hover:text-[#5a4430]">
            <Heart size={12} /> View Public Site
          </button>
        </div>
      </aside>

      {/* Mobile nav */}
      {mobileNav && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileNav(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col" style={{ background: '#faf6ee' }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#e6ddcd' }}>
              <span className="font-semibold text-[#5a4430]">Admin Panel</span>
              <button onClick={() => { supabase.auth.signOut(); }} title="Sign out" className="ml-auto p-1.5 rounded-lg transition hover:bg-[#f0e8d8]" style={{ color: '#8a7a66' }}><LogOut size={16} /></button>
              <button onClick={() => setMobileNav(false)}><X size={20} className="text-[#8a7a66]" /></button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1" onClick={() => setMobileNav(false)}>
              {NAV.map((n) => (
                <button key={n.key} onClick={() => go(n.key)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium"
                  style={{ background: active === n.key ? '#8a6d3b' : 'transparent', color: active === n.key ? '#fff' : '#6b5d4f' }}>
                  <n.icon size={16} /> {n.label}
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b" style={{ background: '#faf6ee', borderColor: '#e6ddcd' }}>
          <button onClick={() => setMobileNav(true)}><Menu size={20} className="text-[#5a4430]" /></button>
          <span className="font-semibold text-[#5a4430] text-sm">{NAV.find((n) => n.key === active)?.label}</span>
        </header>

        <main className="flex-1 overflow-auto thin-scroll p-4 md:p-6">
          {active === 'dashboard' && <Dashboard />}
          {active === 'page-builder' && <PageBuilder />}
          {active === 'gallery' && <GalleryManager />}
          {active === 'events' && <EventManager />}
          {active === 'venues' && <VenuesManager />}
          {active === 'rsvp-builder' && <RsvpBuilder />}
          {active === 'guests' && <GuestList />}
          {active === 'seating' && <SeatingChart />}
          {active === 'invitation' && <InvitationDesigner />}
          {active === 'entourage' && <EntourageManager />}
          {active === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
}

function BrandHeader() {
  return (
    <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: '#e6ddcd' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#b5462f' }}>
        <Heart size={16} className="text-white" />
      </div>
      <div>
        <p className="text-sm font-bold text-[#5a4430] leading-tight">Wedding Admin</p>
        <p className="text-[10px] text-[#a07c4a]">Control Panel</p>
      </div>
    </div>
  );
}
