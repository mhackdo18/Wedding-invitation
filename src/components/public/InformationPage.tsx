import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { InformationConfig, TypeStyle } from '@/types';
import { typeStyle } from '@/lib/typography';
import { stackFor } from '@/lib/fonts';

export default function InformationPage({ pageId, typo }: { pageId: string; typo: Record<string, TypeStyle> }) {
  const [config, setConfig] = useState<InformationConfig | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('pages').select('config').eq('id', pageId).maybeSingle();
      if (data?.config && (data.config as InformationConfig).blocks) {
        setConfig(data.config as InformationConfig);
      }
    })();
  }, [pageId]);

  if (!config || !config.blocks?.length) return null;

  return (
    <section className="px-6 py-8" style={{ borderTop: '1px solid rgba(120,90,60,0.15)' }}>
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="h-px w-8" style={{ background: typo.pageTitle?.color || '#c9b896' }} />
          <h2 style={{ fontFamily: 'var(--heading-font)', fontSize: 26, color: '#5a4430', margin: 0, ...typeStyle(typo.pageTitle) }}>
            {config.title || 'Information'}
          </h2>
          <span className="h-px w-8" style={{ background: typo.pageTitle?.color || '#c9b896' }} />
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {config.blocks.map((block, i) => (
          <div key={i}>
            <div className="p-4">
              {block.heading && (
                <h3 style={{ fontFamily: block.heading_font_family ? stackFor(block.heading_font_family) : 'var(--heading-font)', fontSize: block.heading_font_size || 20, color: block.heading_font_color || '#5a4430', margin: '0 0 8px', textAlign: 'center', ...typeStyle(typo.eventName) }}
                  dangerouslySetInnerHTML={{ __html: block.heading }} />
              )}
              {block.body_html && (
                <div
                  style={{ fontFamily: block.body_font_family ? stackFor(block.body_font_family) : undefined, fontSize: block.body_font_size || 14, lineHeight: 1.7, color: block.body_font_color || '#6b5d4f', ...typeStyle(typo.storyBody) }}
                  dangerouslySetInnerHTML={{ __html: block.body_html }}
                />
              )}
            </div>
            {block.photo_url && (
              <img src={block.photo_url} alt={block.heading || ''} className="w-full max-h-64 object-cover rounded-xl" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
