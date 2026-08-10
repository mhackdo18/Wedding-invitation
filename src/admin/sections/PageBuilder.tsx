import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useSiteSettings, applySettingsVars } from '@/lib/useSiteSettings';
import { FONT_OPTIONS, stackFor } from '@/lib/fonts';
import { uploadImage } from '@/lib/upload';
import { SectionHeader, Card, ConfirmButton, EmptyState } from '../ui';
import type { SiteSettings, TypeStyle, Page, StoryMilestone } from '@/types';
import { Save, Loader2, RotateCcw, Plus, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, FileText, X, Upload, ImageIcon, Image } from 'lucide-react';
import { FontSelect } from '@/components/admin/FontSelect';

const TYPO_KEYS = [
  { key: 'heroPretitle', label: 'Hero Pre-title' },
  { key: 'heroTitle', label: 'Hero Names (Title)' },
  { key: 'heroDate', label: 'Hero Date' },
  { key: 'heroVenue', label: 'Hero Venue' },
  { key: 'storyTitle', label: 'Story Title' },
  { key: 'storyBody', label: 'Story Body' },
  { key: 'scheduleTitle', label: 'Schedule Heading' },
  { key: 'eventName', label: 'Event Name' },
  { key: 'eventTime', label: 'Event Time' },
  { key: 'subEventName', label: 'Sub-Event Name' },
  { key: 'galleryTitle', label: 'Gallery Heading' },
  { key: 'rsvpTitle', label: 'RSVP Heading' },
  { key: 'footer', label: 'Footer Text' },
];

const TEMPLATES = [
  { value: 'welcome', label: 'Welcome' },
  { value: 'story', label: 'Our Story' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'venue', label: 'Venues' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'entourage', label: 'Entourage' },
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
];

const SEAL_STYLES = [
  { value: 'monogram', label: 'Monogram (&)' },
  { value: 'heart', label: 'Heart' },
  { value: 'star', label: 'Star' },
  { value: 'none', label: 'None' },
];

const LINER_PATTERNS = [
  { value: 'solid', label: 'Solid' },
  { value: 'stripes', label: 'Diagonal Stripes' },
  { value: 'dots', label: 'Dots' },
];

const LETTER_FONTS = [
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond (serif)' },
  { value: 'Playfair Display', label: 'Playfair Display (serif)' },
  { value: 'Great Vibes', label: 'Great Vibes (script)' },
  { value: 'Lora', label: 'Lora (serif)' },
  { value: 'Inter', label: 'Inter (sans-serif)' },
];

const ALL_FONTS = [...LETTER_FONTS, { value: 'Montserrat', label: 'Montserrat (sans-serif)' }, { value: 'Dancing Script', label: 'Dancing Script (script)' }, { value: 'EB Garamond', label: 'EB Garamond (serif)' }, { value: 'Raleway', label: 'Raleway (sans-serif)' }];

