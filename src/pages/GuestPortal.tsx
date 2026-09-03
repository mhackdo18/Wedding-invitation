import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSiteSettings, applySettingsVars } from '@/lib/useSiteSettings';
import { navigate } from '@/lib/router';
import type { SiteSettings } from '@/types';
import { Loader2, Check, UserPlus } from 'lucide-react';
import { SiteMonogram } from '@/components/public/SiteMonogram';
import FloatingMusicControl from '@/components/public/FloatingMusicControl';
import { Reveal } from '@/components/public/Reveal';
import { PageBorder } from '@/components/public/PageBorder';
import { stackFor } from '@/lib/fonts';
import { getBorderFromTypography } from '@/lib/pageTemplates';

export default function GuestPortal() {
  const { settings, loading } = useSiteSettings();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [error, setError] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-color)' }}>
        <Loader2 className="animate-spin" style={{ color: '#8a6d3b' }} />
      </div>
    );
  }

  applySettingsVars(settings as SiteSettings | null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) { setError('Please enter your first and last name.'); return; }
    if (!email.trim()) { setError('Please enter your email.'); return; }
    setError('');
    setSubmitting(true);

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    // Check if guest already exists by email OR name
    const [{ data: existingByEmail }, { data: existingByName }] = await Promise.all([
      supabase.from('guests').select('id, name').ilike('email', email.trim()).maybeSingle(),
      supabase.from('guests').select('id, name').ilike('name', fullName.trim()).maybeSingle(),
    ]);

    if (existingByEmail || existingByName) {
      setSubmitting(false);
      setAlreadyExists(true);
      setDone(true);
      return;
    }

    const { error: insError } = await supabase.from('guests').insert({
      name: fullName,
      email: email.trim(),
      phone: phone.trim() || null,
      party_size: 1,
      rsvp_status: 'pending',
      tags: ['self-registered'],
    });

    setSubmitting(false);
    if (insError) {
      setError('Something went wrong. Please try again or contact the couple.');
      return;
    }
    setDone(true);
  };

  const portalBg = settings?.portal_bg_color || 'var(--bg-color)';
  const btnBg = settings?.portal_button_bg_color || '#8a6d3b';
  const btnText = settings?.portal_button_text_color || '#fff';
  const textColor = settings?.portal_text_color || '#3a2e22';
  const textFont = settings?.portal_text_font ? stackFor(settings.portal_text_font) : 'var(--heading-font)';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: portalBg }}>
      <div className="w-full max-w-sm">
        <Reveal enabled={!!settings?.scroll_animation_enabled} animation="fade-up">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(138,109,59,0.12)' }}>
            {done ? <Check size={24} style={{ color: '#5a7a4a' }} /> : <UserPlus size={24} style={{ color: '#8a6d3b' }} />}
          </div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: textFont, color: textColor }}>
            {done ? (alreadyExists ? "You're already on the list!" : "You're on the list!") : 'Add Yourself to Our Guest List'}
          </h1>
          <p className="text-sm mt-1" style={{ fontFamily: textFont, color: settings?.portal_text_color || '#8a7a66' }}>
            {done
              ? alreadyExists
                ? `${firstName}, it looks like you're already on our guest list. We'll be in touch with your invitation soon.`
                : `Thank you, ${firstName}! We'll be in touch with your invitation soon.`
              : `${settings?.partner1_name || ''} & ${settings?.partner2_name || ''}`}
          </p>
        </div>
        </Reveal>

        {done ? (
          <Reveal enabled={!!settings?.scroll_animation_enabled} animation="scale-in">
          <PageBorder template={getBorderFromTypography(settings?.typography)}>
          <div className="text-center">
            <div className="rounded-2xl p-6 shadow-sm" style={{ background: '#fff', border: '1px solid #e6ddcd' }}>
              <SiteMonogram settings={settings} size={28} className="mx-auto mb-3" />
              <p className="text-sm" style={{ color: '#6b5d4f', lineHeight: 1.6 }}>
                {alreadyExists
                  ? "You're already on our guest list. No need to add yourself again — we'll send your invitation soon."
                  : <>Your details have been added to our guest list. We'll send your invitation to <strong>{email}</strong>.</>}
              </p>
            </div>
          </div>
          </PageBorder>
          </Reveal>
        ) : (
          <>
            <Reveal enabled={!!settings?.scroll_animation_enabled} animation="fade-up" delay={100}>
            <PageBorder template={getBorderFromTypography(settings?.typography)}>
            <form onSubmit={submit} className="rounded-2xl p-6 shadow-sm" style={{ background: '#fff', border: '1px solid #e6ddcd' }}>
              {error && (
                <div className="rounded-lg px-3 py-2 mb-4 text-sm" style={{ background: 'rgba(176,58,58,0.08)', color: '#b03a3a', border: '1px solid rgba(176,58,58,0.15)' }}>
                  {error}
                </div>
              )}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6b5d4f', letterSpacing: '0.04em' }}>First Name</label>
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition"
                      style={{ background: '#faf6ee', border: '1px solid #e6ddcd', color: '#3a2e22' }}
                      placeholder="Jane" autoComplete="given-name" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6b5d4f', letterSpacing: '0.04em' }}>Last Name</label>
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition"
                      style={{ background: '#faf6ee', border: '1px solid #e6ddcd', color: '#3a2e22' }}
                      placeholder="Doe" autoComplete="family-name" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6b5d4f', letterSpacing: '0.04em' }}>Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition"
                    style={{ background: '#faf6ee', border: '1px solid #e6ddcd', color: '#3a2e22' }}
                    placeholder="jane@email.com" autoComplete="email" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#6b5d4f', letterSpacing: '0.04em' }}>Phone <span style={{ color: '#c9b896' }}>(optional)</span></label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition"
                    style={{ background: '#faf6ee', border: '1px solid #e6ddcd', color: '#3a2e22' }}
                    placeholder="+1 (555) 123-4567" autoComplete="tel" />
                </div>
              </div>
              <button type="submit" disabled={submitting || !firstName.trim() || !lastName.trim() || !email.trim()}
                className="w-full mt-5 py-2.5 rounded-lg font-semibold text-sm transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: btnBg, color: btnText }}>
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                Add Me to the Guest List
              </button>
            </form>
            </PageBorder>
            </Reveal>
          </>
        )}
      </div>
      <FloatingMusicControl musicUrl={settings?.music_url} />
    </div>
  );
}
