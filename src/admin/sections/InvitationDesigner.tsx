import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSiteSettings } from '@/lib/useSiteSettings';
import { SectionHeader, Card } from '../ui';
import { FontSelect } from '@/components/admin/FontSelect';
import type { SiteSettings, InvitationButton, EmailSettings as EmailCfg, Guest, EmailAttachment } from '@/types';
import { uploadImage } from '@/lib/upload';
import { stackFor } from '@/lib/fonts';
import {
  Save, Eye, Loader2, Plus, Trash2, Mail, FileText, Send, Check, X,
  Upload, GripVertical, ChevronUp, ChevronDown, FlaskConical, Search,
  ExternalLink, Copy, CheckCheck,
  Image as ImageIcon, Link as LinkIcon,
} from 'lucide-react';
import EnvelopePreview from '@/components/public/EnvelopePreview';
import RichTextEditor from '@/components/admin/RichTextEditor';

const LINK_TYPES = [
  { value: 'rsvp', label: 'RSVP' },
  { value: 'find_table', label: 'Find My Table' },
  { value: 'welcome', label: 'Welcome Page' },
  { value: 'page', label: 'Site Page' },
  { value: 'external', label: 'External URL' },
];
type Tab = 'envelope' | 'letter' | 'email' | 'generate' | 'send';

