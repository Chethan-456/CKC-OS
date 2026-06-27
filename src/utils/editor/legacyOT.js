// ═══════════ OT ENGINE ═══════════
export class OTEngine {
  constructor(text = "") { this.text = text; this.version = 0; this.history = []; this._subs = []; }
  subscribe(fn) { this._subs.push(fn); return () => { this._subs = this._subs.filter(f => f !== fn); }; }
  _emit(op) { this._subs.forEach(fn => fn(op, this.text, this.version)); }
  static xform(a, b) {
    let r = { ...b };
    if (a.type === "insert" && b.type === "insert") { if (a.pos < b.pos || (a.pos === b.pos && a.uid < b.uid)) r.pos = b.pos + a.chars.length; }
    else if (a.type === "insert" && b.type === "delete") { if (a.pos <= b.pos) r.pos = b.pos + a.chars.length; }
    else if (a.type === "delete" && b.type === "insert") { if (a.pos < b.pos) r.pos = Math.max(b.pos - a.len, a.pos); }
    else if (a.type === "delete" && b.type === "delete") { if (a.pos < b.pos) r.pos = Math.max(b.pos - a.len, a.pos); else if (a.pos === b.pos) r.skip = true; }
    return r;
  }
  apply(op) {
    let x = { ...op };
    const conc = this.history.filter(h => h.ver > (op.baseVer ?? this.version));
    for (const h of conc) x = OTEngine.xform(h, x);
    if (x.skip) return null;
    if (x.type === "insert") { const p = Math.max(0, Math.min(x.pos, this.text.length)); this.text = this.text.slice(0, p) + x.chars + this.text.slice(p); }
    else if (x.type === "delete") { const p = Math.max(0, Math.min(x.pos, this.text.length)); const l = Math.min(x.len, this.text.length - p); if (l > 0) this.text = this.text.slice(0, p) + this.text.slice(p + l); }
    this.version++; const rec = { ...x, ver: this.version }; this.history.push(rec);
    if (this.history.length > 300) this.history = this.history.slice(-150);
    this._emit(rec); return rec;
  }
  reset(t) { this.text = t; this.version = 0; this.history = []; }
}

class WSManager {
  constructor() { this.engines = new Map(); }
  eng(lang) { if (!this.engines.has(lang)) this.engines.set(lang, new OTEngine(STARTERS[lang] || "")); return this.engines.get(lang); }
  send(uid, msg) { console.log(`[WS] Send to ${uid}:`, msg); }
}
const WS = new WSManager();

const BOTS = [
  { name: "Aria K.", color: "#FF6B9D", bg: "rgba(255,107,157,0.15)", inits: "AK" },
  { name: "Dev M.", color: "#4FC1FF", bg: "rgba(79,193,255,0.15)", inits: "DM" },
  { name: "Sam T.", color: "#4EC9B0", bg: "rgba(78,201,176,0.15)", inits: "ST" },
];

