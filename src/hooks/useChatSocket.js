/**
 * useChatSocket.js
 * Location: src/hooks/useChatSocket.js
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Build WS base URL ─────────────────────────────────────────────────────────
// Priority: VITE_WS_URL env var → fallback to server port 5000 (NOT Vite's port)
const WS_BASE = (() => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  // In dev, Vite runs on 5173 but the WS server runs on 5000 — must hard-target 5000
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host     = window.location.hostname; // just the hostname, no port
  return `${protocol}//${host}:5000`;        // always point at the backend port
})();

let msgIdCounter = 0;
const uid = () => `msg_${Date.now()}_${++msgIdCounter}`;

function buildMsg(user, segments, channel) {
  return {
    id:        uid(),
    uid:       user.id,
    userName:  user.name,
    initials:  user.initials,
    color:     user.color,
    bg:        user.bg,
    role:      user.role,
    segments,
    channel,
    time:      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    reactions: [],
    thread:    [],
    head:      true,
  };
}

export function useChatSocket({ user, channel }) {
  const [status,   setStatus]   = useState('connecting');
  const [retries,  setRetries]  = useState(0);
  const [messages, setMessages] = useState([]);
  const [threads,  setThreads]  = useState({});
  const [presence, setPresence] = useState([]);
  const [typers,   setTypers]   = useState([]);

  const ws          = useRef(null);
  const retryRef    = useRef(0);
  const timerRef    = useRef(null);
  const typingRef   = useRef(null);
  const channelRef  = useRef(channel);
  const mountedRef  = useRef(true);   // prevents state updates after unmount

  // Stable refs for user fields — avoids connect() re-creating on every render
  const userIdRef       = useRef(user.id);
  const userNameRef     = useRef(user.name);
  const userColorRef    = useRef(user.color);
  const userBgRef       = useRef(user.bg);
  const userInitialsRef = useRef(user.initials);
  const userRoleRef     = useRef(user.role);

  // Keep refs in sync when user changes
  useEffect(() => {
    userIdRef.current       = user.id;
    userNameRef.current     = user.name;
    userColorRef.current    = user.color;
    userBgRef.current       = user.bg;
    userInitialsRef.current = user.initials;
    userRoleRef.current     = user.role;
  }, [user.id, user.name, user.color, user.bg, user.initials, user.role]);

  useEffect(() => { channelRef.current = channel; }, [channel]);

  // ── Incoming message handler ──────────────────────────────────────────────
  const handleIncoming = useCallback((data) => {
    if (!mountedRef.current) return;

    switch (data.type) {

      // Server sends full history + presence on connect / channel switch
      case 'init':
      case 'switch_ack':
        setMessages(data.history  || []);
        setThreads(data.threads   || {});
        setPresence(data.presence || []);
        break;

      // New message broadcast
      case 'message': {
        const msg = data.message || data.msg;
        if (!msg) break;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          // Collapse consecutive messages from same user into a thread (no avatar repeat)
          const head = !last || last.uid !== msg.uid || last.channel !== msg.channel;
          return [...prev, { ...msg, head }];
        });
        break;
      }

      // Thread reply broadcast — server sends { rootId, reply, threadLength }
      case 'thread_reply': {
        const reply = data.reply || data.message || data.msg;
        if (!reply || !data.rootId) break;
        setThreads(prev => ({
          ...prev,
          [data.rootId]: [...(prev[data.rootId] || []), reply],
        }));
        // Update reply count badge on root message
        setMessages(prev => prev.map(m =>
          m.id === data.rootId
            ? { ...m, thread: [...(m.thread || []), reply.id] }
            : m
        ));
        break;
      }

      // Reaction update — server sends { msgId, reactions, isThread, rootId }
      case 'react_update': {
        const updater = (msgs) => msgs.map(m => {
          if (m.id !== data.msgId) return m;
          // Mark reactions that include current user as "mine"
          const reactions = (data.reactions || []).map(r => ({
            ...r,
            mine: (r.reactors || []).includes(userIdRef.current),
          }));
          return { ...m, reactions };
        });

        if (data.isThread && data.rootId) {
          setThreads(prev => ({
            ...prev,
            [data.rootId]: updater(prev[data.rootId] || []),
          }));
        } else {
          setMessages(updater);
        }
        break;
      }

      // Presence update — server sends { action, userId, presence: string[] }
      case 'presence':
        setPresence(data.presence || data.users || []);
        break;

      // Typing indicator — ignore own events
      case 'typing':
        if (data.userId === userIdRef.current) break;
        if (data.isTyping) {
          setTypers(prev =>
            prev.find(t => t.userId === data.userId)
              ? prev
              : [...prev, {
                  userId:   data.userId,
                  userName: data.userName,
                  initials: data.initials,
                  color:    data.color,
                  bg:       data.bg,
                }]
          );
          // Auto-clear typing indicator after 4 s (in case stop event is missed)
          clearTimeout(typingRef.current);
          typingRef.current = setTimeout(() => {
            setTypers(prev => prev.filter(t => t.userId !== data.userId));
          }, 4000);
        } else {
          setTypers(prev => prev.filter(t => t.userId !== data.userId));
        }
        break;

      default:
        break;
    }
  }, []); // no deps — uses refs for user.id

  // ── Connect ───────────────────────────────────────────────────────────────
  // connect is stable — it uses refs, not state/props, so it never re-creates
  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    // Clean up any existing socket
    if (ws.current) {
      ws.current.onclose = null; // prevent retry loop during intentional close
      try { ws.current.close(); } catch (_) {}
      ws.current = null;
    }

    clearTimeout(timerRef.current);

    const params = new URLSearchParams({
      userId:   userIdRef.current       || '',
      userName: userNameRef.current     || 'Developer',
      channel:  channelRef.current      || 'engine-dev',
      color:    userColorRef.current    || '#22d3ee',
      bg:       userBgRef.current       || 'rgba(34,211,238,0.14)',
      initials: userInitialsRef.current || 'DV',
      role:     userRoleRef.current     || 'Member',
    });

    const url = `${WS_BASE}/ws?${params.toString()}`;

    let socket;
    try {
      socket = new WebSocket(url);
    } catch (err) {
      console.error('[WS] Could not create WebSocket:', err.message);
      setStatus('error');
      return;
    }

    ws.current = socket;
    if (mountedRef.current) setStatus('connecting');

    // ── Connection timeout (5 s) ─────────────────────────────────────────
    const connTimeout = setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) {
        console.warn('[WS] Connection timeout — retrying');
        socket.close();
      }
    }, 5000);

    socket.onopen = () => {
      clearTimeout(connTimeout);
      if (!mountedRef.current) return;
      console.log('[WS] Connected to', url);
      setStatus('open');
      retryRef.current = 0;
      setRetries(0);
    };

    socket.onmessage = (ev) => {
      try {
        handleIncoming(JSON.parse(ev.data));
      } catch (e) {
        console.warn('[WS] Bad message:', e.message);
      }
    };

    socket.onclose = (ev) => {
      clearTimeout(connTimeout);
      if (!mountedRef.current) return;

      console.log(`[WS] Closed (code=${ev.code}) retry=${retryRef.current}`);
      setStatus('closed');

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s
      if (retryRef.current < 6) {
        const delay = Math.min(1000 * 2 ** retryRef.current, 30000);
        retryRef.current++;
        setRetries(retryRef.current);
        timerRef.current = setTimeout(connect, delay);
      } else {
        console.error('[WS] Max retries reached. Check server is running on port 5000.');
        setStatus('error');
      }
    };

    socket.onerror = (err) => {
      console.error('[WS] Error — will retry via onclose');
      // Don't set error here; onclose fires next and handles retry
    };

  }, []); // STABLE — no deps, uses only refs

  // ── Mount / unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
      clearTimeout(typingRef.current);
      if (ws.current) {
        ws.current.onclose = null; // prevent retry after unmount
        ws.current.close();
        ws.current = null;
      }
    };
  }, []); // runs once — connect is stable

  // ── Send helper ───────────────────────────────────────────────────────────
  const send = useCallback((type, payload) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, ...payload }));
      return true;
    }
    console.warn('[WS] Cannot send — socket not open (state:', ws.current?.readyState, ')');
    return false;
  }, []);

  // ── Public actions ────────────────────────────────────────────────────────
  const sendMessage = useCallback((segments) => {
    const msg = buildMsg(
      { id: userIdRef.current, name: userNameRef.current, initials: userInitialsRef.current,
        color: userColorRef.current, bg: userBgRef.current, role: userRoleRef.current },
      segments,
      channelRef.current
    );
    send('message', { id: msg.id, segments, channel: channelRef.current });
  }, [send]);

  const sendReply = useCallback((parentId, segments) => {
    const msg = buildMsg(
      { id: userIdRef.current, name: userNameRef.current, initials: userInitialsRef.current,
        color: userColorRef.current, bg: userBgRef.current, role: userRoleRef.current },
      segments,
      channelRef.current
    );
    send('thread_reply', { rootId: parentId, id: msg.id, segments, channel: channelRef.current });
  }, [send]);

  const sendReact = useCallback((msgId, emoji, isThread = false, rootId = null) => {
    send('react', { msgId, emoji, isThread, rootId, userId: userIdRef.current });
  }, [send]);

  const setTyping = useCallback((isTyping) => {
    send('typing', {
      userId:   userIdRef.current,
      userName: userNameRef.current,
      initials: userInitialsRef.current,
      color:    userColorRef.current,
      bg:       userBgRef.current,
      isTyping,
      channel:  channelRef.current,
    });
  }, [send]);

  // ── Channel switch — send WS message instead of reconnecting ─────────────
  const switchChannel = useCallback((newChannel) => {
    channelRef.current = newChannel;
    setMessages([]);
    setThreads({});
    setTypers([]);

    if (ws.current?.readyState === WebSocket.OPEN) {
      // Tell server to move this connection to the new channel
      ws.current.send(JSON.stringify({ type: 'switch_channel', channel: newChannel }));
    } else {
      // Not connected — reconnect (new channel will be picked from channelRef)
      connect();
    }
  }, [connect]);

  return {
    status,
    retries,
    messages,
    threads,
    presence,
    typers,
    sendMessage,
    sendReply,
    sendReact,
    switchChannel,
    setTyping,
  };
}