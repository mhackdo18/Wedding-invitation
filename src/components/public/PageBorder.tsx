import type { ReactNode } from 'react';
import { getBorderTemplate } from '@/lib/pageTemplates';
import { BotanicalBorder, type BotanicalStyle } from '@/components/public/BotanicalBorder';

const STYLE_MAP: Record<string, BotanicalStyle> = {
  botanical_emerald: 'emerald',
  botanical_rose: 'rose',
  botanical_gold: 'gold',
  botanical_sage: 'sage',
  botanical_ivory: 'ivory',
};

export function PageBorder({
  template,
  children,
  className = '',
}: {
  template: string | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  const tpl = getBorderTemplate(template);

  if (tpl.value === 'plain') {
    return <div className={className}>{children}</div>;
  }

  const botanicalStyle = STYLE_MAP[tpl.value];

  if (botanicalStyle) {
    return (
      <BotanicalBorder
        style={botanicalStyle}
        className={className}
        background={tpl.wrapper.background}
        borderRadius={tpl.wrapper.borderRadius}
        padding={tpl.wrapper.padding}
        showCorners={tpl.showCorners !== false}
        showGoldDots={tpl.showGoldDots !== false}
        showGeometricFrame={tpl.showGeometricFrame !== false}
      >
        {children}
      </BotanicalBorder>
    );
  }

  // Fallback for legacy templates (elegant_gold, vintage_lace, etc.)
  return (
    <div
      className={`relative ${className}`}
      style={{
        background: tpl.wrapper.background,
        border: tpl.wrapper.border,
        borderRadius: tpl.wrapper.borderRadius,
        padding: tpl.wrapper.padding,
        boxShadow: tpl.wrapper.boxShadow,
      }}
    >
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}
