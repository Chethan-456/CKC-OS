/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CKC-OS  ·  Live Chat WebSocket Server  +  Groq AI Proxy    ║
 * ║  File location:  CKC-OS/server/chat.js                      ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * This single file handles:
 *   • WebSocket connections from every browser tab
 *   • Broadcasting messages to everyone in the same channel
 *   • Thread replies, emoji reactions, typing indicators
 *   • Presence (who is online right now)
 *   • In-memory message history (last 200 msgs per channel)
 *   • POST /api/chat  — Groq LLM proxy (llama-3.3-70b-versatile)
 *
 * ── Setup ──────────────────────────────────────────────────────
 *  1. In server/index.js add:
 *       const { initChatServer, chatRouter } = require("./chat");
 *       app.use("/api/chat", chatRouter);          // REST proxy
 *       initChatServer(httpServer);                // WebSocket
 *
 *  2. In server/.env add:
 *       GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx
 *
 *  3. In the server folder run:
 *       npm install groq-sdk
 */

'use strict';

import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuid } from 'uuid';
import express from 'express';
import Groq from 'groq-sdk';

/* ═══════════════════════════════════════════════════════════════
   SECTION 1 — In-memory state (shared by WS + REST layers)
   ═══════════════════════════════════════════════════════════════ */

// Map<channelId, Message[]>
const history  = new Map();
// Map<channelId, Map<rootMsgId, Reply[]>>
const threads  = new Map();
// Map<ws, { userId, userName, channel, color, bg, initials, role }>
const clients  = new Map();
// Map<channelId, Set<userId>>
const presence = new Map();

const CHANNELS = ['engine-dev', 'general', 'errors', 'devops', 'dm-priya', 'dm-rohan'];
CHANNELS.forEach(ch => {
  history.set(ch, []);
  threads.set(ch, new Map());
  presence.set(ch, new Set());
});

const MAX_HISTORY = 200;

/* ═══════════════════════════════════════════════════════════════
   SECTION 2 — Shared helpers
   ═══════════════════════════════════════════════════════════════ */

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN)
    ws.send(JSON.stringify(payload));
}

/** Broadcast to all clients in a channel, optionally excluding one */
function broadcast(channel, payload, exclude = null) {
  const data = JSON.stringify(payload);
  for (const [ws, meta] of clients) {
    if (
      ws.readyState === WebSocket.OPEN &&
      meta.channel === channel &&
      ws !== exclude
    ) {
      ws.send(data);
    }
  }
}

function broadcastAll(channel, payload) {
  broadcast(channel, payload, null);
}