export default function InvitationDesigner() {
  const { settings, setSettings } = useSiteSettings();
  const [draft, setDraft] = useState<SiteSettings | null>(null);
  const [emailCfg, setEmailCfg] = useState<EmailCfg | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<Tab>('envelope');
  const [preview, setPreview] = useState(false);
  const [uploadingPaperBg, setUploadingPaperBg] = useState(false);
  const [uploadingMonogram, setUploadingMonogram] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingAttach, setUploadingAttach] = useState(false);
  const paperBgRef = useRef<HTMLInputElement>(null);
  const monogramRef = useRef<HTMLInputElement>(null);
  const legacyMonogramRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const attachRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings && !draft) setDraft({ ...settings });
    (async () => {
      const [{ data: e }, { data: g }] = await Promise.all([
        supabase.from('email_settings').select('*').order('created_at').limit(1).maybeSingle(),
        supabase.from('guests').select('*').order('name'),
      ]);
      setEmailCfg(e as EmailCfg | null);
      setGuests(g as Guest[] || []);
    })();
  }, [settings, draft]);

  if (!draft) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8a6d3b]" /></div>;

  const upd = (patch: Partial<SiteSettings>) => { setDraft((d) => d ? { ...d, ...patch } : d); setSaved(false); };
  const updEmail = (patch: Partial<EmailCfg>) => { setEmailCfg((c) => c ? { ...c, ...patch } : c); setSaved(false); };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const updates: Record<string, unknown> = {
      invitation_envelope_color: draft.invitation_envelope_color,
      invitation_wax_seal_color: draft.invitation_wax_seal_color,
      invitation_wax_seal_image_url: draft.invitation_wax_seal_image_url,
      invitation_flap_show_name: draft.invitation_flap_show_name,
      invitation_flap_name_text: draft.invitation_flap_name_text,
      invitation_flap_name_color: draft.invitation_flap_name_color,
      invitation_flap_name_font: draft.invitation_flap_name_font,
      invitation_paper_background_color: draft.invitation_paper_background_color,
      invitation_paper_text_color: draft.invitation_paper_text_color,
      invitation_paper_border_color: draft.invitation_paper_border_color,
      invitation_paper_image_url: draft.invitation_paper_image_url,
      invitation_paper_heading_font: draft.invitation_paper_heading_font,
      invitation_paper_heading_color: draft.invitation_paper_heading_color,
      invitation_paper_show_names: draft.invitation_paper_show_names,
      invitation_paper_body_font: draft.invitation_paper_body_font,
      invitation_paper_body: draft.invitation_paper_body,
      invitation_paper_buttons: draft.invitation_paper_buttons,
      env_greeting: draft.env_greeting,
      env_button_text: draft.env_button_text,
      env_cta_type: draft.env_cta_type,
      env_cta_link: draft.env_cta_link,
      env_font_color: draft.env_font_color,
      letter_font: draft.letter_font,
      letter_body: draft.letter_body,
      env_liner_color: draft.env_liner_color,
      env_liner_pattern: draft.env_liner_pattern,
      seal_style: draft.seal_style,
      monogram_url: draft.monogram_url,
      updated_at: new Date().toISOString(),
    };
    await supabase.from('site_settings').update(updates).eq('id', draft.id);
    if (emailCfg) {
      await supabase.from('email_settings').update({
        provider: emailCfg.provider, smtp_host: emailCfg.smtp_host, smtp_port: emailCfg.smtp_port,
        smtp_user: emailCfg.smtp_user, smtp_pass: emailCfg.smtp_pass, from_email: emailCfg.from_email,
        from_name: emailCfg.from_name, subject_line: emailCfg.subject_line, email_body: emailCfg.email_body,
        site_url: emailCfg.site_url, email_photo_url: emailCfg.email_photo_url,
        email_body_html: emailCfg.email_body_html, email_attachments: emailCfg.email_attachments,
        updated_at: new Date().toISOString(),
      }).eq('id', emailCfg.id);
    }
    setSettings(draft);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const uploadMonogram = async (file: File) => {
    setUploadingMonogram(true);
    const url = await uploadImage(file, 'monogram');
    if (url) upd({ invitation_wax_seal_image_url: url });
    setUploadingMonogram(false);
  };
  const uploadLegacyMonogram = async (file: File) => {
    const url = await uploadImage(file, 'monogram');
    if (url) upd({ monogram_url: url });
  };
  const uploadPaperBg = async (file: File) => {
    setUploadingPaperBg(true);
    const url = await uploadImage(file, 'wedding-images');
    if (url) upd({ invitation_paper_image_url: url });
    setUploadingPaperBg(false);
  };
  const uploadEmailPhoto = async (file: File) => {
    setUploadingPhoto(true);
    const url = await uploadImage(file, 'wedding-images');
    if (url) updEmail({ email_photo_url: url });
    setUploadingPhoto(false);
  };
  const uploadAttachment = async (file: File) => {
    setUploadingAttach(true);
    const url = await uploadImage(file, 'documents');
    if (url) updEmail({ email_attachments: [...(emailCfg?.email_attachments || []), { name: file.name, url }] });
    setUploadingAttach(false);
  };
  const removeAttachment = (idx: number) => {
    const a = [...(emailCfg?.email_attachments || [])];
    a.splice(idx, 1);
    updEmail({ email_attachments: a });
  };

  const buttons = draft.invitation_paper_buttons || [];
  const addButton = () => upd({ invitation_paper_buttons: [...buttons, { label: 'RSVP', link_type: 'rsvp', link_value: '' }] });
  const updateBtn = (i: number, patch: Partial<InvitationButton>) => {
    const b = [...buttons]; b[i] = { ...b[i], ...patch }; upd({ invitation_paper_buttons: b });
  };
  const removeBtn = (i: number) => { const b = [...buttons]; b.splice(i, 1); upd({ invitation_paper_buttons: b }); };
  const moveBtn = (i: number, dir: -1 | 1) => {
    const ni = i + dir;
    if (ni < 0 || ni >= buttons.length) return;
    const b = [...buttons]; [b[i], b[ni]] = [b[ni], b[i]]; upd({ invitation_paper_buttons: b });
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'envelope', label: 'Envelope & Wax Seal', icon: <Mail size={15} /> },
    { key: 'letter', label: 'Letter Body', icon: <FileText size={15} /> },
    { key: 'email', label: 'Email Content', icon: <Send size={15} /> },
    { key: 'generate', label: 'Generate', icon: <FlaskConical size={15} /> },
    { key: 'send', label: 'Send Invitations', icon: <LinkIcon size={15} /> },
  ];

  return (
    <div>
      <SectionHeader
        title="Invitation"
        subtitle="Design the envelope, letter, email content, and send to guests"
        action={
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-[#5a7a4a] flex items-center gap-1"><Check size={14} /> Saved</span>}
            <button onClick={() => setPreview(true)} className="btn-ghost flex items-center gap-1.5"><Eye size={15} /> Preview</button>
            <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-1.5">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save
            </button>
          </div>
        }
      />

      <div className="flex gap-1 mb-5 border-b overflow-x-auto" style={{ borderColor: '#e6ddcd' }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap"
            style={{
              color: tab === t.key ? '#5a4430' : '#8a7a66',
              borderBottom: tab === t.key ? '2px solid #8a6d3b' : '2px solid transparent',
              marginBottom: -1,
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ---- Envelope & Wax Seal Tab ---- */}
      {tab === 'envelope' && (
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">Envelope Colors</h3>
            <div className="grid grid-cols-2 gap-4">
              <ColorPicker label="Envelope Color" value={draft.invitation_envelope_color || '#FAFAFA'} onChange={(v) => upd({ invitation_envelope_color: v })} />
              <ColorPicker label="Wax Seal Color" value={draft.invitation_wax_seal_color || '#C5A059'} onChange={(v) => upd({ invitation_wax_seal_color: v })} />
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">Wax Seal Monogram</h3>
            <p className="text-xs text-[#8a7a66] mb-3">Upload your monogram to display inside the wax seal. Initials are shown when no image is uploaded.</p>
            <div className="flex items-center gap-3">
              {draft.invitation_wax_seal_image_url && (
                <div className="relative">
                  <img src={draft.invitation_wax_seal_image_url} alt="Monogram" className="w-16 h-16 rounded-full object-cover border" style={{ borderColor: '#e6ddcd' }} />
                  <button onClick={() => upd({ invitation_wax_seal_image_url: null })} className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#b03a3a' }}><X size={10} className="text-white" /></button>
                </div>
              )}
              <label className="cursor-pointer">
                <span className="btn-ghost inline-flex items-center gap-1.5 text-sm">
                  {uploadingMonogram ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {draft.invitation_wax_seal_image_url ? 'Replace' : 'Upload Monogram'}
                </span>
                <input ref={monogramRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMonogram(f); }} />
              </label>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">Greeting &amp; Button</h3>
            <div className="space-y-3">
              <div>
                <label className="admin-label">Greeting Text (shown before opening)</label>
                <textarea className="admin-input" rows={2} value={draft.env_greeting || ''} onChange={(e) => upd({ env_greeting: e.target.value })} placeholder="You are cordially invited to celebrate our wedding" />
              </div>
              <div>
                <label className="admin-label">Open Button Text</label>
                <input className="admin-input" value={draft.env_button_text || ''} onChange={(e) => upd({ env_button_text: e.target.value })} placeholder="Explore Invitation" />
              </div>
              <div>
                <label className="admin-label">Continue Button Action</label>
                <select className="admin-input" value={draft.env_cta_type || 'internal'} onChange={(e) => upd({ env_cta_type: e.target.value as 'internal' | 'external' })}>
                  <option value="internal">Internal (scroll to invitation)</option>
                  <option value="external">External URL</option>
                </select>
              </div>
              {draft.env_cta_type === 'external' && (
                <div>
                  <label className="admin-label">External URL</label>
                  <input className="admin-input" value={draft.env_cta_link || ''} onChange={(e) => upd({ env_cta_link: e.target.value })} placeholder="https://..." />
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">Envelope Liner</h3>
            <div className="grid grid-cols-2 gap-4">
              <ColorPicker label="Liner Color" value={draft.env_liner_color || '#F5EFE0'} onChange={(v) => upd({ env_liner_color: v })} />
              <div>
                <label className="admin-label">Liner Pattern</label>
                <select className="admin-input" value={draft.env_liner_pattern || 'solid'} onChange={(e) => upd({ env_liner_pattern: e.target.value })}>
                  <option value="solid">Solid</option>
                  <option value="stripes">Stripes</option>
                  <option value="dots">Dots</option>
                </select>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">Wax Seal Style</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="admin-label">Seal Style</label>
                <select className="admin-input" value={draft.seal_style || 'initials'} onChange={(e) => upd({ seal_style: e.target.value })}>
                  <option value="initials">Initials</option>
                  <option value="monogram">Monogram (&amp;)</option>
                  <option value="heart">Heart</option>
                  <option value="star">Star</option>
                </select>
              </div>
              <ColorPicker label="Seal Color" value={draft.seal_color || '#C5A059'} onChange={(v) => upd({ seal_color: v })} />
            </div>
            <div className="mt-3">
              <label className="admin-label">Monogram Image (wax seal)</label>
              <p className="text-xs text-[#8a7a66] mb-2">Overrides the seal style above with your uploaded image.</p>
              <div className="flex items-center gap-3">
                {draft.monogram_url && (
                  <div className="relative">
                    <img src={draft.monogram_url} alt="Monogram" className="w-12 h-12 rounded-full object-cover border" style={{ borderColor: '#e6ddcd' }} />
                    <button onClick={() => upd({ monogram_url: null })} className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#b03a3a' }}><X size={10} className="text-white" /></button>
                  </div>
                )}
                <label className="cursor-pointer">
                  <span className="btn-ghost inline-flex items-center gap-1.5 text-sm">
                    <Upload size={14} />
                    {draft.monogram_url ? 'Replace' : 'Upload Monogram'}
                  </span>
                  <input ref={legacyMonogramRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLegacyMonogram(f); }} />
                </label>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">Flap Name</h3>
            <label className="flex items-center gap-2 mb-3 text-sm text-[#5a4430]">
              <input type="checkbox" className="accent-[#8a6d3b]" checked={draft.invitation_flap_show_name} onChange={(e) => upd({ invitation_flap_show_name: e.target.checked })} />
              Show guest name on envelope flap
            </label>
            {draft.invitation_flap_show_name && (
              <div className="space-y-3">
                <div>
                  <label className="admin-label">Custom Flap Text</label>
                  <p className="text-xs text-[#8a7a66] mb-1">Leave empty to use guest name. Use {'{guest_name}'} for the default guest name, or {'{name_on_card}'} for the Name on Card field.</p>
                  <input className="admin-input" value={draft.invitation_flap_name_text || ''} onChange={(e) => upd({ invitation_flap_name_text: e.target.value })} placeholder="e.g. Mr. & Mrs. {guest_name}" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ColorPicker label="Name Color" value={draft.invitation_flap_name_color || '#A89582'} onChange={(v) => upd({ invitation_flap_name_color: v })} />
                  <div>
                    <label className="admin-label">Name Font</label>
                    <FontSelect value={draft.invitation_flap_name_font || 'Great Vibes'} onChange={(v) => upd({ invitation_flap_name_font: v })} previewText="Sample Name" previewColor={draft.invitation_flap_name_color || '#A89582'} />
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#3a2e22]">Envelope Preview</h3>
              <button onClick={() => setPreview(true)} className="btn-ghost flex items-center gap-1.5 text-sm"><Eye size={14} /> Full Preview</button>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(30,20,12,0.7)', minHeight: 200 }}>
              <div style={{ transform: 'scale(0.55)', transformOrigin: 'top center', pointerEvents: 'none', height: 220 }}>
                <EnvelopePreview settings={draft} />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ---- Letter Body Tab ---- */}
      {tab === 'letter' && (
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">Paper Style</h3>
            <div className="grid grid-cols-2 gap-4">
              <ColorPicker label="Paper Background" value={draft.invitation_paper_background_color || '#fffef8'} onChange={(v) => upd({ invitation_paper_background_color: v })} />
              <ColorPicker label="Paper Text Color" value={draft.invitation_paper_text_color || '#5a4430'} onChange={(v) => upd({ invitation_paper_text_color: v })} />
              <ColorPicker label="Paper Border Color" value={draft.invitation_paper_border_color || '#e6ddcd'} onChange={(v) => upd({ invitation_paper_border_color: v })} />
            </div>
            <div className="mt-4">
              <label className="admin-label">Paper Background Image</label>
              <div className="flex items-center gap-3 mt-1">
                {draft.invitation_paper_image_url && (
                  <div className="relative">
                    <img src={draft.invitation_paper_image_url} alt="Paper bg" className="w-16 h-16 object-cover rounded border" style={{ borderColor: '#e6ddcd' }} />
                    <button onClick={() => upd({ invitation_paper_image_url: null })} className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#b03a3a' }}><X size={10} className="text-white" /></button>
                  </div>
                )}
                <label className="cursor-pointer">
                  <span className="btn-ghost inline-flex items-center gap-1.5 text-sm">
                    {uploadingPaperBg ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {draft.invitation_paper_image_url ? 'Replace' : 'Upload Background'}
                  </span>
                  <input ref={paperBgRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPaperBg(f); }} />
                </label>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">Heading Font</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="admin-label">Heading Font</label>
                <FontSelect value={draft.invitation_paper_heading_font || 'Great Vibes'} onChange={(v) => upd({ invitation_paper_heading_font: v })} previewText={`${draft.partner1_name || 'Names'} & ${draft.partner2_name || ''}`} previewSize={20} previewColor={draft.invitation_paper_heading_color || '#5a4430'} />
              </div>
              <ColorPicker label="Heading Font Color" value={draft.invitation_paper_heading_color || '#5a4430'} onChange={(v) => upd({ invitation_paper_heading_color: v })} />
            </div>
            <label className="flex items-center gap-2 text-sm text-[#5a4430] mt-3">
              <input type="checkbox" checked={draft.invitation_paper_show_names !== false} onChange={(e) => upd({ invitation_paper_show_names: e.target.checked })} className="accent-[#8a6d3b]" />
              <span>Show partner names heading on the letter</span>
            </label>
          </Card>

          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-1">Letter Body</h3>
            <p className="text-xs text-[#8a7a66] mb-3">This text appears on the letter inside the opened envelope. Use merge tags to personalize: {'{{guest_name}}'}, {'{{name_on_card}}'}, {'{{party_name}}'}, {'{{partner1_name}}'}, {'{{partner2_name}}'}, {'{{partner_name}}'}, {'{{wedding_date}}'}, {'{{rsvp_deadline}}'}, {'{{gate_password}}'}, {'{{rsvp_link}}'}.</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="admin-label">Letter Font</label>
                  <FontSelect value={draft.invitation_paper_body_font || 'Cormorant Garamond'} onChange={(v) => upd({ invitation_paper_body_font: v })} previewText="Aa Bb Cc — Dear Guest" previewSize={16} previewColor={draft.invitation_paper_text_color || '#5a4430'} />
                </div>
                <ColorPicker label="Letter Font Color" value={draft.invitation_paper_text_color || '#5a4430'} onChange={(v) => upd({ invitation_paper_text_color: v })} />
              </div>
              <RichTextEditor
                value={draft.invitation_paper_body || ''}
                onChange={(html) => upd({ invitation_paper_body: html })}
                placeholder="Dear {{guest_name}}, we joyfully request the pleasure of your company..."
                rows={10}
              />
              <div className="flex flex-wrap gap-1.5">
                {['{{guest_name}}', '{{name_on_card}}', '{{party_name}}', '{{partner1_name}}', '{{partner2_name}}', '{{partner_name}}', '{{wedding_date}}', '{{rsvp_deadline}}', '{{gate_password}}', '{{rsvp_link}}'].map((tag) => (
                  <button key={tag} onClick={() => upd({ invitation_paper_body: (draft.invitation_paper_body || '') + tag })} className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ background: '#f0e8d8', color: '#8a6d3b' }}>{tag}</button>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#3a2e22]">Action Buttons</h3>
              <button onClick={addButton} className="btn-ghost flex items-center gap-1 text-sm"><Plus size={14} /> Add</button>
            </div>
            {buttons.length === 0 ? (
              <div className="text-center py-6 text-sm text-[#8a7a66] border border-dashed rounded-lg" style={{ borderColor: '#d6cdbf' }}>No buttons yet</div>
            ) : (
              <div className="space-y-2">
                {buttons.map((btn, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border p-2" style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
                    <div className="flex flex-col">
                      <button onClick={() => moveBtn(i, -1)} disabled={i === 0} className="text-[#c9b896] disabled:opacity-30"><ChevronUp size={13} /></button>
                      <button onClick={() => moveBtn(i, 1)} disabled={i === buttons.length - 1} className="text-[#c9b896] disabled:opacity-30"><ChevronDown size={13} /></button>
                    </div>
                    <GripVertical size={14} className="text-[#c9b896]" />
                    <input className="admin-input flex-1 text-sm" style={{ padding: '4px 8px' }} value={btn.label} onChange={(e) => updateBtn(i, { label: e.target.value })} placeholder="Button label" />
                    <select className="admin-input text-xs" style={{ padding: '4px 8px', width: 'auto' }} value={btn.link_type} onChange={(e) => updateBtn(i, { link_type: e.target.value as InvitationButton['link_type'], link_value: '' })}>
                      {LINK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    {btn.link_type === 'external' && (
                      <input className="admin-input text-xs flex-1" style={{ padding: '4px 8px' }} value={btn.link_value} onChange={(e) => updateBtn(i, { link_value: e.target.value })} placeholder="https://..." />
                    )}
                    <button onClick={() => removeBtn(i)} className="text-[#c9b896] hover:text-[#b03a3a]"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ---- Email Content Tab ---- */}
      {tab === 'email' && emailCfg && (
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">SMTP Settings</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="admin-label">SMTP Host</label><input className="admin-input" value={emailCfg.smtp_host || ''} onChange={(e) => updEmail({ smtp_host: e.target.value })} placeholder="smtp.gmail.com" /></div>
                <div><label className="admin-label">Port</label><input type="number" className="admin-input" value={emailCfg.smtp_port || ''} onChange={(e) => updEmail({ smtp_port: parseInt(e.target.value) || null })} placeholder="587" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="admin-label">Username</label><input className="admin-input" value={emailCfg.smtp_user || ''} onChange={(e) => updEmail({ smtp_user: e.target.value })} /></div>
                <div><label className="admin-label">Password / App Password</label><input type="password" className="admin-input" value={emailCfg.smtp_pass || ''} onChange={(e) => updEmail({ smtp_pass: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="admin-label">From Email</label><input className="admin-input" value={emailCfg.from_email || ''} onChange={(e) => updEmail({ from_email: e.target.value })} placeholder="hello@ourwedding.com" /></div>
                <div><label className="admin-label">From Name</label><input className="admin-input" value={emailCfg.from_name || ''} onChange={(e) => updEmail({ from_name: e.target.value })} placeholder="Alex & Jordan" /></div>
              </div>
              <div>
                <label className="admin-label">Wedding Website URL</label>
                <input className="admin-input" placeholder="https://your-site-url.com" value={emailCfg.site_url || ''} onChange={(e) => updEmail({ site_url: e.target.value })} />
                <p className="text-xs text-[#8a7a66] mt-1">Each guest will receive a unique link to their personal wax-seal invitation.</p>
                {emailCfg.site_url && (
                  <div className="mt-2 rounded-lg border p-2.5" style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
                    <p className="text-[10px] font-semibold text-[#5a4430] mb-1">Example link per guest:</p>
                    <code className="text-xs text-[#8a6d3b] break-all">{emailCfg.site_url.replace(/\/+$/, '')}/#invite/{'<unique-token>'}</code>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-3">Email Subject</h3>
            <input className="admin-input" value={emailCfg.subject_line || ''} onChange={(e) => updEmail({ subject_line: e.target.value })} placeholder={`You're Invited — ${draft.partner1_name} & ${draft.partner2_name}`} />
          </Card>

          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-1">Email Body</h3>
            <p className="text-xs text-[#8a7a66] mb-3">The "OPEN YOUR INVITATION" button is added automatically at the bottom and links to each guest's unique invitation.</p>
            <RichTextEditor
              value={emailCfg.email_body_html || ''}
              onChange={(html) => updEmail({ email_body_html: html })}
              placeholder="Dear {{guest_name}}, you are cordially invited..."
              rows={12}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['{{guest_name}}', '{{name_on_card}}', '{{party_name}}', '{{partner1_name}}', '{{partner2_name}}', '{{partner_name}}', '{{wedding_date}}', '{{rsvp_deadline}}', '{{gate_password}}', '{{rsvp_link}}'].map((tag) => (
                <button key={tag} onClick={() => updEmail({ email_body_html: (emailCfg.email_body_html || '') + tag })}
                  className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ background: '#f0e8d8', color: '#8a6d3b' }}>{tag}</button>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-1">Email Hero Photo</h3>
            <p className="text-xs text-[#8a7a66] mb-3">Appears in the email above the invitation button.</p>
            <div className="flex items-center gap-3">
              {emailCfg.email_photo_url && (
                <div className="relative">
                  <img src={emailCfg.email_photo_url} alt="Email hero" className="w-24 h-16 object-cover rounded border" style={{ borderColor: '#e6ddcd' }} />
                  <button onClick={() => updEmail({ email_photo_url: null })} className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#b03a3a' }}><X size={10} className="text-white" /></button>
                </div>
              )}
              <label className="cursor-pointer">
                <span className="btn-ghost inline-flex items-center gap-1.5 text-sm">
                  {uploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {emailCfg.email_photo_url ? 'Replace Photo' : 'Upload Photo'}
                </span>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadEmailPhoto(f); }} />
              </label>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-[#3a2e22] mb-1">Attached Documents</h3>
            <p className="text-xs text-[#8a7a66] mb-3">Files attached to the email (dress code, itinerary, map).</p>
            <div className="space-y-2 mb-3">
              {(emailCfg.email_attachments || []).map((att: EmailAttachment, i: number) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border p-2" style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
                  <FileText size={14} className="text-[#a07c4a] shrink-0" />
                  <span className="text-sm text-[#5a4430] flex-1 truncate">{att.name}</span>
                  <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#8a6d3b] hover:underline">View</a>
                  <button onClick={() => removeAttachment(i)} className="text-[#c9b896] hover:text-[#b03a3a]"><X size={13} /></button>
                </div>
              ))}
            </div>
            <label className="cursor-pointer">
              <span className="btn-ghost inline-flex items-center gap-1.5 text-sm">
                {uploadingAttach ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Attach File
              </span>
              <input ref={attachRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAttachment(f); }} />
            </label>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#3a2e22]">Email Preview</h3>
              <TestEmailButton emailCfg={emailCfg} />
            </div>
            <div className="rounded-lg overflow-hidden border" style={{ borderColor: '#e6ddcd', background: '#f5f3ef', maxHeight: 500, overflowY: 'auto' }}>
              <div className="p-4 max-w-md mx-auto">
                <p className="text-xs text-[#8a7a66] mb-2"><strong>Subject:</strong> {emailCfg.subject_line || `You're Invited`}</p>
                <hr className="mb-3" style={{ borderColor: '#e6ddcd' }} />
                {/* Header banner */}
                <div style={{ background: '#f0ebe3', padding: '14px 24px', textAlign: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: draft.invitation_wax_seal_color || '#C5A059', fontFamily: 'Arial, sans-serif' }}>YOU'RE INVITED</span>
                </div>
                {/* Body */}
                <div style={{ background: '#fff', padding: '32px 28px 24px', borderLeft: '1px solid #e8e2d8', borderRight: '1px solid #e8e2d8' }}>
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ width: 40, height: 2, background: '#c9bfae', margin: '0 auto' }} />
                  </div>
                  <div style={{ color: '#3a3a3a', fontSize: 15, lineHeight: 1.8, fontFamily: "Georgia, 'Times New Roman', serif" }}
                    dangerouslySetInnerHTML={{
                      __html: (() => {
                        let raw = (emailCfg.email_body_html || `Dear **Sample Guest**,\n\nYou are cordially invited.\n\nWith all our love,\n\n**${draft.partner1_name} & ${draft.partner2_name}**`)
                          .replace(/\{\{guest_name\}\}/g, 'Sample Guest')
                          .replace(/\{\{name_on_card\}\}/g, 'Sample Name')
                          .replace(/\{\{partner1_name\}\}/g, draft.partner1_name)
                          .replace(/\{\{partner2_name\}\}/g, draft.partner2_name)
                          .replace(/\{\{partner_name\}\}/g, `${draft.partner1_name} & ${draft.partner2_name}`)
                          .replace(/\{\{wedding_date\}\}/g, draft.wedding_date ? new Date(draft.wedding_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '')
                          .replace(/\{\{rsvp_deadline\}\}/g, draft.rsvp_deadline ? new Date(draft.rsvp_deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '')
                          .replace(/\{\{gate_password\}\}/g, draft.public_password || '')
                          .replace(/\{\{rsvp_link\}\}/g, '#')
                          .replace(/\{\{party_name\}\}/g, 'The Smith Family');
                        raw = raw.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                        if (!/<p[\s>]|<br\s*\/?>/i.test(raw)) {
                          raw = raw.split(/\n\s*\n/).map((p: string) => `<p style="margin:0 0 12px">${p.replace(/\n/g, '<br>')}</p>`).join('');
                        }
                        return raw;
                      })()
                    }}
                  />
                  {emailCfg.email_photo_url && <img src={emailCfg.email_photo_url} alt="Hero" className="w-full h-auto mt-5" style={{ maxHeight: 300, objectFit: 'contain' }} />}
                  <div className="text-center" style={{ marginTop: 24 }}>
                    <span className="inline-block px-8 py-3 text-white text-xs font-semibold tracking-widest uppercase" style={{ background: '#2d2d2d', fontFamily: 'Arial, sans-serif' }}>OPEN YOUR INVITATION</span>
                  </div>
                </div>
                {/* Footer */}
                <div style={{ background: '#f0ebe3', padding: '12px 24px', textAlign: 'center' }}>
                  <span style={{ color: draft.invitation_wax_seal_color || '#C5A059', fontSize: 16 }}>&#10022;</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ---- Generate Tab ---- */}
      {tab === 'generate' && (
        <GenerateTab guests={guests} emailCfg={emailCfg} onReloadGuests={async () => {
          const { data: g } = await supabase.from('guests').select('*').order('name');
          setGuests(g as Guest[] || []);
        }} />
      )}

      {/* ---- Send Invitations Tab ---- */}
      {tab === 'send' && emailCfg && (
        <SendTab emailCfg={emailCfg} guests={guests} onReloadGuests={async () => {
          const { data: g } = await supabase.from('guests').select('*').order('name');
          setGuests(g as Guest[] || []);
        }} />
      )}

      {/* Full preview overlay */}
      {preview && (
        <div className="fixed inset-0 z-50 overflow-auto" style={{ background: 'rgba(30,20,12,0.85)' }}>
          <button onClick={() => setPreview(false)} className="absolute top-4 right-4 text-sm text-[#c9b896] hover:text-white z-10">✕ Close Preview</button>
          <EnvelopePreview settings={draft} fullscreen onClose={() => setPreview(false)} />
        </div>
      )}
    </div>
  );
}

function TestEmailButton({ emailCfg }: { emailCfg: EmailCfg }) {
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const sendTest = async () => {
    if (!testEmail.trim()) { alert('Enter an email address to send the test to.'); return; }
    setTesting(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invitations`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_send', test_email: testEmail.trim() }),
      });
      const res = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(res.error || `Request failed (${response.status})`);
      alert(res.message || `Test email sent!`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to send test email');
    } finally { setTesting(false); }
  };

  return (
    <div className="flex gap-2">
      <input className="admin-input text-xs w-40" placeholder="test@email.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
      <button onClick={sendTest} disabled={testing} className="btn-ghost flex items-center gap-1.5 text-xs whitespace-nowrap">
        {testing ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
        Test
      </button>
    </div>
  );
}

function SendTab({ emailCfg, guests, onReloadGuests }: { emailCfg: EmailCfg; guests: Guest[]; onReloadGuests: () => Promise<void> }) {
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [guestSearch, setGuestSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState('');
  const [sentMap, setSentMap] = useState<Record<string, string | null>>({});

  useEffect(() => {
    supabase.from('invitations').select('guest_id, sent_at').then(({ data }) => {
      const m: Record<string, string | null> = {};
      (data || []).forEach((i: { guest_id: string; sent_at: string | null }) => { m[i.guest_id] = i.sent_at; });
      setSentMap(m);
    });
  }, [guests]);

  const guestsWithEmail = guests.filter((g) => g.email);
  const filteredGuests = guestsWithEmail.filter((g) => {
    const q = guestSearch.toLowerCase();
    return !q || (g.name || '').toLowerCase().includes(q) || (g.email || '').toLowerCase().includes(q);
  });

  const cardNameFor = (g: Guest) => g.name_on_card || g.name;

  const callEdgeFn = async (body: Record<string, unknown>) => {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invitations`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const res = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(res.error || `Request failed (${response.status})`);
    return res;
  };

  const sendSelected = async () => {
    if (selectedGuests.size === 0) { alert('Select at least one guest.'); return; }
    setSending(true); setSentMsg('');
    try {
      const names: Record<string, string> = {};
      for (const g of guestsWithEmail) {
        if (selectedGuests.has(g.id)) names[g.id] = cardNameFor(g);
      }
      const res = await callEdgeFn({ action: 'send_selected', guest_ids: [...selectedGuests], card_names: names });
      setSentMsg(res.message || 'Emails sent.');
      onReloadGuests();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to send emails');
    } finally { setSending(false); }
  };

  const sendAll = async () => {
    setSending(true); setSentMsg('');
    try {
      const res = await callEdgeFn({ action: 'send_invitations' });
      setSentMsg(res.message || 'Invitations sent.');
      onReloadGuests();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to send invitations');
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-4">
      {sentMsg && (
        <div className="rounded-lg px-4 py-3 text-sm flex items-center gap-2" style={{ background: 'rgba(90,122,74,0.08)', color: '#5a7a4a', border: '1px solid rgba(90,122,74,0.15)' }}>
          <Check size={16} /> {sentMsg}
        </div>
      )}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-[#3a2e22]">Select Recipients</h3>
            <p className="text-xs text-[#8a7a66] mt-0.5">{selectedGuests.size} of {guestsWithEmail.length} guests selected (only those with email)</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSelectedGuests(new Set(guestsWithEmail.map((g) => g.id)))} className="text-xs text-[#8a6d3b] hover:underline font-semibold">All</button>
            <button onClick={() => setSelectedGuests(new Set())} className="text-xs text-[#8a7a66] hover:underline">None</button>
          </div>
        </div>
        <div className="relative mb-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c9b896]" />
          <input className="admin-input pl-8 text-sm" value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} placeholder="Search guests by name or email..." />
        </div>
        <div className="flex items-center gap-2 px-2 pb-1 text-[10px] font-semibold text-[#8a7a66] uppercase tracking-wider">
          <span className="w-4" />
          <span className="flex-1 min-w-0">Guest</span>
          <span className="w-[180px] shrink-0 text-left">Name on Card</span>
          <span className="w-16 shrink-0 text-right">Status</span>
          <span className="w-16 shrink-0 text-right">Email</span>
        </div>
        <div className="space-y-1 max-h-72 overflow-y-auto thin-scroll">
          {filteredGuests.map((g) => (
            <div key={g.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#faf6ee] transition-colors">
              <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                <input type="checkbox" className="accent-[#8a6d3b]" checked={selectedGuests.has(g.id)} onChange={() => {
                  const s = new Set(selectedGuests);
                  s.has(g.id) ? s.delete(g.id) : s.add(g.id);
                  setSelectedGuests(s);
                }} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-[#3a2e22]">{g.name}</span>
                  {g.email && <span className="text-xs text-[#8a7a66] ml-2">{g.email}</span>}
                </div>
              </label>
              <span className="text-xs text-[#5a4430] truncate w-[180px] shrink-0 text-left" title={cardNameFor(g)}>
                {cardNameFor(g)}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full w-16 shrink-0 text-center" style={{
                background: g.rsvp_status === 'confirmed' ? '#e8f0e4' : g.rsvp_status === 'declined' ? '#fbe9e9' : '#f5efe5',
                color: g.rsvp_status === 'confirmed' ? '#5a7a4a' : g.rsvp_status === 'declined' ? '#b03a3a' : '#a07c4a',
              }}>{g.rsvp_status || 'pending'}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full w-16 shrink-0 text-center inline-flex items-center justify-center gap-0.5" style={{
                background: sentMap[g.id] ? '#e8f0e4' : '#f5efe5',
                color: sentMap[g.id] ? '#5a7a4a' : '#c9b896',
              }}>{sentMap[g.id] ? 'Sent' : '—'}</span>
            </div>
          ))}
          {filteredGuests.length === 0 && <p className="text-center text-sm text-[#8a7a66] py-4">No guests found.</p>}
        </div>
        <button onClick={sendSelected} disabled={sending || selectedGuests.size === 0}
          className="btn-primary w-full mt-3 flex items-center justify-center gap-1.5">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
          Send to {selectedGuests.size} Guest{selectedGuests.size !== 1 ? 's' : ''}
        </button>
      </Card>

      <Card>
        <h3 className="font-semibold text-[#3a2e22] mb-2">Send to All Guests</h3>
        <p className="text-xs text-[#8a7a66] mb-3">Each guest receives a unique invitation link connected to their wax-seal envelope.</p>
        <button onClick={sendAll} disabled={sending || guestsWithEmail.length === 0}
          className="btn-ghost w-full flex items-center justify-center gap-2">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
          Send to All {guestsWithEmail.length} Guests
        </button>
      </Card>
    </div>
  );
}

function GenerateTab({ guests, emailCfg, onReloadGuests }: { guests: Guest[]; emailCfg: EmailCfg | null; onReloadGuests: () => Promise<void> }) {
  const [invitations, setInvitations] = useState<Record<string, { token: string; sent_at: string | null; opened_at: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewGuest, setPreviewGuest] = useState<Guest | null>(null);

  const siteUrl = (emailCfg?.site_url || '').replace(/\/+$/, '');

  const loadInvitations = async () => {
    setLoading(true);
    const { data } = await supabase.from('invitations').select('guest_id, token, sent_at, opened_at');
    const map: Record<string, { token: string; sent_at: string | null; opened_at: string | null }> = {};
    (data || []).forEach((inv: Record<string, unknown>) => {
      map[inv.guest_id as string] = { token: inv.token as string, sent_at: inv.sent_at as string | null, opened_at: inv.opened_at as string | null };
    });
    setInvitations(map);
    setLoading(false);
  };

  useEffect(() => { loadInvitations(); }, []);

  const generateAll = async () => {
    setGenerating(true); setMsg('');
    let created = 0;
    let existing = 0;
    for (const g of guests) {
      if (invitations[g.id]) { existing++; continue; }
      const token = crypto.randomUUID();
      const { error } = await supabase.from('invitations').insert({ guest_id: g.id, token });
      if (!error) created++;
    }
    setMsg(`${created} invitation${created !== 1 ? 's' : ''} generated. ${existing} already existed.`);
    setGenerating(false);
    loadInvitations();
  };

  const generateSelected = async () => {
    const ids = Array.from(selected).filter((id) => !invitations[id]);
    if (ids.length === 0) { setMsg('No new guests selected.'); return; }
    setGenerating(true); setMsg('');
    let created = 0;
    for (const id of ids) {
      const token = crypto.randomUUID();
      const { error } = await supabase.from('invitations').insert({ guest_id: id, token });
      if (!error) created++;
    }
    setMsg(`${created} invitation${created !== 1 ? 's' : ''} generated for selected guests.`);
    setGenerating(false);
    setSelected(new Set());
    loadInvitations();
  };

  const generateOne = async (guestId: string) => {
    if (invitations[guestId]) return;
    const token = crypto.randomUUID();
    await supabase.from('invitations').insert({ guest_id: guestId, token });
    loadInvitations();
  };

  const deleteOne = async (guestId: string) => {
    await supabase.from('invitations').delete().eq('guest_id', guestId);
    loadInvitations();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((g) => g.id)));
  };

  const copyLink = async (guestId: string, token: string) => {
    const url = siteUrl ? `${siteUrl}/#invite/${token}` : `${window.location.origin}/#invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(guestId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  };

  const filtered = guests.filter((g) => {
    const q = search.toLowerCase();
    return !q || (g.name || '').toLowerCase().includes(q) || (g.email || '').toLowerCase().includes(q);
  });

  const generatedCount = Object.keys(invitations).length;
  const sentCount = Object.values(invitations).filter((i) => i.sent_at).length;

  return (
    <div className="space-y-4">
      {msg && (
        <div className="rounded-lg px-4 py-3 text-sm flex items-center gap-2" style={{ background: 'rgba(90,122,74,0.08)', color: '#5a7a4a', border: '1px solid rgba(90,122,74,0.15)' }}>
          <Check size={16} /> {msg}
        </div>
      )}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-[#3a2e22]">Generate Invitations</h3>
            <p className="text-xs text-[#8a7a66] mt-0.5">Create unique invitation links for each guest before sending emails. {generatedCount} of {guests.length} generated, {sentCount} sent.</p>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <button onClick={generateSelected} disabled={generating} className="btn-ghost flex items-center gap-1.5 text-sm">
                {generating ? <Loader2 size={15} className="animate-spin" /> : <CheckCheck size={15} />}
                Generate Selected ({selected.size})
              </button>
            )}
            <button onClick={generateAll} disabled={generating} className="btn-primary flex items-center gap-1.5 text-sm">
              {generating ? <Loader2 size={15} className="animate-spin" /> : <FlaskConical size={15} />}
              Generate All
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c9b896]" />
            <input className="admin-input pl-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search guests..." />
          </div>
          <button onClick={toggleSelectAll} className="text-xs text-[#8a6d3b] hover:underline font-semibold whitespace-nowrap">
            {selected.size === filtered.length && filtered.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#8a6d3b]" /></div>
        ) : (
          <div className="space-y-1 max-h-[28rem] overflow-y-auto thin-scroll">
            {filtered.map((g) => {
              const inv = invitations[g.id];
              const isSelected = selected.has(g.id);
              const inviteUrl = inv && siteUrl ? `${siteUrl}/#invite/${inv.token}` : inv ? `${window.location.origin}/#invite/${inv.token}` : '';
              return (
                <div key={g.id} className="rounded-lg border px-3 py-2 transition-colors" style={{ borderColor: isSelected ? '#8a6d3b' : '#e6ddcd', background: isSelected ? 'rgba(138,109,59,0.04)' : 'transparent' }}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(g.id)} className="accent-[#8a6d3b]" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-[#3a2e22] font-medium">{g.name}</span>
                      {g.email && <span className="text-xs text-[#8a7a66] ml-2">{g.email}</span>}
                    </div>
                    {inv ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                          background: inv.sent_at ? '#e8f0e4' : '#f5efe5',
                          color: inv.sent_at ? '#5a7a4a' : '#a07c4a',
                        }}>{inv.sent_at ? 'Sent' : 'Generated'}</span>
                        {inv.opened_at && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#e8f0e4', color: '#5a7a4a' }}>Opened</span>}
                        <button onClick={() => setPreviewGuest(g)} className="text-xs text-[#8a6d3b] hover:underline font-semibold">Preview</button>
                        <button onClick={() => copyLink(g.id, inv.token)} className="text-[#8a6d3b] hover:text-[#5a4430] p-1" title="Copy link">
                          {copiedId === g.id ? <Check size={13} className="text-[#5a7a4a]" /> : <Copy size={13} />}
                        </button>
                        <a href={inviteUrl} target="_blank" rel="noopener noreferrer" className="text-[#8a6d3b] hover:text-[#5a4430] p-1" title="Open invitation">
                          <ExternalLink size={13} />
                        </a>
                        <button onClick={() => deleteOne(g.id)} className="text-xs text-[#b03a3a] hover:underline">Delete</button>
                      </div>
                    ) : (
                      <button onClick={() => generateOne(g.id)} className="text-xs text-[#8a6d3b] hover:underline font-semibold">Generate</button>
                    )}
                  </div>
                  {inv && (
                    <div className="mt-1.5 ml-6 flex items-center gap-1">
                      <code className="text-[10px] text-[#a07c4a] break-all flex-1 bg-[#faf6ee] px-2 py-1 rounded">{inviteUrl}</code>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-center text-sm text-[#8a7a66] py-4">No guests found.</p>}
          </div>
        )}
      </Card>

      {previewGuest && invitations[previewGuest.id] && (
        <InvitationPreviewModal guest={previewGuest} token={invitations[previewGuest.id].token} siteUrl={siteUrl} onClose={() => setPreviewGuest(null)} />
      )}
    </div>
  );
}

function InvitationPreviewModal({ guest, token, siteUrl, onClose }: { guest: Guest; token: string; siteUrl: string; onClose: () => void }) {
  const inviteUrl = siteUrl ? `${siteUrl}/#invite/${token}` : `${window.location.origin}/#invite/${token}`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#e6ddcd' }}>
          <div>
            <h3 className="font-semibold text-[#3a2e22]">Invitation Preview</h3>
            <p className="text-xs text-[#8a7a66]">{guest.name}{guest.email ? ` · ${guest.email}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-[#8a7a66] hover:text-[#3a2e22]"><X size={18} /></button>
        </div>
        <div className="p-5">
          <div className="rounded-lg border p-3 mb-4" style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
            <p className="text-[10px] uppercase tracking-wider text-[#a07c4a] mb-1">Invitation Link</p>
            <code className="text-xs text-[#5a4430] break-all">{inviteUrl}</code>
          </div>
          <div className="rounded-lg overflow-hidden border" style={{ borderColor: '#e6ddcd' }}>
            <iframe src={inviteUrl} title="Invitation Preview" className="w-full" style={{ height: '400px', border: 'none' }} />
          </div>
          <div className="flex items-center justify-between mt-4">
            <button onClick={() => navigator.clipboard.writeText(inviteUrl)} className="btn-ghost flex items-center gap-1.5 text-sm">
              <Copy size={15} /> Copy Link
            </button>
            <a href={inviteUrl} target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center gap-1.5 text-sm">
              <ExternalLink size={15} /> Open in New Tab
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="admin-label">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value || '#ffffff'} onChange={(e) => onChange(e.target.value)} className="w-10 h-9 rounded border cursor-pointer" style={{ borderColor: '#d6cdbf' }} />
        <input className="admin-input" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="#rrggbb" />
      </div>
    </div>
  );
}
