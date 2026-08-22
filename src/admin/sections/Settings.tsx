import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { SectionHeader, Card, ConfirmButton } from '../ui';
import type { Collaborator, SiteSettings } from '@/types';
import { Shield, Users, Plus, Loader2, Trash2, X, Lock, Unlock, Mail, Upload, Image as ImageIcon } from 'lucide-react';
import { uploadImage } from '@/lib/upload';
import { FontSelect } from '@/components/admin/FontSelect';
import { stackFor } from '@/lib/fonts';

export default function Settings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addingCollab, setAddingCollab] = useState(false);
  const [uploadingMonogram, setUploadingMonogram] = useState(false);
  const monogramRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase.from('site_settings').select('*').order('created_at').limit(1).maybeSingle(),
      supabase.from('collaborators').select('*').order('created_at'),
    ]);
    setSettings(s as SiteSettings | null);
    setCollaborators(c as Collaborator[] || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const updateSettings = async (patch: Partial<SiteSettings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...patch });
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    await supabase.from('site_settings').update({
      password_enabled: settings.password_enabled,
      public_password: settings.public_password,
      site_monogram_url: settings.site_monogram_url,
      gate_title_color: settings.gate_title_color,
      gate_title_font: settings.gate_title_font,
      gate_button_bg_color: settings.gate_button_bg_color,
      gate_button_text_color: settings.gate_button_text_color,
      gate_button_radius: settings.gate_button_radius,
      portal_button_bg_color: settings.portal_button_bg_color,
      portal_button_text_color: settings.portal_button_text_color,
      portal_bg_color: settings.portal_bg_color,
      portal_text_color: settings.portal_text_color,
      portal_text_font: settings.portal_text_font,
    }).eq('id', settings.id);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const uploadMonogram = async (file: File) => {
    setUploadingMonogram(true);
    const url = await uploadImage(file, 'monogram');
    if (url) updateSettings({ site_monogram_url: url });
    setUploadingMonogram(false);
  };

  const addCollab = async (email: string, role: string) => {
    await supabase.from('collaborators').insert({ email, role });
    setAddingCollab(false); load();
  };

  const removeCollab = async (id: string) => {
    await supabase.from('collaborators').delete().eq('id', id);
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8a6d3b]" /></div>;

  return (
    <div>
      <SectionHeader title="Settings" subtitle="Security and collaborator management"
        action={<button onClick={saveSettings} disabled={saving} className="btn-primary flex items-center gap-2">{saving ? <Loader2 size={16} className="animate-spin" /> : null}{saved ? 'Saved!' : 'Save Settings'}</button>} />

      <Card className="mb-4">
        <h3 className="font-semibold text-[#3a2e22] mb-3 flex items-center gap-2"><Lock size={16} className="text-[#8a6d3b]" /> Public Site Password Gate</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-[#5a4430]">
            <input type="checkbox" checked={settings?.password_enabled || false} onChange={(e) => updateSettings({ password_enabled: e.target.checked })} className="accent-[#8a6d3b]" />
            <span className="flex items-center gap-1.5">{settings?.password_enabled ? <Unlock size={14} className="text-[#5a7a4a]" /> : <Lock size={14} className="text-[#a07c4a]" />} Enable password protection</span>
          </label>
          {settings?.password_enabled && (
            <div className="space-y-3">
              <div>
                <label className="admin-label">Public Password</label>
                <input type="text" className="admin-input" value={settings.public_password || ''} onChange={(e) => updateSettings({ public_password: e.target.value })} placeholder="Enter a password for guests" />
                <p className="text-xs text-[#8a7a66] mt-1">Guests will see a password screen before accessing any public page.</p>
              </div>
              <div className="border-t pt-3" style={{ borderColor: '#e6ddcd' }}>
                <p className="text-xs font-semibold text-[#5a4430] mb-2">Gate Appearance</p>
              </div>
              <div>
                <label className="admin-label">Title Font</label>
                <FontSelect value={settings?.gate_title_font || undefined} onChange={(f) => updateSettings({ gate_title_font: f })} previewText="Our Wedding" previewSize={18} />
              </div>
              <div>
                <label className="admin-label">Title &amp; Text Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={settings?.gate_title_color || '#5a4430'} onChange={(e) => updateSettings({ gate_title_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" style={{ borderColor: '#e6ddcd' }} />
                  <input type="text" value={settings?.gate_title_color || ''} onChange={(e) => updateSettings({ gate_title_color: e.target.value })} placeholder="#5a4430" className="admin-input flex-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="admin-label">Button Background</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={settings?.gate_button_bg_color || '#8a6d3b'} onChange={(e) => updateSettings({ gate_button_bg_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" style={{ borderColor: '#e6ddcd' }} />
                    <input type="text" value={settings?.gate_button_bg_color || ''} onChange={(e) => updateSettings({ gate_button_bg_color: e.target.value })} placeholder="#8a6d3b" className="admin-input flex-1" />
                  </div>
                </div>
                <div>
                  <label className="admin-label">Button Text Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={settings?.gate_button_text_color || '#ffffff'} onChange={(e) => updateSettings({ gate_button_text_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" style={{ borderColor: '#e6ddcd' }} />
                    <input type="text" value={settings?.gate_button_text_color || ''} onChange={(e) => updateSettings({ gate_button_text_color: e.target.value })} placeholder="#ffffff" className="admin-input flex-1" />
                  </div>
                </div>
              </div>
              <div>
                <label className="admin-label">Button Corner Radius: {settings?.gate_button_radius ?? 8}px</label>
                <input type="range" min={0} max={30} value={settings?.gate_button_radius ?? 8} onChange={(e) => updateSettings({ gate_button_radius: parseInt(e.target.value) })} className="w-full accent-[#8a6d3b]" />
              </div>
              <div className="rounded-lg p-3 mt-2" style={{ background: settings?.bg_color || '#f4efe6' }}>
                <p className="text-[10px] uppercase tracking-wider text-[#a07c4a] mb-1">Preview</p>
                <h3 style={{ fontFamily: stackFor(settings?.gate_title_font || 'Cormorant Garamond'), fontSize: 22, color: settings?.gate_title_color || '#5a4430', margin: 0 }}>{settings?.partner1_name} &amp; {settings?.partner2_name}</h3>
                <button className="mt-2 px-4 py-2 text-sm font-semibold" style={{ background: settings?.gate_button_bg_color || '#8a6d3b', color: settings?.gate_button_text_color || '#fff', borderRadius: settings?.gate_button_radius ?? 8 }}>Enter Site</button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="mb-4">
        <h3 className="font-semibold text-[#3a2e22] mb-3 flex items-center gap-2"><Unlock size={16} className="text-[#8a6d3b]" /> Guest Self-Registration Portal</h3>
        <p className="text-xs text-[#8a7a66] mb-3">Customize the page and button colors guests see when they add themselves to your guest list.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="admin-label">Page Background</label>
            <div className="flex items-center gap-2">
              <input type="color" value={settings?.portal_bg_color || '#faf6ee'} onChange={(e) => updateSettings({ portal_bg_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" style={{ borderColor: '#e6ddcd' }} />
              <input type="text" value={settings?.portal_bg_color || ''} onChange={(e) => updateSettings({ portal_bg_color: e.target.value })} placeholder="#faf6ee" className="admin-input flex-1" />
            </div>
          </div>
          <div>
            <label className="admin-label">Page Text Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={settings?.portal_text_color || '#3a2e22'} onChange={(e) => updateSettings({ portal_text_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" style={{ borderColor: '#e6ddcd' }} />
              <input type="text" value={settings?.portal_text_color || ''} onChange={(e) => updateSettings({ portal_text_color: e.target.value })} placeholder="#3a2e22" className="admin-input flex-1" />
            </div>
          </div>
          <div>
            <label className="admin-label">Button Background</label>
            <div className="flex items-center gap-2">
              <input type="color" value={settings?.portal_button_bg_color || '#8a6d3b'} onChange={(e) => updateSettings({ portal_button_bg_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" style={{ borderColor: '#e6ddcd' }} />
              <input type="text" value={settings?.portal_button_bg_color || ''} onChange={(e) => updateSettings({ portal_button_bg_color: e.target.value })} placeholder="#8a6d3b" className="admin-input flex-1" />
            </div>
          </div>
          <div>
            <label className="admin-label">Button Text</label>
            <div className="flex items-center gap-2">
              <input type="color" value={settings?.portal_button_text_color || '#ffffff'} onChange={(e) => updateSettings({ portal_button_text_color: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" style={{ borderColor: '#e6ddcd' }} />
              <input type="text" value={settings?.portal_button_text_color || ''} onChange={(e) => updateSettings({ portal_button_text_color: e.target.value })} placeholder="#ffffff" className="admin-input flex-1" />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <label className="admin-label">Page Text Font</label>
          <FontSelect value={settings?.portal_text_font || undefined} onChange={(f) => updateSettings({ portal_text_font: f })} previewText="Add Yourself to Our Guest List" previewSize={16} previewColor={settings?.portal_text_color || '#3a2e22'} />
        </div>
        <div className="rounded-lg p-3 mt-3 text-center" style={{ background: settings?.portal_bg_color || '#faf6ee' }}>
          <p className="text-sm font-semibold mb-2" style={{ fontFamily: stackFor(settings?.portal_text_font || 'Cormorant Garamond'), color: settings?.portal_text_color || '#3a2e22' }}>Add Yourself to Our Guest List</p>
          <button className="px-4 py-2 text-sm font-semibold rounded-lg" style={{ background: settings?.portal_button_bg_color || '#8a6d3b', color: settings?.portal_button_text_color || '#fff' }}>Add Me to the Guest List</button>
        </div>
      </Card>

      <Card className="mb-4">
        <h3 className="font-semibold text-[#3a2e22] mb-3 flex items-center gap-2"><ImageIcon size={16} className="text-[#8a6d3b]" /> Site Monogram</h3>
        <p className="text-xs text-[#8a7a66] mb-3">Upload a monogram image to replace the heart icon shown in the site footer, navigation, and standalone pages.</p>
        <div className="flex items-center gap-3">
          {settings?.site_monogram_url && (
            <div className="relative">
              <img src={settings.site_monogram_url} alt="Monogram" className="w-16 h-16 rounded-full object-cover border" style={{ borderColor: '#e6ddcd' }} />
              <button onClick={() => updateSettings({ site_monogram_url: null })} className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#b03a3a' }}><X size={10} className="text-white" /></button>
            </div>
          )}
          <label className="cursor-pointer">
            <span className="btn-ghost inline-flex items-center gap-1.5 text-sm">
              {uploadingMonogram ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {settings?.site_monogram_url ? 'Replace' : 'Upload Monogram'}
            </span>
            <input ref={monogramRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMonogram(f); }} />
          </label>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#3a2e22] flex items-center gap-2"><Users size={16} className="text-[#8a6d3b]" /> Collaborators</h3>
          <button onClick={() => setAddingCollab(true)} className="btn-ghost flex items-center gap-1.5 text-xs"><Plus size={14} /> Invite</button>
        </div>
        <p className="text-xs text-[#8a7a66] mb-3">Invite co-admins or editors with role-based access.</p>
        {collaborators.length === 0 ? (
          <p className="text-sm text-[#8a7a66] py-4 text-center">No collaborators yet</p>
        ) : (
          <div className="space-y-2">
            {collaborators.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: c.role === 'admin' ? '#8a6d3b' : '#e0d4be' }}>
                  <Mail size={14} className={c.role === 'admin' ? 'text-white' : 'text-[#8a7a66]'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#3a2e22] truncate">{c.email}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: c.role === 'admin' ? '#f0e8d8' : '#e8f0e4', color: c.role === 'admin' ? '#8a6d3b' : '#5a7a4a' }}>
                    {c.role === 'admin' ? 'FULL ADMIN' : 'EDITOR / COORDINATOR'}
                  </span>
                </div>
                <ConfirmButton onConfirm={() => removeCollab(c.id)}><Trash2 size={14} /></ConfirmButton>
              </div>
            ))}
          </div>
        )}
      </Card>

      {addingCollab && <AddCollabModal onCancel={() => setAddingCollab(false)} onAdd={addCollab} />}
    </div>
  );
}

function AddCollabModal({ onCancel, onAdd }: { onCancel: () => void; onAdd: (email: string, role: string) => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onCancel}>
      <div className="admin-card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#3a2e22]">Invite Collaborator</h3>
          <button onClick={onCancel}><X size={18} className="text-[#8a7a66]" /></button>
        </div>
        <div className="space-y-3">
          <div><label className="admin-label">Email</label><input className="admin-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="collaborator@email.com" /></div>
          <div><label className="admin-label">Role</label>
            <select className="admin-input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="editor">Editor / Coordinator</option>
              <option value="admin">Full Admin</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
          <button onClick={() => email.trim() && onAdd(email.trim(), role)} className="btn-primary flex-1">Invite</button>
        </div>
      </div>
    </div>
  );
}
