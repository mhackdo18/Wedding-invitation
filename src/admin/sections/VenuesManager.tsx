import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/upload';
import { SectionHeader, Card, EmptyState, ConfirmButton } from '../ui';
import { UploadProgress } from '@/components/admin/UploadProgress';
import type { Venue } from '@/types';
import { MapPin, Plus, Loader2, Trash2, Edit2, X, Upload } from 'lucide-react';

export default function VenuesManager() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Venue | null>(null);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('venues').select('*').order('name');
    setVenues(data as Venue[] || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (v: Partial<Venue>) => {
    if (v.id) {
      await supabase.from('venues').update({ name: v.name, address: v.address, map_url: v.map_url, description: v.description, photo_url: v.photo_url }).eq('id', v.id);
    } else {
      await supabase.from('venues').insert({ name: v.name, address: v.address, map_url: v.map_url, description: v.description, photo_url: v.photo_url });
    }
    setEditing(null); setAdding(false); load();
  };

  const remove = async (id: string) => {
    await supabase.from('venues').delete().eq('id', id);
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8a6d3b]" /></div>;

  return (
    <div>
      <SectionHeader title="Venues" subtitle="Create venues with photos and assign them to events"
        action={<button onClick={() => setAdding(true)} className="btn-primary flex items-center gap-1.5"><Plus size={16} /> Add Venue</button>} />

      {venues.length === 0 && !adding && <Card><EmptyState icon={MapPin} title="No venues yet" hint="Add your ceremony and reception locations" /></Card>}

      <div className="grid sm:grid-cols-2 gap-3">
        {venues.map((v) => (
          <div key={v.id} className="admin-card overflow-hidden">
            {v.photo_url && <img src={v.photo_url} alt={v.name} className="w-full h-32 object-cover" />}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-[#a07c4a]" />
                  <h3 className="font-semibold text-[#3a2e22]">{v.name}</h3>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(v)} className="text-[#8a7a66] hover:text-[#5a4430]"><Edit2 size={14} /></button>
                  <ConfirmButton onConfirm={() => remove(v.id)}><Trash2 size={14} /></ConfirmButton>
                </div>
              </div>
              {v.address && <p className="text-sm text-[#8a7a66] mt-1">{v.address}</p>}
              {v.description && <p className="text-xs text-[#8a7a66] mt-1">{v.description}</p>}
            </div>
          </div>
        ))}
      </div>

      {(adding || editing) && <VenueForm venue={editing} onCancel={() => { setEditing(null); setAdding(false); }} onSave={save} />}
    </div>
  );
}

function VenueForm({ venue, onCancel, onSave }: { venue: Venue | null; onCancel: () => void; onSave: (v: Partial<Venue>) => void }) {
  const [form, setForm] = useState<Partial<Venue>>(venue || { name: '', address: '', map_url: '', description: '', photo_url: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (uploading) return;
    setUploading(true);
    setUploadProgress(0);
    const url = await uploadImage(file, 'venues', setUploadProgress);
    if (url) setForm({ ...form, photo_url: url });
    setUploading(false);
    setUploadProgress(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onCancel}>
      <div className="admin-card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#3a2e22]">{venue ? 'Edit Venue' : 'Add Venue'}</h3>
          <button onClick={onCancel}><X size={18} className="text-[#8a7a66]" /></button>
        </div>
        <div className="space-y-3">
          <div><label className="admin-label">Name *</label><input className="admin-input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <label className="admin-label">Venue Photo</label>
            <div onClick={() => !uploading && fileRef.current?.click()} className={`rounded-lg border-2 border-dashed p-3 text-center transition ${uploading ? '' : 'cursor-pointer hover:border-[#8a6d3b]'}`} style={{ borderColor: '#d6cdbf', background: '#faf6ee' }}>
              {uploading ? <div className="flex items-center justify-center gap-2 text-sm text-[#8a7a66]"><Loader2 size={16} className="animate-spin" /> Uploading...</div>
                : form.photo_url ? <div><img src={form.photo_url} alt="Preview" className="w-full max-h-32 object-cover rounded mb-1" /><p className="text-xs text-[#5a7a4a]">Click to replace</p></div>
                : <div><Upload size={18} className="mx-auto text-[#a07c4a] mb-1" /><p className="text-sm text-[#6b5d4f]">Click to upload a photo</p></div>}
            </div>
            {uploading && <UploadProgress percent={uploadProgress} />}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
            {form.photo_url && <button type="button" onClick={() => setForm({ ...form, photo_url: '' })} className="text-xs text-[#b03a3a] mt-1">Remove photo</button>}
          </div>
          <div><label className="admin-label">Address</label><input className="admin-input" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><label className="admin-label">Map URL</label><input className="admin-input" value={form.map_url || ''} onChange={(e) => setForm({ ...form, map_url: e.target.value })} placeholder="https://maps.google.com/..." /></div>
          <div><label className="admin-label">Description</label><textarea className="admin-input" rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
          <button onClick={() => form.name?.trim() && onSave(form)} className="btn-primary flex-1">Save</button>
        </div>
      </div>
    </div>
  );
}
