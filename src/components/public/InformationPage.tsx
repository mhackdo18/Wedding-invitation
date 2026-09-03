import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { InformationBlock, InformationConfig, TypeStyle } from '@/types';
import { typeStyle } from '@/lib/typography';
import { stackFor } from '@/lib/fonts';
import HeroImage from '@/components/public/HeroImage';
import { Reveal } from '@/components/public/Reveal';

function BlockColumn({ block, typo, col }: { block: InformationBlock; typo: Record<string, TypeStyle>; col: 1 | 2 }) {
  const subheading = col === 1 ? block.subheading : block.subheading2;
  const bodyHtml = col === 1 ? block.body_html : block.body2_html;
  const photoUrl = col === 1 ? block.photo_url : block.photo2_url;
  const subFontFamily = col === 1 ? block.subheading_font_family : block.subheading2_font_family;
  const subFontColor = col === 1 ? block.subheading_font_color : block.subheading2_font_color;
  const subFontSize = col === 1 ? block.subheading_font_size : block.subheading2_font_size;
  const bodyFontFamily = col === 1 ? block.body_font_family : block.body2_font_family;
  const bodyFontColor = col === 1 ? block.body_font_color : block.body2_font_color;
  const bodyFontSize = col === 1 ? block.body_font_size : block.body2_font_size;

  return (
    <div>
      <div className="p-4">
        {subheading && (
          <p style={{
            fontFamily: subFontFamily ? stackFor(subFontFamily) : 'var(--body-font)',
            fontSize: subFontSize || 14,
            color: subFontColor || '#a0927e',
            margin: '0 0 8px',
            textAlign: 'center',
          }}
            dangerouslySetInnerHTML={{ __html: subheading }} />
        )}
        {bodyHtml && (
          <div
            style={{ ...typeStyle(typo.storyBody), fontFamily: bodyFontFamily ? stackFor(bodyFontFamily) : undefined, fontSize: bodyFontSize || 14, lineHeight: 1.7, color: bodyFontColor || '#6b5d4f' }}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        )}
      </div>
      {photoUrl && (
        <img src={photoUrl} alt="" className="w-full max-h-64 object-cover" />
      )}
    </div>
  );
}

export default function InformationPage({ pageId, typo, heroImageUrl, guestTags, animEnabled }: { pageId: string; typo: Record<string, TypeStyle>; heroImageUrl?: string; guestTags?: string[]; animEnabled?: boolean }) {
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

  const visibleBlocks = config.blocks.filter((block) => {
    if (!block.tags || block.tags.length === 0) return true;
    if (!guestTags || guestTags.length === 0) return false;
    return block.tags.some((t) => guestTags.includes(t));
  });

  if (visibleBlocks.length === 0) return null;

  return (
    <section className="px-6 py-8">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="h-px w-8" style={{ background: typo.pageTitle?.color || '#c9b896' }} />
          <h2 style={{ fontFamily: 'var(--heading-font)', fontSize: 26, color: '#5a4430', margin: 0, ...typeStyle(typo.pageTitle) }}>
            {config.title || 'Information'}
          </h2>
          <span className="h-px w-8" style={{ background: typo.pageTitle?.color || '#c9b896' }} />
        </div>
      </div>

      <HeroImage url={heroImageUrl || ''} alt={config.title || 'Information'} />

      <div className="max-w-2xl mx-auto space-y-6">
        {visibleBlocks.map((block, i) => (
          <Reveal
            key={i}
            enabled={!!animEnabled}
            animation={i % 2 === 0 ? 'fade-left' : 'fade-right'}
            delay={i * 80}
            className="information-block-emboss overflow-hidden"
          >
            {/* Main header bar — renders the block heading with heading style */}
            <div style={{ background: 'transparent', padding: '14px 24px', textAlign: 'center' }}>
              {block.heading ? (
                <div
                  style={{
                    color: block.heading_font_color || '#5a4430',
                    fontSize: block.heading_font_size || 16,
                    fontFamily: block.heading_font_family ? stackFor(block.heading_font_family) : 'var(--heading-font)',
                    fontWeight: 600,
                  }}
                  dangerouslySetInnerHTML={{ __html: block.heading }}
                />
              ) : null}
            </div>
            {/* Columns */}
            {block.columns === 2 ? (
              <div className="grid grid-cols-1 md:grid-cols-2">
                <BlockColumn block={block} typo={typo} col={1} />
                <BlockColumn block={block} typo={typo} col={2} />
              </div>
            ) : (
              <BlockColumn block={block} typo={typo} col={1} />
            )}
          </Reveal>
        ))}
      </div>
    </section>
  );
}
