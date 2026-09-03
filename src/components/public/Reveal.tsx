import { type ReactNode } from 'react';
import { useScrollReveal } from '@/lib/useScrollReveal';

interface RevealProps {
  children: ReactNode;
  enabled: boolean;
  animation?: 'fade-up' | 'fade-in' | 'fade-left' | 'fade-right' | 'scale-in';
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  as?: 'div' | 'section' | 'li' | 'article';
}

export function Reveal({ children, enabled, animation = 'fade-up', delay = 0, className = '', style, as = 'div' }: RevealProps) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>(enabled);
  const Tag = as as 'div';
  return (
    <Tag
      ref={ref}
      className={`${visible ? `sr-${animation}` : 'sr-hidden'} ${className}`}
      style={{ ...(delay ? { animationDelay: `${delay}ms` } : {}), ...style }}
    >
      {children}
    </Tag>
  );
}
