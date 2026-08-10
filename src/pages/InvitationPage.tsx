import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useSiteSettings, applySettingsVars } from '@/lib/useSiteSettings';
import { typeStyle } from '@/lib/typography';
import type { Invitation, Guest, Party, WeddingEvent, RsvpQuestion, Page, GalleryPhoto, StoryMilestone, TypeStyle } from '@/types';
import EnvelopeIntro from '@/components/public/EnvelopeIntro';
import WelcomePage from '@/components/public/WelcomePage';
import StoryPage from '@/components/public/StoryPage';
import Schedule from '@/components/public/Schedule';
import Gallery from '@/components/public/Gallery';
import FindYourTable from '@/components/public/FindYourTable';
import VenueSection from '@/components/public/VenueSection';
import EntouragePage from '@/components/public/EntouragePage';
import DocumentViewer from '@/components/public/DocumentViewer';
import RsvpWizard from '@/components/public/RsvpWizard';
import { navigate } from '@/lib/router';
import { Heart, Loader2, Menu, X } from 'lucide-react';

export default function InvitationPage({ token }: { token: string }) {
  const { settings, loading } = useSiteSettings();
  const [inv, setInv] = useState<Invitation | null>(null);
  const [guest, setGuest] = useState<Guest | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const [partyMembers, setPartyMembers] = useState<Guest[]>([]);
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [questions, setQuestions] = useState<RsvpQuestion[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [milestones, setMilestones] = useState<StoryMilestone[]>([]);
  const [introOpen, setIntroOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const storyPageRef = useRef<Page | null>(null);

  useEffect(() => { applySettingsVars(settings); }, [settings]);

  useEffect(() => {
    (async () => {
      // Fetch invitation + guest
      const { data: invData } = await supabase
        .from('invitations').select('*, guest:guests(*)')
        .eq('token', token).maybeSingle();
      if (invData) {
        const i = invData as unknown as Invitation;
        setInv(i);
        const g = i.guest as Guest;
        setGuest(g);
        await supabase.from('invitations').update({ opened_at: new Date().toISOString() }).eq('id', i.id);
        setIntroOpen(true);

        if (g?.party_id) {
          const { data: p } = await supabase.from('parties').select('*').eq('id', g.party_id).maybeSingle();
          setParty(p as Party || null);
          const { data: members } = await supabase.from('guests').select('*').eq('party_id', g.party_id).order('name');
          setPartyMembers(members as Guest[] || []);
        }
      }

      // Fetch all page content (same as PublicSite)
      const { data: pg } = await supabase.from('pages').select('*').order('display_order');
      const allPages = pg as Page[] || [];
      setPages(allPages);
      storyPageRef.current = allPages.find((p) => p.template === 'story') || null;
      if (storyPageRef.current) {
        const { data: ms } = await supabase.from('story_milestones').select('*').eq('page_id', storyPageRef.current.id).order('display_order');
        setMilestones(ms as StoryMilestone[] || []);
      }

      const { data: ev } = await supabase.from('events').select('*, venue:venues(*)').order('display_order');
      const allEvents = ev as unknown as WeddingEvent[] || [];
      setEvents(allEvents);

      const { data: ph } = await supabase.from('gallery_photos').select('*').order('display_order');
      setPhotos(ph as GalleryPhoto[] || []);

      const { data: q } = await supabase.from('rsvp_questions').select('*').order('display_order');
      setQuestions(q as RsvpQuestion[] || []);
    })();
  }, [token]);

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-color)' }}>
        <Loader2 className="animate-spin" style={{ color: '#8a6d3b' }} />
      </div>
    );
  }

  if (!inv) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg-color)' }}>
        <div className="embossed-card rounded-xl p-8 text-center max-w-sm">
          <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: 26, color: '#5a4430' }}>Invitation not found</h1>
          <p style={{ fontSize: 14, color: '#8a7a66', marginTop: 8 }}>
            This invitation link may have expired. Please contact the couple.
          </p>
        </div>
      </div>
    );
  }

  const typo = settings.typography || {};
  const rsvpGuests = partyMembers.length > 0 ? partyMembers : (guest ? [guest] : []);
  const visiblePages = pages.filter((p) => p.is_visible).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  const mainEvents = events.filter((e) => !e.parent_id).map((e) => ({
    ...e,
    sub_events: events.filter((s) => s.parent_id === e.id),
  }));

  const scrollToSection = (template: string, pageId?: string) => {
    const id = pageId ? `section-${pageId}` : `section-${template}`;
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileNav(false);
  };

  const navItems = visiblePages.filter((p) => p.template !== 'rsvp');
  const ctaSize = settings.cta_size === 'small' ? { py: 7, px: 16, fontSize: 13 } : settings.cta_size === 'large' ? { py: 12, px: 28, fontSize: 16 } : { py: 9, px: 22, fontSize: 14 };

  const renderSection = (p: Page) => {
    switch (p.template) {
      case 'welcome':
        return <WelcomePage settings={settings} typo={typo} onRsvp={() => document.getElementById('invitation-rsvp')?.scrollIntoView({ behavior: 'smooth' })} />;
      case 'story':
        return <StoryPage settings={settings} typo={typo} milestones={milestones} />;
      case 'venue':
        return <VenueSection />;
      case 'schedule':
        return <Schedule events={mainEvents} typo={typo} />;
      case 'gallery':
        return <Gallery photos={photos} typo={typo} />;
      case 'find-table':
        return <FindYourTable />;
      case 'entourage':
        return <EntouragePage pageId={p.id} typo={typo} />;
      case 'document':
        return <DocumentViewer page={p} typo={typo} />;
      case 'custom':
        return (
          <section className="px-6 py-8" style={{ borderTop: '1px solid rgba(120,90,60,0.15)' }}>
            <div className="text-center mb-6">
              <h2 style={{ ...typeStyle(typo.storyTitle), fontFamily: 'var(--heading-font)', fontSize: 26, color: '#5a4430', margin: 0 }}>{p.title}</h2>
            </div>
            {p.hero_image_url && <img src={p.hero_image_url} alt={p.title} className="w-full max-h-72 object-cover rounded-xl mb-4" />}
            <p className="text-sm leading-relaxed text-[#6b5d4f] max-w-md mx-auto text-center" style={{ whiteSpace: 'pre-wrap' }}>
              {(p as any).body_text || 'Add your content in the Page Builder.'}
            </p>
          </section>
        );
      default:
        return null;
    }
  };

  const welcomePage = visiblePages.find((p) => p.template === 'welcome');
  const otherPages = visiblePages.filter((p) => p.template !== 'welcome');

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-color)' }}>
      <EnvelopeIntro
        open={introOpen}
        onClose={() => setIntroOpen(false)}
        settings={settings}
        guestName={guest?.name}
        partyName={party?.name}
      />

      <div className="mx-auto embossed-card scroll-edge fade-up" style={{ maxWidth: 'var(--page-width)', fontFamily: 'var(--body-font)' }}>
        {/* Personalized banner */}
        {guest && (
          <div className="text-center py-3" style={{ background: '#f0e8d8' }}>
            <p style={{ fontSize: 13, color: '#6b5d4f' }}>
              Dear <strong style={{ color: '#5a4430' }}>{guest.name}</strong>
              {party && partyMembers.length > 1 ? `, you're RSVPing for ${party.name}` : ', you have a personal invitation.'}
            </p>
          </div>
        )}

        {/* Sticky Navigation */}
        <nav className="sticky top-0 z-20 flex items-center justify-between px-4 py-2.5 border-b" style={{ background: 'var(--page-color)', borderColor: 'rgba(120,90,60,0.12)' }}>
          <button onClick={() => scrollToSection('welcome')} className="flex items-center gap-1.5 shrink-0">
            <Heart size={14} style={{ color: '#b5462f' }} />
            <span className="hidden sm:inline" style={{ fontFamily: 'var(--heading-font)', fontSize: 14, fontWeight: 600, color: '#5a4430' }}>
              {settings.partner1_name} &amp; {settings.partner2_name}
            </span>
          </button>
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((p) => (
              <button key={p.id} onClick={() => scrollToSection(p.template, p.id)} className="px-3 py-1.5 text-xs font-medium rounded-full transition" style={{ color: '#8a7a66' }}>
                {p.title}
              </button>
            ))}
            <button onClick={() => document.getElementById('invitation-rsvp')?.scrollIntoView({ behavior: 'smooth' })} className="ml-2 font-semibold transition" style={{ background: settings.cta_bg_color, color: settings.cta_text_color, borderRadius: settings.cta_radius, padding: `${ctaSize.py}px ${ctaSize.px}px`, fontSize: ctaSize.fontSize }}>
              {settings.cta_text}
            </button>
          </div>
          <button onClick={() => setMobileNav(true)} className="md:hidden text-[#5a4430]"><Menu size={18} /></button>
        </nav>

        {/* Mobile nav drawer */}
        {mobileNav && (
          <div className="md:hidden fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/30" onClick={() => setMobileNav(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-56 flex flex-col p-4" style={{ background: 'var(--page-color)' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-[#5a4430] text-sm">Menu</span>
                <button onClick={() => setMobileNav(false)}><X size={18} className="text-[#8a7a66]" /></button>
              </div>
              <div className="space-y-1">
                {navItems.map((p) => (
                  <button key={p.id} onClick={() => scrollToSection(p.template, p.id)} className="w-full text-left px-3 py-2 rounded-lg text-sm" style={{ color: '#8a7a66' }}>
                    {p.title}
                  </button>
                ))}
              </div>
              <button onClick={() => { setMobileNav(false); document.getElementById('invitation-rsvp')?.scrollIntoView({ behavior: 'smooth' }); }} className="mt-3 w-full text-center font-semibold" style={{ background: settings.cta_bg_color, color: settings.cta_text_color, borderRadius: settings.cta_radius, padding: `${ctaSize.py}px ${ctaSize.px}px`, fontSize: ctaSize.fontSize }}>
                {settings.cta_text}
              </button>
            </div>
          </div>
        )}

        {/* Render all page sections */}
        {welcomePage && (
          <div id={welcomePage.id ? `section-${welcomePage.id}` : 'section-welcome'}>
            {renderSection(welcomePage)}
          </div>
        )}
        {!welcomePage && (
          <div id="section-welcome">
            <WelcomePage settings={settings} typo={typo} onRsvp={() => document.getElementById('invitation-rsvp')?.scrollIntoView({ behavior: 'smooth' })} />
          </div>
        )}

        {otherPages.map((p) => (
          <div key={p.id} id={`section-${p.id}`}>
            {renderSection(p)}
          </div>
        ))}

        {/* Embedded RSVP section */}
        <section id="invitation-rsvp" style={{ borderTop: '1px solid rgba(120,90,60,0.15)' }}>
          <div className="px-6 py-6 text-center">
            <p style={{ fontFamily: 'Great Vibes, cursive', fontSize: 22, color: '#b5462f' }}>
              {guest ? `Dear ${guest.name},` : 'Dear Guest,'}
            </p>
            <p style={{ fontSize: 15, color: '#6b5d4f', lineHeight: 1.7, marginTop: 8, maxWidth: 420, margin: '8px auto 0' }}>
              {partyMembers.length > 1
                ? `You can RSVP for everyone in ${party?.name} below.`
                : 'We would be honoured to have you join us. Please RSVP below.'}
            </p>
          </div>
          <RsvpWizard
            guests={rsvpGuests}
            events={mainEvents}
            questions={questions}
            settings={settings}
            typo={typo}
            embedded
          />
        </section>

        {/* Footer */}
        <footer className="text-center py-8" style={{ background: settings.footer_bg_color && settings.footer_bg_color !== 'transparent' ? settings.footer_bg_color : 'transparent' }}>
          {settings.footer_monogram_url ? (
            <img src={settings.footer_monogram_url} alt="Monogram" className="w-16 h-16 rounded-full object-cover mx-auto mb-3" />
          ) : (
            <Heart size={16} className="mx-auto mb-2" style={{ color: '#b5462f' }} />
          )}
          <p style={{ ...typeStyle(typo.footer), fontSize: 13, color: '#8a7a66' }}>
            {settings.footer_text
              ? settings.footer_text.replace(/\{partner1\}/g, settings.partner1_name).replace(/\{partner2\}/g, settings.partner2_name)
              : `${settings.partner1_name} & ${settings.partner2_name}`}
          </p>
        </footer>
      </div>
      <div className="h-10" />
    </div>
  );
}
