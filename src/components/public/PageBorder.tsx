import type { ReactNode } from 'react';
import { getBorderTemplate, getBorderColorFromTypography, getBorderThicknessFromTypography } from '@/lib/pageTemplates';
import { BotanicalBorder, FiligreeBorder, type BotanicalStyle } from '@/components/public/BotanicalBorder';
import { VintageLaceBorder } from '@/components/public/VintageLaceBorder';
import { FloralSideBorder } from '@/components/public/FloralSideBorder';

const BOTANICAL_STYLE_MAP: Record<string, BotanicalStyle> = {
  botanical_emerald: 'emerald',
  botanical_rose: 'rose',
  botanical_gold: 'gold',
};

function BorderWrapper({ edgeGap, children }: { edgeGap: number; children: ReactNode }) {
  if (edgeGap <= 0) return <>{children}</>;
  return <div style={{ padding: `${edgeGap}px` }}>{children}</div>;
}

export function PageBorder({
  template,
  typography,
  children,
  className = '',
}: {
  template: string | null | undefined;
  typography?: Record<string, unknown> | null;
  children: ReactNode;
  className?: string;
}) {
  const tpl = getBorderTemplate(template);

  if (tpl.type === 'none') {
    return <div className={className}>{children}</div>;
  }

  const customColor = getBorderColorFromTypography(typography);
  const customThickness = getBorderThicknessFromTypography(typography);
  const color = customColor || tpl.defaultColor;
  const thickness = customThickness ?? tpl.defaultThickness;
  const t = Math.max(0.5, thickness);
  const gap = tpl.edgeGap || 0;

  // Botanical SVG corner borders
  if (tpl.type === 'botanical') {
    const bs = BOTANICAL_STYLE_MAP[tpl.value] || 'emerald';
    return (
      <BorderWrapper edgeGap={gap}>
        <BotanicalBorder
          botanicalStyle={bs}
          className={className}
          borderColor={color}
          borderThickness={t}
          padding={tpl.padding}
          showCorners={tpl.showCorners !== false}
          showGoldDots={tpl.showGoldDots === true}
        >
          {children}
        </BotanicalBorder>
      </BorderWrapper>
    );
  }

  // Filigree SVG corner borders
  if (tpl.type === 'filigree') {
    return (
      <BorderWrapper edgeGap={gap}>
        <FiligreeBorder className={className} borderColor={color} borderThickness={t} padding={tpl.padding}>
          {children}
        </FiligreeBorder>
      </BorderWrapper>
    );
  }

  // Vintage lace borders — ornate floral lace corners + double inset lines
  if (tpl.type === 'vintage_lace') {
    return (
      <BorderWrapper edgeGap={gap}>
        <VintageLaceBorder className={className} borderColor={color} borderThickness={t} padding={tpl.padding}>
          {children}
        </VintageLaceBorder>
      </BorderWrapper>
    );
  }

  // Floral side borders — extravagant cascading flowers along both sides
  if (tpl.type === 'floral_side') {
    const variantMap: Record<string, 'rose' | 'wisteria' | 'garden' | 'wildflower'> = {
      floral_side_rose: 'rose',
      floral_side_wisteria: 'wisteria',
      floral_side_garden: 'garden',
      floral_side_wildflower: 'wildflower',
    };
    const variant = variantMap[tpl.value] || 'rose';
    return (
      <FloralSideBorder className={className} borderColor={color} borderThickness={t} padding={tpl.padding} variant={variant}>
        {children}
      </FloralSideBorder>
    );
  }

  // Arch border: arched top with straight sides and bottom
  if (tpl.type === 'arch') {
    return (
      <BorderWrapper edgeGap={gap}>
        <div className={`relative ${className}`} style={{ padding: tpl.padding, background: 'transparent' }}>
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden="true">
            <path d="M 0 100 L 0 25 Q 50 0 100 25 L 100 100" fill="none" stroke={color} strokeWidth={t * 0.8} />
          </svg>
          <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
        </div>
      </BorderWrapper>
    );
  }

  // Keyhole arch: rounded arch at top with larger radius — art deco style
  if (tpl.type === 'keyhole') {
    return (
      <BorderWrapper edgeGap={gap}>
        <div className={`relative ${className}`} style={{ padding: tpl.padding, background: 'transparent' }}>
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden="true">
            <path d="M 0 100 L 0 30 Q 0 0 50 0 Q 100 0 100 30 L 100 100" fill="none" stroke={color} strokeWidth={t} />
            <path d="M 3 97 L 3 32 Q 3 3 50 3 Q 97 3 97 32 L 97 97" fill="none" stroke={color} strokeWidth={Math.max(0.5, t * 0.4)} opacity={0.5} />
          </svg>
          <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
        </div>
      </BorderWrapper>
    );
  }

  // Beveled frame: angled corner cuts for a modern geometric look
  if (tpl.type === 'beveled') {
    const cut = 18;
    return (
      <BorderWrapper edgeGap={gap}>
        <div className={`relative ${className}`} style={{ padding: tpl.padding, background: 'transparent' }}>
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden="true">
            <path d={`M ${cut} 0 L ${100 - cut} 0 L 100 ${cut} L 100 ${100 - cut} L ${100 - cut} 100 L ${cut} 100 L 0 ${100 - cut} L 0 ${cut} Z`} fill="none" stroke={color} strokeWidth={t} />
            <path d={`M ${cut + 3} 3 L ${100 - cut - 3} 3 L 97 ${cut + 3} L 97 ${100 - cut - 3} L ${100 - cut - 3} 97 L ${cut + 3} 97 L 3 ${100 - cut - 3} L 3 ${cut + 3} Z`} fill="none" stroke={color} strokeWidth={Math.max(0.5, t * 0.4)} opacity={0.4} />
          </svg>
          <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
        </div>
      </BorderWrapper>
    );
  }

  // Corner accent border: thin line with L-shaped brackets at corners
  if (tpl.type === 'corner') {
    const bracket = `${Math.max(8, t * 8)}px`;
    return (
      <BorderWrapper edgeGap={gap}>
        <div className={`relative ${className}`} style={{ padding: tpl.padding, background: 'transparent' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ border: `${t}px solid ${color}`, borderRadius: '2px', opacity: 0.25 }} />
          <div className="absolute pointer-events-none" style={{ top: 0, left: 0, width: bracket, height: bracket, borderTop: `${t * 1.5}px solid ${color}`, borderLeft: `${t * 1.5}px solid ${color}` }} />
          <div className="absolute pointer-events-none" style={{ top: 0, right: 0, width: bracket, height: bracket, borderTop: `${t * 1.5}px solid ${color}`, borderRight: `${t * 1.5}px solid ${color}` }} />
          <div className="absolute pointer-events-none" style={{ bottom: 0, left: 0, width: bracket, height: bracket, borderBottom: `${t * 1.5}px solid ${color}`, borderLeft: `${t * 1.5}px solid ${color}` }} />
          <div className="absolute pointer-events-none" style={{ bottom: 0, right: 0, width: bracket, height: bracket, borderBottom: `${t * 1.5}px solid ${color}`, borderRight: `${t * 1.5}px solid ${color}` }} />
          <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
        </div>
      </BorderWrapper>
    );
  }

  // Double-line border
  if (tpl.type === 'double') {
    return (
      <BorderWrapper edgeGap={gap}>
        <div className={className} style={{ padding: tpl.padding, border: `${t}px solid ${color}`, borderRadius: '4px', background: 'transparent', boxShadow: `inset 0 0 0 ${Math.max(1, t)}px transparent, inset 0 0 0 ${Math.max(2, t + 2)}px ${color}` }}>
          <div style={{ border: `${Math.max(1, t - 1)}px solid ${color}`, borderRadius: '2px', padding: '4px', minHeight: '100%' }}>
            {children}
          </div>
        </div>
      </BorderWrapper>
    );
  }

  // Triple-line border
  if (tpl.type === 'triple') {
    return (
      <BorderWrapper edgeGap={gap}>
        <div className={className} style={{ padding: tpl.padding, border: `${t}px solid ${color}`, borderRadius: '4px', background: 'transparent', boxShadow: `inset 0 0 0 ${Math.max(2, t + 2)}px transparent, inset 0 0 0 ${Math.max(3, t + 3)}px ${color}, inset 0 0 0 ${Math.max(6, t + 6)}px transparent, inset 0 0 0 ${Math.max(7, t + 7)}px ${color}` }}>
          <div style={{ padding: '4px', minHeight: '100%' }}>
            {children}
          </div>
        </div>
      </BorderWrapper>
    );
  }

  // Dashed border
  if (tpl.type === 'dashed') {
    return (
      <BorderWrapper edgeGap={gap}>
        <div className={className} style={{ padding: tpl.padding, border: `${t}px dashed ${color}`, borderRadius: '4px', background: 'transparent' }}>
          {children}
        </div>
      </BorderWrapper>
    );
  }

  // Dotted border
  if (tpl.type === 'dotted') {
    return (
      <BorderWrapper edgeGap={gap}>
        <div className={className} style={{ padding: tpl.padding, border: `${t}px dotted ${color}`, borderRadius: '4px', background: 'transparent' }}>
          {children}
        </div>
      </BorderWrapper>
    );
  }

  // Ornate border (bold outer + thin inner accent)
  if (tpl.type === 'ornate') {
    return (
      <BorderWrapper edgeGap={gap}>
        <div className={className} style={{ padding: tpl.padding, border: `${t}px solid ${color}`, borderRadius: '2px', background: 'transparent', boxShadow: `inset 0 0 0 1px ${color}` }}>
          <div style={{ outline: `1px solid ${color}`, outlineOffset: '4px' }}>
            {children}
          </div>
        </div>
      </BorderWrapper>
    );
  }

  // Inset frame: recessed double frame with soft shadow depth
  if (tpl.type === 'inset') {
    return (
      <BorderWrapper edgeGap={gap}>
        <div className={className} style={{ padding: tpl.padding, border: `${t}px solid ${color}`, borderRadius: '6px', background: 'transparent', boxShadow: `inset 0 0 0 ${Math.max(2, t + 2)}px transparent, inset 0 0 0 ${Math.max(3, t + 3)}px ${color}, inset 0 2px 8px rgba(80,60,40,0.08)` }}>
          <div style={{ padding: '4px', minHeight: '100%' }}>
            {children}
          </div>
        </div>
      </BorderWrapper>
    );
  }

  // Rounded soft border: gentle rounded corners with inner accent line
  if (tpl.type === 'rounded') {
    return (
      <BorderWrapper edgeGap={gap}>
        <div className={className} style={{ padding: tpl.padding, border: `${t}px solid ${color}`, borderRadius: '16px', background: 'transparent', boxShadow: `inset 0 0 0 ${Math.max(2, t + 2)}px transparent, inset 0 0 0 ${Math.max(3, t + 3)}px ${color}` }}>
          <div style={{ borderRadius: '12px', padding: '4px', minHeight: '100%' }}>
            {children}
          </div>
        </div>
      </BorderWrapper>
    );
  }

  // Simple thin-line border (default)
  return (
    <BorderWrapper edgeGap={gap}>
      <div className={className} style={{ padding: tpl.padding, border: `${t}px solid ${color}`, borderRadius: '4px', background: 'transparent' }}>
        {children}
      </div>
    </BorderWrapper>
  );
}
