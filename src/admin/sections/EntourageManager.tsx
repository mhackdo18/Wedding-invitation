import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SectionHeader, Card } from '../ui';
import type { EntourageConfig, EntourageSection, EntourageBlock, EntourageColumn } from '@/types';
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown, Type, Bold, Italic, Underline } from 'lucide-react';
import { FontSelect } from '@/components/admin/FontSelect';

const FONTS = ['inherit', 'Great Vibes', 'Cormorant Garamond', 'Playfair Display', 'Cinzel', 'Lora', 'Raleway', 'Montserrat', 'Inter'];
const SWATCH = ['#5a4430', '#8a6d3b', '#b5462f', '#5a7a4a', '#3a5a7a', '#7a3a5a', '#a07c4a', '#6b5d4f', '#2a2e3a', '#b03a3a'];

function StyleToggles({ bold, italic, underline, onBold, onItalic, onUnderline }: {
  bold?: boolean; italic?: boolean; underline?: boolean;
  onBold?: (v: boolean) => void; onItalic?: (v: boolean) => void; onUnderline?: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-1">
      {onBold && (
        <button type="button" onClick={() => onBold(!bold)} title="Bold"
          className="w-6 h-6 rounded flex items-center justify-center text-xs transition"
          style={{ background: bold ? '#8a6d3b' : 'transparent', color: bold ? '#fff' : '#8a7a66', border: `1px solid ${bold ? '#8a6d3b' : '#d6cdbf'}` }}>
          <Bold size={12} />
        </button>
      )}
      {onItalic && (
        <button type="button" onClick={() => onItalic(!italic)} title="Italic"
          className="w-6 h-6 rounded flex items-center justify-center text-xs transition"
          style={{ background: italic ? '#8a6d3b' : 'transparent', color: italic ? '#fff' : '#8a7a66', border: `1px solid ${italic ? '#8a6d3b' : '#d6cdbf'}` }}>
          <Italic size={12} />
        </button>
      )}
      {onUnderline && (
        <button type="button" onClick={() => onUnderline(!underline)} title="Underline"
          className="w-6 h-6 rounded flex items-center justify-center text-xs transition"
          style={{ background: underline ? '#8a6d3b' : 'transparent', color: underline ? '#fff' : '#8a7a66', border: `1px solid ${underline ? '#8a6d3b' : '#d6cdbf'}` }}>
          <Underline size={12} />
        </button>
      )}
    </div>
  );
}

function FontPicker({ label, value, onChange, sizeValue, onSizeChange, colorValue, onColorChange, bold, italic, underline, onBold, onItalic, onUnderline }: {
  label: string;
  value?: string; onChange: (v: string) => void;
  sizeValue?: number; onSizeChange?: (v: number) => void;
  colorValue?: string; onColorChange?: (v: string) => void;
  bold?: boolean; italic?: boolean; underline?: boolean;
  onBold?: (v: boolean) => void; onItalic?: (v: boolean) => void; onUnderline?: (v: boolean) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="admin-label">{label}</label>
      <div className="flex gap-1.5 flex-wrap items-center">
        <FontSelect value={value || 'inherit'} onChange={onChange} previewText="Sample Text" previewSize={sizeValue || 14} previewColor={colorValue} className="flex-1 min-w-0" />
        {onSizeChange && (
          <input type="number" min={8} max={48} className="admin-input text-xs w-16" value={sizeValue || 0}
            onChange={(e) => onSizeChange(parseInt(e.target.value) || 0)} title="Font size" />
        )}
        {(onBold || onItalic || onUnderline) && (
          <StyleToggles bold={bold} italic={italic} underline={underline} onBold={onBold} onItalic={onItalic} onUnderline={onUnderline} />
        )}
      </div>
      {onColorChange && (
        <div className="flex gap-1 flex-wrap items-center">
          {SWATCH.map((c) => (
            <button key={c} onClick={() => onColorChange(c)}
              className="w-5 h-5 rounded-full border-2 transition" title={c}
              style={{ background: c, borderColor: colorValue === c ? '#3a2e22' : 'transparent' }} />
          ))}
          <input type="color" value={colorValue || '#5a4430'} onChange={(e) => onColorChange(e.target.value)}
            className="w-5 h-5 rounded border cursor-pointer" style={{ borderColor: '#d6cdbf' }} />
        </div>
      )}
    </div>
  );
}

