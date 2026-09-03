import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useSiteSettings, applySettingsVars } from '@/lib/useSiteSettings';
import { FONT_OPTIONS, stackFor } from '@/lib/fonts';
import { uploadImage } from '@/lib/upload';
import { SectionHeader, Card, ConfirmButton, EmptyState } from '../ui';
import type { SiteSettings, TypeStyle, Page, StoryMilestone, InformationConfig, InformationBlock } from '@/types';
import { Save, Loader2, RotateCcw, Plus, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, FileText, X, Upload, ImageIcon, Image, GripVertical, ChevronUp, ChevronDown, Music } from 'lucide-react';
import { FontSelect } from '@/components/admin/FontSelect';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { UploadProgress } from '@/components/admin/UploadProgress';
import TagInput from '@/components/admin/TagInput';
import { PAGE_BORDER_TEMPLATES, getBorderFromTypography, setBorderInTypography } from '@/lib/pageTemplates';

const TYPO_KEYS = [
  { key: 'pageTitle', label: 'Page Title' },
  { key: 'heroPretitle', label: 'Hero Pre-title' },
  { key: 'heroTitle', label: 'Hero Names (Title)' },
  { key: 'heroAmpersand', label: 'Hero Ampersand (&)' },
  { key: 'heroMarried', label: 'Hero "Married" Text' },
  { key: 'heroDate', label: 'Hero Date' },
  { key: 'heroVenue', label: 'Hero Venue' },
  { key: 'storyTitle', label: 'Story Title' },
  { key: 'storyBody', label: 'Story Body' },
  { key: 'scheduleTitle', label: 'Schedule Heading' },
  { key: 'eventDate', label: 'Event Date' },
  { key: 'eventName', label: 'Event Name' },
  { key: 'eventTime', label: 'Event Time' },
  { key: 'eventDescription', label: 'Event Description' },
  { key: 'subEventDate', label: 'Sub-Event Date' },
  { key: 'subEventName', label: 'Sub-Event Name' },
  { key: 'subEventTime', label: 'Sub-Event Time' },
  { key: 'subEventDescription', label: 'Sub-Event Description' },
  { key: 'venueName', label: 'Event Venue Name' },
  { key: 'venueLocation', label: 'Event Venue Location' },
  { key: 'venueDescription', label: 'Venue Description' },
  { key: 'galleryTitle', label: 'Gallery Heading' },
  { key: 'rsvpTitle', label: 'RSVP Heading' },
  { key: 'rsvpDeadline', label: 'RSVP Deadline' },
  { key: 'countdown', label: 'Countdown' },
  { key: 'footer', label: 'Footer Text' },
];

const TEMPLATES = [
  { value: 'welcome', label: 'Welcome' },
  { value: 'story', label: 'Our Story' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'venue', label: 'Venues' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'entourage', label: 'Entourage' },
  { value: 'information', label: 'Information' },
  { value: 'document', label: 'Document Viewer' },
  { value: 'find-table', label: 'Find Your Table' },
  { value: 'custom', label: 'Custom' },
];

const WELCOME_LAYOUTS = [
  { value: 'centered', label: 'Centered Overlay', hint: 'Full-image background with centered text' },
  { value: 'split', label: 'Split Image/Text', hint: 'Image on one side, text on the other' },
  { value: 'minimalist', label: 'Minimalist Frame', hint: 'Bordered text, no background image' },
  { value: 'classic', label: 'Classic Card', hint: 'Soft faded image with text overlay' },
  { value: 'fullscreen', label: 'Fullscreen Cinematic', hint: 'Photo fills screen, name in large script at center' },
  { value: 'magazine', label: 'Magazine', hint: 'Dark bottom bar over photo, elegant editorial' },
  { value: 'vintage', label: 'Vintage Stationery', hint: 'Cream paper with ornate border, no photo needed' },
  { value: 'botanical', label: 'Botanical', hint: 'Side strip with photo, greenery feel, names large' },
  { value: 'elegant_frame', label: 'Elegant Frame', hint: 'Thin gold border frame, centered names, refined' },
  { value: 'watercolor', label: 'Watercolor Wash', hint: 'Soft gradient background, no photo, dreamy pastel' },
  { value: 'modern_minimal', label: 'Modern Minimal', hint: 'Clean white, bold sans-serif names, lots of space' },
  { value: 'script_focus', label: 'Script Focus', hint: 'Large script names on plain background, no photo' },
  { value: 'photo_collage', label: 'Photo Collage', hint: 'Grid of photos with names overlaid' },
  { value: 'dark_luxe', label: 'Dark Luxe', hint: 'Black background, gold text, luxurious feel' },
  { value: 'floral_border', label: 'Floral Border', hint: 'Decorative floral frame around content' },
  { value: 'split_diagonal', label: 'Diagonal Split', hint: 'Diagonal image/text split, modern angle' },
  { value: 'names_top', label: 'Names on Top', hint: 'Partner names on one line above hero image, dates and countdown below' },
  { value: 'invitation_cover', label: 'Invitation Cover', hint: 'Rounded photo cover with music controls, script names, and invitation message' },
];

type Tab = 'pages' | 'story' | 'styling';

export default function PageBuilder() {
  const [tab, setTab] = useState<Tab>('pages');

  return (
    <div>
      <SectionHeader title="Page Builder" subtitle="Manage sections, story timeline, and styling" />
      <div className="flex gap-1 mb-4 border-b overflow-x-auto thin-scroll" style={{ borderColor: '#e6ddcd' }}>
        {(['pages', 'story', 'styling'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap"
            style={{ borderColor: tab === t ? '#8a6d3b' : 'transparent', color: tab === t ? '#5a4430' : '#8a7a66' }}>
            {t === 'pages' ? 'Page & Section Management' : t === 'story' ? 'Our Story' : 'Page style'}
          </button>
        ))}
      </div>
      {tab === 'pages' && <PagesTab />}
      {tab === 'story' && <StoryTab />}
      {tab === 'styling' && <StylingTab />}
    </div>
  );
}

