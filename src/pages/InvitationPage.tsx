import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useSiteSettings, applySettingsVars } from '@/lib/useSiteSettings';
import { typeStyle, fluidPx } from '@/lib/typography';
import type { Invitation, Guest, Party, WeddingEvent, RsvpQuestion, Page, GalleryPhoto, StoryMilestone, TypeStyle, SeatingTable } from '@/types';
import EnvelopeIntro from '@/components/public/EnvelopeIntro';
import DoorReveal from '@/components/public/DoorReveal';
import WelcomePage from '@/components/public/WelcomePage';
import StoryPage from '@/components/public/StoryPage';
import Schedule from '@/components/public/Schedule';
import Gallery from '@/components/public/Gallery';
import FindYourTable from '@/components/public/FindYourTable';
import VenueSection from '@/components/public/VenueSection';
import EntouragePage from '@/components/public/EntouragePage';
import InformationPage from '@/components/public/InformationPage';
import DocumentViewer from '@/components/public/DocumentViewer';
import HeroImage from '@/components/public/HeroImage';
import RsvpWizard from '@/components/public/RsvpWizard';
import { navigate } from '@/lib/router';
import { Loader2 } from 'lucide-react';
import { SiteMonogram } from '@/components/public/SiteMonogram';
import FloatingMusicControl from '@/components/public/FloatingMusicControl';
import FloatingMenuButton from '@/components/public/FloatingMenuButton';
import FaqChat from '@/components/public/FaqChat';
import FallingPetals from '@/components/public/FallingPetals';
import { Reveal } from '@/components/public/Reveal';
import { isRsvpClosed, formatDeadlineDate } from '@/lib/timezone';
import { PageBorder } from '@/components/public/PageBorder';
import { getBorderFromTypography, getBorderExcludeWelcomeFromTypography, getCardBg, getOuterBg } from '@/lib/pageTemplates';
import type { BgPhotoConfig } from '@/lib/pageTemplates';
import type { PageBackground, BackgroundFit, BackgroundPosition } from '@/types';
import type { ReactNode } from 'react';

const FIT_TO_CSS: Record<BackgroundFit, string> = {
  cover: 'cover',
  contain: 'contain',
  fill: '100% 100%',
  center: 'auto',
  repeat: 'auto',
};

