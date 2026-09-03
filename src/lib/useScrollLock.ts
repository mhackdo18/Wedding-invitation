import { useEffect } from 'react';

let lockCount = 0;
let savedHtmlOverflow = '';
let savedBodyOverflow = '';
let savedPaddingRight = '';

function applyLock() {
  const html = document.documentElement;
  const body = document.body;
  const scrollbarWidth = window.innerWidth - html.clientWidth;
  savedHtmlOverflow = html.style.overflowY;
  savedBodyOverflow = body.style.overflow;
  savedPaddingRight = body.style.paddingRight;
  html.style.overflowY = 'hidden';
  body.style.overflow = 'hidden';
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

function releaseLock() {
  const html = document.documentElement;
  const body = document.body;
  html.style.overflowY = savedHtmlOverflow;
  body.style.overflow = savedBodyOverflow;
  body.style.paddingRight = savedPaddingRight;
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (lockCount === 0) applyLock();
    lockCount++;
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) releaseLock();
    };
  }, [active]);
}
