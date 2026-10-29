import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export interface FloatingMenuItem {
  key: string;
  label: string;
  onSelect: () => void;
  accent?: boolean;
  ctaStyle?: { background?: string; color?: string; borderRadius?: string };
}

export default function FloatingMenuButton({
  items,
  bottomOffset = 20,
  visible = true,
}: {
  items: FloatingMenuItem[];
  bottomOffset?: number;
  visible?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!visible || items.length === 0) return null;

  const choose = (item: FloatingMenuItem) => {
    setOpen(false);
    item.onSelect();
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
      {open && (
        <div
          className="fixed right-[4.5rem] z-50 w-52 max-h-[60vh] overflow-y-auto rounded-2xl p-2 shadow-2xl"
          style={{
            bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom, 0px))`,
            background: 'var(--page-color, #FBF7F0)',
            border: '1px solid rgba(120,90,60,0.2)',
          }}
        >
          {items.map((item) =>
            item.ctaStyle ? (
              <button
                key={item.key}
                onClick={() => choose(item)}
                className="w-full text-center font-semibold transition hover:opacity-90"
                style={{
                  background: item.ctaStyle.background || '#8a6d3b',
                  color: item.ctaStyle.color || '#fff',
                  borderRadius: item.ctaStyle.borderRadius || '9999px',
                  padding: '10px 16px',
                  fontSize: '14px',
                }}
              >
                {item.label}
              </button>
            ) : (
              <button
                key={item.key}
                onClick={() => choose(item)}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition hover:bg-black/5"
                style={{ color: '#5a4430' }}
              >
                {item.label}
              </button>
            )
          )}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        className="fixed right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition active:scale-95"
        style={{
          bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom, 0px))`,
          background: 'rgba(58,46,34,0.88)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          color: '#fff',
        }}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>
    </>
  );
}
