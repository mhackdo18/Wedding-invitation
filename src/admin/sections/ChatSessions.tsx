import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Eraser, Loader2, MessageCircle, RefreshCw, Search, Send, Trash2, UserRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ConfirmButton, EmptyState } from '@/admin/ui';
import type { ChatMessage } from '@/types';

interface SessionRow {
  session_id: string;
  name: string | null;
  message_count: number;
  last_message_at: string;
  first_message_at: string;
  preview: string | null;
}

interface ChatRow {
  session_id: string;
  name: string | null;
  message: string;
  role: string;
  created_at: string;
}

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const formatDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export default function ChatSessions() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [search, setSearch] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retentionDays, setRetentionDays] = useState(30);
  const [cleanResult, setCleanResult] = useState<string | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('chat_messages')
      .select('session_id, name, message, role, created_at')
      .order('created_at', { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const grouped = new Map<string, SessionRow>();
    for (const row of (data || []) as ChatRow[]) {
      const existing = grouped.get(row.session_id);
      if (!existing) {
        grouped.set(row.session_id, {
          session_id: row.session_id,
          name: row.role === 'visitor' ? row.name : null,
          message_count: 1,
          first_message_at: row.created_at,
          last_message_at: row.created_at,
          preview: row.message,
        });
        continue;
      }
      existing.message_count += 1;
      if (row.created_at < existing.first_message_at) existing.first_message_at = row.created_at;
      if (row.created_at > existing.last_message_at) {
        existing.last_message_at = row.created_at;
        existing.preview = row.message;
      }
      if (!existing.name && row.name) existing.name = row.name;
    }

    const sorted = Array.from(grouped.values()).sort(
      (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
    );
    setSessions(sorted);
    setSelectedSession((current) => current ? sorted.find((session) => session.session_id === current.session_id) || current : sorted[0] || null);
    setLoading(false);
  }, []);

  const loadHistory = useCallback(async (sessionId: string) => {
    setHistoryLoading(true);
    const { data, error: historyError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (historyError) setError(historyError.message);
    else setHistory((data as ChatMessage[]) || []);
    setHistoryLoading(false);
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    if (selectedSession) loadHistory(selectedSession.session_id);
    else setHistory([]);
  }, [selectedSession, loadHistory]);

  useEffect(() => {
    const list = messageListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [history, historyLoading]);

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sessions;
    return sessions.filter((session) =>
      (session.name || 'Anonymous Guest').toLowerCase().includes(query) ||
      (session.preview || '').toLowerCase().includes(query),
    );
  }, [search, sessions]);

  const sendReply = async () => {
    const message = reply.trim();
    if (!message || !selectedSession || sending) return;
    setSending(true);
    setError(null);
    const { data, error: sendError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: selectedSession.session_id,
        role: 'bot',
        name: 'Admin',
        message,
      })
      .select()
      .maybeSingle();

    if (sendError) {
      setError(sendError.message);
    } else if (data) {
      setHistory((current) => [...current, data as ChatMessage]);
      setReply('');
      await loadSessions();
    }
    setSending(false);
  };

  const deleteSession = async (sessionId: string) => {
    const { error: deleteError } = await supabase.from('chat_messages').delete().eq('session_id', sessionId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    const next = sessions.filter((session) => session.session_id !== sessionId);
    setSessions(next);
    setSelectedSession((current) => current?.session_id === sessionId ? next[0] || null : current);
  };

  const clearAll = async () => {
    const { error: deleteError } = await supabase.from('chat_messages').delete().neq('session_id', '');
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setSessions([]);
    setSelectedSession(null);
    setHistory([]);
  };

  const cleanupOldSessions = async () => {
    setCleaning(true);
    setCleanResult(null);
    const { data, error: cleanupError } = await supabase.rpc('cleanup_old_chat_messages', { retention_days: retentionDays });
    if (cleanupError) setError(cleanupError.message);
    else {
      const deleted = typeof data === 'number' ? data : 0;
      setCleanResult(`${deleted} ${deleted === 1 ? 'message' : 'messages'} removed from inactive sessions`);
      await loadSessions();
    }
    setCleaning(false);
  };

  return (
    <div className="h-[calc(100vh-7rem)] min-h-0 flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#2f3338]">Chat Sessions</h1>
          <p className="text-sm text-[#7f858c] mt-0.5">Review guest conversations and send a helpful correction when needed.</p>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-[#9a8f82]">
            <span>Delete sessions inactive for</span>
            <input type="number" min={1} max={365} value={retentionDays} onChange={(event) => setRetentionDays(Math.max(1, Math.min(365, Number(event.target.value) || 30)))} className="admin-input w-14 text-center text-xs py-1" />
            <span>days</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={loadSessions} className="btn-ghost flex items-center gap-1.5" title="Refresh conversations">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={cleanupOldSessions} disabled={cleaning || sessions.length === 0} className="btn-ghost flex items-center gap-1.5 disabled:opacity-40" title={`Delete sessions inactive for ${retentionDays} days`}>
            {cleaning ? <Loader2 size={14} className="animate-spin" /> : <Eraser size={14} />}
            Clean up
          </button>
          {sessions.length > 0 && <ConfirmButton onConfirm={clearAll} className="flex items-center gap-1.5"><Trash2 size={14} /> Clear all</ConfirmButton>}
        </div>
      </div>

      {cleanResult && <p className="text-xs text-[#5a7a4a] mb-3">{cleanResult}</p>}
      {error && <div className="admin-card p-3 mb-3 flex items-center gap-2" style={{ background: '#fdf0f0', borderColor: '#e8b4b4' }}><AlertTriangle size={16} className="text-[#b03a3a]" /><p className="text-sm text-[#b03a3a]">{error}</p></div>}

      <div className="admin-card flex-1 min-h-0 overflow-hidden flex flex-col lg:flex-row">
        <aside className="w-full lg:w-[340px] shrink-0 min-h-0 border-b lg:border-b-0 lg:border-r flex flex-col" style={{ borderColor: '#e6ddcd', background: '#fffdf9' }}>
          <div className="p-4 border-b" style={{ borderColor: '#eee7dc' }}>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a5aa]" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" className="admin-input pl-9" />
            </div>
            <p className="text-[11px] text-[#9a8f82] mt-3">{sessions.length} {sessions.length === 1 ? 'conversation' : 'conversations'}</p>
          </div>
          <div className="flex-1 overflow-y-auto thin-scroll">
            {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8a6d3b]" /></div> : filteredSessions.length === 0 ? <EmptyState icon={MessageCircle} title="No conversations found" hint={search ? 'Try a different search.' : 'Guest messages will appear here.'} /> : filteredSessions.map((session) => {
              const active = selectedSession?.session_id === session.session_id;
              return (
                <button key={session.session_id} onClick={() => setSelectedSession(session)} className="w-full text-left px-4 py-4 border-b transition" style={{ borderColor: '#eee7dc', background: active ? '#f1f1f1' : 'transparent' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center" style={{ background: active ? '#e2e2e2' : '#ececeb' }}><UserRound size={17} className="text-white" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2"><p className="font-semibold text-sm text-[#30343a] truncate">{session.name || 'Anonymous Guest'}</p><span className="text-[11px] text-[#777e85] shrink-0">{formatTime(session.last_message_at)}</span></div>
                      <p className="text-xs text-[#69717a] mt-1 line-clamp-2 leading-relaxed">{session.preview || 'No message preview'}</p>
                      <p className="text-[11px] text-[#83a99e] mt-2">{session.message_count} {session.message_count === 1 ? 'message' : 'messages'}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex-1 min-w-0 min-h-0 flex flex-col bg-white">
          {!selectedSession ? <EmptyState icon={MessageCircle} title="Select a conversation" hint="Choose a guest from the left to read the full conversation." /> : <>
            <header className="px-5 py-4 border-b flex items-center justify-between gap-3" style={{ borderColor: '#eee7dc' }}>
              <div className="flex items-center gap-3 min-w-0"><div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#ececeb' }}><UserRound size={17} className="text-white" /></div><div className="min-w-0"><h2 className="font-bold text-[#30343a] truncate">{selectedSession.name || 'Anonymous Guest'}</h2><p className="text-xs text-[#92979c]">{selectedSession.message_count} messages · Started {formatDay(selectedSession.first_message_at)}</p></div></div>
              <ConfirmButton onConfirm={() => deleteSession(selectedSession.session_id)} className="p-2" aria-label="Delete conversation"><Trash2 size={15} /></ConfirmButton>
            </header>

            <div ref={messageListRef} className="flex-1 overflow-y-auto thin-scroll px-5 py-5 space-y-5">
              {historyLoading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8a6d3b]" /></div> : history.map((message, index) => {
                const previous = history[index - 1];
                const showDay = !previous || formatDay(previous.created_at) !== formatDay(message.created_at);
                const fromGuest = message.role === 'visitor';
                return <div key={message.id}>
                  {showDay && <p className="text-center text-xs text-[#858b91] mb-4">{formatDay(message.created_at)}</p>}
                  <div className={`flex ${fromGuest ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[78%] ${fromGuest ? 'items-start' : 'items-end'} flex flex-col gap-1`}>
                      <div className="flex items-center gap-2 text-[11px] text-[#8a9096]"><span>{fromGuest ? (message.name || 'Guest') : (message.name || 'Assistant')}</span><span>{formatTime(message.created_at)}</span></div>
                      <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed" style={fromGuest ? { background: '#f2f3f4', color: '#394047', borderTopLeftRadius: 5 } : { background: '#e7f1fb', color: '#33404d', borderTopRightRadius: 5 }}><span style={{ whiteSpace: 'pre-wrap' }}>{message.message}</span></div>
                    </div>
                  </div>
                </div>;
              })}
            </div>

            <div className="border-t p-4" style={{ borderColor: '#eee7dc' }}>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #dfe3e7' }}>
                <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: 'linear-gradient(90deg, #d9f5ed, #e3dcfa)' }}><span className="text-xs font-semibold text-[#30343a]">Manual reply</span><span className="text-[11px] text-[#7662c4]">Sent to guest chat</span></div>
                <textarea value={reply} onChange={(event) => setReply(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendReply(); } }} placeholder="Write a message" rows={3} disabled={sending} className="w-full resize-none border-0 px-4 py-3 text-sm text-[#394047] outline-none placeholder:text-[#aeb4ba]" />
                <div className="flex justify-end px-3 pb-3"><button onClick={sendReply} disabled={sending || !reply.trim()} className="btn-primary flex items-center gap-2 disabled:opacity-40"><Send size={14} /> {sending ? 'Sending...' : 'Send reply'}</button></div>
              </div>
              <p className="text-[11px] text-[#9a9fa4] mt-2">Press Enter to send · Shift + Enter for a new line</p>
            </div>
          </>}
        </section>
      </div>

    </div>
  );
}
