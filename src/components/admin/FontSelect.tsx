import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FONT_OPTIONS, stackFor, categoryLabel, type FontOption } from '@/lib/fonts';
import { ensureFontLoaded } from '@/lib/useFontLoader';
import { ChevronDown, Check } from 'lucide-react';

interface FontSelectProps {
  value?: string;
  onChange: (font: string) => void;
  previewText?: string;
  previewSize?: number;
  previewColor?: string;
  className?: string;
}

interface PopperRect { top: number; left: number; width: number }

export function FontSelect({ value, onChange, previewText = 'Sample Text', previewSize = 16, previewColor = '#5a4430', className }: FontSelectProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [popperRect, setPopperRect] = useState<PopperRect>({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && value !== 'inherit') ensureFontLoaded(value);
  }, [value]);
  const current = value || 'Cormorant Garamond';

  const updatePopperRect = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPopperRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  useLayoutEffect(() => {
    if (open) updatePopperRect();
  }, [open, updatePopperRect]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (popperRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onScroll = () => updatePopperRect();
    const onResize = () => updatePopperRect();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [open, updatePopperRect]);

  const filtered = FONT_OPTIONS.filter((f) => {
    if (!filter) return true;
    return f.name.toLowerCase().includes(filter.toLowerCase()) || f.category.includes(filter.toLowerCase());
  });

  const grouped: Record<string, FontOption[]> = { script: [], serif: [], sans: [] };
  filtered.forEach((f) => grouped[f.category].push(f));

  return (
    <div className={`relative ${className || ''}`} ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => { setOpen(!open); if (!open) updatePopperRect(); }}
        className="admin-input w-full flex items-center justify-between gap-2"
      >
        <span style={{ fontFamily: stackFor(current), fontSize: Math.min(previewSize, 14) }} className="truncate flex-1 text-left">
          {current}
        </span>
        <ChevronDown size={15} className="text-[#8a7a66] shrink-0" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && createPortal(
        <div
          ref={popperRef}
          className="fixed z-[9999] rounded-lg border shadow-lg max-h-72 overflow-hidden flex flex-col"
          style={{ borderColor: '#e6ddcd', background: '#fff', top: popperRect.top, left: popperRect.left, width: popperRect.width }}
        >
          <div className="p-2 border-b shrink-0" style={{ borderColor: '#f0e8d8' }}>
            <input
              autoFocus
              className="admin-input text-xs"
              placeholder="Search fonts..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto thin-scroll flex-1">
            {(['script', 'serif', 'sans'] as const).map((cat) => {
              if (grouped[cat].length === 0) return null;
              return (
                <div key={cat}>
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider sticky top-0" style={{ background: '#faf6ee', color: '#a07c4a' }}>
                    {categoryLabel(cat)}
                  </div>
                  {grouped[cat].map((f) => (
                    <button
                      key={f.name}
                      onClick={() => { onChange(f.name); setOpen(false); setFilter(''); }}
                      className="w-full px-3 py-2 flex items-center justify-between gap-2 hover:bg-[#faf6ee] transition text-left"
                      style={{ background: current === f.name ? 'rgba(138,109,59,0.06)' : 'transparent' }}
                    >
                      <span style={{ fontFamily: f.stack, fontSize: 17, color: '#3a2e22' }} className="flex-1 truncate">
                        {f.name}
                      </span>
                      {current === f.name && <Check size={14} className="text-[#8a6d3b] shrink-0" />}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