export default function EntourageManager() {
  const [config, setConfig] = useState<EntourageConfig | null>(null);
  const [pageId, setPageId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('pages').select('id, config').eq('template', 'entourage').maybeSingle();
      if (data) {
        setPageId(data.id);
        const cfg = (data.config as EntourageConfig) || { title: 'Bridal Entourage', sections: [] };
        if (!cfg.sections?.length) {
          cfg.sections = [{ title: 'Principal Sponsors', font_family: 'inherit', font_size: 15, font_color: '#5a4430', blocks: [{ sub_header: '', sub_header_font_family: 'inherit', sub_header_font_color: '#a07c4a', sub_header_font_size: 11, columns: [
            { label: "Groom's Side", side: 'groom', names: [], label_font_family: 'inherit', label_font_color: '#8a6d3b', label_font_size: 11, name_font_family: 'inherit', name_font_color: '#5a4430', name_font_size: 14 },
            { label: "Bride's Side", side: 'bride', names: [], label_font_family: 'inherit', label_font_color: '#8a6d3b', label_font_size: 11, name_font_family: 'inherit', name_font_color: '#5a4430', name_font_size: 14 },
          ]}] }];
        }
        setConfig(cfg);
      }
      setLoading(false);
    })();
  }, []);

  const clone = useCallback(<T,>(v: T): T => JSON.parse(JSON.stringify(v)), []);

  const update = (updater: (draft: EntourageConfig) => void) => {
    setConfig((prev) => { if (!prev) return prev; const d = clone(prev); updater(d); return d; });
  };

  const save = async () => {
    if (!config || !pageId) return;
    setSaving(true);
    await supabase.from('pages').update({ config }).eq('id', pageId);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const addSection = () => update((d) => {
    d.sections.push({ title: 'New Section', font_family: 'inherit', font_size: 15, font_color: '#5a4430', blocks: [{ sub_header: '', sub_header_font_family: 'inherit', sub_header_font_color: '#a07c4a', sub_header_font_size: 11, columns: [
      { label: "Groom's Side", side: 'groom', names: [], label_font_family: 'inherit', label_font_color: '#8a6d3b', label_font_size: 11, name_font_family: 'inherit', name_font_color: '#5a4430', name_font_size: 14 },
      { label: "Bride's Side", side: 'bride', names: [], label_font_family: 'inherit', label_font_color: '#8a6d3b', label_font_size: 11, name_font_family: 'inherit', name_font_color: '#5a4430', name_font_size: 14 },
    ]}] });
  });

  const moveSection = (i: number, dir: -1 | 1) => update((d) => { const ni = i + dir; if (ni < 0 || ni >= d.sections.length) return; [d.sections[i], d.sections[ni]] = [d.sections[ni], d.sections[i]]; });
  const removeSection = (i: number) => update((d) => { d.sections.splice(i, 1); });

  const makeColumns = (count: number): EntourageColumn[] => {
    const base = { names: [], label_font_family: 'inherit', label_font_color: '#8a6d3b', label_font_size: 11, name_font_family: 'inherit', name_font_color: '#5a4430', name_font_size: 14 } as EntourageColumn;
    if (count === 1) return [{ ...base, label: 'Names', side: 'neutral' }];
    if (count === 3) return [
      { ...base, label: "Groom's Side", side: 'groom' },
      { ...base, label: 'Center', side: 'neutral' },
      { ...base, label: "Bride's Side", side: 'bride' },
    ];
    return [
      { ...base, label: "Groom's Side", side: 'groom' },
      { ...base, label: "Bride's Side", side: 'bride' },
    ];
  };

  const addBlock = (si: number, cols = 2) => update((d) => {
    d.sections[si].blocks.push({ sub_header: '', sub_header_font_family: 'inherit', sub_header_font_color: '#a07c4a', sub_header_font_size: 11, columns: makeColumns(cols) });
  });
  const moveBlock = (si: number, bi: number, dir: -1 | 1) => update((d) => { const bl = d.sections[si].blocks; const ni = bi + dir; if (ni < 0 || ni >= bl.length) return; [bl[bi], bl[ni]] = [bl[ni], bl[bi]]; });
  const removeBlock = (si: number, bi: number) => update((d) => { d.sections[si].blocks.splice(bi, 1); });

  const updateCol = (si: number, bi: number, ci: number, patch: Partial<EntourageColumn>) => update((d) => { d.sections[si].blocks[bi].columns[ci] = { ...d.sections[si].blocks[bi].columns[ci], ...patch }; });
  const addName = (si: number, bi: number, ci: number) => update((d) => { d.sections[si].blocks[bi].columns[ci].names.push(''); });
  const updateName = (si: number, bi: number, ci: number, ni: number, val: string) => update((d) => { d.sections[si].blocks[bi].columns[ci].names[ni] = val; });
  const removeName = (si: number, bi: number, ci: number, ni: number) => update((d) => { d.sections[si].blocks[bi].columns[ci].names.splice(ni, 1); });

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8a6d3b]" /></div>;

  return (
    <div>
      <SectionHeader title="Entourage" subtitle="Customize your bridal party with full font and color control"
        action={
          <button onClick={save} disabled={saving || !config} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {saved ? 'Saved!' : 'Save'}
          </button>
        } />

      {config && (
        <>
          <Card className="mb-4">
            <label className="admin-label">Page Title</label>
            <input className="admin-input" value={config.title} onChange={(e) => update((d) => { d.title = e.target.value; })} placeholder="Bridal Entourage" />
          </Card>

          {config.sections.map((sec, si) => (
            <Card key={si} className="mb-4">
              {/* Section controls */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: '#f0e8d8', color: '#8a6d3b' }}>Section {si + 1}</span>
                  <div className="flex gap-0.5">
                    <button onClick={() => moveSection(si, -1)} disabled={si === 0} className="p-1 rounded hover:bg-[#f0e8d8] disabled:opacity-30"><ChevronUp size={14} className="text-[#8a7a66]" /></button>
                    <button onClick={() => moveSection(si, 1)} disabled={si === config.sections.length - 1} className="p-1 rounded hover:bg-[#f0e8d8] disabled:opacity-30"><ChevronDown size={14} className="text-[#8a7a66]" /></button>
                  </div>
                </div>
                <button onClick={() => removeSection(si)} className="p-1 rounded hover:bg-[#fbe9e9]"><Trash2 size={14} className="text-[#c9b896] hover:text-[#b03a3a]" /></button>
              </div>

              <input className="admin-input mb-3" value={sec.title} onChange={(e) => update((d) => { d.sections[si].title = e.target.value; })} placeholder="Section title (e.g. Principal Sponsors)" />

              <div className="rounded-lg border p-3 mb-3" style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
                <p className="text-xs font-semibold text-[#3a2e22] mb-2 flex items-center gap-1"><Type size={12} /> Section Title Style</p>
                <FontPicker label="" value={sec.font_family} onChange={(v) => update((d) => { d.sections[si].font_family = v; })}
                  sizeValue={sec.font_size} onSizeChange={(v) => update((d) => { d.sections[si].font_size = v; })}
                  colorValue={sec.font_color} onColorChange={(v) => update((d) => { d.sections[si].font_color = v; })}
                  bold={sec.bold} italic={sec.italic} underline={sec.underline}
                  onBold={(v) => update((d) => { d.sections[si].bold = v; })}
                  onItalic={(v) => update((d) => { d.sections[si].italic = v; })}
                  onUnderline={(v) => update((d) => { d.sections[si].underline = v; })} />
              </div>

              {/* Blocks */}
              {sec.blocks.map((block, bi) => (
                <div key={bi} className="rounded-lg border p-3 mb-3" style={{ borderColor: '#e6ddcd', background: '#fff' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8a7a66]">Block {bi + 1}</span>
                    <div className="flex gap-0.5">
                      <button onClick={() => moveBlock(si, bi, -1)} disabled={bi === 0} className="p-1 rounded hover:bg-[#f0e8d8] disabled:opacity-30"><ChevronUp size={12} className="text-[#8a7a66]" /></button>
                      <button onClick={() => moveBlock(si, bi, 1)} disabled={bi === sec.blocks.length - 1} className="p-1 rounded hover:bg-[#f0e8d8] disabled:opacity-30"><ChevronDown size={12} className="text-[#8a7a66]" /></button>
                      <button onClick={() => removeBlock(si, bi)} className="p-1 rounded hover:bg-[#fbe9e9]"><Trash2 size={12} className="text-[#c9b896] hover:text-[#b03a3a]" /></button>
                    </div>
                  </div>

                  <input className="admin-input text-sm mb-2" value={block.sub_header} onChange={(e) => update((d) => { d.sections[si].blocks[bi].sub_header = e.target.value; })} placeholder="Sub-header (e.g. To Stand as Witness)" />

                  <div className="rounded border p-2 mb-2" style={{ borderColor: '#f0e8d8', background: '#faf6ee' }}>
                    <p className="text-[10px] font-semibold text-[#5a4430] mb-1.5">Sub-Header Style</p>
                    <FontPicker label="" value={block.sub_header_font_family} onChange={(v) => update((d) => { d.sections[si].blocks[bi].sub_header_font_family = v; })}
                      sizeValue={block.sub_header_font_size} onSizeChange={(v) => update((d) => { d.sections[si].blocks[bi].sub_header_font_size = v; })}
                      colorValue={block.sub_header_font_color} onColorChange={(v) => update((d) => { d.sections[si].blocks[bi].sub_header_font_color = v; })}
                      bold={block.sub_header_bold} italic={block.sub_header_italic} underline={block.sub_header_underline}
                      onBold={(v) => update((d) => { d.sections[si].blocks[bi].sub_header_bold = v; })}
                      onItalic={(v) => update((d) => { d.sections[si].blocks[bi].sub_header_italic = v; })}
                      onUnderline={(v) => update((d) => { d.sections[si].blocks[bi].sub_header_underline = v; })} />
                  </div>

                  {/* Columns */}
                  <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${block.columns.length}, 1fr)` }}>
                    {block.columns.map((col, ci) => (
                      <div key={ci} className="rounded border p-2" style={{ borderColor: '#f0e8d8', background: '#fcfaf6' }}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{
                            background: col.side === 'groom' ? '#e8f0e4' : col.side === 'bride' ? '#fce8f0' : '#f0e8d8',
                            color: col.side === 'groom' ? '#5a7a4a' : col.side === 'bride' ? '#b5462f' : '#8a6d3b',
                          }}>{col.side || 'neutral'}</span>
                        </div>
                        <input className="admin-input text-xs mb-2" value={col.label} onChange={(e) => updateCol(si, bi, ci, { label: e.target.value })} placeholder="Label (e.g. Best Man)" />
                        <div className="rounded border p-1.5 mb-2" style={{ borderColor: '#f0e8d8', background: '#fff' }}>
                          <p className="text-[10px] font-semibold text-[#5a4430] mb-1">Label Style</p>
                          <FontPicker label="" value={col.label_font_family} onChange={(v) => updateCol(si, bi, ci, { label_font_family: v })}
                            sizeValue={col.label_font_size} onSizeChange={(v) => updateCol(si, bi, ci, { label_font_size: v })}
                            colorValue={col.label_font_color} onColorChange={(v) => updateCol(si, bi, ci, { label_font_color: v })}
                            bold={col.label_bold} italic={col.label_italic} underline={col.label_underline}
                            onBold={(v) => updateCol(si, bi, ci, { label_bold: v })}
                            onItalic={(v) => updateCol(si, bi, ci, { label_italic: v })}
                            onUnderline={(v) => updateCol(si, bi, ci, { label_underline: v })} />
                        </div>
                        <div className="rounded border p-1.5 mb-2" style={{ borderColor: '#f0e8d8', background: '#fff' }}>
                          <p className="text-[10px] font-semibold text-[#5a4430] mb-1">Name Style</p>
                          <FontPicker label="" value={col.name_font_family} onChange={(v) => updateCol(si, bi, ci, { name_font_family: v })}
                            sizeValue={col.name_font_size} onSizeChange={(v) => updateCol(si, bi, ci, { name_font_size: v })}
                            colorValue={col.name_font_color} onColorChange={(v) => updateCol(si, bi, ci, { name_font_color: v })}
                            bold={col.name_bold} italic={col.name_italic} underline={col.name_underline}
                            onBold={(v) => updateCol(si, bi, ci, { name_bold: v })}
                            onItalic={(v) => updateCol(si, bi, ci, { name_italic: v })}
                            onUnderline={(v) => updateCol(si, bi, ci, { name_underline: v })} />
                        </div>
                        <div className="space-y-1">
                          {col.names.map((name, ni) => (
                            <div key={ni} className="flex gap-1">
                              <input className="admin-input text-xs flex-1" value={name} onChange={(e) => updateName(si, bi, ci, ni, e.target.value)} placeholder="Name" />
                              <button onClick={() => removeName(si, bi, ci, ni)} className="p-1 rounded hover:bg-[#fbe9e9]"><Trash2 size={11} className="text-[#c9b896] hover:text-[#b03a3a]" /></button>
                            </div>
                          ))}
                          <button onClick={() => addName(si, bi, ci)} className="text-xs text-[#8a6d3b] hover:underline flex items-center gap-1"><Plus size={11} /> Add name</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={() => addBlock(si, 1)} className="btn-ghost text-xs flex items-center gap-1"><Plus size={12} /> Add 1-column block</button>
              <button onClick={() => addBlock(si, 2)} className="btn-ghost text-xs flex items-center gap-1"><Plus size={12} /> Add 2-column block</button>
              <button onClick={() => addBlock(si, 3)} className="btn-ghost text-xs flex items-center gap-1"><Plus size={12} /> Add 3-column block</button>
            </Card>
          ))}
          <button onClick={addSection} className="btn-ghost flex items-center gap-1.5"><Plus size={14} /> Add Section</button>
        </>
      )}
    </div>
  );
}
