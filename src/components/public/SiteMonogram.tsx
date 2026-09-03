import type { SiteSettings } from '@/types';
import { Heart } from 'lucide-react';

export function SiteMonogram({ settings, size = 16, className = '' }: { settings: SiteSettings | null; size?: number; className?: string }) {
  if (settings?.site_monogram_url) {
    return <img src={settings.site_monogram_url} alt="Monogram" className={`rounded-full object-cover ${className}`} style={{ width: size, height: size }} />;
  }
  return <Heart size={size} className={className} style={{ color: '#b5462f' }} />;
}
