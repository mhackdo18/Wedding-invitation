import { useRef, useCallback, useEffect } from 'react';
import { Bold, Italic, Underline, AlignCenter, AlignLeft, AlignRight, AlignJustify } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  rows?: number;
}

export default function RichTextEditor({ value, onChange, placeholder, rows = 6 }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!isInternalChange.current && value !== el.innerHTML) {
      el.innerHTML = value || '';
    }
    isInternalChange.current = false;
  }, [value]);

  const exec = useCallback((command: string) => {
    document.execCommand(command, false);
    if (ref.current) {
      isInternalChange.current = true;
      onChange(ref.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (ref.current) {
      isInternalChange.current = true;
      onChange(ref.current.innerHTML);
    }
  }, [onChange]);

  const btn = (icon: React.ReactNode, command: string, label: string) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); exec(command); }}
      className="w-8 h-8 flex items-center justify-center rounded transition hover:bg-[#f0e8d8] text-[#5a4430]"
      title={label}
    >
      {icon}
    </button>
  );

  return (
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#d6cdbf' }}>
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b" style={{ borderColor: '#e6ddcd', background: '#faf6ee' }}>
        {btn(<Bold size={15} />, 'bold', 'Bold')}
        {btn(<Italic size={15} />, 'italic', 'Italic')}
        {btn(<Underline size={15} />, 'underline', 'Underline')}
        <span className="w-px h-5 mx-1" style={{ background: '#d6cdbf' }} />
        {btn(<AlignLeft size={15} />, 'justifyLeft', 'Align left')}
        {btn(<AlignCenter size={15} />, 'justifyCenter', 'Align center')}
        {btn(<AlignRight size={15} />, 'justifyRight', 'Align right')}
        {btn(<AlignJustify size={15} />, 'justifyFull', 'Justify')}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        className="px-3 py-2 text-sm outline-none prose-sm"
        style={{ minHeight: `${rows * 28}px`, lineHeight: 1.5, color: '#3a3a3a', fontFamily: "Georgia, 'Times New Roman', serif" }}
      />
    </div>
  );
}
