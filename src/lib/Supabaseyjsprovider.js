import * as Y from "yjs";
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness.js";

/**
 * SupabaseYjsProvider
 * --------------------
 * Bridges a Yjs Doc (+ Awareness) over a single Supabase Realtime
 * broadcast channel. No separate WebSocket server required — this
 * reuses the same Realtime transport the rest of the app already
 * relies on.
 *
 * Protocol (all broadcast on one channel, room = `roomName`):
 *   - event "yjs-update"     payload: { update: number[], origin: string }
 *   - event "yjs-awareness"  payload: { update: number[], origin: string }
 *   - event "yjs-sync-req"   payload: { origin: string }   (ask peers for full state)
 *   - event "yjs-sync-resp"  payload: { update: number[], to: string }
 *
 * Updates are Yjs binary deltas (Uint8Array), sent as plain arrays
 * since Supabase broadcast payloads are JSON.
 */
export class SupabaseYjsProvider {
  constructor(supabase, roomName, ydoc, { user } = {}) {
    this.supabase = supabase;
    this.roomName = roomName;
    this.doc = ydoc;
    this.origin = Math.random().toString(36).slice(2);
    this.synced = false;

    this.awareness = new Awareness(ydoc);
    if (user) {
      this.awareness.setLocalStateField("user", user);
    }

    this._onDocUpdate = (update, origin) => {
      if (origin === this) return; // don't echo back updates we just applied remotely
      this._send("yjs-update", { update: Array.from(update), origin: this.origin });
    };
    this.doc.on("update", this._onDocUpdate);

    this._onAwarenessUpdate = ({ added, updated, removed }, origin) => {
      if (origin === "remote") return;
      const changedClients = added.concat(updated).concat(removed);
      const update = encodeAwarenessUpdate(this.awareness, changedClients);
      this._send("yjs-awareness", { update: Array.from(update), origin: this.origin });
    };
    this.awareness.on("update", this._onAwarenessUpdate);

    this._handleBeforeUnload = () => {
      removeAwarenessStates(this.awareness, [this.doc.clientID], "window unload");
    };
    window.addEventListener("beforeunload", this._handleBeforeUnload);

    this.channel = supabase.channel(roomName, { config: { broadcast: { self: false } } });

    this.channel
      .on("broadcast", { event: "yjs-update" }, ({ payload }) => {
        if (payload.origin === this.origin) return;
        Y.applyUpdate(this.doc, new Uint8Array(payload.update), this);
      })
      .on("broadcast", { event: "yjs-awareness" }, ({ payload }) => {
        if (payload.origin === this.origin) return;
        applyAwarenessUpdate(this.awareness, new Uint8Array(payload.update), "remote");
      })
      .on("broadcast", { event: "yjs-sync-req" }, ({ payload }) => {
        if (payload.origin === this.origin) return;
        // Reply with our full doc state so the requester catches up,
        // including every Y.Text in the doc (not just the active file).
        const fullState = Y.encodeStateAsUpdate(this.doc);
        this._send("yjs-sync-resp", { update: Array.from(fullState), to: payload.origin });
        // Also share our current awareness state with the new joiner.
        const awState = encodeAwarenessUpdate(this.awareness, Array.from(this.awareness.getStates().keys()));
        this._send("yjs-awareness", { update: Array.from(awState), origin: this.origin });
      })
      .on("broadcast", { event: "yjs-sync-resp" }, ({ payload }) => {
        if (payload.to !== this.origin) return;
        Y.applyUpdate(this.doc, new Uint8Array(payload.update), this);
        this.synced = true;
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Ask the room for full state on join/reconnect.
          this._send("yjs-sync-req", { origin: this.origin });
        }
      });
  }

  _send(event, payload) {
    this.channel.send({ type: "broadcast", event, payload });
  }

  destroy() {
    this.doc.off("update", this._onDocUpdate);
    this.awareness.off("update", this._onAwarenessUpdate);
    window.removeEventListener("beforeunload", this._handleBeforeUnload);
    removeAwarenessStates(this.awareness, [this.doc.clientID], "provider destroy");
    this.channel.unsubscribe();
  }
}