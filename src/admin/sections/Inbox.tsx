import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SectionHeader, EmptyState, ConfirmButton } from '@/admin/ui';
import { Mail, Loader2, RefreshCw, Trash2 } from 'lucide-react';

interface MessageRow {
  id: string;
  answer: string | null;
  created_at: string;
  guest: { name: string } | null;
  question: { label: string } | null;
}

export default function Inbox() {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: questions } = await supabase
      .from('rsvp_questions')
      .select('id')
      .eq('question_type', 'message');
    if (!questions || questions.length === 0) {
      setMessages([]);
      setLoading(false);
      return;
    }
    const questionIds = questions.map((q) => q.id);
    const { data, error } = await supabase
      .from('rsvp_answers')
      .select(`
        id, answer, created_at,
        guest:guests ( name ),
        question:rsvp_questions ( label )
      `)
      .in('question_id', questionIds)
      .not('answer', 'is', null)
      .order('created_at', { ascending: false });
    if (error) {
      setLoading(false);
      return;
    }
    setMessages((data || []) as unknown as MessageRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const deleteMessage = async (id: string) => {
    await supabase.from('rsvp_answers').delete().eq('id', id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  const extractMessage = (raw: string | null): string => {
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.value !== undefined) return String(parsed.value);
      if (typeof parsed === 'string') return parsed;
    } catch { /* not JSON */ }
    return raw;
  };

  return (
    <div>
      <SectionHeader
        title="Inbox"
        subtitle="Messages from your guests"
        action={
          <button onClick={load} className="btn-ghost flex items-center gap-1.5">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8a6d3b]" /></div>
      ) : messages.length === 0 ? (
        <div className="admin-card p-4">
          <EmptyState icon={Mail} title="No messages from guests yet." hint="Messages will appear here when guests submit their RSVP." />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {messages.map((msg) => {
            const text = extractMessage(msg.answer);
            if (!text.trim()) return null;
            return (
              <div key={msg.id} className="admin-card p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: '#f0e8d8' }}>
                      <Mail size={16} className="text-[#8a6d3b]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#3a2e22] leading-tight">{msg.guest?.name || 'Unknown Guest'}</p>
                      {msg.question?.label && <p className="text-[10px] text-[#a07c4a] uppercase tracking-wider mt-0.5">{msg.question.label}</p>}
                    </div>
                  </div>
                  <ConfirmButton onConfirm={() => deleteMessage(msg.id)}>
                    <Trash2 size={14} className="text-[#c9b896] hover:text-[#b03a3a] transition" />
                  </ConfirmButton>
                </div>
                <p className="text-sm text-[#5a4430] leading-relaxed whitespace-pre-wrap flex-1 mt-1">{text}</p>
                <p className="text-[10px] text-[#a07c4a] mt-3 pt-2 border-t" style={{ borderColor: '#e6ddcd' }}>{formatDate(msg.created_at)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
