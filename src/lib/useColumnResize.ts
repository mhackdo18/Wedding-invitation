import { useCallback, useEffect, useState } from 'react';

export function useColumnResize(storageKey: string, defaultWidths: Record<string, number> = {}) {
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return { ...defaultWidths, ...JSON.parse(saved) };
    } catch {}
    return defaultWidths;
  });

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(colWidths)); } catch {}
  }, [colWidths, storageKey]);

  const startResize = useCallback((col: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[col] || 120;
    let moved = false;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      if (Math.abs(delta) > 2) moved = true;
      const newWidth = Math.max(60, startWidth + delta);
      setColWidths((prev) => ({ ...prev, [col]: newWidth }));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [colWidths]);

  return { colWidths, startResize };
}
