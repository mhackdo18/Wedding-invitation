import { useState, useRef, useEffect } from 'react';
import { Tag, X } from 'lucide-react';
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

export default function TagInput({ tags, onAdd, onRemove, input, setInput, onEnter, placeholder, size = 'md' }: TagInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchAllTags().then(setAllTags); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setShowSug(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const updateInput = (v: string) => {
    setInput(v);
    if (v.trim()) {
      const q = v.trim().toLowerCase();
      setSuggestions(allTags.filter((t) => t.toLowerCase().includes(q) && !tags.includes(t)).slice(0, 6));
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

  return (
    <div ref={ref} className="relative">
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((t) => (
          <span key={t} className={`inline-flex items-center gap-1 rounded-full font-semibold ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2 py-0.5 text-xs'}`} style={{ background: '#f0e8d8', color: '#8a6d3b' }}>
            <Tag size={10} /> {t}
            <button onClick={() => { onRemove(t); invalidateTagCache(); }}><X size={10} /></button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          className={`admin-input ${size === 'sm' ? 'text-xs' : ''}`}
          placeholder={placeholder || 'VIP, Family, Bridal Party...'}
          value={input}
          onChange={(e) => updateInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(input); onEnter?.(); }
            else if (e.key === ',' && input.trim()) { e.preventDefault(); commit(input); }
          }}
        />
        {showSug && suggestions.length > 0 && (
          <div className="absolute z-50 left-0 right-0 mt-1 rounded-lg border shadow-lg max-h-48 overflow-y-auto thin-scroll" style={{ borderColor: '#d6cdbf', background: '#fff' }}>
            {suggestions.map((s) => (
              <button key={s} onClick={() => commit(s)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[#faf6ee] flex items-center gap-1.5 text-[#5a4430]">
                <Tag size={10} className="text-[#c9b896]" /> {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
