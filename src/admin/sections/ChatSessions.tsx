import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SectionHeader, EmptyState, ConfirmButton } from '@/admin/ui';
import { MessageCircle, Loader2, RefreshCw, Trash2, AlertTriangle, Clock, Eraser, ArrowLeft, Send } from 'lucide-react';
import type { ChatMessage } from '@/types';

interface SessionRow {
  session_id: string;
  name: string | null;
  message_count: number;
  last_message_at: string;
  first_message_at: string;
  preview: string | null;
}

export default function ChatSessions() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retentionDays, setRetentionDays] = useState(30);
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('chat_messages')
        .select('session_id, name, message, role, created_at')
        .order('created_at', { ascending: false });

      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setSessions([]);
        setLoading(false);
        return;
      }

      const grouped = new Map<string, SessionRow>();
      for (const row of data as Array<{ session_id: string; name: string | null; message: string; role: string; created_at: string }>) {
        const existing = grouped.get(row.session_id);
        if (!existing) {
          grouped.set(row.session_id, {
            session_id: row.session_id,
            name: row.role === 'visitor' ? row.name : null,
            message_count: 1,
            first_message_at: row.created_at,
            last_message_at: row.created_at,
            preview: row.role === 'visitor' ? row.message : null,
          });
        } else {
          existing.message_count += 1;
          if (row.created_at > existing.last_message_at) {
            existing.last_message_at = row.created_at;
          }
          if (row.created_at < existing.first_message_at) {
            existing.first_message_at = row.created_at;
          }
          if (row.role === 'visitor' && !existing.name && row.name) {
            existing.name = row.name;
          }
          if (row.role === 'visitor' && !existing.preview) {
            existing.preview = row.message;
          }
        }
      }

      const sorted = Array.from(grouped.values()).sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
      setSessions(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat sessions');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadHistory = useCallback(async (sessionId: string) => {
    setHistoryLoading(true);
    const { data, error: histError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (histError) {
      setError(histError.message);
    } else {
      setHistory((data as ChatMessage[]) || []);
    }
    setHistoryLoading(false);
  }, []);

  const openHistory = (session: SessionRow) => {
    setSelectedSession(session);
    setHistory([]);
    loadHistory(session.session_id);
  };

  const closeHistory = () => {
    setSelectedSession(null);
    setHistory([]);
  };

  const deleteSession = async (sessionId: string) => {
    const { error: delError } = await supabase.from('chat_messages').delete().eq('session_id', sessionId);
    if (delError) {
      setError(delError.message);
      return;
    }
    setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
    if (selectedSession?.session_id === sessionId) {
      closeHistory();
    }
  };

  const clearAllSessions = async () => {
    const { error: delError } = await supabase.from('chat_messages').delete().neq('session_id', '');
    if (delError) {
      setError(delError.message);
      return;
    }
    setSessions([]);
    closeHistory();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  const cleanupOldMessages = async () => {
    setCleaning(true);
    setCleanResult(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('cleanup_old_chat_messages', { retention_days: retentionDays });
      if (rpcError) {
        setError(rpcError.message);
      } else {
        const deleted = typeof data === 'number' ? data : 0;
        setCleanResult(`Deleted ${deleted} old ${deleted === 1 ? 'message' : 'messages'}.`);
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cleanup failed');
    }
    setCleaning(false);
  };

  const totalMessages = sessions.reduce((sum, s) => sum + s.message_count, 0);

  if (selectedSession) {
    return (
      <div>
        <SectionHeader
          title="Chat History"
          subtitle={selectedSession.name || 'Anonymous Guest'}
          action={
            <div className="flex items-center gap-2">
              <button onClick={closeHistory} className="btn-ghost flex items-center gap-1.5">
                <ArrowLeft size={14} /> Back
              </button>
              <ConfirmButton onConfirm={() => deleteSession(selectedSession.session_id)} className="flex items-center gap-1.5 text-xs">
                <Trash2 size={14} /> Delete Session
              </ConfirmButton>
            </div>
          }
        />

        <div className="admin-card p-3 mb-4">
          <p className="text-[10px] text-[#a07c4a] uppercase tracking-wider mb-1">Session ID</p>
          <p className="text-xs text-[#8a7a66] break-all font-mono">{selectedSession.session_id}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-[#a07c4a]">
            <span>{selectedSession.message_count} {selectedSession.message_count === 1 ? 'message' : 'messages'}</span>
            <span>·</span>
            <span>Started {formatDate(selectedSession.first_message_at)}</span>
            <span>·</span>
            <span>Last {formatDate(selectedSession.last_message_at)}</span>
          </div>
        </div>

        {historyLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8a6d3b]" /></div>
        ) : history.length === 0 ? (
          <div className="admin-card p-4">
            <EmptyState icon={MessageCircle} title="No messages in this session." />
          </div>
        ) : (
          <div className="admin-card p-4 space-y-3 max-w-2xl">
            {history.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'visitor' ? 'justify-end' : 'justify-start'}`}>
                <div className="flex flex-col gap-1 max-w-[75%]">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#a07c4a]">
                    <span className="font-medium">{m.role === 'visitor' ? (m.name || 'Guest') : 'Bot'}</span>
                    <span>·</span>
                    <span>{formatDate(m.created_at)}</span>
                  </div>
                  <div
                    className="rounded-2xl px-3 py-2 text-sm"
                    style={
                      m.role === 'visitor'
                        ? { background: 'rgba(58,46,34,0.85)', color: '#fff', borderBottomRightRadius: 4 }
                        : { background: 'rgba(120,90,60,0.10)', color: '#5a4430', borderBottomLeftRadius: 4 }
                    }
                  >
                    <span style={{ whiteSpace: 'pre-wrap' }}>{m.message}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Chat Sessions"
        subtitle="View and manage guest chat conversations"
        action={
          <div className="flex items-center gap-2">
            <button onClick={load} className="btn-ghost flex items-center gap-1.5">
              <RefreshCw size={14} /> Refresh
            </button>
            {sessions.length > 0 && (
              <ConfirmButton onConfirm={clearAllSessions} className="flex items-center gap-1.5 text-xs">
                <Trash2 size={14} /> Clear All
              </ConfirmButton>
            )}
          </div>
        }
      />

      {error && (
        <div className="admin-card p-3 mb-4 flex items-center gap-2" style={{ background: '#fdf0f0', borderColor: '#e8b4b4' }}>
          <AlertTriangle size={16} className="text-[#b03a3a]" />
          <p className="text-sm text-[#b03a3a]">{error}</p>
        </div>
      )}

      {/* Data management card */}
      <div className="admin-card p-4 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[#8a6d3b]" />
            <div>
              <p className="text-sm font-semibold text-[#3a2e22]">Auto-Cleanup Old Messages</p>
              <p className="text-xs text-[#8a7a66] mt-0.5">Delete chat messages older than a set number of days to keep the database from growing indefinitely.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#5a4430]">Older than</label>
            <input
              type="number"
              min={1}
              max={365}
              value={retentionDays}
              onChange={(e) => setRetentionDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 30)))}
              className="admin-input w-20 text-center"
            />
            <label className="text-xs text-[#5a4430]">days</label>
            <button
              onClick={cleanupOldMessages}
              disabled={cleaning || totalMessages === 0}
              className="btn-ghost flex items-center gap-1.5 text-sm disabled:opacity-40"
            >
              {cleaning ? <Loader2 size={14} className="animate-spin" /> : <Eraser size={14} />}
              {cleaning ? 'Cleaning...' : 'Clean Now'}
            </button>
          </div>
        </div>
        {cleanResult && (
          <p className="text-xs text-[#5a7a4a] mt-2 font-medium">{cleanResult}</p>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8a6d3b]" /></div>
      ) : sessions.length === 0 ? (
        <div className="admin-card p-4">
          <EmptyState icon={MessageCircle} title="No chat sessions yet." hint="Conversations will appear here when guests use the FAQ chat." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="admin-card p-3">
              <p className="text-2xl font-bold text-[#3a2e22] leading-none">{sessions.length}</p>
              <p className="text-xs text-[#8a7a66] mt-1">Total Sessions</p>
            </div>
            <div className="admin-card p-3">
              <p className="text-2xl font-bold text-[#3a2e22] leading-none">{sessions.reduce((sum, s) => sum + s.message_count, 0)}</p>
              <p className="text-xs text-[#8a7a66] mt-1">Total Messages</p>
            </div>
            <div className="admin-card p-3">
              <p className="text-2xl font-bold text-[#3a2e22] leading-none">{sessions.filter((s) => s.name).length}</p>
              <p className="text-xs text-[#8a7a66] mt-1">Named Guests</p>
            </div>
            <div className="admin-card p-3">
              <p className="text-2xl font-bold text-[#3a2e22] leading-none">{sessions.filter((s) => !s.name).length}</p>
              <p className="text-xs text-[#8a7a66] mt-1">Anonymous</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {sessions.map((session) => (
              <div key={session.session_id} className="admin-card p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <button
                    onClick={() => openHistory(session)}
                    className="flex items-center gap-2 min-w-0 text-left hover:opacity-80 transition"
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: '#f0e8d8' }}>
                      <MessageCircle size={16} className="text-[#8a6d3b]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#3a2e22] leading-tight truncate hover:underline">
                        {session.name || 'Anonymous Guest'}
                      </p>
                      <p className="text-[10px] text-[#a07c4a] mt-0.5 truncate" title={session.session_id}>
                        {session.session_id}
                      </p>
                    </div>
                  </button>
                  <ConfirmButton onConfirm={() => deleteSession(session.session_id)}>
                    <Trash2 size={14} className="text-[#c9b896] hover:text-[#b03a3a] transition" />
                  </ConfirmButton>
                </div>
                <button
                  onClick={() => openHistory(session)}
                  className="text-left hover:opacity-80 transition"
                >
                  {session.preview && (
                    <p className="text-xs text-[#5a4430] leading-relaxed mt-1 line-clamp-2" style={{ whiteSpace: 'pre-wrap' }}>
                      {session.preview}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3 pt-2 border-t text-[10px] text-[#a07c4a]" style={{ borderColor: '#e6ddcd' }}>
                    <span>{session.message_count} {session.message_count === 1 ? 'message' : 'messages'}</span>
                    <span>·</span>
                    <span>Started {formatDate(session.first_message_at)}</span>
                    <span>·</span>
                    <span>Last {formatDate(session.last_message_at)}</span>
                  </div>
                  <p className="text-[10px] text-[#8a6d3b] font-medium mt-2 flex items-center gap-1">
                    <MessageCircle size={10} /> Click to view full chat history
                  </p>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
