import { useEffect, useState, type RefObject } from 'react';

export function useStickyScrollbar<T extends HTMLElement>(scrollRef: RefObject<T>) {
  const [visible, setVisible] = useState(false);
  const [thumbWidth, setThumbWidth] = useState(0);
  const [thumbLeft, setThumbLeft] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      const { scrollWidth, clientWidth, scrollLeft } = el;
      const canScroll = scrollWidth > clientWidth + 2;
      if (!canScroll) { setVisible(false); return; }
      const ratio = clientWidth / scrollWidth;
      setThumbWidth(Math.max(30, ratio * clientWidth));
      setThumbLeft((scrollLeft / scrollWidth) * clientWidth);
    };

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio > 0.05),
      { threshold: [0, 0.05, 0.1, 0.25, 0.5, 1] }
    );
    observer.observe(el);

    update();
    el.addEventListener('scroll', update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const tableEl = el.querySelector('table');
    if (tableEl) ro.observe(tableEl);

    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [scrollRef]);

  const scrollTo = (clientX: number, trackWidth: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const trackInner = trackWidth - thumbWidth;
    if (trackInner <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - thumbWidth / 2) / trackInner));
    el.scrollLeft = ratio * (el.scrollWidth - el.clientWidth);
  };

  return { visible, thumbWidth, thumbLeft, scrollTo };
}
