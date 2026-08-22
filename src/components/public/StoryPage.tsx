import type { SiteSettings, TypeStyle, StoryMilestone } from '@/types';
import { typeStyle } from '@/lib/typography';

export default function StoryPage({
  settings, typo, milestones,
}: { settings: SiteSettings; typo: Record<string, TypeStyle>; milestones: StoryMilestone[] }) {
  return (
    <section className="px-6 py-8" style={{ borderTop: '1px solid rgba(120,90,60,0.15)' }}>
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="h-px w-8" style={{ background: typo.storyTitle?.color || '#c9b896' }} />
          <h2 style={{ fontFamily: 'var(--heading-font)', fontSize: 26, color: '#5a4430', margin: 0, ...typeStyle(typo.storyTitle) }}>
            {settings.story_title || 'Our Story'}
          </h2>
          <span className="h-px w-8" style={{ background: typo.storyTitle?.color || '#c9b896' }} />
        </div>
      </div>

      <div className="max-w-md mx-auto">
        <div
          style={{ fontSize: 15, lineHeight: 1.8, color: '#6b5d4f', textAlign: 'left', ...typeStyle(typo.storyBody) }}
          dangerouslySetInnerHTML={{ __html: settings.story_body || 'Write your story here in the Page Builder.' }}
        />

        {milestones.length > 0 && (
          <div className="space-y-4 mt-6">
            {milestones.map((m) => (
              <div key={m.id} className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #e6ddcd' }}>
                {m.image_url && (
                  <img src={m.image_url} alt={m.title} className="w-full max-h-56 object-cover" />
                )}
                <div className="p-4">
                  <h3 style={{ fontFamily: 'var(--heading-font)', fontSize: 20, color: '#5a4430', margin: 0, ...typeStyle(typo.eventName) }}>
                    {m.title}
                  </h3>
                  {m.milestone_date && (
                    <p style={{ fontSize: 12, color: '#a07c4a', marginTop: 2, ...typeStyle(typo.eventDate) }}>
                      {new Date(m.milestone_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                  {m.body && (
                    <p style={{ fontSize: 14, lineHeight: 1.6, color: '#6b5d4f', marginTop: 6, whiteSpace: 'pre-wrap', ...typeStyle(typo.eventDescription) }}>
                      {m.body}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
