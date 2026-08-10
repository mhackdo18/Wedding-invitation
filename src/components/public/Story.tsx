import type { SiteSettings, TypeStyle } from '@/types';
import { typeStyle } from '@/lib/typography';

export default function Story({
  settings, typo,
}: { settings: SiteSettings; typo: Record<string, TypeStyle> }) {
  return (
    <section className="px-6 py-8 text-center">
      <div className="flex items-center justify-center gap-3 mb-4">
        <span className="h-px w-8" style={{ background: '#c9b896' }} />
        <h2 style={{ ...typeStyle(typo.storyTitle), fontFamily: 'var(--heading-font)', fontSize: 26, color: '#5a4430', margin: 0 }}>
          {settings.story_title || 'Our Story'}
        </h2>
        <span className="h-px w-8" style={{ background: '#c9b896' }} />
      </div>
      <p style={{ ...typeStyle(typo.storyBody), fontSize: 15, lineHeight: 1.7, color: '#6b5d4f', maxWidth: 460, margin: '0 auto' }}>
        {settings.story_body}
      </p>
    </section>
  );
}
