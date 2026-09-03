import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { EntourageConfig, TypeStyle } from '@/types';
import { typeStyle } from '@/lib/typography';
import HeroImage from '@/components/public/HeroImage';
import { Reveal } from '@/components/public/Reveal';

const FONT_LIST = ['inherit', 'Great Vibes', 'Cormorant Garamond', 'Playfair Display', 'Cinzel', 'Lora', 'Raleway', 'Montserrat', 'Inter'];

function resolveFont(f?: string) {
  return f && f !== 'inherit' ? `'${f}', serif` : 'var(--body-font)';
}

export default function EntouragePage({ pageId, typo, heroImageUrl, animEnabled }: { pageId: string; typo: Record<string, TypeStyle>; heroImageUrl?: string; animEnabled?: boolean }) {
  const [config, setConfig] = useState<EntourageConfig | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('pages').select('config').eq('id', pageId).maybeSingle();
      if (data?.config && (data.config as EntourageConfig).sections) {
        setConfig(data.config as EntourageConfig);
      }
    })();
  }, [pageId]);

  if (!config || !config.sections?.length) return null;

  return (
    <section className="px-6 py-8">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="h-px w-8" style={{ background: typo.pageTitle?.color || '#c9b896' }} />
          <h2 style={{ fontFamily: 'var(--heading-font)', fontSize: 26, color: '#5a4430', margin: 0, ...typeStyle(typo.pageTitle) }}>
            {config.title || 'Entourage'}
          </h2>
          <span className="h-px w-8" style={{ background: typo.pageTitle?.color || '#c9b896' }} />
        </div>
      </div>

      <HeroImage url={heroImageUrl || ''} alt={config.title || 'Entourage'} />

      <div className="max-w-2xl mx-auto space-y-8">
        {config.sections.map((section, si) => {
          const secFont = resolveFont(section.font_family);
          const secColor = section.font_color || '#5a4430';
          const secSize = section.font_size || 15;
          return (
            <Reveal key={si} enabled={!!animEnabled} animation="fade-up" delay={si * 100}>
            <div>
              {section.title && (
                <h3 style={{ fontFamily: secFont, fontSize: secSize, color: secColor, textAlign: 'center', margin: '0 0 16px', fontWeight: section.bold ? 700 : 400, fontStyle: section.italic ? 'italic' : 'normal', textDecoration: section.underline ? 'underline' : 'none' }}>
                  {section.title}
                </h3>
              )}
              <div className="space-y-5">
                {(section.blocks || []).map((block, bi) => {
                  const shFont = resolveFont(block.sub_header_font_family);
                  const shColor = block.sub_header_font_color || '#a07c4a';
                  const shSize = block.sub_header_font_size || 11;
                  return (
                    <div key={bi} className="text-center">
                      {block.sub_header && (
                        <p style={{ fontFamily: shFont, fontSize: shSize, color: shColor, letterSpacing: '0.1em', marginBottom: 10, fontWeight: block.sub_header_bold ? 700 : 400, fontStyle: block.sub_header_italic ? 'italic' : 'normal', textDecoration: block.sub_header_underline ? 'underline' : 'none' }}>
                          {block.sub_header}
                        </p>
                      )}
                      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${block.columns?.length || 1}, 1fr)` }}>
                        {(block.columns || []).map((col, ci) => {
                          const lblFont = resolveFont(col.label_font_family);
                          const lblColor = col.label_font_color || '#8a6d3b';
                          const lblSize = col.label_font_size || 11;
                          const nmFont = resolveFont(col.name_font_family);
                          const nmColor = col.name_font_color || secColor;
                          const nmSize = col.name_font_size || secSize;
                          return (
                            <div key={ci} className="px-3 py-2">
                              {col.label && (
                                <p style={{ fontFamily: lblFont, fontSize: lblSize, fontWeight: col.label_bold === false ? 400 : 700, color: lblColor, letterSpacing: '0.08em', marginBottom: 6, fontStyle: col.label_italic ? 'italic' : 'normal', textDecoration: col.label_underline ? 'underline' : 'none' }}>
                                  {col.label}
                                </p>
                              )}
                              <div className="space-y-0.5">
                                {(col.names || []).filter((n) => n.trim()).map((name, ni) => (
                                  <p key={ni} style={{ fontSize: nmSize, color: nmColor, lineHeight: 1.5, fontFamily: nmFont, fontWeight: col.name_bold ? 700 : 400, fontStyle: col.name_italic ? 'italic' : 'normal', textDecoration: col.name_underline ? 'underline' : 'none' }}>
                                    {name}
                                  </p>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
