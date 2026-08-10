import { useEffect } from 'react';
import { fontHref } from './fonts';

let loaded = false;

export function useFontLoader() {
  useEffect(() => {
    if (loaded) return;
    loaded = true;
    const link = document.getElementById('gfont') as HTMLLinkElement | null;
    if (link && !link.href) {
      link.href = fontHref();
    }
  }, []);
}