function getPresence(channel) {
  return [...(presence.get(channel) || new Set())];
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 3 — WebSocket server  (initChatServer)
   ═══════════════════════════════════════════════════════════════ */

function initChatServer() {
  const wss = new WebSocketServer({
  noServer: true,
  verifyClient: ({ origin }, cb) => {
    const allowed = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
    ];
    // Allow if no origin (non-browser clients) or origin is whitelisted
    cb(!origin || allowed.includes(origin));
  },
});

  wss.on('connection', (ws, req) => {

    /* ── Parse URL query params sent by the browser ── */
    const url      = new URL(req.url, 'http://localhost');
    const userId   = url.searchParams.get('userId')   || uuid();
    const userName = decodeURIComponent(url.searchParams.get('userName') || 'Anonymous');
    const channel  = url.searchParams.get('channel')  || 'engine-dev';
    const color    = url.searchParams.get('color')    || '#22d3ee';
    const bg       = url.searchParams.get('bg')       || 'rgba(34,211,238,0.14)';
    const initials = url.searchParams.get('initials') || '??';
    const role     = url.searchParams.get('role')     || 'Member';

    /* ── Register this connection ── */
    clients.set(ws, { userId, userName, channel, color, bg, initials, role });
    if (!presence.has(channel)) presence.set(channel, new Set());
    presence.get(channel).add(userId);

    /* ── Send initial data to the newly connected client ── */
    send(ws, {
      type:     'init',
      userId,
      channel,
      history:  history.get(channel) || [],
      threads:  Object.fromEntries(threads.get(channel) || new Map()),
      presence: getPresence(channel),
    });

    /* ── Tell everyone else in channel this person joined ── */
    broadcast(channel, {
      type:     'presence',
      action:   'join',
      userId,
      userName,
      color,
      initials,
      role,
      presence: getPresence(channel),
    }, ws);

    /* ── Handle incoming messages ── */
    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      const meta = clients.get(ws);
      if (!meta) return;

      switch (msg.type) {

        /* ── New chat message ── */
        case 'message': {
          const m = {
            id:        msg.id || `m-${uuid()}`,
            uid:       meta.userId,
            userName:  meta.userName,
            color:     meta.color,
            bg:        meta.bg,
            initials:  meta.initials,
            role:      meta.role,
            time:      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            head:      true,
            segments:  msg.segments || [],
            code:      msg.code || null,
            reactions: [],
            thread:    [],
            channel:   meta.channel,
          };

          const hist = history.get(meta.channel);
          hist.push(m);
          if (hist.length > MAX_HISTORY) hist.shift();

          broadcastAll(meta.channel, { type: 'message', message: m });
          break;
        }

        /* ── Reply inside a thread ── */
        case 'thread_reply': {
          const { rootId } = msg;
          const chThreads  = threads.get(meta.channel);
          if (!chThreads) break;

          const reply = {
            id:        `tr-${uuid()}`,
            uid:       meta.userId,
            userName:  meta.userName,
            color:     meta.color,
            bg:        meta.bg,
            initials:  meta.initials,
            role:      meta.role,
            time:      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            head:      true,
            segments:  msg.segments || [],
            reactions: [],
          };

          if (!chThreads.has(rootId)) chThreads.set(rootId, []);
          chThreads.get(rootId).push(reply);

          /* Update root message thread-count */
          const hist = history.get(meta.channel);
          const root = hist.find(m => m.id === rootId);
          if (root) root.thread.push(reply.id);

          broadcastAll(meta.channel, {
            type:         'thread_reply',
            rootId,
            reply,
            threadLength: chThreads.get(rootId).length,
          });
          break;
        }

        /* ── Emoji reaction toggle ── */
        case 'react': {
          const { msgId, emoji, isThread, rootId } = msg;
          const hist   = history.get(meta.channel);
          let   target = hist.find(m => m.id === msgId);

          if (!target && isThread) {
            target = (threads.get(meta.channel)?.get(rootId) || [])
              .find(r => r.id === msgId);
          }

          if (target) {
            const existing = target.reactions.find(r => r.e === emoji);
            if (existing) {
              existing.reactors = existing.reactors || new Set();
              if (existing.reactors.has(meta.userId)) {
                existing.reactors.delete(meta.userId);
                existing.n = Math.max(0, existing.n - 1);
              } else {
                existing.reactors.add(meta.userId);
                existing.n++;
              }
              if (existing.n === 0)
                target.reactions = target.reactions.filter(r => r.e !== emoji);
            } else {
              target.reactions.push({
                e:        emoji,
                n:        1,
                reactors: new Set([meta.userId]),
              });
            }

            const safeReactions = target.reactions.map(r => ({
              e:        r.e,
              n:        r.n,
              reactors: [...(r.reactors || [])],
            }));

            broadcastAll(meta.channel, {
              type:      'react_update',
              msgId,
              reactions: safeReactions,
              isThread,
              rootId,
            });
          }
          break;
        }

        /* ── Typing indicator ── */
        case 'typing': {
          broadcast(meta.channel, {
            type:     'typing',
            userId:   meta.userId,
            userName: meta.userName,
            color:    meta.color,
            bg:       meta.bg,
            initials: meta.initials,
            isTyping: msg.isTyping,
          }, ws);          // exclude sender — they already know they're typing
          break;
        }

        /* ── Switch to a different channel ── */
        case 'switch_channel': {
          const oldCh = meta.channel;
          const newCh = msg.channel;
          if (!history.has(newCh)) break;

          /* Leave old channel */
          presence.get(oldCh)?.delete(meta.userId);
          broadcast(oldCh, {
            type:     'presence',
            action:   'leave',
            userId:   meta.userId,
            presence: getPresence(oldCh),
          });

          /* Join new channel */
          meta.channel = newCh;
          if (!presence.has(newCh)) presence.set(newCh, new Set());
          presence.get(newCh).add(meta.userId);

          send(ws, {
            type:     'switch_ack',
            channel:  newCh,
            history:  history.get(newCh) || [],
            threads:  Object.fromEntries(threads.get(newCh) || new Map()),
            presence: getPresence(newCh),
          });

          broadcastAll(newCh, {
            type:     'presence',
            action:   'join',
            userId:   meta.userId,
            userName: meta.userName,
            color:    meta.color,
            initials: meta.initials,
            role:     meta.role,
            presence: getPresence(newCh),
          });
          break;
        }
      }
    });

    /* ── Client disconnected ── */
    ws.on('close', () => {
      const meta = clients.get(ws);
      if (!meta) return;
      clients.delete(ws);
      presence.get(meta.channel)?.delete(meta.userId);
      broadcast(meta.channel, {
        type:     'presence',
        action:   'leave',
        userId:   meta.userId,
        userName: meta.userName,
        presence: getPresence(meta.channel),
      });
    });

    ws.on('error', (err) => console.error('[WS]', err.message));
  });

  console.log('✅ Chat WebSocket server attached at /ws');
  return wss;
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 4 — Groq AI proxy  (Express router → POST /api/chat)
   ═══════════════════════════════════════════════════════════════ */

const chatRouter = express.Router();

chatRouter.post('/', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: '"messages" array is required.' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not set on the server.' });
  }

  const groq = new Groq({ apiKey });

  try {
    const completion = await groq.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      max_tokens:  1500,
      temperature: 0.3,
      messages,            // [{ role: 'system', ... }, { role: 'user', ... }]
    });

    // Return OpenAI-compatible shape — frontend reads data.choices[0].message.content
    res.json(completion);

  } catch (err) {
    console.error('[Groq]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════
   SECTION 5 — REST helpers  (call from server/index.js if needed)
   ═══════════════════════════════════════════════════════════════ */

function getHistory(channel) {
  return {
    messages: history.get(channel) || [],
    threads:  Object.fromEntries(threads.get(channel) || new Map()),
  };
}

function getPresenceForChannel(channel) {
  return getPresence(channel);
}

/* ═══════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════ */

export {
  initChatServer,        // attach WebSocket to httpServer
  chatRouter,            // mount with  app.use('/api/chat', chatRouter)
  getHistory,            // REST helper
  getPresenceForChannel, // REST helper
};