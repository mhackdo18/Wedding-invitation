import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useSiteSettings, applySettingsVars } from '@/lib/useSiteSettings';
import { navigate } from '@/lib/router';
import { typeStyle } from '@/lib/typography';
import type { SiteSettings, TypeStyle, Page, WeddingEvent, GalleryPhoto, RsvpQuestion, StoryMilestone } from '@/types';
import WelcomePage from '@/components/public/WelcomePage';
import StoryPage from '@/components/public/StoryPage';
import Schedule from '@/components/public/Schedule';
import Gallery from '@/components/public/Gallery';
import FindYourTable from '@/components/public/FindYourTable';
import VenueSection from '@/components/public/VenueSection';
import EntouragePage from '@/components/public/EntouragePage';
import InformationPage from '@/components/public/InformationPage';
import DocumentViewer from '@/components/public/DocumentViewer';
import EnvelopeIntro from '@/components/public/EnvelopeIntro';
import { Menu, X } from 'lucide-react';
import { SiteMonogram } from '@/components/public/SiteMonogram';
import FloatingMusicControl from '@/components/public/FloatingMusicControl';
import FallingPetals from '@/components/public/FallingPetals';

const SECTION_IDS: Record<string, string> = {
  welcome: 'section-welcome',
  story: 'section-story',
  venue: 'section-venue',
  schedule: 'section-schedule',
  gallery: 'section-gallery',
  'find-table': 'section-find-table',
  entourage: 'section-entourage',
  document: 'section-document',
  custom: 'section-custom',
};

