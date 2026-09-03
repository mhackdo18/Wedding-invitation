import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/upload';
import { UploadProgress } from '@/components/admin/UploadProgress';
import { SectionHeader, Card, EmptyState, ConfirmButton } from '../ui';
import type { GalleryPhoto } from '@/types';
import { ImagePlus, Loader2, Trash2, X, Upload } from 'lucide-react';

const LAYOUTS = [
  { value: 'masonry', label: 'Masonry', hint: 'Pinterest-style staggered columns' },
  { value: 'grid', label: 'Classic Grid', hint: 'Uniform square thumbnails' },
  { value: 'carousel', label: 'Carousel', hint: 'One photo at a time with arrows' },
  { value: 'spotlight', label: 'Spotlight', hint: 'Large featured photos stacked' },
];

export default function GalleryManager() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('gallery_photos').select('*').order('layout').order('display_order');
    setPhotos(data as GalleryPhoto[] || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addPhoto = async (url: string, caption: string, layout: string) => {
    const order = photos.filter((p) => p.layout === layout).length;
    await supabase.from('gallery_photos').insert({ image_url: url, caption, layout, display_order: order });
    setAdding(null); load();
  };

  const remove = async (id: string) => {
    await supabase.from('gallery_photos').delete().eq('id', id);
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8a6d3b]" /></div>;

  return (
    <div>
      <SectionHeader title="Gallery" subtitle="Upload photos directly into each layout section" />

      {LAYOUTS.map((layout) => {
        const group = photos.filter((p) => p.layout === layout.value).sort((a, b) => a.display_order - b.display_order);
        return (
          <Card key={layout.value} className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-[#3a2e22]">{layout.label}</h3>
                <p className="text-xs text-[#8a7a66]">{layout.hint}</p>
              </div>
              <button onClick={() => setAdding(layout.value)} className="btn-primary flex items-center gap-1.5 text-xs">
                <Upload size={14} /> Upload Photo Here
              </button>
            </div>
            {group.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed py-8 text-center" style={{ borderColor: '#e0d4be' }}>
                <ImagePlus size={24} className="mx-auto text-[#c9b896] mb-1" />
                <p className="text-xs text-[#8a7a66]">No photos in this layout yet. Click &ldquo;Upload Photo Here&rdquo;.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {group.map((p) => (
                  <div key={p.id} className="relative group rounded-lg overflow-hidden">
                    <img src={p.image_url} alt={p.caption || ''} className="w-full aspect-square object-cover" />
                    {p.caption && <p className="absolute bottom-0 left-0 right-0 text-[10px] text-white px-1.5 py-1 truncate" style={{ background: 'rgba(0,0,0,0.5)' }}>{p.caption}</p>}
                    <button onClick={() => remove(p.id)} className="absolute top-1 right-1 bg-black/50 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}

      {photos.length === 0 && (
        <Card><EmptyState icon={ImagePlus} title="No photos yet" hint="Upload photos to any layout above" /></Card>
      )}

      {adding && <PhotoForm layout={adding} onCancel={() => setAdding(null)} onSave={addPhoto} />}
    </div>
  );
}

function PhotoForm({ layout, onCancel, onSave }: { layout: string; onCancel: () => void; onSave: (url: string, caption: string, layout: string) => void }) {
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (uploading) return;
    setUploading(true);
    setUploadProgress(0);
    const url = await uploadImage(file, 'gallery', setUploadProgress);
    if (url) setUploadedUrl(url);
    setUploading(false);
    setUploadProgress(0);
  };

  const save = () => {
    if (uploadedUrl) onSave(uploadedUrl, caption, layout);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.4)' }} onClick={onCancel}>
      <div className="admin-card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#3a2e22]">Upload to {LAYOUTS.find((l) => l.value === layout)?.label}</h3>
          <button onClick={onCancel}><X size={18} className="text-[#8a7a66]" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="admin-label">Photo File</label>
            <div
              onClick={() => !uploading && fileRef.current?.click()}
              className={`rounded-lg border-2 border-dashed p-6 text-center transition ${uploading ? '' : 'cursor-pointer hover:border-[#8a6d3b]'}`}
              style={{ borderColor: '#d6cdbf', background: '#faf6ee' }}
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-sm text-[#8a7a66]"><Loader2 size={16} className="animate-spin" /> Uploading...</div>
              ) : uploadedUrl ? (
                <div>
                  <img src={uploadedUrl} alt="Preview" className="w-full max-h-40 object-contain rounded mb-2" />
                  <p className="text-xs text-[#5a7a4a] font-semibold">Uploaded! Click to replace</p>
                </div>
              ) : (
                <div>
                  <Upload size={24} className="mx-auto text-[#a07c4a] mb-2" />
                  <p className="text-sm text-[#6b5d4f]">Click to select a photo</p>
                  <p className="text-xs text-[#8a7a66] mt-1">JPG, PNG, WebP</p>
                </div>
              )}
            </div>
            {uploading && <UploadProgress percent={uploadProgress} />}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
          </div>
          <div><label className="admin-label">Caption (optional)</label><input className="admin-input" value={caption} onChange={(e) => setCaption(e.target.value)} /></div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={!uploadedUrl || uploading} className="btn-primary flex-1">{uploading ? 'Uploading...' : 'Add Photo'}</button>
        </div>
      </div>
    </div>
  );
}
