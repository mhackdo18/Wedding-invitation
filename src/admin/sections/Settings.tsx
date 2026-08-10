import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SectionHeader, Card, ConfirmButton } from '../ui';
import type { Collaborator, SiteSettings } from '@/types';
import { Shield, Users, Plus, Loader2, Trash2, X, Lock, Unlock, Mail } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addingCollab, setAddingCollab] = useState(false);

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
    }).eq('id', settings.id);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
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
            <div>
              <label className="admin-label">Public Password</label>
              <input type="text" className="admin-input" value={settings.public_password || ''} onChange={(e) => updateSettings({ public_password: e.target.value })} placeholder="Enter a password for guests" />
              <p className="text-xs text-[#8a7a66] mt-1">Guests will see a password screen before accessing any public page.</p>
            </div>
          )}
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
