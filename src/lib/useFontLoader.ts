import { useEffect } from 'react';
import { PRELOAD_BATCHES } from './fonts';

let loaded = false;

export function useFontLoader() {
  useEffect(() => {
    if (loaded) return;
    loaded = true;
    PRELOAD_BATCHES.forEach((href) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    });
  }, []);
}

export function ensureFontLoaded(fontName: string) {
  const id = `gfont-${fontName.replace(/[^a-zA-Z0-9]/g, '')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}&display=swap`;
  document.head.appendChild(link);
}
