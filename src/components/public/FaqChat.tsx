import { useEffect, useRef, useState, useCallback } from 'react';
import { MessageCircle, X, Send, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ChatMessage } from '@/types';

const SESSION_KEY = 'wedding_chat_session';
const NAME_KEY = 'wedding_chat_name';
const SESSION_ACTIVITY_KEY = 'wedding_chat_activity';

function newSessionId(): string {
  try {
    const id = (crypto as any).uuid ? (crypto as any).uuid() : crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return 'session-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

function getOrCreateSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
  } catch {}
  return newSessionId();
}

function loadStoredName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch {
    return '';
  }
}

function saveStoredName(name: string) {
  try {
    if (name) localStorage.setItem(NAME_KEY, name);
  } catch {}
}

interface FaqChatProps {
  webhookUrl: string;
  greeting: string | null;
  guestName?: string | null;
  guestNameOnCard?: string | null;
  guestTags?: string[] | null;
  authUsername?: string | null;
  authPassword?: string | null;
  botName?: string | null;
  tableNumber?: string | null;
  partyName?: string | null;
}

export default function FaqChat({ webhookUrl, greeting, guestName, guestNameOnCard, guestTags, authUsername, authPassword, botName, tableNumber, partyName }: FaqChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [name, setName] = useState(guestName || loadStoredName());
  const [nameInput, setNameInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [clearing, setClearing] = useState(false);
  const sessionIdRef = useRef<string>(getOrCreateSessionId());
  const hadConversationRef = useRef(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const resetConversation = useCallback(() => {
    const previousSessionId = sessionIdRef.current;
    sessionIdRef.current = newSessionId();
    try {
      localStorage.removeItem(`${SESSION_ACTIVITY_KEY}:${previousSessionId}`);
    } catch {}
    hadConversationRef.current = false;
    setMessages([]);
    setLoaded(false);
    setChatStarted(false);
    setSending(false);
    setInput('');
    setNameInput('');
    if (guestName) {
      setName(guestName);
      saveStoredName(guestName);
    } else {
      setName('');
      try {
        localStorage.removeItem(NAME_KEY);
      } catch {}
    }
  }, [guestName]);

  const displayName = botName || 'Wedding Assistant';
  const welcomeLine = greeting
    ? `Hi, I'm ${displayName}! ${greeting}`
    : `Hi, I'm ${displayName}! I'm ready to assist you.`;

  // On the per-guest invitation pages, the guest name is provided and auto-captured.
  useEffect(() => {
    if (guestName) {
      setName(guestName);
      saveStoredName(guestName);
    }
  }, [guestName]);

  // Load existing conversation history for this session, then subscribe to realtime inserts.
  useEffect(() => {
    if (!open || !chatStarted) return;
    const sessionId = sessionIdRef.current;

    (async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      const rows = (data as ChatMessage[]) || [];
      if (rows.length > 0) {
        hadConversationRef.current = true;
        setMessages(rows);
        setLoaded(true);
      } else {
        let sessionWasUsed = false;
        try {
          sessionWasUsed = localStorage.getItem(`${SESSION_ACTIVITY_KEY}:${sessionId}`) === '1';
        } catch {}
        if (hadConversationRef.current || sessionWasUsed) resetConversation();
        else {
          setMessages([]);
          setLoaded(true);
        }
      }
    })();

    const channel = supabase
      .channel('chat_messages_session')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const row = payload.new as ChatMessage;
          hadConversationRef.current = true;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          if (row.role === 'bot') setSending(false);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${sessionId}` },
        () => {
          resetConversation();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, chatStarted, resetConversation]);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, sending, open, chatStarted]);

  const clearChat = useCallback(() => {
    // Generate a new session ID and reset the local conversation state.
    // Old session data is preserved in the database for admin review.
    setClearing(true);
    sessionIdRef.current = newSessionId();
    hadConversationRef.current = false;
    setMessages([]);
    setLoaded(false);
    setChatStarted(false);
    setSending(false);
    setInput('');
    setNameInput('');
    if (guestName) {
      // Per-guest invitation: re-capture the provided guest name fresh.
      setName(guestName);
      saveStoredName(guestName);
    } else {
      // Public invitation: clear the cached name so the guest is asked again.
      try { localStorage.removeItem(NAME_KEY); } catch {}
      setName('');
    }
    setClearing(false);
  }, [guestName]);

  const startChat = useCallback(() => {
    setChatStarted(true);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    if (!name) return;
    const sessionId = sessionIdRef.current;

    const row = {
      session_id: sessionId,
      role: 'visitor' as const,
      name,
      message: text,
    };

    setSending(true);
    setInput('');
    hadConversationRef.current = true;

    const { error } = await supabase.from('chat_messages').insert(row);
    if (error) {
      setSending(false);
      setInput(text);
      hadConversationRef.current = false;
      return;
    }
    try {
      localStorage.setItem(`${SESSION_ACTIVITY_KEY}:${sessionId}`, '1');
    } catch {}

    try {
      const params = new URLSearchParams({
        session_id: sessionId,
        name,
        message: text,
        name_on_card: guestNameOnCard || '',
        tags: (guestTags && guestTags.length > 0) ? guestTags.join(',') : '',
        bot_name: botName || '',
        table_number: tableNumber || '',
        party_name: partyName || '',
      });
      const sep = webhookUrl.includes('?') ? '&' : '?';
      const url = `${webhookUrl}${sep}${params.toString()}`;
      const headers: Record<string, string> = {};
      if (authUsername) {
        const token = btoa(`${authUsername}:${authPassword || ''}`);
        headers['Authorization'] = `Basic ${token}`;
      }
      const res = await fetch(url, { method: 'GET', headers });
      if (!res.ok) {
        console.error('[FaqChat] Webhook returned non-OK status', res.status, res.statusText);
      }
    } catch (err) {
      console.error('[FaqChat] Webhook GET failed', err);
    }
  }, [input, sending, name, webhookUrl, guestNameOnCard, guestTags, authUsername, authPassword, botName, tableNumber, partyName]);

  const confirmName = () => {
    const n = nameInput.trim();
    if (!n) return;
    setName(n);
    saveStoredName(n);
  };

  const buttonStyle: React.CSSProperties = {
    background: 'rgba(58,46,34,0.85)',
    backdropFilter: 'blur(8px)',
    color: '#fff',
  };

  const hasName = Boolean(name);

  return (
    <>
      {/* Floating chat button, stacked above the music control */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close FAQ chat' : 'Open FAQ chat'}
        className="fixed right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition hover:scale-105"
        style={{ ...buttonStyle, bottom: '5rem' }}
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed right-3 z-50 flex flex-col rounded-2xl shadow-2xl sm:w-80 sm:h-[28rem] w-[calc(100vw-1.5rem)] h-[70vh]"
          style={{
            bottom: '8.5rem',
            background: 'var(--page-color, #FBF7F0)',
            border: '1px solid rgba(120,90,60,0.2)',
            fontFamily: 'var(--body-font)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'rgba(120,90,60,0.15)' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: 'rgba(58,46,34,0.85)', color: '#fff' }}
              >
                <MessageCircle size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#5a4430' }}>
                  {displayName}
                </p>
                <p className="text-[10px]" style={{ color: '#8a7a66' }}>
                  Typically replies in a moment
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {chatStarted && messages.length > 0 && (
                <button
                  onClick={clearChat}
                  disabled={clearing || sending}
                  aria-label="Start new conversation"
                  title="Start new conversation"
                  className="rounded-full p-1 transition hover:bg-black/5 disabled:opacity-40"
                  style={{ color: '#8a7a66' }}
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="rounded-full p-1 transition hover:bg-black/5"
                style={{ color: '#8a7a66' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
            {/* Start-chat screen */}
            {!chatStarted && hasName && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-6">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: 'rgba(58,46,34,0.85)', color: '#fff' }}
                >
                  <MessageCircle size={24} />
                </div>
                <p className="text-sm" style={{ color: '#5a4430' }}>
                  {welcomeLine}
                </p>
                <button
                  onClick={startChat}
                  className="rounded-full px-5 py-2 text-sm font-medium transition hover:scale-105"
                  style={{ background: 'rgba(58,46,34,0.85)', color: '#fff' }}
                >
                  Start Chat
                </button>
              </div>
            )}

            {!hasName && (
              <div className="flex flex-col gap-2 py-2">
                <p className="text-xs" style={{ color: '#8a7a66' }}>
                  Please share your name so we can help you.
                </p>
                <div className="flex gap-2">
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmName(); }}
                    placeholder="Your name"
                    className="flex-1 rounded-full px-3 py-1.5 text-sm outline-none"
                    style={{ border: '1px solid rgba(120,90,60,0.25)', background: '#fff', color: '#5a4430' }}
                    autoFocus
                  />
                  <button
                    onClick={confirmName}
                    className="rounded-full px-3 py-1.5 text-sm font-medium"
                    style={{ background: 'rgba(58,46,34,0.85)', color: '#fff' }}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {chatStarted && loaded && messages.length === 0 && hasName && (
              <div className="flex">
                <div
                  className="max-w-[80%] rounded-2xl rounded-bl-md px-3 py-2 text-sm"
                  style={{ background: 'rgba(120,90,60,0.10)', color: '#5a4430' }}
                >
                  <span style={{ whiteSpace: 'pre-wrap' }}>{welcomeLine}</span>
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'visitor' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === 'visitor' ? 'rounded-br-md' : 'rounded-bl-md'
                  }`}
                  style={
                    m.role === 'visitor'
                      ? { background: 'rgba(58,46,34,0.85)', color: '#fff' }
                      : { background: 'rgba(120,90,60,0.10)', color: '#5a4430' }
                  }
                >
                  <span style={{ whiteSpace: 'pre-wrap' }}>{m.message}</span>
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl rounded-bl-md px-3 py-2 text-sm"
                  style={{ background: 'rgba(120,90,60,0.10)', color: '#8a7a66' }}
                >
                  <span className="inline-flex gap-1">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          {chatStarted && (
            <div
              className="flex items-center gap-2 px-3 py-2 border-t"
              style={{ borderColor: 'rgba(120,90,60,0.15)' }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={hasName ? 'Type your question...' : 'Enter your name first'}
                disabled={!hasName || sending}
                className="flex-1 rounded-full px-3 py-2 text-sm outline-none disabled:opacity-50"
                style={{ border: '1px solid rgba(120,90,60,0.25)', background: '#fff', color: '#5a4430' }}
              />
              <button
                onClick={sendMessage}
                disabled={!hasName || sending || !input.trim()}
                aria-label="Send message"
                className="flex h-9 w-9 items-center justify-center rounded-full transition disabled:opacity-40 hover:scale-105"
                style={{ background: 'rgba(58,46,34,0.85)', color: '#fff' }}
              >
                <Send size={16} />
              </button>
            </div>
          )}

          <style>{`
            .typing-dot {
              width: 6px; height: 6px; border-radius: 9999px;
              background: #8a7a66; display: inline-block;
              animation: typing-bounce 1.2s infinite ease-in-out;
            }
            .typing-dot:nth-child(2) { animation-delay: 0.15s; }
            .typing-dot:nth-child(3) { animation-delay: 0.3s; }
            @keyframes typing-bounce {
              0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
              30% { transform: translateY(-4px); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