function bgPositionCss(pos: BackgroundPosition): string {
  const map: Record<BackgroundPosition, string> = {
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

function SectionBackground({ page, children }: { page: Page; children: ReactNode }) {
  const bg = (page.config as Record<string, unknown>)?.background as PageBackground | undefined;
  if (!bg?.url) return <>{children}</>;
  const bgSize = FIT_TO_CSS[bg.fit] || 'cover';
  const bgRepeat = bg.fit === 'repeat' ? 'repeat' : 'no-repeat';
  const opacity = bg.opacity / 100;
  const overlayOpacity = bg.overlayOpacity / 100;
  const isFront = bg.layer === 'front';
  const imgLayer = (
    <div className="absolute inset-0 pointer-events-none" style={{
      backgroundImage: `url(${bg.url})`,
      backgroundSize: bg.fit === 'repeat' ? 'auto' : bgSize,
      backgroundPosition: bg.fit === 'repeat' ? '0 0' : bgPositionCss(bg.position),
      backgroundRepeat: bgRepeat,
      opacity,
      filter: bg.blur > 0 ? `blur(${bg.blur}px)` : undefined,
      transform: bg.blur > 0 ? 'scale(1.05)' : undefined,
      zIndex: isFront ? 2 : 0,
    }} />
  );
  const overlayLayer = bg.overlayColor ? (
    <div className="absolute inset-0 pointer-events-none" style={{ background: bg.overlayColor, opacity: overlayOpacity, zIndex: isFront ? 1 : 0 }} />
  ) : null;
  if (isFront) {
    return (
      <div className="relative">
        <div className="relative" style={{ zIndex: 1 }}>{children}</div>
        {overlayLayer}
        {imgLayer}
      </div>
    );
  }
  return (
    <div className="relative">
      {imgLayer}
      {overlayLayer}
      <div className="relative" style={{ zIndex: 1 }}>{children}</div>
    </div>
  );
}

function BgPhotoLayer({ bg, children }: { bg: BgPhotoConfig; children: ReactNode }) {
  if (!bg.url) return <>{children}</>;
  const bgSize = FIT_TO_CSS[bg.fit] || 'cover';
  const bgRepeat = bg.fit === 'repeat' ? 'repeat' : 'no-repeat';
  const opacity = bg.opacity / 100;
  const overlayOpacity = bg.overlayOpacity / 100;
  const imgLayer = (
    <div className="absolute inset-0 pointer-events-none" style={{
      backgroundImage: `url(${bg.url})`,
      backgroundSize: bg.fit === 'repeat' ? 'auto' : bgSize,
      backgroundPosition: bg.fit === 'repeat' ? '0 0' : bgPositionCss(bg.position),
      backgroundRepeat: bgRepeat,
      opacity,
      filter: bg.blur > 0 ? `blur(${bg.blur}px)` : undefined,
      transform: bg.blur > 0 ? 'scale(1.05)' : undefined,
      zIndex: 0,
    }} />
  );
  const overlayLayer = bg.overlayColor ? (
    <div className="absolute inset-0 pointer-events-none" style={{ background: bg.overlayColor, opacity: overlayOpacity, zIndex: 0 }} />
  ) : null;
  return (
    <div className="relative">
      {imgLayer}
      {overlayLayer}
      <div className="relative" style={{ zIndex: 1 }}>{children}</div>
    </div>
  );
}

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
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [introOpen, setIntroOpen] = useState(false);
  const [doorOpen, setDoorOpen] = useState(false);
  const [doorOpening, setDoorOpening] = useState(false);
  const [revealDone, setRevealDone] = useState(false);
  const [invLoading, setInvLoading] = useState(true);
  const storyPageRef = useRef<Page | null>(null);

  useEffect(() => { applySettingsVars(settings); }, [settings]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [invitationResult, pagesResult, eventsResult, photosResult, questionsResult] = await Promise.all([
          supabase.from('invitations').select('*, guest:guests(*)').eq('token', token).maybeSingle(),
          supabase.from('pages').select('*').order('display_order'),
          supabase.from('events').select('*, venue:venues(*)').order('display_order'),
          supabase.from('gallery_photos').select('*').order('display_order'),
          supabase.from('rsvp_questions').select('*').order('display_order'),
        ]);

        if (!active) return;

        const i = invitationResult.data as unknown as Invitation | null;
        const g = i?.guest as Guest | undefined;
        const allPages = pagesResult.data as Page[] || [];
        const storyPage = allPages.find((p) => p.template === 'story') || null;

        setPages(allPages);
        storyPageRef.current = storyPage;
        setEvents(eventsResult.data as unknown as WeddingEvent[] || []);
        setPhotos(photosResult.data as GalleryPhoto[] || []);
        setQuestions(questionsResult.data as RsvpQuestion[] || []);

        if (!i) {
          setInvLoading(false);
          return;
        }

        setInv(i);
        setGuest(g || null);
        setIntroOpen(true);
        setDoorOpen(true);
        setInvLoading(false);

        const [partyResult, membersResult] = g?.party_id
          ? await Promise.all([
              supabase.from('parties').select('*').eq('id', g.party_id).maybeSingle(),
              supabase.from('guests').select('*').eq('party_id', g.party_id).order('name'),
            ])
          : [{ data: null }, { data: null }];

        if (!active) return;
        setParty(partyResult.data as Party || null);
        setPartyMembers(membersResult.data as Guest[] || []);

        if (g) {
          const { data: seatData } = await supabase
            .from('seat_assignments')
            .select('table:seating_tables(name)')
            .eq('guest_id', g.id)
            .maybeSingle();
          if (active && seatData) {
            const tbl = (seatData as unknown as { table: SeatingTable | null }).table;
            setTableNumber(tbl?.name || null);
          }
        }

        if (storyPage) {
          const { data: milestonesData } = await supabase
            .from('story_milestones').select('*').eq('page_id', storyPage.id).order('display_order');
          if (active) setMilestones(milestonesData as StoryMilestone[] || []);
        }

        supabase.from('invitations').update({ opened_at: new Date().toISOString() }).eq('id', i.id).then(() => {});
      } catch {
        if (active) setInvLoading(false);
      }
    })();

    return () => { active = false; };
  }, [token]);

  if (loading || !settings || invLoading) {
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
          <h1 style={{ fontFamily: 'var(--heading-font)', fontSize: fluidPx(26), color: '#5a4430' }}>Invitation not found</h1>
          <p style={{ fontSize: fluidPx(14), color: '#8a7a66', marginTop: 8 }}>
            This invitation link may have expired. Please contact the couple.
          </p>
        </div>
      </div>
    );
  }

  const typo = settings.typography || {};
  const borderTemplate = getBorderFromTypography(settings.typography);
  const excludeWelcomeBorder = getBorderExcludeWelcomeFromTypography(settings.typography);
  const cardBg = getCardBg(settings.typography);
  const outerBg = getOuterBg(settings.typography);
  const rsvpGuests = partyMembers.length > 0 ? partyMembers : (guest ? [guest] : []);
  const visiblePages = pages
    .filter((p) => p.is_visible)
    .filter((p) => {
      if (!p.visible_tags || p.visible_tags.length === 0) return true;
      if (!guest?.tags || guest.tags.length === 0) return false;
      return p.visible_tags.some((t) => guest.tags.includes(t));
    })
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  const mainEvents = events.filter((e) => !e.parent_id).map((e) => ({
    ...e,
    sub_events: events.filter((s) => s.parent_id === e.id),
  }));

  const scrollToSection = (template: string, pageId?: string) => {
    const id = pageId ? `section-${pageId}` : `section-${template}`;
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const navItems = visiblePages.filter((p) => p.template !== 'rsvp');
  const ctaSize = settings.cta_size === 'small' ? { py: 7, px: 16, fontSize: fluidPx(13) } : settings.cta_size === 'large' ? { py: 12, px: 28, fontSize: fluidPx(16) } : { py: 9, px: 22, fontSize: fluidPx(14) };

  const renderSection = (p: Page) => {
    switch (p.template) {
      case 'welcome':
        return <WelcomePage settings={settings} typo={typo} onRsvp={() => document.getElementById('invitation-rsvp')?.scrollIntoView({ behavior: 'smooth' })} />;
      case 'story':
        return <StoryPage settings={settings} typo={typo} milestones={milestones} heroImageUrl={p.hero_image_url ?? undefined} />;
      case 'venue':
        return <VenueSection typo={typo} heroImageUrl={p.hero_image_url ?? undefined} animEnabled={!!settings.scroll_animation_enabled} />;
      case 'schedule':
        return <Schedule events={mainEvents} typo={typo} heroImageUrl={p.hero_image_url ?? undefined} animEnabled={!!settings.scroll_animation_enabled} />;
      case 'gallery':
        return <Gallery photos={photos} typo={typo} heroImageUrl={p.hero_image_url ?? undefined} animEnabled={!!settings.scroll_animation_enabled} />;
      case 'find-table':
        return <FindYourTable heroImageUrl={p.hero_image_url ?? undefined} animEnabled={!!settings.scroll_animation_enabled} />;
      case 'entourage':
        return <EntouragePage pageId={p.id} typo={typo} heroImageUrl={p.hero_image_url ?? undefined} animEnabled={!!settings.scroll_animation_enabled} />;
      case 'information':
        return <InformationPage pageId={p.id} typo={typo} heroImageUrl={p.hero_image_url ?? undefined} guestTags={guest?.tags} animEnabled={!!settings.scroll_animation_enabled} />;
      case 'document':
        return <DocumentViewer page={p} typo={typo} heroImageUrl={p.hero_image_url ?? undefined} animEnabled={!!settings.scroll_animation_enabled} />;
      case 'custom':
        return (
          <section className="px-6 py-8" style={{ borderTop: '1px solid rgba(120,90,60,0.15)' }}>
            <div className="text-center mb-6">
              <h2 style={{ fontFamily: 'var(--heading-font)', fontSize: fluidPx(26), color: '#5a4430', margin: 0, ...typeStyle(typo.pageTitle) }}>{p.title}</h2>
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

  const welcomePage = visiblePages.find((p) => p.template === 'welcome');
  const otherPages = visiblePages.filter((p) => p.template !== 'welcome');

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-color)' }}>
      <BgPhotoLayer bg={outerBg}>
      <DoorReveal
        open={introOpen || doorOpen}
        opening={doorOpening}
        onDone={() => { setDoorOpen(false); setDoorOpening(false); setIntroOpen(false); setRevealDone(true); }}
        settings={settings}
      />
      <EnvelopeIntro
        open={introOpen}
        onOpen={() => setRevealDone(true)}
        onClose={() => {
          setRevealDone(false);
          setDoorOpen(true);
          setTimeout(() => setDoorOpening(true), 700);
        }}
        settings={settings}
        guestName={guest?.name_on_card || guest?.name}
        partyName={party?.name}
      />

      <div className="mx-auto w-full embossed-card scroll-edge fade-up lg:max-w-[var(--page-width)]" style={{ fontFamily: 'var(--body-font)' }}>
        <BgPhotoLayer bg={cardBg}>
        {/* Sticky Navigation */}
        <nav className="sticky top-0 z-20 hidden lg:flex items-center justify-between px-4 py-2.5 border-b" style={{ background: 'var(--page-color)', borderColor: 'rgba(120,90,60,0.12)' }}>
          <button onClick={() => scrollToSection('welcome')} className="flex items-center shrink-0" aria-label="Back to welcome">
            <SiteMonogram settings={settings} size={36} />
          </button>
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((p) => (
              <button key={p.id} onClick={() => scrollToSection(p.template, p.id)} className="px-3 py-1.5 text-xs font-medium rounded-full transition" style={{ color: '#8a7a66' }}>
                {p.title}
              </button>
            ))}
            {settings.show_rsvp_in_navigation !== false && (
              <button onClick={() => document.getElementById('invitation-rsvp')?.scrollIntoView({ behavior: 'smooth' })} className="ml-2 font-semibold transition" style={{ background: settings.cta_bg_color, color: settings.cta_text_color, borderRadius: settings.cta_radius, padding: `${ctaSize.py}px ${ctaSize.px}px`, fontSize: ctaSize.fontSize }}>
                {settings.cta_text}
              </button>
            )}
          </div>
        </nav>

        {/* Render all page sections */}
        {welcomePage && (
          <div id={welcomePage.id ? `section-${welcomePage.id}` : 'section-welcome'}>
            <SectionBackground page={welcomePage}>
            <Reveal enabled={!!settings.scroll_animation_enabled} animation="fade-up"><PageBorder template={borderTemplate} typography={settings.typography} enabled={!excludeWelcomeBorder}>{renderSection(welcomePage)}</PageBorder></Reveal>
            </SectionBackground>
          </div>
        )}
        {!welcomePage && (
          <div id="section-welcome">
            <Reveal enabled={!!settings.scroll_animation_enabled} animation="fade-up"><PageBorder template={borderTemplate} typography={settings.typography} enabled={!excludeWelcomeBorder}><WelcomePage settings={settings} typo={typo} onRsvp={() => document.getElementById('invitation-rsvp')?.scrollIntoView({ behavior: 'smooth' })} /></PageBorder></Reveal>
          </div>
        )}

        {otherPages.map((p, idx) => (
          <div key={p.id} id={`section-${p.id}`}>
            <SectionBackground page={p}>
            <Reveal enabled={!!settings.scroll_animation_enabled} animation={idx % 2 === 0 ? 'fade-left' : 'fade-right'}><PageBorder template={borderTemplate} typography={settings.typography}>{renderSection(p)}</PageBorder></Reveal>
            </SectionBackground>
          </div>
        ))}

        {/* Embedded RSVP section */}
        {settings.show_rsvp_section !== false && (
        <Reveal enabled={!!settings.scroll_animation_enabled} animation="scale-in">
        <section id="invitation-rsvp" style={{ borderTop: '1px solid rgba(120,90,60,0.15)' }}>
          {settings.rsvp_deadline && (
            <div className="text-center pt-6">
              <p className="text-base sm:text-lg font-semibold" style={{ color: isRsvpClosed(settings.rsvp_deadline, settings.timezone) ? '#b03a3a' : '#8a6d3b', ...typeStyle(typo.rsvpDeadline) }}>
                {isRsvpClosed(settings.rsvp_deadline, settings.timezone) ? 'RSVP IS NOW CLOSED' : 'RSVP DEADLINE'}
              </p>
              <p className="text-base sm:text-lg font-semibold" style={{ color: isRsvpClosed(settings.rsvp_deadline, settings.timezone) ? '#b03a3a' : '#8a6d3b', ...typeStyle(typo.rsvpDeadline) }}>
                {formatDeadlineDate(settings.rsvp_deadline, settings.timezone)}
              </p>
            </div>
          )}
          <RsvpWizard
            guests={rsvpGuests}
            events={mainEvents}
            questions={questions}
            settings={settings}
            typo={typo}
            embedded
            onGuestsUpdate={setPartyMembers}
          />
        </section>
        </Reveal>
        )}

        <Reveal enabled={!!settings.scroll_animation_enabled} animation="fade-in">
        {/* Footer */}
        <footer className="text-center py-8" style={{ background: settings.footer_bg_color && settings.footer_bg_color !== 'transparent' ? settings.footer_bg_color : 'transparent' }}>
          {settings.footer_monogram_url ? (
            <img src={settings.footer_monogram_url} alt="Monogram" className="w-16 h-16 rounded-full object-cover mx-auto mb-3" />
          ) : (
            <SiteMonogram settings={settings} size={16} className="mx-auto mb-2" />
          )}
          <p style={{ fontSize: fluidPx(13), color: '#8a7a66', ...typeStyle(typo.footer) }}>
            {settings.footer_text
              ? settings.footer_text.replace(/\{partner1\}/g, settings.partner1_name).replace(/\{partner2\}/g, settings.partner2_name)
              : `${settings.partner1_name} & ${settings.partner2_name}`}
          </p>
        </footer>
        </Reveal>
        </BgPhotoLayer>
      </div>
      <FloatingMenuButton items={[
        ...navItems.map((p) => ({ key: p.id, label: p.title, onSelect: () => scrollToSection(p.template, p.id) })),
        ...(settings.show_rsvp_in_navigation !== false ? [{ key: 'rsvp', label: settings.cta_text, onSelect: () => document.getElementById('invitation-rsvp')?.scrollIntoView({ behavior: 'smooth' }), accent: true }] : []),
      ]} />
      <div className="h-10" />
      {settings.petal_animation_enabled && (
        <FallingPetals color={settings.petal_color} size={settings.petal_size} count={settings.petal_count} speed={settings.petal_speed} />
      )}
      <FloatingMusicControl musicUrl={settings.music_url} autoplay={settings.music_autoplay} active={revealDone} />
      {settings.faq_chat_enabled && settings.faq_chat_webhook_url && (
        <FaqChat webhookUrl={settings.faq_chat_webhook_url} greeting={settings.faq_chat_greeting} guestName={guest?.name_on_card || guest?.name} guestNameOnCard={guest?.name_on_card} guestTags={guest?.tags} authUsername={settings.faq_chat_auth_username} authPassword={settings.faq_chat_auth_password} botName={settings.faq_chat_bot_name} tableNumber={tableNumber} partyName={party?.name} />
      )}
      </BgPhotoLayer>
    </div>
  );
}
