import { useState, useEffect } from 'react';
import type { Page, TypeStyle } from '@/types';
import { typeStyle } from '@/lib/typography';
import { useScrollLock } from '@/lib/useScrollLock';
import HeroImage from '@/components/public/HeroImage';
import { Reveal } from '@/components/public/Reveal';
import { ZoomIn, ZoomOut, Maximize, X, FileText } from 'lucide-react';

export default function DocumentViewer({ page, typo, heroImageUrl, animEnabled }: { page: Page; typo: Record<string, TypeStyle>; heroImageUrl?: string; animEnabled?: boolean }) {
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  useScrollLock(fullscreen);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const docUrl = (page.config as Record<string, unknown>)?.doc_url as string || '';
  const docType = (page.config as Record<string, unknown>)?.doc_type as string || 'pdf';

  if (!docUrl) {
    return (
      <section className="px-6 py-8 text-center" style={{ borderTop: '1px solid rgba(120,90,60,0.15)' }}>
        <FileText size={32} className="mx-auto text-[#c9b896] mb-2" />
        <p style={{ fontSize: 14, color: '#8a7a66' }}>No document uploaded yet.</p>
      </section>
    );
  }

  const isImage = docType === 'jpg' || docType === 'png' || docUrl.match(/\.(jpg|jpeg|png|webp)$/i);

  return (
    <section className="px-6 py-8" style={{ borderTop: '1px solid rgba(120,90,60,0.15)' }}>
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="h-px w-8" style={{ background: typo.pageTitle?.color || '#c9b896' }} />
          <h2 style={{ fontFamily: 'var(--heading-font)', fontSize: 26, color: '#5a4430', margin: 0, ...typeStyle(typo.pageTitle) }}>
            {page.title}
          </h2>
          <span className="h-px w-8" style={{ background: typo.pageTitle?.color || '#c9b896' }} />
        </div>
      </div>

      <HeroImage url={heroImageUrl || ''} alt={page.title} />

      <Reveal enabled={!!animEnabled} animation="scale-in">
      <div className="flex items-center justify-center gap-2 mb-4">
        <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="btn-ghost flex items-center gap-1 text-xs"><ZoomOut size={14} /> Zoom Out</button>
        <span className="text-xs text-[#8a7a66] w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="btn-ghost flex items-center gap-1 text-xs"><ZoomIn size={14} /> Zoom In</button>
        <button onClick={() => setFullscreen(true)} className="btn-ghost flex items-center gap-1 text-xs"><Maximize size={14} /> Fullscreen</button>
      </div>
      </Reveal>

      <Reveal enabled={!!animEnabled} animation="fade-up" delay={100}>
      <div className="overflow-auto thin-scroll rounded-xl border" style={{ borderColor: '#e6ddcd', maxHeight: fullscreen ? 'none' : 600, background: '#faf6ee' }}>
        {isImage ? (
          <div className="flex justify-center p-4">
            <img src={docUrl} alt={page.title} style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', maxWidth: '100%' }} />
          </div>
        ) : (
          <iframe src={docUrl} title={page.title} style={{ width: '100%', height: 600, transform: `scale(${zoom})`, transformOrigin: 'top left', border: 'none' }} />
        )}
      </div>
      </Reveal>

      {fullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(30,20,12,0.9)' }} onClick={() => setFullscreen(false)}>
          <div className="flex items-center justify-end p-3">
            <button onClick={() => setFullscreen(false)} className="text-white/80"><X size={24} /></button>
          </div>
          <div className="flex-1 overflow-auto flex justify-center p-4" onClick={(e) => e.stopPropagation()}>
            {isImage ? (
              <img src={docUrl} alt={page.title} style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', maxWidth: '90vw' }} />
            ) : (
              <iframe src={docUrl} title={page.title} style={{ width: '100%', height: '100%', border: 'none' }} />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
