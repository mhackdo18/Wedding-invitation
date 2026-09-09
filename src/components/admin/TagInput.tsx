import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Tag, X, ChevronDown, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

let cachedTags: string[] | null = null;

export async function fetchAllTags(): Promise<string[]> {
  if (cachedTags) return cachedTags;
  const { data } = await supabase.from('tags').select('name').order('name');
  cachedTags = (data || []).map((t: { name: string }) => t.name);
  return cachedTags;
}

export function invalidateTagCache() { cachedTags = null; }

export async function addTagToRegistry(name: string): Promise<void> {
  const t = name.trim();
  if (!t) return;
  await supabase.from('tags').upsert({ name: t }, { onConflict: 'name' });
  invalidateTagCache();
}

export async function removeTagFromRegistry(name: string): Promise<void> {
  await supabase.from('tags').delete().eq('name', name);
  invalidateTagCache();
}

interface TagInputProps {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  input: string;
  setInput: (v: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  size?: 'sm' | 'md';
}

interface PopperRect { top: number; left: number; width: number }

export default function TagInput({ tags, onAdd, onRemove, input, setInput, onEnter, placeholder, size = 'md' }: TagInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showBrowse, setShowBrowse] = useState(false);
  const [popperRect, setPopperRect] = useState<PopperRect>({ top: 0, left: 0, width: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const browsePopperRef = useRef<HTMLDivElement>(null);
  const suggestionPopperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchAllTags().then(setAllTags); }, []);

  const updatePopperRect = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setPopperRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  useLayoutEffect(() => {
    if (showSug || showBrowse) updatePopperRect();
  }, [showSug, showBrowse, updatePopperRect]);

  useEffect(() => {
    if (!showSug && !showBrowse) return;
    const onScroll = () => updatePopperRect();
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (suggestionPopperRef.current?.contains(target)) return;
      if (browsePopperRef.current?.contains(target)) return;
      setShowSug(false);
      setShowBrowse(false);
    };
    const onResize = () => updatePopperRect();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [showSug, showBrowse, updatePopperRect]);

  const updateInput = (v: string) => {
    setInput(v);
    setShowBrowse(false);
    if (v.trim()) {
      const q = v.trim().toLowerCase();
      setSuggestions(allTags.filter((t) => t.toLowerCase().includes(q) && !tags.includes(t)).slice(0, 8));
      setShowSug(true);
    } else setShowSug(false);
  };

  const commit = (val: string) => {
    const t = val.trim();
    if (t && !tags.includes(t)) {
      onAdd(t);
      addTagToRegistry(t);
      invalidateTagCache();
      setAllTags((prev) => prev.includes(t) ? prev : [...prev, t].sort());
    }
    setInput(''); setShowSug(false);
  };

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      onRemove(tag);
    } else {
      onAdd(tag);
      addTagToRegistry(tag);
      invalidateTagCache();
    }
  };

  const availableTags = allTags.filter((t) => !tags.includes(t));

  return (
    <div ref={containerRef}>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((t) => (
          <span key={t} className={`inline-flex items-center gap-1 rounded-full font-semibold ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2 py-0.5 text-xs'}`} style={{ background: '#f0e8d8', color: '#8a6d3b' }}>
            <Tag size={10} /> {t}
            <button onClick={() => { onRemove(t); invalidateTagCache(); }}><X size={10} /></button>
          </span>
        ))}
      </div>
      <div className="relative flex items-stretch gap-1">
        <input
          ref={inputRef}
          className={`admin-input flex-1 ${size === 'sm' ? 'text-xs' : ''}`}
          placeholder={placeholder || 'VIP, Family, Bridal Party...'}
          value={input}
          onChange={(e) => updateInput(e.target.value)}
          onFocus={updatePopperRect}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(input); onEnter?.(); }
            else if (e.key === ',' && input.trim()) { e.preventDefault(); commit(input); }
          }}
        />
        <button
          type="button"
          onClick={() => { setShowBrowse((v) => !v); setShowSug(false); updatePopperRect(); }}
          className={`shrink-0 inline-flex items-center gap-1 rounded-lg border px-2.5 transition ${showBrowse ? 'bg-[#8a6d3b] text-white border-[#8a6d3b]' : 'bg-white text-[#8a6d3b] border-[#d6cdbf] hover:border-[#b59a6b]'}`}
          title="Browse all tags"
          style={size === 'sm' ? { fontSize: '0.6875rem' } : { fontSize: '0.75rem' }}
        >
          <Tag size={11} /> All Tags <ChevronDown size={11} />
        </button>
      </div>

      {showSug && suggestions.length > 0 && createPortal(
        <div
          ref={suggestionPopperRef}
          className="fixed z-[9999] rounded-lg border shadow-lg max-h-48 overflow-y-auto thin-scroll"
          style={{ borderColor: '#d6cdbf', background: '#fff', top: popperRect.top, left: popperRect.left, width: popperRect.width }}
        >
          {suggestions.map((s) => (
            <button key={s} onClick={() => commit(s)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[#faf6ee] flex items-center gap-1.5 text-[#5a4430]">
              <Tag size={10} className="text-[#c9b896]" /> {s}
            </button>
          ))}
        </div>,
        document.body
      )}

      {showBrowse && createPortal(
        <div
          ref={browsePopperRef}
          className="fixed z-[9999] rounded-lg border shadow-lg max-h-56 overflow-y-auto thin-scroll p-2"
          style={{ borderColor: '#d6cdbf', background: '#fff', top: popperRect.top, left: popperRect.left, width: Math.max(popperRect.width, 220) }}
        >
          {allTags.length === 0 && availableTags.length === 0 ? (
            <p className="text-xs text-[#a0927e] text-center py-3">No tags created yet. Type a tag above to create one.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((t) => {
                const active = tags.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition border ${
                      active
                        ? 'bg-[#f0e8d8] text-[#8a6d3b] border-[#e0d4b8]'
                        : 'bg-white text-[#8a7a66] border-[#d6cdbf] hover:border-[#b59a6b] hover:text-[#5a4430]'
                    }`}
                  >
                    {active && <Check size={10} />}
                    <Tag size={10} className={active ? 'text-[#c9b896]' : 'text-[#d6cdbf]'} />
                    {t}
                  </button>
                );
              })}
              {availableTags.length === 0 && tags.length > 0 && (
                <p className="text-xs text-[#a0927e] w-full text-center py-1">All tags are already added.</p>
              )}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