// ===================== Pages Tab =====================
function PagesTab() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Page | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('pages').select('*').order('display_order');
    setPages(data as Page[] || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleVisible = async (p: Page) => {
    await supabase.from('pages').update({ is_visible: !p.is_visible }).eq('id', p.id);
    load();
  };

  const move = async (p: Page, dir: -1 | 1) => {
    const sorted = [...pages].sort((a, b) => a.display_order - b.display_order);
    const idx = sorted.findIndex((x) => x.id === p.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    await Promise.all([
      supabase.from('pages').update({ display_order: other.display_order }).eq('id', p.id),
      supabase.from('pages').update({ display_order: p.display_order }).eq('id', other.id),
    ]);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from('pages').delete().eq('id', id);
    load();
  };

  const reorder = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const ordered = [...pages].sort((a, b) => a.display_order - b.display_order);
    const sourceIndex = ordered.findIndex((p) => p.id === sourceId);
    const targetIndex = ordered.findIndex((p) => p.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);
    await Promise.all(ordered.map((p, index) => supabase.from('pages').update({ display_order: index }).eq('id', p.id)));
    setDraggedId(null);
    load();
  };

  const [heroUploading, setHeroUploading] = useState<string | null>(null);
  const [heroProgress, setHeroProgress] = useState(0);

  const uploadPageHero = async (pageId: string, file: File) => {
    if (heroUploading) return;
    setHeroUploading(pageId);
    setHeroProgress(0);
    const url = await uploadImage(file, 'pages', setHeroProgress);
    if (url) { await supabase.from('pages').update({ hero_image_url: url }).eq('id', pageId); load(); }
    setHeroUploading(null);
    setHeroProgress(0);
  };

  const removePageHero = async (pageId: string) => {
    await supabase.from('pages').update({ hero_image_url: null }).eq('id', pageId);
    load();
  };

  const save = async (data: Partial<Page>) => {
    const config = { ...(data.config as object || {}), body_text: data.body_text || null };
    if (editing) {
      await supabase.from('pages').update({ title: data.title, slug: data.slug, template: data.template, is_visible: data.is_visible, config }).eq('id', editing.id);
    } else {
      await supabase.from('pages').insert({ title: data.title, slug: data.slug, template: data.template, is_visible: data.is_visible ?? true, display_order: pages.length, config });
    }
    setAdding(false); setEditing(null); load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8a6d3b]" /></div>;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-1.5"><Plus size={16} /> Add Section</button>
      </div>
      {pages.length === 0 && !adding && <Card><EmptyState icon={FileText} title="No pages" hint="Add your first section" /></Card>}
      <div className="space-y-2">
        {[...pages].sort((a, b) => a.display_order - b.display_order).map((p, i, arr) => (
          <div key={p.id} draggable onDragStart={() => setDraggedId(p.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => draggedId && reorder(draggedId, p.id)} className="admin-card p-3 flex items-center gap-3">
            <GripVertical size={16} className="text-[#c9b896] shrink-0 cursor-grab" />
            <div className="flex flex-col gap-0.5">
              <button onClick={() => move(p, -1)} disabled={i === 0} className="text-[#8a7a66] disabled:opacity-30 hover:text-[#5a4430]"><ArrowUp size={14} /></button>
              <button onClick={() => move(p, 1)} disabled={i === arr.length - 1} className="text-[#8a7a66] disabled:opacity-30 hover:text-[#5a4430]"><ArrowDown size={14} /></button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#3a2e22]">{p.title}</p>
              <p className="text-xs text-[#8a7a66]">/{p.slug} · {TEMPLATES.find((t) => t.value === p.template)?.label || p.template}</p>
            </div>
            <button onClick={() => toggleVisible(p)} className="text-[#8a7a66] hover:text-[#5a4430]" title={p.is_visible ? 'Visible' : 'Hidden'}>
              {p.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <label title="Upload hero photo" className={`cursor-pointer text-[#8a7a66] hover:text-[#5a4430] ${heroUploading ? 'pointer-events-none opacity-50' : ''}`}>
              {heroUploading === p.id ? <Loader2 size={14} className="animate-spin" /> : p.hero_image_url ? <img src={p.hero_image_url} alt="" className="w-6 h-6 rounded object-cover" /> : <Image size={14} />}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPageHero(p.id, f); e.target.value = ''; }} />
            </label>
            {p.hero_image_url && <button onClick={() => removePageHero(p.id)} title="Remove hero photo" className="text-[#b03a3a] hover:text-[#9a2a2a]"><X size={14} /></button>}
            <button onClick={() => setEditing(p)} className="text-[#8a7a66] hover:text-[#5a4430] text-xs font-medium">Edit</button>
            <ConfirmButton onConfirm={() => remove(p.id)}><Trash2 size={14} /></ConfirmButton>
          </div>
        ))}
      </div>
      {(adding || editing) && <PageForm page={editing} onCancel={() => { setAdding(false); setEditing(null); }} onSave={save} existingSlugs={pages.filter((p) => p.id !== editing?.id).map((p) => p.slug)} />}
    </div>
  );
}

