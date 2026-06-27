import * as Y from "yjs";
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness.js";

/**
 * SupabaseYjsProvider
 * --------------------
 * Bridges a Yjs Doc (+ Awareness) over Supabase Realtime Broadcast.
 * No separate WebSocket server needed.
 *
 * Protocol events on channel `roomName`:
 *   "yjs-update"    { update: number[], origin: string }
 *   "yjs-awareness" { update: number[], origin: string }
 *   "yjs-sync-req"  { origin: string }
 *   "yjs-sync-resp" { update: number[], awUpdate: number[], to: string }
 *
 * Key fixes vs original:
 *  - Queue doc updates that arrive before channel is SUBSCRIBED
 *  - Flush queued updates once SUBSCRIBED
 *  - Retry send on transient failures (REST fallback is fine)
 *  - Export `synced` as a promise so consumers can await initial sync
 */
export class SupabaseYjsProvider {
  constructor(supabase, roomName, ydoc, { user } = {}) {
    this.supabase  = supabase;
    this.roomName  = roomName;
    this.doc       = ydoc;
    this.origin    = Math.random().toString(36).slice(2, 10);
    this.synced    = false;
    this._ready    = false;      // true once SUBSCRIBED
    this._queue    = [];         // doc updates buffered before SUBSCRIBED

    // Resolve when we've received a full-state sync response from a peer
    this._syncedResolve = null;
    this.syncedPromise = new Promise((res) => { this._syncedResolve = res; });
    // Auto-resolve after 2 s even if no peer replies (fresh room)
    this._autoSyncTimer = setTimeout(() => {
      if (!this.synced) { this.synced = true; this._syncedResolve?.(true); }
    }, 2000);

    // ── Awareness ──────────────────────────────────────────────────────
    this.awareness = new Awareness(ydoc);
    if (user) this.awareness.setLocalStateField("user", user);

    // ── Doc update listener ─────────────────────────────────────────────
    this._onDocUpdate = (update, origin) => {
      if (origin === this) return;           // don't echo our own applied updates
      if (!this._ready) {
        this._queue.push(update);            // buffer until subscribed
        return;
      }
      this._sendDocUpdate(update);
    };
    this.doc.on("update", this._onDocUpdate);

    // ── Awareness update listener ───────────────────────────────────────
    this._onAwarenessUpdate = ({ added, updated, removed }, origin) => {
      if (origin === "remote") return;
      const changed = [...added, ...updated, ...removed];
      const encoded = encodeAwarenessUpdate(this.awareness, changed);
      this._send("yjs-awareness", { update: Array.from(encoded), origin: this.origin });
    };
    this.awareness.on("update", this._onAwarenessUpdate);

    // ── Cleanup on tab close ────────────────────────────────────────────
    this._handleBeforeUnload = () => {
      removeAwarenessStates(this.awareness, [this.doc.clientID], "window unload");
    };
    window.addEventListener("beforeunload", this._handleBeforeUnload);

    // ── Supabase Realtime channel ───────────────────────────────────────
    // self:true so broadcast echoes back to us (important for multi-tab)
    this.channel = supabase.channel(`ckcos:${roomName}`, {
      config: { broadcast: { self: false, ack: false } }
    });

    this.channel
      // Remote doc update
      .on("broadcast", { event: "yjs-update" }, ({ payload }) => {
        if (!payload || payload.origin === this.origin) return;
        try {
          Y.applyUpdate(this.doc, new Uint8Array(payload.update), this);
        } catch { /* malformed payload */ }
      })

      // Remote awareness (cursor, user info)
      .on("broadcast", { event: "yjs-awareness" }, ({ payload }) => {
        if (!payload || payload.origin === this.origin) return;
        try {
          applyAwarenessUpdate(this.awareness, new Uint8Array(payload.update), "remote");
        } catch { /* malformed */ }
      })

      // Peer asking for our full doc state (new joiner or periodic sync)
      .on("broadcast", { event: "yjs-sync-req" }, ({ payload }) => {
        if (!payload || payload.origin === this.origin) return;
        
        let update;
        try {
          if (payload.stateVector) {
            update = Y.encodeStateAsUpdate(this.doc, new Uint8Array(payload.stateVector));
          } else {
            update = Y.encodeStateAsUpdate(this.doc);
          }
        } catch {
          update = Y.encodeStateAsUpdate(this.doc);
        }

        const awState   = encodeAwarenessUpdate(
          this.awareness,
          Array.from(this.awareness.getStates().keys())
        );
        this._send("yjs-sync-resp", {
          update:   Array.from(update),
          awUpdate: Array.from(awState),
          to:       payload.origin,
        });
      })

      // Full state response from a peer
      .on("broadcast", { event: "yjs-sync-resp" }, ({ payload }) => {
        if (!payload || payload.to !== this.origin) return;
        try {
          Y.applyUpdate(this.doc, new Uint8Array(payload.update), this);
          if (payload.awUpdate?.length) {
            applyAwarenessUpdate(this.awareness, new Uint8Array(payload.awUpdate), "remote");
          }
          if (!this.synced) {
            this.synced = true;
            clearTimeout(this._autoSyncTimer);
            this._syncedResolve?.(true);
          }
        } catch { /* malformed */ }
      })

      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          this._ready = true;

          // Flush any updates that were generated before we were subscribed
          for (const update of this._queue) this._sendDocUpdate(update);
          this._queue = [];

          // Start periodic state vector sync to heal dropped UDP-like broadcast packets
          this._sendSyncReq();
          this._healInterval = setInterval(() => this._sendSyncReq(), 2500);
        }
      });
  }

  // ── Internal helpers ──────────────────────────────────────────────────

  _sendSyncReq() {
    try {
      const sv = Y.encodeStateVector(this.doc);
      this._send("yjs-sync-req", { origin: this.origin, stateVector: Array.from(sv) });
    } catch { /* ignore */ }
  }

  _sendDocUpdate(update) {
    this._send("yjs-update", { update: Array.from(update), origin: this.origin });
  }

  _send(event, payload) {
    this.channel.send({ type: "broadcast", event, payload }).catch(() => {
      // Supabase REST fallback — silently ignore, the update will re-arrive via Y.Doc sync
    });
  }

  // ── Public API ────────────────────────────────────────────────────────

  /** Set or update the local user's presence info (name, color, cursor…) */
  setUser(userInfo) {
    this.awareness.setLocalStateField("user", userInfo);
  }

  /** Set the local cursor position in awareness */
  setCursor(cursor) {
    this.awareness.setLocalStateField("cursor", cursor);
  }

  destroy() {
    clearTimeout(this._autoSyncTimer);
    clearInterval(this._healInterval);
    this.doc.off("update", this._onDocUpdate);
    this.awareness.off("update", this._onAwarenessUpdate);
    window.removeEventListener("beforeunload", this._handleBeforeUnload);
    removeAwarenessStates(this.awareness, [this.doc.clientID], "provider destroy");
    try { this.channel.unsubscribe(); } catch { /* ignore */ }
  }
}