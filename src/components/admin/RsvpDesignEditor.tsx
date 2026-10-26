import type { CSSProperties } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { FontSelect } from '@/components/admin/FontSelect';
import type { RsvpDesign, RsvpTextElement } from '@/lib/rsvpDesign';
import { DEFAULT_RSVP_DESIGN, resolveRsvpDesign, rsvpButtonStyle, rsvpTextStyle } from '@/lib/rsvpDesign';

interface RsvpDesignEditorProps {
  value: RsvpDesign;
  onChange: (value: RsvpDesign) => void;
}

const TEXT_FIELDS: { key: RsvpTextElement; label: string; sample: string }[] = [
  { key: 'pretitle', label: 'Small RSVP Label', sample: 'RSVP' },
  { key: 'title', label: 'Main Heading', sample: 'RSVP for Your Self' },
  { key: 'intro', label: 'Intro Message', sample: 'Choose your name to begin.' },
  { key: 'instruction', label: 'Search Instruction', sample: 'Find your name to begin:' },
  { key: 'guestName', label: 'Guest Name', sample: 'Mark Doronila' },
  { key: 'guestStatus', label: 'Guest Status', sample: 'CONFIRMED' },
  { key: 'questionMeta', label: 'Question Details', sample: 'Question 1 of 4' },
  { key: 'questionTitle', label: 'Question Heading', sample: 'Will you join us?' },
  { key: 'questionHint', label: 'Question Hint', sample: 'Please select one option.' },
  { key: 'requiredLabel', label: 'Required / Optional Label', sample: 'Required' },
  { key: 'thankYouTitle', label: 'Thank-You Heading', sample: 'Thank you' },
  { key: 'thankYouMessage', label: 'Thank-You Message', sample: 'Your RSVP has been received.' },
];

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const safeColor = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000';
  return (
    <div>
      <label className="admin-label">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={safeColor} onChange={(event) => onChange(event.target.value)} className="w-10 h-10 rounded border cursor-pointer" style={{ borderColor: '#e6ddcd' }} />
        <input type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder="#5a4430" className="admin-input flex-1 font-mono text-xs" />
      </div>
    </div>
  );
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div>
      <label className="admin-label">{label}: {value}px</label>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-[#8a6d3b]" />
    </div>
  );
}

export default function RsvpDesignEditor({ value, onChange }: RsvpDesignEditorProps) {
  const design = resolveRsvpDesign(value);
  const updateText = (key: RsvpTextElement, patch: Record<string, string | number>) => {
    onChange(resolveRsvpDesign({ ...design, text: { ...design.text, [key]: { ...design.text[key], ...patch } } }));
  };
  const updateButton = (patch: Record<string, string | number>) => {
    onChange(resolveRsvpDesign({ ...design, button: { ...design.button, ...patch } }));
  };
  const reset = () => onChange(resolveRsvpDesign(DEFAULT_RSVP_DESIGN));

  return (
    <div className="rounded-lg border p-3 space-y-4" style={{ borderColor: '#d6cdbf', background: '#faf6ee' }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-[#8a6d3b]" />
            <h3 className="font-semibold text-sm text-[#3a2e22]">RSVP Page Design</h3>
          </div>
          <p className="text-xs text-[#8a7a66] mt-1">Customize the public RSVP page one element at a time.</p>
        </div>
        <button onClick={reset} className="btn-ghost text-xs inline-flex items-center gap-1.5"><RotateCcw size={13} /> Reset Design</button>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8a6d3b]">Page and card colors</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ColorField label="Page Background" value={design.pageBackgroundColor} onChange={(pageBackgroundColor) => onChange({ ...design, pageBackgroundColor })} />
          <ColorField label="Card Background" value={design.cardBackgroundColor} onChange={(cardBackgroundColor) => onChange({ ...design, cardBackgroundColor })} />
          <ColorField label="Card Border" value={design.cardBorderColor} onChange={(cardBorderColor) => onChange({ ...design, cardBorderColor })} />
          <ColorField label="Input Background" value={design.inputBackgroundColor} onChange={(inputBackgroundColor) => onChange({ ...design, inputBackgroundColor })} />
          <ColorField label="Input Border" value={design.inputBorderColor} onChange={(inputBorderColor) => onChange({ ...design, inputBorderColor })} />
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8a6d3b]">Text styles</h4>
        <div className="space-y-2">
          {TEXT_FIELDS.map(({ key, label, sample }) => {
            const style = design.text[key] || {};
            return (
              <details key={key} className="rounded-lg border bg-white/60" style={{ borderColor: '#e6ddcd' }}>
                <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-3 py-2 text-sm text-[#5a4430]">
                  <span>{label}</span>
                  <span style={rsvpTextStyle(design, key)} className="truncate max-w-[48%]">{sample}</span>
                </summary>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border-t" style={{ borderColor: '#e6ddcd' }}>
                  <div className="md:col-span-2"><label className="admin-label">Font</label><FontSelect value={style.fontFamily} onChange={(fontFamily) => updateText(key, { fontFamily })} previewText={sample} previewSize={style.fontSize || 16} previewColor={style.color} /></div>
                  <NumberField label="Size" value={style.fontSize || 16} min={10} max={64} onChange={(fontSize) => updateText(key, { fontSize })} />
                  <ColorField label="Text Color" value={style.color || '#3a2e22'} onChange={(color) => updateText(key, { color })} />
                  <div><label className="admin-label">Weight</label><select className="admin-input" value={style.fontWeight || 400} onChange={(event) => updateText(key, { fontWeight: Number(event.target.value) })}><option value={400}>Regular</option><option value={500}>Medium</option><option value={600}>Semibold</option><option value={700}>Bold</option></select></div>
                </div>
              </details>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8a6d3b]">All RSVP buttons</h4>
        <p className="text-xs text-[#8a7a66]">This style is used for Search, RSVP, Edit, Back, Next, Submit, and RSVP for Another Member.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><label className="admin-label">Button Font</label><FontSelect value={design.button.fontFamily} onChange={(fontFamily) => updateButton({ fontFamily })} previewText="RSVP" previewSize={design.button.fontSize || 13} previewColor={design.button.color} /></div>
          <NumberField label="Text Size" value={design.button.fontSize || 13} min={10} max={24} onChange={(fontSize) => updateButton({ fontSize })} />
          <div><label className="admin-label">Button Size</label><select className="admin-input" value={design.button.size || 'medium'} onChange={(event) => updateButton({ size: event.target.value })}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></div>
          <ColorField label="Background Color" value={design.button.backgroundColor || '#8a6d3b'} onChange={(backgroundColor) => updateButton({ backgroundColor })} />
          <ColorField label="Text Color" value={design.button.color || '#ffffff'} onChange={(color) => updateButton({ color })} />
          <ColorField label="Border Color" value={design.button.borderColor || '#8a6d3b'} onChange={(borderColor) => updateButton({ borderColor })} />
          <NumberField label="Corner Radius" value={design.button.borderRadius || 0} min={0} max={40} onChange={(borderRadius) => updateButton({ borderRadius })} />
        </div>
        <div className="rounded-lg p-4 flex items-center justify-center" style={{ background: design.cardBackgroundColor }}>
          <button type="button" style={rsvpButtonStyle(design) as CSSProperties}>RSVP</button>
        </div>
      </div>
    </div>
  );
}