export default function PublicSite() {
  const { settings, loading } = useSiteSettings();
  const [pages, setPages] = useState<Page[]>([]);
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [questions, setQuestions] = useState<RsvpQuestion[]>([]);
  const [milestones, setMilestones] = useState<StoryMilestone[]>([]);
  const [introOpen, setIntroOpen] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const storyPageRef = useRef<Page | null>(null);

  useEffect(() => { applySettingsVars(settings); }, [settings]);

  useEffect(() => {
    (async () => {
      const { data: pg } = await supabase.from('pages').select('*').order('display_order');
      const allPages = pg as Page[] || [];
      setPages(allPages);
      storyPageRef.current = allPages.find((p) => p.template === 'story') || null;
      if (storyPageRef.current) {
        const { data: ms } = await supabase.from('story_milestones').select('*').eq('page_id', storyPageRef.current.id).order('display_order');
        setMilestones(ms as StoryMilestone[] || []);
      }
      const { data: ev } = await supabase.from('events').select('*, venue:venues(*)').order('display_order');
      setEvents(ev as unknown as WeddingEvent[] || []);
      const { data: ph } = await supabase.from('gallery_photos').select('*').order('display_order');
      setPhotos(ph as GalleryPhoto[] || []);
      const { data: q } = await supabase.from('rsvp_questions').select('*').order('display_order');
      setQuestions(q as RsvpQuestion[] || []);
    })();
  }, []);

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-color)' }}>
        <div className="skeleton w-48 h-6 rounded" />
      </div>
    );
  }

  const typo = settings.typography || {};
  const visiblePages = pages.filter((p) => p.is_visible).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  const mainEvents = events.filter((e) => !e.parent_id).map((e) => ({
    ...e,
    sub_events: events.filter((s) => s.parent_id === e.id),
  }));

  const scrollToSection = (template: string, pageId?: string) => {
    const id = pageId ? `section-${pageId}` : SECTION_IDS[template];
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileNav(false);
  };

  const navItems = visiblePages.filter((p) => p.template !== 'rsvp');
  const ctaSize = settings.cta_size === 'small' ? { py: 7, px: 16, fontSize: 13 } : settings.cta_size === 'large' ? { py: 12, px: 28, fontSize: 16 } : { py: 9, px: 22, fontSize: 14 };

  // Render a page section dynamically based on its template
  const renderSection = (p: Page) => {
    switch (p.template) {
      case 'welcome':
        return <WelcomePage settings={settings} typo={typo} onRsvp={() => navigate('/rsvp')} />;
      case 'story':
        return <StoryPage settings={settings} typo={typo} milestones={milestones} />;
      case 'venue':
        return <VenueSection typo={typo} />;
      case 'schedule':
        return <Schedule events={mainEvents} typo={typo} partner1={settings.partner1_name} partner2={settings.partner2_name} />;
      case 'gallery':
        return <Gallery photos={photos} typo={typo} />;
      case 'find-table':
        return <FindYourTable />;
      case 'entourage':
        return <EntouragePage pageId={p.id} typo={typo} />;
      case 'information':
        return <InformationPage pageId={p.id} typo={typo} />;
      case 'document':
        return <DocumentViewer page={p} typo={typo} />;
      case 'custom':
        return (
          <section className="px-6 py-8" style={{ borderTop: '1px solid rgba(120,90,60,0.15)' }}>
            <div className="text-center mb-6">
              <h2 style={{ fontFamily: 'var(--heading-font)', fontSize: 26, color: '#5a4430', margin: 0, ...typeStyle(typo.pageTitle) }}>{p.title}</h2>
            </div>
            <div
              className="text-sm leading-relaxed text-[#6b5d4f] max-w-md mx-auto text-center"
              dangerouslySetInnerHTML={{ __html: (p as any).body_text || (p as any).config?.body_text || 'Add your content in the Page Builder.' }}
            />
          </section>
        );
      default:
        return null;
    }
  };

  // Build ordered sections: welcome is always first if it exists, then rest by display_order
  const welcomePage = visiblePages.find((p) => p.template === 'welcome');
  const otherPages = visiblePages.filter((p) => p.template !== 'welcome');

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-color)' }}>
      <EnvelopeIntro open={introOpen} onClose={() => setIntroOpen(false)} settings={settings} />

      <div className="mx-auto embossed-card scroll-edge fade-up" style={{ maxWidth: 'var(--page-width)', fontFamily: 'var(--body-font)' }}>
        {/* Sticky Navigation */}
        <nav className="sticky top-0 z-20 flex items-center justify-between px-4 py-2.5 border-b" style={{ background: 'var(--page-color)', borderColor: 'rgba(120,90,60,0.12)' }}>
          <button onClick={() => scrollToSection('welcome')} className="flex items-center gap-1.5 shrink-0">
            <SiteMonogram settings={settings} size={14} />
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
            {settings.show_rsvp_button !== false && (
              <button onClick={() => navigate('/rsvp')} className="ml-2 font-semibold transition" style={{ background: settings.cta_bg_color, color: settings.cta_text_color, borderRadius: settings.cta_radius, padding: `${ctaSize.py}px ${ctaSize.px}px`, fontSize: ctaSize.fontSize }}>
                {settings.cta_text}
              </button>
            )}
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
              {settings.show_rsvp_button !== false && (
                <button onClick={() => navigate('/rsvp')} className="mt-3 w-full text-center font-semibold" style={{ background: settings.cta_bg_color, color: settings.cta_text_color, borderRadius: settings.cta_radius, padding: `${ctaSize.py}px ${ctaSize.px}px`, fontSize: ctaSize.fontSize }}>
                  {settings.cta_text}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Render sections dynamically in page builder order */}
        {welcomePage && (
          <div id={welcomePage.id ? `section-${welcomePage.id}` : 'section-welcome'}>
            {welcomePage.hero_image_url && (
              <div className="w-full overflow-hidden">
                <img src={welcomePage.hero_image_url} alt={welcomePage.title} className="w-full aspect-[16/9] object-cover" />
              </div>
            )}
            {renderSection(welcomePage)}
          </div>
        )}
        {!welcomePage && (
          <div id="section-welcome">
            <WelcomePage settings={settings} typo={typo} onRsvp={() => navigate('/rsvp')} />
          </div>
        )}

        {otherPages.map((p) => (
          <div key={p.id} id={`section-${p.id}`}>
            {p.hero_image_url && (
              <div className="mx-6 my-6">
                <div className="w-full overflow-hidden rounded-xl">
                  <img src={p.hero_image_url} alt={p.title} className="w-full aspect-[16/9] object-cover" />
                </div>
              </div>
            )}
            {renderSection(p)}
          </div>
        ))}

        {/* RSVP CTA section at the bottom of scroll */}
        {settings.show_rsvp_section !== false && (
          <section className="px-6 py-10 text-center">
            <h2 style={{ fontFamily: 'var(--heading-font)', fontSize: 24, color: '#5a4430', margin: 0 }}>Will you join us?</h2>
            <p style={{ fontSize: 14, color: '#8a7a66', marginTop: 6 }}>Let us know your response</p>
        {settings.rsvp_deadline && (
          <div className="mt-2">
            <p className="text-base sm:text-lg font-semibold" style={{ color: '#8a6d3b', ...typeStyle(typo.rsvpDeadline) }}>
              RSVP DEADLINE
            </p>
            <p className="text-base sm:text-lg font-semibold" style={{ color: '#8a6d3b', ...typeStyle(typo.rsvpDeadline) }}>
              {new Date(settings.rsvp_deadline).toLocaleDateString([], { dateStyle: 'long' })}
            </p>
          </div>
        )}
            {settings.show_rsvp_button !== false && (
              <button onClick={() => navigate('/rsvp')} className="mt-4 font-semibold transition hover:opacity-90" style={{ background: settings.cta_bg_color, color: settings.cta_text_color, borderRadius: settings.cta_radius, padding: `${ctaSize.py}px ${ctaSize.px}px`, fontSize: ctaSize.fontSize }}>
                {settings.cta_text}
              </button>
            )}
          </section>
        )}

        <footer className="text-center py-8" style={{ background: settings.footer_bg_color && settings.footer_bg_color !== 'transparent' ? settings.footer_bg_color : 'transparent' }}>
          {settings.footer_monogram_url ? (
            <img src={settings.footer_monogram_url} alt="Monogram" className="w-16 h-16 rounded-full object-cover mx-auto mb-3" />
          ) : (
            <SiteMonogram settings={settings} size={16} className="mx-auto mb-2" />
          )}
          <p style={{ fontSize: 13, color: '#8a7a66', ...typeStyle(typo.footer) }}>
            {settings.footer_text
              ? settings.footer_text.replace(/\{partner1\}/g, settings.partner1_name).replace(/\{partner2\}/g, settings.partner2_name)
              : `${settings.partner1_name} & ${settings.partner2_name}`}
          </p>
        </footer>
      </div>
      <div className="h-10" />
      {settings.petal_animation_enabled && (
        <FallingPetals color={settings.petal_color} size={settings.petal_size} count={settings.petal_count} speed={settings.petal_speed} />
      )}
      <FloatingMusicControl musicUrl={settings.music_url} autoplay={settings.music_autoplay} />
    </div>
  );
}