const MERGE_TAGS = ['{{guest_name}}', '{{party_name}}', '{{partner1_name}}', '{{partner2_name}}'];

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
            {t === 'pages' ? 'Page & Section Management' : t === 'story' ? 'Our Story' : 'Per-Section Styling'}
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

  const [heroUploading, setHeroUploading] = useState<string | null>(null);

  const uploadPageHero = async (pageId: string, file: File) => {
    setHeroUploading(pageId);
    const url = await uploadImage(file, 'pages');
    if (url) { await supabase.from('pages').update({ hero_image_url: url }).eq('id', pageId); load(); }
    setHeroUploading(null);
  };

  const save = async (data: Partial<Page>) => {
    if (editing) {
      await supabase.from('pages').update({ title: data.title, slug: data.slug, template: data.template, is_visible: data.is_visible }).eq('id', editing.id);
    } else {
      await supabase.from('pages').insert({ title: data.title, slug: data.slug, template: data.template, is_visible: data.is_visible ?? true, display_order: pages.length });
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
        {pages.sort((a, b) => a.display_order - b.display_order).map((p, i, arr) => (
          <div key={p.id} className="admin-card p-3 flex items-center gap-3">
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
            <label title="Upload hero photo" className="cursor-pointer text-[#8a7a66] hover:text-[#5a4430]">
              {heroUploading === p.id ? <Loader2 size={14} className="animate-spin" /> : p.hero_image_url ? <img src={p.hero_image_url} alt="" className="w-6 h-6 rounded object-cover" /> : <Image size={14} />}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPageHero(p.id, f); }} />
            </label>
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
  const [form, setForm] = useState<Partial<Page>>(page || { title: '', slug: '', template: 'custom', is_visible: true });
  const [slugError, setSlugError] = useState('');
  const genSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onCancel}>
      <div className="admin-card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#3a2e22]">{page ? 'Edit Section' : 'Add Section'}</h3>
          <button onClick={onCancel}><X size={18} className="text-[#8a7a66]" /></button>
        </div>
        <div className="space-y-3">
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
          <label className="flex items-center gap-2 text-sm text-[#5a4430]">
            <input type="checkbox" checked={form.is_visible ?? true} onChange={(e) => setForm({ ...form, is_visible: e.target.checked })} className="accent-[#8a6d3b]" />
            Visible on public site
          </label>
        </div>
        <div className="flex gap-2 mt-4">
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

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    await supabase.from('site_settings').update({
      story_title: draft.story_title, story_body: draft.story_body,
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
            <p className="text-xs text-[#8a7a66] mb-2">Write your story here. Line breaks are preserved.</p>
            <textarea className="admin-input" rows={12} value={draft.story_body || ''} onChange={(e) => update({ story_body: e.target.value })}
              placeholder="We met on a rainy afternoon in October..." style={{ lineHeight: 1.7 }} />
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
  const monogramRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [monogramUploading, setMonogramUploading] = useState(false);

  useEffect(() => { if (settings && !draft) setDraft(settings); }, [settings, draft]);

  const update = (patch: Partial<SiteSettings>) => { setDraft((d) => d ? { ...d, ...patch } : d); setSaved(false); };
  const updateTypo = (key: string, patch: Partial<TypeStyle>) => {
    setDraft((d) => { if (!d) return d; const cur = d.typography?.[key] || {}; return { ...d, typography: { ...d.typography, [key]: { ...cur, ...patch } } }; });
    setSaved(false);
  };

  const handleHeroUpload = async (file: File) => {
    setUploading(true);
    const url = await uploadImage(file, 'hero');
    if (url) update({ hero_image_url: url });
    setUploading(false);
  };

  const handleMonogramUpload = async (file: File) => {
    setMonogramUploading(true);
    const url = await uploadImage(file, 'monogram');
    if (url) update({ monogram_url: url });
    setMonogramUploading(false);
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
      typography: draft.typography, rsvp_intro: draft.rsvp_intro,
      welcome_layout: draft.welcome_layout,
      cta_text: draft.cta_text, cta_bg_color: draft.cta_bg_color, cta_text_color: draft.cta_text_color,
      cta_radius: draft.cta_radius, cta_size: draft.cta_size,
      env_color: draft.env_color, env_liner_color: draft.env_liner_color,
      seal_color: draft.seal_color, seal_style: draft.seal_style,
      env_greeting: draft.env_greeting, env_button_text: draft.env_button_text,
      monogram_url: draft.monogram_url, letter_body: draft.letter_body,
      letter_font: draft.letter_font, env_liner_pattern: draft.env_liner_pattern,
      env_cta_type: draft.env_cta_type, env_cta_link: draft.env_cta_link,
      env_font_color: draft.env_font_color,
      footer_monogram_url: draft.footer_monogram_url,
      footer_text: draft.footer_text, footer_bg_color: draft.footer_bg_color,
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

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Left column: global + welcome layout + CTA + envelope */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">Couple &amp; Story</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="admin-label">Partner 1</label><input className="admin-input" value={draft.partner1_name} onChange={(e) => update({ partner1_name: e.target.value })} /></div>
                <div><label className="admin-label">Partner 2</label><input className="admin-input" value={draft.partner2_name} onChange={(e) => update({ partner2_name: e.target.value })} /></div>
              </div>
              <div><label className="admin-label">Wedding Date &amp; Time</label><input type="datetime-local" className="admin-input" value={draft.wedding_date ? new Date(draft.wedding_date).toISOString().slice(0, 16) : ''} onChange={(e) => update({ wedding_date: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
              <div><label className="admin-label">Venue Line (hero)</label><input className="admin-input" value={draft.venue_line || ''} onChange={(e) => update({ venue_line: e.target.value })} /></div>
              <div>
                <label className="admin-label">Hero Photo</label>
                <div onClick={() => fileRef.current?.click()} className="rounded-lg border-2 border-dashed p-3 text-center cursor-pointer transition hover:border-[#8a6d3b]" style={{ borderColor: '#d6cdbf', background: '#faf6ee' }}>
                  {uploading ? <div className="flex items-center justify-center gap-2 text-sm text-[#8a7a66]"><Loader2 size={16} className="animate-spin" /> Uploading...</div>
                    : draft.hero_image_url ? <div><img src={draft.hero_image_url} alt="" className="w-full max-h-28 object-cover rounded mb-1" /><p className="text-xs text-[#5a7a4a]">Click to replace</p></div>
                    : <div><Upload size={18} className="mx-auto text-[#a07c4a] mb-1" /><p className="text-sm text-[#6b5d4f]">Click to upload hero photo</p></div>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleHeroUpload(f); }} />
              </div>
              <div><label className="admin-label">Story Title</label><input className="admin-input" value={draft.story_title || ''} onChange={(e) => update({ story_title: e.target.value })} /></div>
              <div><label className="admin-label">Story Body</label><textarea className="admin-input" rows={2} value={draft.story_body || ''} onChange={(e) => update({ story_body: e.target.value })} /></div>
              <div><label className="admin-label">RSVP Intro Text</label><input className="admin-input" value={draft.rsvp_intro || ''} onChange={(e) => update({ rsvp_intro: e.target.value })} /></div>
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

        {/* Right column: colors, fonts, typography, envelope */}
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
            <h3 className="font-semibold text-[#3a2e22] mb-3">Invitation envelop waxsea</h3>
            <div className="space-y-3">
              <div><label className="admin-label">Greeting Text (shown before opening)</label><textarea className="admin-input" rows={2} value={draft.env_greeting || ''} onChange={(e) => update({ env_greeting: e.target.value })} /></div>
              <div><label className="admin-label">Open Button Text</label><input className="admin-input" value={draft.env_button_text} onChange={(e) => update({ env_button_text: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="admin-label">Envelope Color</label><div className="flex gap-2 items-center"><input type="color" value={draft.env_color} onChange={(e) => update({ env_color: e.target.value })} className="w-10 h-9 rounded border border-[#d6cdbf] cursor-pointer" /><span className="text-xs text-[#8a7a66]">{draft.env_color}</span></div></div>
                <div><label className="admin-label">Liner Color</label><div className="flex gap-2 items-center"><input type="color" value={draft.env_liner_color} onChange={(e) => update({ env_liner_color: e.target.value })} className="w-10 h-9 rounded border border-[#d6cdbf] cursor-pointer" /></div></div>
              </div>
              <div><label className="admin-label">Liner Pattern</label><select className="admin-input" value={draft.env_liner_pattern} onChange={(e) => update({ env_liner_pattern: e.target.value })}>{LINER_PATTERNS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="admin-label">Wax Seal Color</label><div className="flex gap-2 items-center"><input type="color" value={draft.seal_color} onChange={(e) => update({ seal_color: e.target.value })} className="w-10 h-9 rounded border border-[#d6cdbf] cursor-pointer" /></div></div>
                <div><label className="admin-label">Seal Style</label><select className="admin-input" value={draft.seal_style} onChange={(e) => update({ seal_style: e.target.value })}>{SEAL_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
              </div>
              <div>
                <label className="admin-label">Monogram Image (wax seal)</label>
                <div onClick={() => monogramRef.current?.click()} className="rounded-lg border-2 border-dashed p-3 text-center cursor-pointer transition hover:border-[#8a6d3b]" style={{ borderColor: '#d6cdbf', background: '#faf6ee' }}>
                  {monogramUploading ? <div className="flex items-center justify-center gap-2 text-sm text-[#8a7a66]"><Loader2 size={16} className="animate-spin" /> Uploading...</div>
                    : draft.monogram_url ? <div className="flex items-center justify-center gap-2"><img src={draft.monogram_url} alt="Monogram" className="w-12 h-12 rounded-full object-cover" /><p className="text-xs text-[#5a7a4a]">Click to replace</p></div>
                    : <div><Upload size={18} className="mx-auto text-[#a07c4a] mb-1" /><p className="text-sm text-[#6b5d4f]">Upload monogram for wax seal</p></div>}
                </div>
                <input ref={monogramRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMonogramUpload(f); }} />
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">Letter Body</h3>
            <div className="space-y-3">
              <div>
                <label className="admin-label">Letter Font</label>
                <FontSelect value={draft.letter_font} onChange={(v) => update({ letter_font: v })} previewText="Aa Bb Cc — Dear Guest" previewSize={16} previewColor={draft.env_font_color || '#5a4430'} />
              </div>
              <div>
                <label className="admin-label">Letter Text Color</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={draft.env_font_color || '#5a4430'} onChange={(e) => update({ env_font_color: e.target.value })} className="w-10 h-9 rounded border border-[#d6cdbf] cursor-pointer" />
                  <input className="admin-input" value={draft.env_font_color || '#5a4430'} onChange={(e) => update({ env_font_color: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="admin-label">Letter Text</label>
                <textarea className="admin-input" rows={5} value={draft.letter_body || ''} onChange={(e) => update({ letter_body: e.target.value })} />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {MERGE_TAGS.map((tag) => (
                    <button key={tag} onClick={() => update({ letter_body: (draft.letter_body || '') + ' ' + tag })} className="px-2 py-0.5 rounded-full text-[10px] font-mono" style={{ background: '#f0e8d8', color: '#8a6d3b' }}>{tag}</button>
                  ))}
                </div>
                <p className="text-xs text-[#8a7a66] mt-1">Click a tag to insert it. Tags are replaced with guest data when the envelope opens.</p>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: '#e6ddcd', background: '#fffef8' }}>
                <p className="text-xs font-semibold text-[#8a7a66] mb-1">Preview (with sample data):</p>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 14, color: '#5a4430', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{(draft.letter_body || '').replace(/\{\{guest_name\}\}/g, 'Jane Smith').replace(/\{\{party_name\}\}/g, 'The Smith Family').replace(/\{\{partner1_name\}\}/g, draft.partner1_name).replace(/\{\{partner2_name\}\}/g, draft.partner2_name)}</p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">Footer Customization</h3>
            <div className="space-y-3">
              <div>
                <label className="admin-label">Footer Monogram Image</label>
                <FooterMonogramUpload url={draft.footer_monogram_url} onUpload={(url) => update({ footer_monogram_url: url })} />
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

          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">Continue Button Action</h3>
            <p className="text-xs text-[#8a7a66] mb-3">The button text is set in the Invitation envelop waxsea section above.</p>
            <div className="space-y-3">
              <div><label className="admin-label">Link Type</label>
                <select className="admin-input" value={draft.env_cta_type} onChange={(e) => update({ env_cta_type: e.target.value as 'internal' | 'external' })}>
                  <option value="internal">Internal (scroll to invitation)</option>
                  <option value="external">External URL</option>
                </select>
              </div>
              {draft.env_cta_type === 'external' && (
                <div><label className="admin-label">External URL</label><input className="admin-input" value={draft.env_cta_link || ''} onChange={(e) => update({ env_cta_link: e.target.value })} placeholder="https://..." /></div>
              )}
              <p className="text-xs text-[#8a7a66]">The envelope will not auto-redirect. Guests must click this button to continue.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FooterMonogramUpload({ url, onUpload }: { url: string | null | undefined; onUpload: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const handle = async (file: File) => {
    setUploading(true);
    const uploadFn = (await import('@/lib/upload')).uploadImage;
    const u = await uploadFn(file, 'monogram');
    if (u) onUpload(u);
    setUploading(false);
  };
  return (
    <div onClick={() => ref.current?.click()} className="rounded-lg border-2 border-dashed p-3 flex items-center gap-3 cursor-pointer transition hover:border-[#8a6d3b]" style={{ borderColor: '#d6cdbf', background: '#faf6ee' }}>
      {uploading ? <Loader2 size={16} className="animate-spin text-[#a07c4a]" /> : url ? <img src={url} alt="Footer monogram" className="w-12 h-12 rounded-full object-cover" /> : <ImageIcon size={24} className="text-[#c9b896]" />}
      <div className="text-sm text-[#6b5d4f]">{url ? 'Click to replace footer monogram' : 'Upload footer monogram image'}</div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }} />
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
        </div>
      </div>
    </div>
  );
}