function PageForm({ page, onCancel, onSave, existingSlugs }: { page: Page | null; onCancel: () => void; onSave: (d: Partial<Page>) => void; existingSlugs: string[] }) {
  const [form, setForm] = useState<Partial<Page>>(page || { title: '', slug: '', template: 'custom', is_visible: true, body_text: (page?.config as any)?.body_text || '' });
  const [slugError, setSlugError] = useState('');
  const genSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Initialize information config from existing page
  useEffect(() => {
    if (page?.template === 'information' && page.config && !form.config) {
      const cfg = page.config as InformationConfig;
      if (cfg.blocks) setForm((f) => ({ ...f, config: cfg }));
    }
  }, [page]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onCancel}>
      <div className={`admin-card w-full p-5 flex flex-col min-h-0 max-h-[90vh] overflow-hidden ${form.template === 'information' ? 'max-w-3xl' : 'max-w-md'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h3 className="font-semibold text-[#3a2e22]">{page ? 'Edit Section' : 'Add Section'}</h3>
          <button onClick={onCancel}><X size={18} className="text-[#8a7a66]" /></button>
        </div>
        <div className="space-y-3 overflow-y-auto thin-scroll pr-1 flex-1 min-h-0">
          <div><label className="admin-label">Section Title *</label><input className="admin-input" value={form.title || ''} onChange={(e) => { const t = e.target.value; setForm({ ...form, title: t, slug: form.slug || genSlug(t) }); }} /></div>
          <div>
            <label className="admin-label">URL Slug *</label>
            <input className="admin-input font-mono text-xs" value={form.slug || ''} onChange={(e) => { const s = genSlug(e.target.value); setSlugError(existingSlugs.includes(s) ? 'This slug is already in use' : ''); setForm({ ...form, slug: s }); }} />
            {slugError && <p className="text-xs text-[#b03a3a] mt-1">{slugError}</p>}
          </div>
          <div>
            <label className="admin-label">Template</label>
            <select className="admin-input" value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value as Page['template'] })}>
              {TEMPLATES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {form.template === 'custom' && (
            <div>
              <label className="admin-label">Body Content</label>
              <p className="text-xs text-[#8a7a66] mb-2">Format your content with bold, italic, underline, and alignment.</p>
              <RichTextEditor value={form.body_text || (form.config as any)?.body_text || ''} onChange={(html) => setForm({ ...form, body_text: html })} placeholder="Write your content here..." rows={6} />
            </div>
          )}
          {form.template === 'information' && (
            <InformationConfigEditor form={form} setForm={setForm} />
          )}
          <label className="flex items-center gap-2 text-sm text-[#5a4430]">
            <input type="checkbox" checked={form.is_visible ?? true} onChange={(e) => setForm({ ...form, is_visible: e.target.checked })} className="accent-[#8a6d3b]" />
            Visible on public site
          </label>
        </div>
        <div className="flex gap-2 mt-4 shrink-0">
          <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
          <button onClick={() => form.title?.trim() && form.slug?.trim() && !slugError && onSave(form)} disabled={!!slugError} className="btn-primary flex-1">Save</button>
        </div>
      </div>
    </div>
  );
}

// ===================== Story Milestones Tab =====================
function StoryTab() {
  const { settings, setSettings } = useSiteSettings();
  const [draft, setDraft] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (settings && !draft) setDraft(settings); }, [settings, draft]);

  const update = (patch: Partial<SiteSettings>) => { setDraft((d) => d ? { ...d, ...patch } : d); setSaved(false); };

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleHeroUpload = async (file: File) => {
    if (uploading) return;
    setUploading(true);
    setUploadProgress(0);
    const url = await uploadImage(file, 'hero', setUploadProgress);
    if (url) update({ hero_image_url: url });
    setUploading(false);
    setUploadProgress(0);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    await supabase.from('site_settings').update({
      partner1_name: draft.partner1_name, partner2_name: draft.partner2_name,
      wedding_date: draft.wedding_date, venue_line: draft.venue_line,
      story_title: draft.story_title, story_body: draft.story_body,
      hero_image_url: draft.hero_image_url,
      updated_at: new Date().toISOString(),
    }).eq('id', draft.id);
    setSettings(draft);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  if (!draft) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8a6d3b]" /></div>;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saved ? 'Saved!' : 'Save Story'}
        </button>
      </div>
      <Card>
        <h3 className="font-semibold text-[#3a2e22] mb-3">Our Story</h3>
        <div className="space-y-3">
          <div>
            <label className="admin-label">Story Title</label>
            <input className="admin-input" value={draft.story_title || ''} onChange={(e) => update({ story_title: e.target.value })} placeholder="Our Story" />
          </div>
          <div>
            <label className="admin-label">Story / Paragraph</label>
            <p className="text-xs text-[#8a7a66] mb-2">Write and format your story here.</p>
            <RichTextEditor value={draft.story_body || ''} onChange={(html) => update({ story_body: html })} placeholder="We met on a rainy afternoon in October..." rows={12} />
          </div>
        </div>
      </Card>
    </div>
  );
}

// ===================== Styling Tab =====================
function StylingTab() {
  const { settings, setSettings } = useSiteSettings();
  const [draft, setDraft] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const musicRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [musicUploading, setMusicUploading] = useState(false);
  const [musicProgress, setMusicProgress] = useState(0);

  useEffect(() => { if (settings && !draft) setDraft(settings); }, [settings, draft]);

  const update = (patch: Partial<SiteSettings>) => { setDraft((d) => d ? { ...d, ...patch } : d); setSaved(false); };
  const updateTypo = (key: string, patch: Partial<TypeStyle>) => {
    setDraft((d) => { if (!d) return d; const cur = d.typography?.[key] || {}; return { ...d, typography: { ...d.typography, [key]: { ...cur, ...patch } } }; });
    setSaved(false);
  };

  const handleHeroUpload = async (file: File) => {
    if (uploading) return;
    setUploading(true);
    setUploadProgress(0);
    const url = await uploadImage(file, 'hero', setUploadProgress);
    if (url) update({ hero_image_url: url });
    setUploading(false);
    setUploadProgress(0);
  };

  const handleMusicUpload = async (file: File) => {
    if (musicUploading) return;
    setMusicUploading(true);
    setMusicProgress(0);
    const url = await uploadImage(file, 'music', setMusicProgress);
    if (url) update({ music_url: url });
    setMusicUploading(false);
    setMusicProgress(0);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const { error } = await supabase.from('site_settings').update({
      partner1_name: draft.partner1_name, partner2_name: draft.partner2_name,
      wedding_date: draft.wedding_date, venue_line: draft.venue_line,
      story_title: draft.story_title, story_body: draft.story_body,
      hero_image_url: draft.hero_image_url,
      page_color: draft.page_color, bg_color: draft.bg_color,
      page_width: draft.page_width, heading_font: draft.heading_font, body_font: draft.body_font,
      typography: draft.typography, rsvp_intro: draft.rsvp_intro, rsvp_deadline: draft.rsvp_deadline,
      show_rsvp_button: draft.show_rsvp_button, show_rsvp_section: draft.show_rsvp_section,
      welcome_layout: draft.welcome_layout,
      cta_text: draft.cta_text, cta_bg_color: draft.cta_bg_color, cta_text_color: draft.cta_text_color,
      cta_radius: draft.cta_radius, cta_size: draft.cta_size,
      footer_monogram_url: draft.footer_monogram_url,
      footer_text: draft.footer_text, footer_bg_color: draft.footer_bg_color,
      hero_pretitle_text: draft.hero_pretitle_text, hero_married_text: draft.hero_married_text,
      music_url: draft.music_url, music_autoplay: draft.music_autoplay,
      petal_animation_enabled: draft.petal_animation_enabled, petal_color: draft.petal_color,
      petal_size: draft.petal_size, petal_count: draft.petal_count, petal_speed: draft.petal_speed,
      updated_at: new Date().toISOString(),
    }).eq('id', draft.id);
    if (!error) { setSettings(draft); applySettingsVars(draft); setSaved(true); }
    setSaving(false);
  };

  const resetTypo = (key: string) => {
    setDraft((d) => { if (!d) return d; const t = { ...d.typography }; delete t[key]; return { ...d, typography: t }; });
    setSaved(false);
  };

  if (!draft) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8a6d3b]" /></div>;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <Card>
        <h3 className="font-semibold text-[#3a2e22] mb-3">Welcome page style</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="admin-label">Partner 1</label><input className="admin-input" value={draft.partner1_name} onChange={(e) => update({ partner1_name: e.target.value })} /></div>
            <div><label className="admin-label">Partner 2</label><input className="admin-input" value={draft.partner2_name} onChange={(e) => update({ partner2_name: e.target.value })} /></div>
          </div>
          <div><label className="admin-label">Wedding Date &amp; Time</label><input type="datetime-local" className="admin-input" value={draft.wedding_date ? new Date(draft.wedding_date).toISOString().slice(0, 16) : ''} onChange={(e) => update({ wedding_date: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
          <div><label className="admin-label">Venue Line (hero)</label><input className="admin-input" value={draft.venue_line || ''} onChange={(e) => update({ venue_line: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="admin-label">Pre-title Text</label><input className="admin-input" value={draft.hero_pretitle_text ?? ''} onChange={(e) => update({ hero_pretitle_text: e.target.value || null })} placeholder="Together with their families" /><p className="text-xs text-[#8a7a66] mt-1">Leave blank for default</p></div>
            <div><label className="admin-label">"Married" Text</label><input className="admin-input" value={draft.hero_married_text ?? ''} onChange={(e) => update({ hero_married_text: e.target.value || null })} placeholder="ARE GETTING MARRIED" /><p className="text-xs text-[#8a7a66] mt-1">Leave blank for default</p></div>
          </div>
          <div>
            <label className="admin-label">Hero Photo</label>
            <div onClick={() => !uploading && fileRef.current?.click()} className={`rounded-lg border-2 border-dashed p-3 text-center transition ${uploading ? '' : 'cursor-pointer hover:border-[#8a6d3b]'}`} style={{ borderColor: '#d6cdbf', background: '#faf6ee' }}>
              {uploading ? <div className="flex items-center justify-center gap-2 text-sm text-[#8a7a66]"><Loader2 size={16} className="animate-spin" /> Uploading...</div>
                : draft.hero_image_url ? <div><img src={draft.hero_image_url} alt="" className="w-full max-h-28 object-cover rounded mb-1" /><p className="text-xs text-[#5a7a4a]">Click to replace</p></div>
                : <div><Upload size={18} className="mx-auto text-[#a07c4a] mb-1" /><p className="text-sm text-[#6b5d4f]">Click to upload hero photo</p></div>}
            </div>
            {uploading && <UploadProgress percent={uploadProgress} />}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleHeroUpload(f); e.target.value = ''; }} />
            {draft.hero_image_url && <button type="button" onClick={() => update({ hero_image_url: null })} className="text-xs text-[#b03a3a] mt-1">Remove photo</button>}
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Left column: global + welcome layout + CTA */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">RSVP &amp; Welcome</h3>
            <div className="space-y-3">
              <div><label className="admin-label">RSVP Intro Text</label><input className="admin-input" value={draft.rsvp_intro || ''} onChange={(e) => update({ rsvp_intro: e.target.value })} /></div>
              <div><label className="admin-label">RSVP Deadline</label><input type="datetime-local" className="admin-input" value={draft.rsvp_deadline ? new Date(draft.rsvp_deadline).toISOString().slice(0, 16) : ''} onChange={(e) => update({ rsvp_deadline: e.target.value ? new Date(e.target.value).toISOString() : null })} /><p className="text-xs text-[#8a7a66] mt-1">Shown to guests above the RSVP form. Once this deadline passes (in your selected timezone under Settings), RSVP submissions will be automatically closed.</p></div>
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-sm text-[#5a4430]"><input type="checkbox" checked={draft.show_rsvp_button !== false} onChange={(e) => update({ show_rsvp_button: e.target.checked })} className="accent-[#8a6d3b]" /> Show RSVP button on welcome page and navigation</label>
                <label className="flex items-center gap-2 text-sm text-[#5a4430]"><input type="checkbox" checked={draft.show_rsvp_section !== false} onChange={(e) => update({ show_rsvp_section: e.target.checked })} className="accent-[#8a6d3b]" /> Show RSVP section on welcome page</label>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">Background Music</h3>
            <p className="text-xs text-[#8a7a66] mb-3">Upload an audio file (MP3, WAV, etc.) to play in a loop when visitors open the public site or guest portal. A floating mute/unmute control appears at the bottom right.</p>
            <div onClick={() => !musicUploading && musicRef.current?.click()} className={`rounded-lg border-2 border-dashed p-3 flex items-center gap-3 transition ${musicUploading ? '' : 'cursor-pointer hover:border-[#8a6d3b]'}`} style={{ borderColor: '#d6cdbf', background: '#faf6ee' }}>
              {musicUploading ? <Loader2 size={20} className="animate-spin text-[#a07c4a]" /> : <Music size={20} className="text-[#c9b896]" />}
              <div className="text-sm text-[#6b5d4f]">
                {musicUploading ? 'Uploading...' : draft.music_url ? <span><span className="text-[#5a7a4a] font-medium">Music uploaded</span> — click to replace</span> : 'Click to upload background music'}
              </div>
              <input ref={musicRef} type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMusicUpload(f); e.target.value = ''; }} />
            </div>
            {musicUploading && <UploadProgress percent={musicProgress} />}
            {draft.music_url && (
              <div className="mt-3 space-y-2">
                <label className="flex items-center gap-2 text-sm text-[#5a4430]"><input type="checkbox" checked={draft.music_autoplay !== false} onChange={(e) => update({ music_autoplay: e.target.checked })} className="accent-[#8a6d3b]" /> Auto-play music when page loads</label>
                <button onClick={() => update({ music_url: null })} className="text-xs text-[#b03a3a] hover:underline">Remove music</button>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">Falling Petals / Leaves Animation</h3>
            <p className="text-xs text-[#8a7a66] mb-3">Add a romantic falling petals or leaves animation overlay on the public site and guest invitation pages.</p>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-[#5a4430]"><input type="checkbox" checked={draft.petal_animation_enabled || false} onChange={(e) => update({ petal_animation_enabled: e.target.checked })} className="accent-[#8a6d3b]" /> Enable falling petals animation</label>
              {draft.petal_animation_enabled && (
                <>
                  <div>
                    <label className="admin-label">Petal / Leaf Color</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={draft.petal_color || '#c9b896'} onChange={(e) => update({ petal_color: e.target.value })} className="w-10 h-9 rounded border border-[#d6cdbf] cursor-pointer" />
                      <input className="admin-input" value={draft.petal_color || ''} onChange={(e) => update({ petal_color: e.target.value })} placeholder="#c9b896" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between mb-1"><label className="admin-label !mb-0">Petal Size</label><span className="text-xs text-[#8a7a66]">{draft.petal_size ?? 18}px</span></div>
                      <input type="range" min={8} max={40} value={draft.petal_size ?? 18} onChange={(e) => update({ petal_size: parseInt(e.target.value) })} className="w-full" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1"><label className="admin-label !mb-0">Amount</label><span className="text-xs text-[#8a7a66]">{draft.petal_count ?? 15}</span></div>
                      <input type="range" min={5} max={40} value={draft.petal_count ?? 15} onChange={(e) => update({ petal_count: parseInt(e.target.value) })} className="w-full" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1"><label className="admin-label !mb-0">Falling Speed</label><span className="text-xs text-[#8a7a66]">{draft.petal_speed ?? 8}s</span></div>
                    <input type="range" min={3} max={20} value={draft.petal_speed ?? 8} onChange={(e) => update({ petal_speed: parseInt(e.target.value) })} className="w-full" />
                    <p className="text-xs text-[#8a7a66] mt-1">Lower = faster fall, higher = slower drift</p>
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">Welcome Section Layout</h3>
            <div className="grid grid-cols-2 gap-2">
              {WELCOME_LAYOUTS.map((l) => (
                <button key={l.value} onClick={() => update({ welcome_layout: l.value })}
                  className="text-left p-2.5 rounded-lg border text-xs transition"
                  style={{ borderColor: draft.welcome_layout === l.value ? '#8a6d3b' : '#e6ddcd', background: draft.welcome_layout === l.value ? '#faf6ee' : '#fff' }}>
                  <p className="font-semibold" style={{ color: draft.welcome_layout === l.value ? '#8a6d3b' : '#5a4430' }}>{l.label}</p>
                  <p className="text-[#8a7a66] mt-0.5">{l.hint}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-1">Page Border &amp; Background</h3>
            <p className="text-xs text-[#8a7a66] mb-3">Choose an elegant border and background style applied to every section of your public site and guest portal.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PAGE_BORDER_TEMPLATES.map((t) => (
                <button key={t.value} onClick={() => update({ typography: setBorderInTypography(draft.typography, t.value) })}
                  className="group text-left rounded-lg border overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
                  style={{ borderColor: (getBorderFromTypography(draft.typography) || 'plain') === t.value ? '#8a6d3b' : '#e6ddcd', boxShadow: (getBorderFromTypography(draft.typography) || 'plain') === t.value ? '0 0 0 2px rgba(138,109,59,0.14)' : undefined }}>
                  <div className="aspect-[4/3] flex items-center justify-center" style={{ background: t.preview.background, borderTop: t.preview.border, borderLeft: t.preview.border, borderRight: t.preview.border }}>
                    <div className="w-3/4 h-1/2 flex items-center justify-center" style={{ border: `1px solid ${t.preview.accent}`, borderRadius: t.preview.borderRadius }}>
                      <span className="text-[8px] uppercase tracking-[0.18em]" style={{ color: t.preview.accent }}>Names</span>
                    </div>
                  </div>
                  <div className="p-2" style={{ background: '#fff' }}>
                    <p className="font-semibold text-[11px]" style={{ color: (getBorderFromTypography(draft.typography) || 'plain') === t.value ? '#8a6d3b' : '#5a4430' }}>{t.label}</p>
                    <p className="text-[10px] text-[#8a7a66] mt-0.5 leading-snug">{t.hint}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">RSVP Button (CTA)</h3>
            <div className="space-y-3">
              <div><label className="admin-label">Button Text</label><input className="admin-input" value={draft.cta_text} onChange={(e) => update({ cta_text: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="admin-label">Background Color</label><div className="flex gap-2 items-center"><input type="color" value={draft.cta_bg_color} onChange={(e) => update({ cta_bg_color: e.target.value })} className="w-10 h-9 rounded border border-[#d6cdbf] cursor-pointer" /><input className="admin-input" value={draft.cta_bg_color} onChange={(e) => update({ cta_bg_color: e.target.value })} /></div></div>
                <div><label className="admin-label">Text Color</label><div className="flex gap-2 items-center"><input type="color" value={draft.cta_text_color} onChange={(e) => update({ cta_text_color: e.target.value })} className="w-10 h-9 rounded border border-[#d6cdbf] cursor-pointer" /><input className="admin-input" value={draft.cta_text_color} onChange={(e) => update({ cta_text_color: e.target.value })} /></div></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><div className="flex justify-between mb-1"><label className="admin-label !mb-0">Border Radius</label><span className="text-xs text-[#8a7a66]">{draft.cta_radius}px</span></div><input type="range" min={0} max={30} value={draft.cta_radius} onChange={(e) => update({ cta_radius: parseInt(e.target.value) })} className="w-full" /></div>
                <div><label className="admin-label">Size</label><select className="admin-input" value={draft.cta_size} onChange={(e) => update({ cta_size: e.target.value })}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></div>
              </div>
              <div className="text-center pt-2">
                <span className="inline-block font-semibold transition" style={{ background: draft.cta_bg_color, color: draft.cta_text_color, borderRadius: draft.cta_radius, padding: draft.cta_size === 'small' ? '7px 16px' : draft.cta_size === 'large' ? '12px 28px' : '9px 22px', fontSize: draft.cta_size === 'small' ? 13 : draft.cta_size === 'large' ? 16 : 14 }}>
                  {draft.cta_text}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column: colors, fonts, typography, footer */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">Colors &amp; Width</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="admin-label">Page Color (card)</label><div className="flex gap-2 items-center"><input type="color" value={draft.page_color} onChange={(e) => update({ page_color: e.target.value })} className="w-10 h-9 rounded border border-[#d6cdbf] cursor-pointer" /><input className="admin-input" value={draft.page_color} onChange={(e) => update({ page_color: e.target.value })} /></div></div>
                <div><label className="admin-label">Background Color</label><div className="flex gap-2 items-center"><input type="color" value={draft.bg_color} onChange={(e) => update({ bg_color: e.target.value })} className="w-10 h-9 rounded border border-[#d6cdbf] cursor-pointer" /><input className="admin-input" value={draft.bg_color} onChange={(e) => update({ bg_color: e.target.value })} /></div></div>
              </div>
              <div><div className="flex justify-between mb-1"><label className="admin-label !mb-0">Page Width</label><span className="text-xs text-[#8a7a66]">{draft.page_width}px</span></div><input type="range" min={320} max={1100} step={10} value={draft.page_width} onChange={(e) => update({ page_width: parseInt(e.target.value) })} className="w-full" /></div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">Default Fonts</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="admin-label">Heading Font</label><FontSelect value={draft.heading_font} onChange={(v) => update({ heading_font: v })} previewText={`${draft.partner1_name || 'Names'} & ${draft.partner2_name || ''}`} previewSize={22} /></div>
              <div><label className="admin-label">Body Font</label><FontSelect value={draft.body_font} onChange={(v) => update({ body_font: v })} previewText="The quick brown fox 123" previewSize={14} /></div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#3a2e22]">Granular Typography</h3>
              <span className="text-xs text-[#8a7a66]">Per element</span>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-auto thin-scroll pr-1">
              {TYPO_KEYS.map((t) => (
                <TypoRow key={t.key} label={t.label} style={draft.typography?.[t.key]} onChange={(p) => updateTypo(t.key, p)} onReset={() => resetTypo(t.key)} />
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">Footer Customization</h3>
            <div className="space-y-3">
              <div>
                <label className="admin-label">Footer Monogram Image</label>
                <FooterMonogramUpload url={draft.footer_monogram_url} onUpload={(url) => update({ footer_monogram_url: url })} onRemove={() => update({ footer_monogram_url: null })} />
              </div>
              <div><label className="admin-label">Footer Text</label><textarea className="admin-input" rows={2} value={draft.footer_text || ''} onChange={(e) => update({ footer_text: e.target.value })} placeholder="With love, {partner1} & {partner2} · Wedding 2025" /></div>
              <div><label className="admin-label">Footer Background Color</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={draft.footer_bg_color || 'transparent'} onChange={(e) => update({ footer_bg_color: e.target.value })} className="w-10 h-9 rounded border border-[#d6cdbf] cursor-pointer" />
                  <input className="admin-input" value={draft.footer_bg_color || 'transparent'} onChange={(e) => update({ footer_bg_color: e.target.value })} placeholder="transparent" />
                </div>
              </div>
            </div>
          </Card>


        </div>
      </div>
    </div>
  );
}

function FooterMonogramUpload({ url, onUpload, onRemove }: { url: string | null | undefined; onUpload: (url: string) => void; onRemove: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  const handle = async (file: File) => {
    if (uploading) return;
    setUploading(true);
    setProgress(0);
    const uploadFn = (await import('@/lib/upload')).uploadImage;
    const u = await uploadFn(file, 'monogram', setProgress);
    if (u) onUpload(u);
    setUploading(false);
    setProgress(0);
  };
  return (
    <div onClick={() => !uploading && ref.current?.click()} className={`rounded-lg border-2 border-dashed p-3 flex items-center gap-3 transition ${uploading ? '' : 'cursor-pointer hover:border-[#8a6d3b]'}`} style={{ borderColor: '#d6cdbf', background: '#faf6ee' }}>
      {uploading ? <Loader2 size={16} className="animate-spin text-[#a07c4a]" /> : url ? <img src={url} alt="Footer monogram" className="w-12 h-12 rounded-full object-cover" /> : <ImageIcon size={24} className="text-[#c9b896]" />}
      <div className="text-sm text-[#6b5d4f]">{uploading ? 'Uploading...' : url ? 'Click to replace footer monogram' : 'Upload footer monogram image'}</div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ''; }} />
      {uploading && <UploadProgress percent={progress} />}
      {url && !uploading && <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-xs text-[#b03a3a] hover:underline ml-2">Remove</button>}
    </div>
  );
}

function TypoRow({ label, style, onChange, onReset }: { label: string; style?: TypeStyle; onChange: (p: Partial<TypeStyle>) => void; onReset: () => void }) {
  const hasOverride = Boolean(style && Object.keys(style).length);
  return (
    <div className="rounded-lg border p-2.5" style={{ borderColor: hasOverride ? '#c9b896' : '#e6ddcd', background: hasOverride ? '#faf6ee' : '#fff' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[#5a4430]">{label}</span>
        {hasOverride && <button onClick={onReset} className="text-[#8a7a66] hover:text-[#b03a3a]"><RotateCcw size={12} /></button>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FontSelect value={style?.fontFamily || ''} onChange={(v) => onChange({ fontFamily: v || undefined })} previewText={label} previewSize={13} className="!py-1" />
        <div className="flex gap-1.5">
          <input type="number" className="admin-input !py-1.5 !text-xs w-16" placeholder="px" value={style?.fontSize ?? ''} onChange={(e) => onChange({ fontSize: e.target.value ? parseInt(e.target.value) : undefined })} />
          <select className="admin-input !py-1.5 !text-xs w-14" value={style?.fontWeight || ''} onChange={(e) => onChange({ fontWeight: e.target.value ? parseInt(e.target.value) : undefined })}>
            <option value="">W</option><option value="300">300</option><option value="400">400</option><option value="500">500</option><option value="600">600</option><option value="700">700</option>
          </select>
          <input type="color" value={style?.color || '#5a4430'} onChange={(e) => onChange({ color: e.target.value })} className="w-7 h-7 rounded border border-[#d6cdbf] cursor-pointer shrink-0" />
          <input type="text" value={style?.color || ''} onChange={(e) => onChange({ color: e.target.value || undefined })} placeholder="#5a4430" className="admin-input !py-1.5 !text-xs w-20" />
        </div>
      </div>
    </div>
  );
}

function InformationConfigEditor({ form, setForm }: { form: Partial<Page>; setForm: (f: Partial<Page>) => void }) {
  const cfg = (form.config as InformationConfig) || { title: form.title || 'Information', blocks: [] };
  const [uploading, setUploading] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const update = (patch: Partial<InformationConfig>) => {
    setForm({ ...form, config: { ...cfg, ...patch } });
  };

  const addBlock = () => {
    const newBlock: InformationBlock = { heading: '', subheading: '', body_html: '', photo_url: null };
    update({ blocks: [...cfg.blocks, newBlock] });
  };

  const updateBlock = (index: number, patch: Partial<InformationBlock>) => {
    const blocks = [...cfg.blocks];
    blocks[index] = { ...blocks[index], ...patch };
    update({ blocks });
  };

  const removeBlock = (index: number) => {
    update({ blocks: cfg.blocks.filter((_, i) => i !== index) });
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    const blocks = [...cfg.blocks];
    const swapIdx = index + dir;
    if (swapIdx < 0 || swapIdx >= blocks.length) return;
    [blocks[index], blocks[swapIdx]] = [blocks[swapIdx], blocks[index]];
    update({ blocks });
  };

  const uploadPhoto = async (index: number, file: File) => {
    if (uploading !== null) return;
    setUploading(index);
    setUploadProgress(0);
    const url = await uploadImage(file, 'pages', setUploadProgress);
    if (url) updateBlock(index, { photo_url: url });
    setUploading(null);
    setUploadProgress(0);
  };

  const uploadPhoto2 = async (index: number, file: File) => {
    if (uploading !== null) return;
    setUploading(index);
    setUploadProgress(0);
    const url = await uploadImage(file, 'pages', setUploadProgress);
    if (url) updateBlock(index, { photo2_url: url });
    setUploading(null);
    setUploadProgress(0);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="admin-label">Section Title</label>
        <input className="admin-input" value={cfg.title} onChange={(e) => update({ title: e.target.value })} placeholder="Information" />
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#5a4430]">Information Blocks</span>
          <button onClick={addBlock} className="text-xs font-medium flex items-center gap-1" style={{ color: '#8a6d3b' }}>
            <Plus size={12} /> Add Block
          </button>
        </div>
        <p className="text-xs text-[#8a7a66] mb-3">Each block has a main heading at the top, then one or two columns. Each column has its own sub-heading, body, and photo.</p>
        <div className="space-y-4">
          {cfg.blocks.map((block, i) => (
            <div key={i} className="rounded-lg overflow-hidden" style={{ border: '1px solid #d6cdbf' }}>
              {/* Main header bar — block number + controls */}
              <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#5a4430' }}>
                <span className="text-white font-bold text-sm shrink-0">Block {i + 1}</span>
                <div className="flex-1" />
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => moveBlock(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-white/15 disabled:opacity-30"><ChevronUp size={14} className="text-white" /></button>
                  <button onClick={() => moveBlock(i, 1)} disabled={i === cfg.blocks.length - 1} className="p-1 rounded hover:bg-white/15 disabled:opacity-30"><ChevronDown size={14} className="text-white" /></button>
                  <ConfirmButton onConfirm={() => removeBlock(i)}><Trash2 size={14} className="text-white/80 hover:text-white" /></ConfirmButton>
                </div>
              </div>
              {/* Main block heading + heading style */}
              <div className="p-3 space-y-2" style={{ background: '#f5efe3' }}>
                <div>
                  <label className="admin-label">Heading (rich text) — main block title</label>
                  <RichTextEditor value={block.heading} onChange={(html) => updateBlock(i, { heading: html })} placeholder="Main block heading..." rows={2} />
                </div>
                <div className="rounded border p-2" style={{ borderColor: '#e6ddcd', background: '#fffdf8' }}>
                  <p className="text-[10px] font-semibold text-[#5a4430] mb-1.5">Heading Style</p>
                  <div className="grid grid-cols-2 gap-2">
                    <FontSelect value={block.heading_font_family || 'inherit'} onChange={(f) => updateBlock(i, { heading_font_family: f })} previewText="Heading" previewSize={block.heading_font_size || 20} previewColor={block.heading_font_color} className="w-full" />
                    <div className="flex items-center gap-1.5">
                      <input type="number" min={10} max={48} className="admin-input text-xs w-16" value={block.heading_font_size || 20} onChange={(e) => updateBlock(i, { heading_font_size: parseInt(e.target.value) || 20 })} title="Font size" />
                      <input type="color" value={block.heading_font_color || '#5a4430'} onChange={(e) => updateBlock(i, { heading_font_color: e.target.value })} className="w-7 h-7 rounded border cursor-pointer" style={{ borderColor: '#d6cdbf' }} />
                      <input type="text" value={block.heading_font_color || ''} onChange={(e) => updateBlock(i, { heading_font_color: e.target.value })} placeholder="#5a4430" className="admin-input text-xs flex-1" />
                    </div>
                  </div>
                </div>
                {/* Column toggle */}
                <div className="flex items-center gap-2 pt-1">
                  <label className="admin-label !mb-0">Columns</label>
                  <button onClick={() => updateBlock(i, { columns: 1 })} className={`text-xs px-2.5 py-1 rounded ${block.columns !== 2 ? 'bg-[#8a6d3b] text-white' : 'bg-[#f0e8d8] text-[#8a6d3b]'}`}>1 Column</button>
                  <button onClick={() => updateBlock(i, { columns: 2 })} className={`text-xs px-2.5 py-1 rounded ${block.columns === 2 ? 'bg-[#8a6d3b] text-white' : 'bg-[#f0e8d8] text-[#8a6d3b]'}`}>2 Columns</button>
                </div>
              </div>
              {/* Columns grid */}
              <div className="p-3 pt-0" style={{ background: '#faf6ee' }}>
                <div className={`grid gap-3 ${block.columns === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                  {/* Column 1 */}
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #e6ddcd' }}>
                    {/* Sub-header bar */}
                    <div className="px-3 py-2 flex items-center gap-2" style={{ background: '#8a6d3b' }}>
                      <span className="text-white text-xs font-semibold">Column 1</span>
                    </div>
                    <div className="p-3 space-y-2">
                      <div>
                        <label className="admin-label">Sub-heading (rich text)</label>
                        <RichTextEditor value={block.subheading || ''} onChange={(html) => updateBlock(i, { subheading: html })} placeholder="Column sub-heading..." rows={2} />
                      </div>
                      <div className="rounded border p-2" style={{ borderColor: '#f0e8d8', background: '#fffdf8' }}>
                        <p className="text-[10px] font-semibold text-[#5a4430] mb-1.5">Sub-heading Style</p>
                        <div className="grid grid-cols-2 gap-2">
                          <FontSelect value={block.subheading_font_family || 'inherit'} onChange={(f) => updateBlock(i, { subheading_font_family: f })} previewText="Sub-heading" previewSize={block.subheading_font_size || 14} previewColor={block.subheading_font_color} className="w-full" />
                          <div className="flex items-center gap-1.5">
                            <input type="number" min={10} max={32} className="admin-input text-xs w-16" value={block.subheading_font_size || 14} onChange={(e) => updateBlock(i, { subheading_font_size: parseInt(e.target.value) || 14 })} title="Font size" />
                            <input type="color" value={block.subheading_font_color || '#a0927e'} onChange={(e) => updateBlock(i, { subheading_font_color: e.target.value })} className="w-7 h-7 rounded border cursor-pointer" style={{ borderColor: '#d6cdbf' }} />
                            <input type="text" value={block.subheading_font_color || ''} onChange={(e) => updateBlock(i, { subheading_font_color: e.target.value })} placeholder="#a0927e" className="admin-input text-xs flex-1" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="admin-label">Body (rich text)</label>
                        <RichTextEditor value={block.body_html} onChange={(html) => updateBlock(i, { body_html: html })} placeholder="Write your content here..." rows={5} />
                      </div>
                      <div className="rounded border p-2" style={{ borderColor: '#f0e8d8', background: '#fffdf8' }}>
                        <p className="text-[10px] font-semibold text-[#5a4430] mb-1.5">Body Style</p>
                        <div className="grid grid-cols-2 gap-2">
                          <FontSelect value={block.body_font_family || 'inherit'} onChange={(f) => updateBlock(i, { body_font_family: f })} previewText="Body text" previewSize={block.body_font_size || 14} previewColor={block.body_font_color} className="w-full" />
                          <div className="flex items-center gap-1.5">
                            <input type="number" min={10} max={32} className="admin-input text-xs w-16" value={block.body_font_size || 14} onChange={(e) => updateBlock(i, { body_font_size: parseInt(e.target.value) || 14 })} title="Font size" />
                            <input type="color" value={block.body_font_color || '#6b5d4f'} onChange={(e) => updateBlock(i, { body_font_color: e.target.value })} className="w-7 h-7 rounded border cursor-pointer" style={{ borderColor: '#d6cdbf' }} />
                            <input type="text" value={block.body_font_color || ''} onChange={(e) => updateBlock(i, { body_font_color: e.target.value })} placeholder="#6b5d4f" className="admin-input text-xs flex-1" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="admin-label">Photo (below body)</label>
                        <div className="flex items-center gap-2">
                          <label className={`flex items-center gap-2 text-xs text-[#8a6d3b] ${uploading === i ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:text-[#5a4430]'}`}>
                            {uploading === i ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            {block.photo_url ? 'Replace photo' : 'Upload photo'}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(i, f); e.target.value = ''; }} />
                          </label>
                          {uploading === i && <UploadProgress percent={uploadProgress} />}
                          {block.photo_url && uploading !== i && (
                            <button onClick={() => updateBlock(i, { photo_url: null })} className="text-xs text-[#b03a3a] hover:underline">Remove</button>
                          )}
                        </div>
                        {block.photo_url && <img src={block.photo_url} alt="" className="w-full max-h-32 object-cover rounded-lg mt-2" />}
                      </div>
                    </div>
                  </div>
                  {/* Column 2 */}
                  {block.columns === 2 && (
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #e6ddcd' }}>
                    {/* Sub-header bar */}
                    <div className="px-3 py-2 flex items-center gap-2" style={{ background: '#8a6d3b' }}>
                      <span className="text-white text-xs font-semibold">Column 2</span>
                    </div>
                    <div className="p-3 space-y-2">
                      <div>
                        <label className="admin-label">Sub-heading 2 (rich text)</label>
                        <RichTextEditor value={block.subheading2 || ''} onChange={(html) => updateBlock(i, { subheading2: html })} placeholder="Column 2 sub-heading..." rows={2} />
                      </div>
                      <div className="rounded border p-2" style={{ borderColor: '#f0e8d8', background: '#fffdf8' }}>
                        <p className="text-[10px] font-semibold text-[#5a4430] mb-1.5">Sub-heading 2 Style</p>
                        <div className="grid grid-cols-2 gap-2">
                          <FontSelect value={block.subheading2_font_family || 'inherit'} onChange={(f) => updateBlock(i, { subheading2_font_family: f })} previewText="Sub-heading" previewSize={block.subheading2_font_size || 14} previewColor={block.subheading2_font_color} className="w-full" />
                          <div className="flex items-center gap-1.5">
                            <input type="number" min={10} max={32} className="admin-input text-xs w-16" value={block.subheading2_font_size || 14} onChange={(e) => updateBlock(i, { subheading2_font_size: parseInt(e.target.value) || 14 })} title="Font size" />
                            <input type="color" value={block.subheading2_font_color || '#a0927e'} onChange={(e) => updateBlock(i, { subheading2_font_color: e.target.value })} className="w-7 h-7 rounded border cursor-pointer" style={{ borderColor: '#d6cdbf' }} />
                            <input type="text" value={block.subheading2_font_color || ''} onChange={(e) => updateBlock(i, { subheading2_font_color: e.target.value })} placeholder="#a0927e" className="admin-input text-xs flex-1" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="admin-label">Body 2 (rich text)</label>
                        <RichTextEditor value={block.body2_html || ''} onChange={(html) => updateBlock(i, { body2_html: html })} placeholder="Write your content here..." rows={5} />
                      </div>
                      <div className="rounded border p-2" style={{ borderColor: '#f0e8d8', background: '#fffdf8' }}>
                        <p className="text-[10px] font-semibold text-[#5a4430] mb-1.5">Body 2 Style</p>
                        <div className="grid grid-cols-2 gap-2">
                          <FontSelect value={block.body2_font_family || 'inherit'} onChange={(f) => updateBlock(i, { body2_font_family: f })} previewText="Body text" previewSize={block.body2_font_size || 14} previewColor={block.body2_font_color} className="w-full" />
                          <div className="flex items-center gap-1.5">
                            <input type="number" min={10} max={32} className="admin-input text-xs w-16" value={block.body2_font_size || 14} onChange={(e) => updateBlock(i, { body2_font_size: parseInt(e.target.value) || 14 })} title="Font size" />
                            <input type="color" value={block.body2_font_color || '#6b5d4f'} onChange={(e) => updateBlock(i, { body2_font_color: e.target.value })} className="w-7 h-7 rounded border cursor-pointer" style={{ borderColor: '#d6cdbf' }} />
                            <input type="text" value={block.body2_font_color || ''} onChange={(e) => updateBlock(i, { body2_font_color: e.target.value })} placeholder="#6b5d4f" className="admin-input text-xs flex-1" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="admin-label">Photo 2 (below body)</label>
                        <div className="flex items-center gap-2">
                          <label className={`flex items-center gap-2 text-xs text-[#8a6d3b] ${uploading === i ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:text-[#5a4430]'}`}>
                            {uploading === i ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            {block.photo2_url ? 'Replace photo' : 'Upload photo'}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto2(i, f); e.target.value = ''; }} />
                          </label>
                          {uploading === i && <UploadProgress percent={uploadProgress} />}
                          {block.photo2_url && uploading !== i && (
                            <button onClick={() => updateBlock(i, { photo2_url: null })} className="text-xs text-[#b03a3a] hover:underline">Remove</button>
                          )}
                        </div>
                        {block.photo2_url && <img src={block.photo2_url} alt="" className="w-full max-h-32 object-cover rounded-lg mt-2" />}
                      </div>
                    </div>
                  </div>
                  )}
                </div>
                {/* Guest tags */}
                <div className="mt-3">
                  <label className="admin-label">Guest Tags (visibility)</label>
                  <p className="text-[10px] text-[#8a7a66] mb-1.5">Only show this block to guests with these tags. Leave empty to show to everyone.</p>
                  <TagInput
                    tags={block.tags || []}
                    onAdd={(t) => updateBlock(i, { tags: [...(block.tags || []), t] })}
                    onRemove={(t) => updateBlock(i, { tags: (block.tags || []).filter((x) => x !== t) })}
                    input=""
                    setInput={() => {}}
                    placeholder="VIP, Family..."
                    size="sm"
                  />
                </div>
              </div>
            </div>
          ))}
          {cfg.blocks.length === 0 && (
            <p className="text-xs text-center text-[#a0927e] py-4">No blocks yet. Click "Add Block" to create your first one.</p>
          )}
        </div>
      </div>
    </div>
  );
}
