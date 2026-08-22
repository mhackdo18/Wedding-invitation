import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { GalleryPhoto, TypeStyle } from '@/types';
import { typeStyle } from '@/lib/typography';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Gallery({
  photos, typo,
}: { photos: GalleryPhoto[]; typo: Record<string, TypeStyle> }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  if (!photos.length) return null;

  const layouts = [...new Set(photos.map((p) => p.layout))];
  const next = () => setLightbox((i) => i === null ? i : (i + 1) % photos.length);
  const prev = () => setLightbox((i) => i === null ? i : (i - 1 + photos.length) % photos.length);

  return (
    <section className="px-6 py-8">
      <div className="text-center mb-5">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="h-px w-8" style={{ background: typo.galleryTitle?.color || '#c9b896' }} />
          <h2 style={{ fontFamily: 'var(--heading-font)', fontSize: 26, color: '#5a4430', margin: 0, ...typeStyle(typo.galleryTitle) }}>
            Gallery
          </h2>
          <span className="h-px w-8" style={{ background: typo.galleryTitle?.color || '#c9b896' }} />
        </div>
      </div>

      {layouts.map((layout) => {
        const group = photos.filter((p) => p.layout === layout).sort((a, b) => a.display_order - b.display_order);
        return (
          <div key={layout} className="mb-6">
            {layout === 'masonry' && (
              <div className="columns-2 gap-2 [&>*]:mb-2">
                {group.map((p, idx) => (
                  <button key={p.id} onClick={() => setLightbox(photos.indexOf(p))} className="block w-full break-inside-avoid overflow-hidden rounded-lg">
                    <img src={p.image_url} alt={p.caption || ''} className="w-full block transition-transform hover:scale-105" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
            {layout === 'grid' && (
              <div className="grid grid-cols-3 gap-2">
                {group.map((p) => (
                  <button key={p.id} onClick={() => setLightbox(photos.indexOf(p))} className="aspect-square overflow-hidden rounded-lg">
                    <img src={p.image_url} alt={p.caption || ''} className="w-full h-full object-cover transition-transform hover:scale-110" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
            {layout === 'carousel' && (
              <Carousel photos={group} onOpen={(p) => setLightbox(photos.indexOf(p))} />
            )}
            {layout === 'spotlight' && (
              <div className="space-y-3">
                {group.map((p) => (
                  <button key={p.id} onClick={() => setLightbox(photos.indexOf(p))} className="block w-full overflow-hidden rounded-xl">
                    <img src={p.image_url} alt={p.caption || ''} className="w-full max-h-72 object-cover transition-transform hover:scale-105" loading="lazy" />
                    {p.caption && <p className="text-center py-1.5" style={{ fontSize: 12, color: '#8a7a66' }}>{p.caption}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {lightbox !== null && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,20,12,0.9)' }} onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center bg-black/40 text-white hover:bg-black/60 transition" onClick={(e) => { e.stopPropagation(); setLightbox(null); }}><X size={22} /></button>
          <button className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center bg-black/40 text-white hover:bg-black/60 transition" onClick={(e) => { e.stopPropagation(); prev(); }}><ChevronLeft size={26} /></button>
          <img src={photos[lightbox].image_url} alt="" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
          <button className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center bg-black/40 text-white hover:bg-black/60 transition" onClick={(e) => { e.stopPropagation(); next(); }}><ChevronRight size={26} /></button>
        </div>,
        document.body
      )}
    </section>
  );
}

function Carousel({ photos, onOpen }: { photos: GalleryPhoto[]; onOpen: (p: GalleryPhoto) => void }) {
  const [i, setI] = useState(0);
  const cur = photos[i];
  if (!cur) return null;
  return (
    <div className="relative rounded-xl overflow-hidden">
      <button onClick={() => onOpen(cur)} className="block w-full">
        <img src={cur.image_url} alt={cur.caption || ''} className="w-full max-h-80 object-cover" />
      </button>
      {photos.length > 1 && (
        <>
          <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5" onClick={() => setI((i - 1 + photos.length) % photos.length)}><ChevronLeft size={20} /></button>
          <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5" onClick={() => setI((i + 1) % photos.length)}><ChevronRight size={20} /></button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, idx) => (
              <button key={idx} onClick={() => setI(idx)} className={`w-1.5 h-1.5 rounded-full ${idx === i ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
