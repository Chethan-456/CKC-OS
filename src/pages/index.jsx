import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authStore, PALETTE, LANGS, LK, initials, genSid } from "./editor.jsx";

/* ═══════════════════════════════════════════════════════════════
   GLOBAL CSS
═══════════════════════════════════════════════════════════════ */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Clash+Display:wght@400;500;600;700&family=Instrument+Sans:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { font-family: 'Instrument Sans', sans-serif; background: #0d0f14; color: #e0e6ff; overflow-x: hidden; }

:root {
  --bg:  #0d0f14; --bg2: #111318; --bg3: #151820;
  --surface: rgba(255,255,255,.03); --border: rgba(255,255,255,.07);
  --border-h: rgba(79,193,255,.4);
  --blue: #4FC1FF; --blue-d: #2196D3; --blue-l: #8DD8FF;
  --teal: #4EC9B0; --rose: #FF6B9D; --amber: #FFB547; --violet: #A78BFA;
  --indigo: #7c83ff;
  --text: #e0e6ff; --text-2: #7a8aaa; --text-3: #3f4d66;
  --mono: 'JetBrains Mono', monospace;
  --disp: 'Syne', sans-serif;
  --sans: 'Instrument Sans', sans-serif;
}

@keyframes pageIn  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
@keyframes fadeUp  { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
@keyframes blink   { 0%,100%{opacity:1} 50%{opacity:.2} }
@keyframes spin    { to{transform:rotate(360deg)} }
@keyframes cardIn  { from{opacity:0;transform:translateY(26px) scale(.96)} to{opacity:1;transform:none} }
@keyframes float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes pulseGlow  { 0%,100%{box-shadow:0 0 0 0 rgba(255,181,71,.4)}  50%{box-shadow:0 0 18px 4px rgba(255,181,71,.18)} }
@keyframes pulseBlue  { 0%,100%{box-shadow:0 0 0 0 rgba(124,131,255,.35)} 50%{box-shadow:0 0 18px 4px rgba(124,131,255,.15)} }

.page-in  { animation: pageIn .4s cubic-bezier(.22,1,.36,1) both; }
.a-cin    { animation: cardIn .38s cubic-bezier(.34,1.4,.64,1) both; }
.a-spin   { animation: spin .7s linear infinite; }
.a-blink  { animation: blink 2s infinite; }
.a-float  { animation: float 4s ease-in-out infinite; }
.fade-1 { animation: fadeUp .6s ease both; }
.fade-2 { animation: fadeUp .7s .1s ease both; }
.fade-3 { animation: fadeUp .7s .2s ease both; }
.fade-4 { animation: fadeUp .7s .3s ease both; }
.fade-5 { animation: fadeUp .7s .4s ease both; }

.hp-grad      { background: linear-gradient(135deg,var(--blue) 0%,var(--teal) 50%,var(--rose) 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.hp-grad-blue { background: linear-gradient(135deg,var(--blue),var(--teal)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.hp-grad-amber{ background: linear-gradient(135deg,#FFB547,#FF6B9D); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.hp-grad-indigo{ background: linear-gradient(135deg,#7c83ff,#a78bfa); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

.ckc-nav { position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:1rem 2.8rem;background:rgba(13,15,20,.88);backdrop-filter:blur(24px);border-bottom:1px solid rgba(255,255,255,.05); }
.nav-logo { font-family:var(--disp);font-size:1.2rem;font-weight:800;color:#fff;display:flex;align-items:center;gap:9px; }
.nav-logo-mark { width:28px;height:28px;border-radius:7px;background:linear-gradient(135deg,var(--blue),var(--teal));display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 4px 16px rgba(79,193,255,.35); }
.nav-links { display:flex;gap:1.8rem; }
.nav-link  { font-size:.82rem;font-weight:500;color:var(--text-2);cursor:pointer;transition:color .2s;background:none;border:none;font-family:var(--sans); }
.nav-link:hover { color:var(--blue-l); }
.btn-nav { background:linear-gradient(135deg,var(--blue),var(--teal));color:#0d0f14;border:none;border-radius:7px;padding:8px 20px;font-size:.82rem;font-weight:700;cursor:pointer;font-family:var(--disp);box-shadow:0 4px 18px rgba(79,193,255,.3);transition:opacity .2s,transform .2s; }
.btn-nav:hover { opacity:.9;transform:translateY(-1px); }

.btn-primary { display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--blue),var(--teal));color:#0d0f14;border:none;border-radius:10px;padding:13px 30px;font-size:.95rem;font-weight:700;cursor:pointer;font-family:var(--disp);box-shadow:0 8px 32px rgba(79,193,255,.4);transition:transform .2s,box-shadow .2s; }
.btn-primary:hover { transform:translateY(-2px);box-shadow:0 14px 44px rgba(79,193,255,.55); }
.btn-primary .arrow { transition:transform .2s;display:inline-block; }
.btn-primary:hover .arrow { transform:translateX(4px); }
.btn-ghost { background:transparent;color:var(--text-2);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:13px 30px;font-size:.95rem;font-weight:500;cursor:pointer;font-family:var(--sans);transition:all .2s; }
.btn-ghost:hover { border-color:var(--blue-l);color:var(--blue-l); }

.btn-amber { display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#FFB547,#FF6B9D);color:#0d0f14;border:none;border-radius:10px;padding:13px 30px;font-size:.95rem;font-weight:700;cursor:pointer;font-family:var(--disp);box-shadow:0 8px 32px rgba(255,181,71,.35);transition:transform .2s,box-shadow .2s; }
.btn-amber:hover { transform:translateY(-2px);box-shadow:0 14px 44px rgba(255,181,71,.5); }

.btn-indigo { display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#7c83ff,#a78bfa);color:#0d0f14;border:none;border-radius:10px;padding:13px 30px;font-size:.95rem;font-weight:700;cursor:pointer;font-family:var(--disp);box-shadow:0 8px 32px rgba(124,131,255,.35);transition:transform .2s,box-shadow .2s; }
.btn-indigo:hover { transform:translateY(-2px);box-shadow:0 14px 44px rgba(124,131,255,.5); }

.hero { min-height:100vh;display:flex;align-items:center;position:relative;overflow:hidden;padding:8rem 2.8rem 5rem; }
.hero-mesh { position:absolute;inset:0;z-index:0;background:radial-gradient(ellipse 65% 50% at 70% 10%,rgba(79,193,255,.13) 0%,transparent 65%),radial-gradient(ellipse 40% 38% at 10% 80%,rgba(78,201,176,.09) 0%,transparent 60%),radial-gradient(ellipse 30% 28% at 90% 80%,rgba(167,139,250,.07) 0%,transparent 55%); }
.hero-grid { position:absolute;inset:0;z-index:0;background-image:linear-gradient(rgba(79,193,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(79,193,255,.035) 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(ellipse 90% 70% at 50% 0%,black 0%,transparent 100%); }
.hero-content { position:relative;z-index:1;max-width:680px; }
.hero-badge { display:inline-flex;align-items:center;gap:7px;background:rgba(79,193,255,.08);border:1px solid rgba(79,193,255,.25);border-radius:100px;padding:5px 14px;font-size:.68rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--blue-l);margin-bottom:1.8rem; }
.live-dot { width:6px;height:6px;border-radius:50%;background:var(--teal);box-shadow:0 0 7px var(--teal);display:inline-block; }
.hero-stats { display:flex;gap:2.8rem;margin-top:4rem; }
.stat { border-left:2px solid rgba(79,193,255,.3);padding-left:.9rem; }
.stat-num { font-family:var(--disp);font-size:1.9rem;font-weight:800;color:#fff; }
.stat-lbl { font-size:.65rem;color:var(--text-3);letter-spacing:.1em;text-transform:uppercase;margin-top:2px; }
.hero-visual { position:absolute;right:2.8rem;top:50%;transform:translateY(-50%);width:370px;z-index:1; }
.code-card { background:rgba(17,19,24,.95);border:1px solid rgba(255,255,255,.09);border-radius:14px;overflow:hidden;box-shadow:0 40px 80px rgba(0,0,0,.7),0 0 0 1px rgba(79,193,255,.08); }
.code-header { display:flex;align-items:center;gap:7px;padding:10px 14px;background:rgba(255,255,255,.03);border-bottom:1px solid rgba(255,255,255,.05); }
.dot-r{width:9px;height:9px;border-radius:50%;background:#FF5F56;} .dot-y{width:9px;height:9px;border-radius:50%;background:#FFBD2E;} .dot-g{width:9px;height:9px;border-radius:50%;background:#27C93F;}
.code-fname { font-family:var(--mono);font-size:.68rem;color:var(--text-3);margin-left:7px; }
.code-body  { padding:1.1rem 1.4rem;font-family:var(--mono);font-size:.74rem;line-height:1.85; }
.c-kw{color:#4FC1FF;} .c-fn{color:#4EC9B0;} .c-str{color:#FFB547;} .c-cmt{color:#3f4d66;font-style:italic;} .c-var{color:#e0e6ff;}

.section { padding:5.5rem 2.8rem; }
.section.dark   { background:var(--bg2); }
.section.darker { background:var(--bg3); }
.s-label { font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:var(--blue-l);font-weight:600;margin-bottom:.6rem; }
.s-title { font-family:var(--disp);font-size:clamp(1.8rem,3.8vw,2.8rem);font-weight:800;color:#fff;letter-spacing:-.03em;line-height:1.05;margin-bottom:.9rem; }
.s-desc  { font-size:.95rem;color:var(--text-2);max-width:500px;line-height:1.8; }

/* ── Cognitive Analytics spotlight banner ── */
.cog-banner {
  position: relative; overflow: hidden;
  background: linear-gradient(135deg, rgba(255,181,71,.07) 0%, rgba(255,107,157,.06) 50%, rgba(167,139,250,.06) 100%);
  border: 1px solid rgba(255,181,71,.22);
  border-radius: 18px; padding: 2.2rem 2.4rem;
  margin-top: 3rem; cursor: pointer;
  transition: border-color .25s, transform .25s;
  animation: pulseGlow 3s ease-in-out infinite;
}
.cog-banner:hover { border-color: rgba(255,181,71,.55); transform: translateY(-3px); }
.cog-banner::before {
  content:''; position:absolute; inset:0;
  background: radial-gradient(ellipse 55% 70% at 85% 50%, rgba(255,181,71,.08), transparent 65%);
  pointer-events:none;
}
.cog-banner-grid {
  position:absolute; inset:0; pointer-events:none;
  background-image: linear-gradient(rgba(255,181,71,.04) 1px,transparent 1px), linear-gradient(90deg,rgba(255,181,71,.04) 1px,transparent 1px);
  background-size: 32px 32px;
}
.cog-preview-bar {
  display: flex; gap: 10px; align-items: center; margin-bottom: 1.2rem;
}
.cog-pill {
  font-size: .6rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  padding: 3px 10px; border-radius: 100px; border: 1px solid;
}
.cog-pill-amber { background:rgba(255,181,71,.12); color:#FFB547; border-color:rgba(255,181,71,.35); }
.cog-pill-rose  { background:rgba(255,107,157,.1);  color:#FF6B9D; border-color:rgba(255,107,157,.3); }
.cog-pill-viol  { background:rgba(167,139,250,.1);  color:#A78BFA; border-color:rgba(167,139,250,.3); }

/* ── AI Pair Programmer spotlight banner ── */
.aip-banner {
  position: relative; overflow: hidden;
  background: linear-gradient(135deg, rgba(124,131,255,.07) 0%, rgba(167,139,250,.06) 50%, rgba(79,193,255,.05) 100%);
  border: 1px solid rgba(124,131,255,.22);
  border-radius: 18px; padding: 2.2rem 2.4rem;
  margin-top: 3rem; cursor: pointer;
  transition: border-color .25s, transform .25s, box-shadow .25s;
  animation: pulseBlue 3s ease-in-out infinite;
}
.aip-banner:hover { border-color: rgba(124,131,255,.55); transform: translateY(-3px); box-shadow: 0 20px 60px rgba(124,131,255,.12); }
.aip-banner::before {
  content:''; position:absolute; inset:0;
  background: radial-gradient(ellipse 55% 70% at 85% 50%, rgba(124,131,255,.08), transparent 65%);
  pointer-events:none;
}
.aip-banner-grid {
  position:absolute; inset:0; pointer-events:none;
  background-image: linear-gradient(rgba(124,131,255,.03) 1px,transparent 1px), linear-gradient(90deg,rgba(124,131,255,.03) 1px,transparent 1px);
  background-size: 32px 32px;
}
.aip-pill-indigo { background:rgba(124,131,255,.12); color:#a5abff; border-color:rgba(124,131,255,.35); }
.aip-pill-violet { background:rgba(167,139,250,.1);  color:#A78BFA; border-color:rgba(167,139,250,.3); }
.aip-pill-blue   { background:rgba(79,193,255,.1);   color:#4FC1FF; border-color:rgba(79,193,255,.3); }

.efc { background:rgba(17,19,24,.75);border:1px solid rgba(79,193,255,.18);border-radius:18px;overflow:hidden;box-shadow:0 40px 80px rgba(0,0,0,.5);margin-top:3rem; }
.efc-bar { display:flex;align-items:center;justify-content:space-between;padding:1.1rem 1.6rem;background:rgba(255,255,255,.02);border-bottom:1px solid rgba(255,255,255,.06); }
.efc-dots { display:flex;gap:5px; }
.efc-pills { display:flex;gap:.4rem; }
.pill-sm { font-size:.6rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:2px 9px;border-radius:100px;border:1px solid; }
.pill-live { background:rgba(78,201,176,.1);color:var(--teal);border-color:rgba(78,201,176,.3); }
.pill-ws   { background:rgba(79,193,255,.1);color:var(--blue-l);border-color:rgba(79,193,255,.3); }
.pill-crdt { background:rgba(167,139,250,.1);color:var(--violet);border-color:rgba(167,139,250,.3); }
.efc-body  { padding:1.4rem 1.6rem;display:grid;grid-template-columns:1fr 1fr;gap:1.4rem; }
.efc-preview { background:rgba(10,12,18,.8);border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.06); }
.efc-ph { padding:.6rem .9rem;background:rgba(255,255,255,.025);border-bottom:1px solid rgba(255,255,255,.05);font-family:var(--mono);font-size:.64rem;color:var(--text-3); }
.efc-pb { padding:.9rem;font-family:var(--mono);font-size:.68rem;line-height:1.8; }
.efc-right { display:flex;flex-direction:column;gap:.9rem; }
.efc-stats { display:flex;gap:.9rem; }
.efc-stat  { flex:1;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:9px;padding:.9rem; }
.efc-sv    { font-family:var(--disp);font-size:1.5rem;font-weight:800;color:#fff; }
.efc-sl    { font-size:.63rem;color:var(--text-3);margin-top:2px; }

.layers-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:1.4rem;margin-top:3rem; }
.layer-card  { border-radius:16px;padding:1.9rem;position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.06);transition:transform .3s,border-color .3s; }
.layer-card:hover { transform:translateY(-5px); }
.layer-card.bc { background:linear-gradient(145deg,rgba(79,193,255,.09),rgba(79,193,255,.025)); }
.layer-card.bc:hover { border-color:rgba(79,193,255,.35); }
.layer-card.tc { background:linear-gradient(145deg,rgba(78,201,176,.08),rgba(78,201,176,.02)); }
.layer-card.tc:hover { border-color:rgba(78,201,176,.35); }
.layer-card.vc { background:linear-gradient(145deg,rgba(167,139,250,.08),rgba(167,139,250,.02)); }
.layer-card.vc:hover { border-color:rgba(167,139,250,.35); }
.layer-num { font-family:var(--disp);font-size:3rem;font-weight:800;opacity:.06;position:absolute;top:.9rem;right:1.3rem;color:#fff;line-height:1; }
.layer-icon { font-size:1.5rem;margin-bottom:.9rem; }
.layer-card h3 { font-family:var(--disp);font-size:1.1rem;font-weight:700;color:#fff;margin-bottom:.6rem; }
.layer-card p  { font-size:.84rem;color:var(--text-2);line-height:1.75; }
.layer-pills { display:flex;flex-wrap:wrap;gap:.4rem;margin-top:1.1rem; }
.pill   { font-size:.68rem;font-weight:500;border-radius:100px;padding:3px 11px;border:1px solid; }
.pill-b { background:rgba(79,193,255,.08);color:var(--blue-l);border-color:rgba(79,193,255,.25); }
.pill-t { background:rgba(78,201,176,.08);color:var(--teal);border-color:rgba(78,201,176,.25); }
.pill-v { background:rgba(167,139,250,.08);color:var(--violet);border-color:rgba(167,139,250,.25); }

.modules-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(285px,1fr));gap:1.1rem;margin-top:3rem; }
.mod-card { background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:1.5rem;position:relative;overflow:hidden;transition:all .25s; }
.mod-card:hover { background:rgba(255,255,255,.05);border-color:rgba(79,193,255,.28);transform:translateY(-3px); }
.mod-card.mod-cog { background:linear-gradient(145deg,rgba(255,181,71,.07),rgba(255,107,157,.04)); border-color:rgba(255,181,71,.2); }
.mod-card.mod-cog:hover { border-color:rgba(255,181,71,.5); transform:translateY(-4px); box-shadow:0 16px 48px rgba(255,181,71,.12); }
.mod-card.mod-git { background:linear-gradient(145deg,rgba(78,201,176,.08),rgba(79,193,255,.04)); border-color:rgba(78,201,176,.2); }
.mod-card.mod-git:hover { border-color:rgba(78,201,176,.5); transform:translateY(-4px); box-shadow:0 16px 48px rgba(78,201,176,.12); }
.mod-card.mod-aipair { background:linear-gradient(145deg,rgba(124,131,255,.09),rgba(167,139,250,.04)); border-color:rgba(124,131,255,.2); }
.mod-card.mod-aipair:hover { border-color:rgba(124,131,255,.5); transform:translateY(-4px); box-shadow:0 16px 48px rgba(124,131,255,.12); }
.mod-idx  { font-family:var(--mono);font-size:.64rem;color:rgba(79,193,255,.5);font-weight:600;letter-spacing:.08em;margin-bottom:.7rem; }
.mod-card.mod-cog .mod-idx    { color:rgba(255,181,71,.6); }
.mod-card.mod-git .mod-idx    { color:rgba(78,201,176,.6); }
.mod-card.mod-aipair .mod-idx { color:rgba(124,131,255,.6); }
.mod-card h3 { font-family:var(--disp);font-size:.95rem;font-weight:700;color:#fff;margin-bottom:.4rem; }
.mod-card p  { font-size:.8rem;color:var(--text-3);line-height:1.7; }
.mod-accent  { position:absolute;bottom:0;left:0;height:2px;border-radius:0 0 0 13px;width:0;transition:width .35s ease; }
.mod-card:hover .mod-accent { width:100%; }

.lang-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:.8rem;margin-top:2.5rem; }
.lang-chip { background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:1.1rem;display:flex;flex-direction:column;align-items:center;gap:.5rem;transition:all .2s;text-align:center;cursor:default; }
.lang-chip:hover { transform:translateY(-2px); }

.tabs { display:flex;gap:.4rem;margin-bottom:2rem;flex-wrap:wrap; }
.tab-btn { font-family:var(--sans);font-size:.8rem;font-weight:500;background:var(--surface);border:1px solid var(--border);color:var(--text-2);border-radius:7px;padding:6px 16px;cursor:pointer;transition:all .2s; }
.tab-btn.active { background:rgba(79,193,255,.13);border-color:rgba(79,193,255,.38);color:var(--blue-l); }
.tab-btn:hover:not(.active) { border-color:rgba(255,255,255,.14);color:var(--text); }

.wf-steps { display:flex;flex-direction:column;margin-top:2.5rem;max-width:580px; }
.wf-step  { display:flex;gap:1.4rem;position:relative;padding-bottom:2.2rem; }
.wf-step:last-child { padding-bottom:0; }
.wf-step:not(:last-child)::before { content:'';position:absolute;left:18px;top:38px;width:2px;bottom:0;background:linear-gradient(to bottom,rgba(79,193,255,.28),transparent); }
.wf-num { width:38px;height:38px;border-radius:50%;background:rgba(79,193,255,.1);border:1px solid rgba(79,193,255,.28);display:flex;align-items:center;justify-content:center;font-family:var(--disp);font-size:.82rem;font-weight:800;color:var(--blue-l);flex-shrink:0; }
.wf-body h4 { font-family:var(--disp);font-size:.95rem;font-weight:700;color:#fff;margin-bottom:.28rem;padding-top:.55rem; }
.wf-body p  { font-size:.82rem;color:var(--text-3);line-height:1.7; }

.apps-grid { display:grid;grid-template-columns:1fr 1fr;gap:1.4rem;margin-top:3rem; }
.app-card  { border-radius:16px;padding:2.2rem;border:1px solid rgba(255,255,255,.06);position:relative;overflow:hidden; }
.app-card.students { background:linear-gradient(135deg,rgba(78,201,176,.07),rgba(79,193,255,.05)); }
.app-card.devs     { background:linear-gradient(135deg,rgba(255,107,157,.06),rgba(167,139,250,.06)); }
.app-label { font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;font-weight:600;margin-bottom:.9rem; }
.app-card.students .app-label { color:var(--teal); }
.app-card.devs     .app-label { color:var(--rose); }
.app-card h3 { font-family:var(--disp);font-size:1.5rem;font-weight:800;color:#fff;margin-bottom:1.1rem; }
.app-list { list-style:none;display:flex;flex-direction:column;gap:.65rem; }
.app-list li { display:flex;align-items:flex-start;gap:.55rem;font-size:.87rem;color:var(--text-2); }
.app-list li::before { content:'';width:5px;height:5px;border-radius:50%;margin-top:.55rem;flex-shrink:0; }
.app-card.students .app-list li::before { background:var(--teal); }
.app-card.devs     .app-list li::before { background:var(--rose); }

.novelty-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:1.1rem;margin-top:2.5rem; }
.novelty-card { background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:1.4rem; }
.novelty-icon { width:38px;height:38px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:1rem;margin-bottom:.9rem; }
.ni-b{background:rgba(79,193,255,.1);} .ni-t{background:rgba(78,201,176,.1);} .ni-v{background:rgba(167,139,250,.1);} .ni-r{background:rgba(255,107,157,.1);}
.novelty-card h4 { font-family:var(--disp);font-size:.9rem;font-weight:700;color:#fff;margin-bottom:.35rem; }
.novelty-card p  { font-size:.79rem;color:var(--text-3);line-height:1.7; }

.cta-section { padding:6.5rem 2.8rem;text-align:center;position:relative;overflow:hidden; }
.cta-section::before { content:'';position:absolute;inset:0;background:radial-gradient(ellipse 55% 48% at 50% 50%,rgba(79,193,255,.1) 0%,transparent 70%); }
.cta-section h2 { font-family:var(--disp);font-size:clamp(1.9rem,4.5vw,3.2rem);font-weight:800;color:#fff;letter-spacing:-.03em;margin-bottom:.9rem;position:relative;z-index:1; }
.cta-section p  { font-size:1rem;color:var(--text-2);margin-bottom:2.2rem;position:relative;z-index:1; }
.cta-btns { display:flex;justify-content:center;gap:.9rem;flex-wrap:wrap;position:relative;z-index:1; }

.footer { border-top:1px solid rgba(255,255,255,.05);padding:1.8rem 2.8rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.9rem; }

.login-input { width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:.6rem .85rem;font-size:.85rem;color:#e0e6ff;font-family:var(--sans);outline:none;transition:border-color .2s,box-shadow .2s; }
.login-input:focus { border-color:rgba(79,193,255,.5);box-shadow:0 0 0 3px rgba(79,193,255,.08); }

::-webkit-scrollbar{width:5px;height:5px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px;} ::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.14);}

@media(max-width:900px){
  .hero{padding:7rem 1.5rem 4rem;} .hero-visual{display:none;}
  .ckc-nav{padding:.9rem 1.5rem;} .nav-links{display:none;}
  .section{padding:4rem 1.5rem;} .cta-section{padding:4.5rem 1.5rem;} .footer{padding:1.3rem 1.5rem;}
  .layers-grid{grid-template-columns:1fr;} .apps-grid{grid-template-columns:1fr;} .efc-body{grid-template-columns:1fr;}
  .cog-banner { padding:1.6rem; } .aip-banner { padding:1.6rem; }
}
`;

/* ═══════════════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════════════ */
const MODULES = [
  { idx:"01", title:"Live Collaborative Editor",     desc:"Google Docs-style real-time coding with multi-user cursor tracking via WebSockets, full CRDT/OT, and CodeMirror 6.",    accent:"#4FC1FF", isEditor:true },
  { idx:"02", title:"Real-Time Debugging Room",      desc:"Share logs instantly. Teams view, annotate, and suggest fixes collaboratively — for students and developers alike.",       accent:"#4EC9B0", isDebug:true },
  { idx:"03", title:"Live Server Logs Dashboard",    desc:"Stream server events in real-time. Acts as a mini DevOps monitoring layer with live error surfacing.",                    accent:"#FFB547", isLogs:true },
  { idx:"04", title:"Collaborative API Testing",     desc:"Like Postman, but real-time. Teams test endpoints, share requests, and view responses together live.",                    accent:"#FF6B9D", isApi:true },
  { idx:"05", title:"Context-Based Dev Chat",        desc:"Chat linked to specific files, errors, and projects. Threaded discussions with @mention support.",                        accent:"#A78BFA", isChat:true },
  { idx:"06", title:"Code Execution Sandbox",        desc:"Run 8 languages in-browser: TypeScript, JavaScript, Python, Java, C++, Rust, Go, SQL — with simulated output.",         accent:"#4FC1FF", isExec:true, isSandbox:true },
  { idx:"07", title:"Performance Monitor",           desc:"Track API response time, errors per second, and execution latency with real-time graph visualization.",                  accent:"#4EC9B0", isPerf:true },
  { idx:"08", title:"Behavior Tracking Engine",      desc:"Monitors typing speed, backspace frequency, error rate, and idle time to understand developer cognition.",               accent:"#FFB547", isBehavior:true },
  { idx:"09", title:"Frustration Detection",         desc:"Detects when users are stuck and intelligently triggers hints, learning mode, or contextual suggestions.",               accent:"#FF6B9D", isFrustration:true },
  { idx:"10", title:"Live Knowledge Graph Engine",   desc:"Converts code into concepts, errors, and fixes. Builds a live visual graph: Loop → Array → Error → Fix.",              accent:"#A78BFA", core:true, isKnowledge:true },
  { idx:"11", title:"Adaptive AI Mentor",            desc:"Beginner gets deep explanations. Intermediate gets hints. Advanced gets optimizations. Fully adaptive.",                 accent:"#4FC1FF", isAiMentor:true },
  { idx:"12", title:"Adaptive UI Engine",            desc:"Dynamically changes the interface: hints for beginners, guidance for stuck users, minimal for experts.",                 accent:"#4EC9B0" },
  { idx:"13", title:"Cognitive Analytics Dashboard", desc:"Displays productivity trends, focus levels, and weak concept identification across sessions. AI-powered insights in real time.", accent:"#FFB547", isCognitive:true },
  { idx:"14", title:"Version Control Integration",   desc:"Connect sessions to GitHub / GitLab. View real-time diffs, commit history, branch status, and AI-generated commit messages — directly inside the editor.", accent:"#4EC9B0", isGitBridge:true },
  { idx:"15", title:"AI Pair Programmer",            desc:"Inline co-pilot powered by Claude API — suggests next lines, explains selected code in plain English, generates boilerplate, and refactors on demand with RAG-enhanced context.", accent:"#7c83ff", isAIPair:true },
];

const WORKFLOW_STEPS = [
  { n:"1", title:"Users Join Session",          desc:"Developers and students enter a session with unique IDs. Pick from 8 supported languages at login." },
  { n:"2", title:"Collaborative Editing",       desc:"Code is co-authored using full CRDT/OT conflict resolution, guaranteeing convergence across all clients." },
  { n:"3", title:"Behavior Tracked",            desc:"The Behavior Tracking Engine silently monitors typing patterns, idle time, and error frequency." },
  { n:"4", title:"Logs & Execution Streamed",   desc:"Code output and server logs flow to all participants in real time via WebSockets." },
  { n:"5", title:"AI Analyzes Code & Behavior", desc:"The AI engine processes code semantics and developer state to derive contextual understanding." },
  { n:"6", title:"System Responds Adaptively",  desc:"Suggestions surface, knowledge graph updates, UI adapts — all in real time without interruption." },
];

/* ── Mini sparkline ── */
function MiniSparkline({ values, color }) {
  const W = 80, H = 28, pad = 2;
  const max = Math.max(...values), min = Math.min(...values);
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow:"visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BADGE + CLICK CONFIG
═══════════════════════════════════════════════════════════════ */
const BADGE_CFG = {
  isEditor:     { bg:"rgba(79,193,255,.1)",   color:"#8DD8FF", border:"rgba(79,193,255,.28)",  label:"▶ LIVE"      },
  isDebug:      { bg:"rgba(255,107,157,.1)",  color:"#FF6B9D", border:"rgba(255,107,157,.28)", label:"🐛 DEBUG"    },
  isLogs:       { bg:"rgba(78,201,176,.1)",   color:"#4EC9B0", border:"rgba(78,201,176,.28)",  label:"📡 LOGS"     },
  isApi:        { bg:"rgba(255,107,157,.1)",  color:"#FF6B9D", border:"rgba(255,107,157,.28)", label:"⚡ API"       },
  isChat:       { bg:"rgba(167,139,250,.1)",  color:"#A78BFA", border:"rgba(167,139,250,.28)", label:"💬 CHAT"     },
  isSandbox:    { bg:"rgba(78,201,176,.1)",   color:"#4EC9B0", border:"rgba(78,201,176,.28)",  label:"▶ RUN"       },
  isPerf:       { bg:"rgba(78,201,176,.1)",   color:"#4EC9B0", border:"rgba(78,201,246,.28)",  label:"📊 PERF"     },
  isBehavior:   { bg:"rgba(255,181,71,.1)",   color:"#FFB547", border:"rgba(255,181,71,.28)",  label:"🧠 TRACK"    },
  isFrustration:{ bg:"rgba(255,107,157,.1)",  color:"#FF6B9D", border:"rgba(255,107,157,.28)", label:"😤 DETECT"   },
  isKnowledge:  { bg:"rgba(167,139,250,.1)",  color:"#A78BFA", border:"rgba(167,139,250,.28)", label:"🕸 GRAPH"    },
  isAiMentor:   { bg:"rgba(79,193,255,.1)",   color:"#8DD8FF", border:"rgba(79,193,255,.28)",  label:"🤖 MENTOR"   },
  isCognitive:  { bg:"linear-gradient(135deg,rgba(255,181,71,.18),rgba(255,107,157,.12))", color:"#FFB547", border:"rgba(255,181,71,.38)", label:"📊 ANALYTICS" },
  isGitBridge:  { bg:"rgba(78,201,176,.1)",   color:"#4EC9B0", border:"rgba(78,201,176,.28)",  label:"🔀 GIT"      },
  isAIPair:     { bg:"linear-gradient(135deg,rgba(124,131,255,.18),rgba(167,139,250,.12))", color:"#a5abff", border:"rgba(124,131,255,.38)", label:"⌥ COPILOT" },
  core:         { bg:"rgba(255,181,71,.1)",   color:"#FFB547", border:"rgba(255,181,71,.28)",  label:"CORE"        },
};

const CLICK_COLOR = {
  isEditor:"var(--blue)", isDebug:"var(--teal)", isLogs:"var(--amber)",
  isChat:"var(--violet)", isSandbox:"var(--teal)", isApi:"var(--rose)",
  isPerf:"var(--teal)", isBehavior:"var(--amber)", isFrustration:"var(--rose)",
  isKnowledge:"var(--violet)", isAiMentor:"var(--blue)", isCognitive:"#FFB547",
  isGitBridge:"var(--teal)", isAIPair:"#7c83ff",
};

/* flag keys that make a card clickable (ordered: first match wins for badge) */
const CLICKABLE = [
  "isEditor","isDebug","isLogs","isChat","isSandbox","isApi",
  "isPerf","isBehavior","isFrustration","isKnowledge","isAiMentor",
  "isCognitive","isGitBridge","isAIPair",
];

/* ═══════════════════════════════════════════════════════════════
   HOME PAGE
═══════════════════════════════════════════════════════════════ */
function HomePage({
  onLaunch, onOpenChat, onOpenSandbox, onOpenApi,
  onOpenPerf, onOpenBehavior, onOpenFrustration,
  onOpenCognitive, onOpenDebug, onOpenLogs,
  onOpenKnowledge, onOpenAiMentor,
  onOpenGitBridge, onOpenAIPair,
}) {
  const [activeTab, setActiveTab] = useState("all");
  const filtered = activeTab === "all" ? MODULES
    : activeTab === "collab" ? MODULES.filter((_,i) => i < 6)
    : MODULES.filter((_,i) => i >= 6);
  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior:"smooth" });

  /* resolve click handler per module */
  const getHandler = m => {
    if (m.isEditor)       return onLaunch;
    if (m.isDebug)        return onOpenDebug;
    if (m.isLogs)         return onOpenLogs;
    if (m.isChat)         return onOpenChat;
    if (m.isSandbox)      return onOpenSandbox;
    if (m.isApi)          return onOpenApi;
    if (m.isPerf)         return onOpenPerf;
    if (m.isBehavior)     return onOpenBehavior;
    if (m.isFrustration)  return onOpenFrustration;
    if (m.isKnowledge)    return onOpenKnowledge;
    if (m.isAiMentor)     return onOpenAiMentor;
    if (m.isCognitive)    return onOpenCognitive;
    if (m.isGitBridge)    return onOpenGitBridge;
    if (m.isAIPair)       return onOpenAIPair;
    return undefined;
  };

  const isClickable  = m => CLICKABLE.some(k => m[k]);
  const getBadgeKey  = m => CLICKABLE.find(k => m[k]) || (m.core ? "core" : null);

  return (
    <div className="page-in" style={{ minHeight:"100vh" }}>

      {/* ── NAV ── */}
      <nav className="ckc-nav">
        <div className="nav-logo">
          <div className="nav-logo-mark">⚡</div>CKC-OS
        </div>
        <div className="nav-links">
          {[["Overview","overview"],["Modules","modules"],["Architecture","arch"],["Languages","langs"]].map(([l,id]) => (
            <button key={id} className="nav-link" onClick={() => scrollTo(id)}>{l}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {/* AI Copilot nav button */}
          <button
            onClick={onOpenAIPair}
            style={{
              background:"linear-gradient(135deg,rgba(124,131,255,.18),rgba(167,139,250,.14))",
              color:"#a5abff", border:"1px solid rgba(124,131,255,.38)", borderRadius:7,
              padding:"7px 16px", fontSize:".78rem", fontWeight:700, cursor:"pointer",
              fontFamily:"var(--disp)", letterSpacing:".04em", transition:"all .2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background="linear-gradient(135deg,rgba(124,131,255,.3),rgba(167,139,250,.22))"; e.currentTarget.style.borderColor="rgba(124,131,255,.6)"; }}
            onMouseLeave={e => { e.currentTarget.style.background="linear-gradient(135deg,rgba(124,131,255,.18),rgba(167,139,250,.14))"; e.currentTarget.style.borderColor="rgba(124,131,255,.38)"; }}
          >
            ⌥ AI Copilot
          </button>
          {/* Analytics nav button */}
          <button
            onClick={onOpenCognitive}
            style={{
              background:"linear-gradient(135deg,rgba(255,181,71,.18),rgba(255,107,157,.14))",
              color:"#FFB547", border:"1px solid rgba(255,181,71,.38)", borderRadius:7,
              padding:"7px 16px", fontSize:".78rem", fontWeight:700, cursor:"pointer",
              fontFamily:"var(--disp)", letterSpacing:".04em", transition:"all .2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background="linear-gradient(135deg,rgba(255,181,71,.3),rgba(255,107,157,.22))"; e.currentTarget.style.borderColor="rgba(255,181,71,.6)"; }}
            onMouseLeave={e => { e.currentTarget.style.background="linear-gradient(135deg,rgba(255,181,71,.18),rgba(255,107,157,.14))"; e.currentTarget.style.borderColor="rgba(255,181,71,.38)"; }}
          >
            📊 Analytics
          </button>
          <button className="btn-nav" onClick={onLaunch}>⚡ Launch Editor</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-mesh"/><div className="hero-grid"/>
        <div style={{ width:"100%" }}>
          <div className="hero-content">
            <div className="hero-badge fade-1">
              <span className="live-dot a-blink"/>
              CRDT/OT · CodeMirror 6 · 8 Languages · Real-Time
            </div>
            <h1 className="fade-2" style={{ fontFamily:"var(--disp)", fontSize:"clamp(2.7rem,6.5vw,5.2rem)", fontWeight:800, lineHeight:1.0, letterSpacing:"-.04em", color:"#fff", marginBottom:"1.2rem" }}>
              Cognitive Knowledge<br/><span className="hp-grad">Coding OS</span>
            </h1>
            <p className="fade-3" style={{ fontSize:"1.05rem", color:"var(--text-2)", maxWidth:540, lineHeight:1.8, marginBottom:"2.2rem", fontWeight:300 }}>
              A next-generation intelligent ecosystem — real-time collaboration with full CRDT/OT, 8-language execution via CodeMirror 6, AI-driven cognitive adaptation, and live knowledge graphs.
            </p>
            <div className="fade-4" style={{ display:"flex", gap:".9rem", flexWrap:"wrap", alignItems:"center" }}>
              <button className="btn-primary" onClick={onLaunch}>
                ⚡ Launch Collaborative Editor <span className="arrow">→</span>
              </button>
              <button className="btn-ghost" onClick={() => scrollTo("overview")}>System Overview</button>
            </div>
            <div className="hero-stats fade-5">
              {[["14","Core Modules"],["8","Languages"],["3","System Layers"],["∞","Real-time"]].map(([n,l]) => (
                <div className="stat" key={l}><div className="stat-num">{n}</div><div className="stat-lbl">{l}</div></div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating code preview */}
        <div className="hero-visual a-float">
          <div className="code-card">
            <div className="code-header">
              <span className="dot-r"/><span className="dot-y"/><span className="dot-g"/>
              <span className="code-fname">engine.ts · CodeMirror 6</span>
            </div>
            <div className="code-body">
              {[
                <><span className="c-cmt">// CKC-OS · CRDT/OT Engine</span></>,
                <><span className="c-kw">async function</span> <span className="c-fn">analyzeCode</span>(<span className="c-var">session</span>) {"{"}</>,
                <>  <span className="c-kw">const</span> <span className="c-var">graph</span> = <span className="c-kw">await</span> <span className="c-fn">buildKnowledgeGraph</span>(...);</>,
                <>  <span className="c-kw">const</span> <span className="c-var">state</span> = <span className="c-fn">detectCognition</span>(<span className="c-var">session</span>);</>,
                <></>,
                <>  <span className="c-kw">if</span> (<span className="c-var">state</span>.<span className="c-fn">isFrustrated</span>) {"{"}</>,
                <>    <span className="c-fn">triggerAdaptiveMentor</span>(<span className="c-str">'guidance'</span>);</>,
                <>  {"}"}</>,
                <></>,
                <>  <span className="c-fn">runCode</span>({"{"}<span className="c-var">lang</span>: <span className="c-str">'typescript'</span>{"}"});</>,
                <>  <span className="c-kw">return</span> {"{"} <span className="c-var">graph</span>, <span className="c-var">state</span> {"}"};</>,
                <>{"}"}</>,
              ].map((l,i) => <div key={i}>{l}</div>)}
            </div>
          </div>
        </div>
      </section>

      {/* ── EDITOR FEATURE HIGHLIGHT ── */}
      <section className="section dark" id="overview">
        <div className="s-label">Module 01 — Featured</div>
        <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"1.4rem", alignItems:"flex-end" }}>
          <div>
            <h2 className="s-title">Live Collaborative Editor</h2>
            <p className="s-desc">Google Docs-style coding with full CRDT/OT, live cursors, and 8-language execution via CodeMirror 6.</p>
          </div>
          <button className="btn-primary" onClick={onLaunch} style={{ fontSize:".85rem", padding:"11px 22px" }}>
            Open Editor <span className="arrow">→</span>
          </button>
        </div>
        <div className="efc">
          <div className="efc-bar">
            <div className="efc-dots"><span className="dot-r"/><span className="dot-y"/><span className="dot-g"/></div>
            <div style={{ display:"flex", alignItems:"center", gap:7, fontFamily:"var(--mono)", fontSize:".68rem", color:"var(--text-2)" }}>
              <span className="a-blink live-dot" style={{ width:6, height:6 }}/>
              engine.ts · 4 collaborators · TypeScript
            </div>
            <div className="efc-pills">
              <span className="pill-sm pill-live">● Live</span>
              <span className="pill-sm pill-ws">WebSocket</span>
              <span className="pill-sm pill-crdt">CRDT/OT</span>
            </div>
          </div>
          <div className="efc-body">
            <div className="efc-preview">
              <div className="efc-ph">engine.ts — TypeScript · CodeMirror 6</div>
              <div className="efc-pb">
                {[
                  <><span className="c-kw">export class</span> <span style={{color:"#8DD8FF"}}>CKCEngine</span> {"{"}</>,
                  <>  <span className="c-kw">private</span> <span className="c-var">ws</span>: <span style={{color:"#A78BFA"}}>WebSocketServer</span>;</>,
                  <>  <span className="c-kw">async</span> <span className="c-fn">applyOT</span>(<span className="c-var">op</span>: <span style={{color:"#A78BFA"}}>Operation</span>) {"{"}</>,
                  <>    <span className="c-kw">const</span> <span className="c-var">t</span> = <span className="c-fn">this</span>.<span className="c-fn">transform</span>(<span className="c-var">op</span>, <span className="c-fn">this</span>.<span className="c-var">version</span>);</>,
                  <>    <span className="c-fn">this</span>.<span className="c-fn">broadcast</span>(<span className="c-var">t</span>); <span className="c-cmt">// ← Aria editing</span></>,
                  <>  {"}"}</>,
                  <>{"}"}</>,
                ].map((l,i) => (
                  <div key={i} style={{ fontFamily:"var(--mono)", fontSize:".68rem", lineHeight:"21px", whiteSpace:"pre" }}>{l}</div>
                ))}
              </div>
            </div>
            <div className="efc-right">
              <div className="efc-stats">
                <div className="efc-stat"><div className="efc-sv">4</div><div className="efc-sl">Live Users</div></div>
                <div className="efc-stat"><div className="efc-sv" style={{color:"var(--teal)"}}>247</div><div className="efc-sl">CRDT Ops</div></div>
                <div className="efc-stat"><div className="efc-sv" style={{color:"var(--violet)"}}>8ms</div><div className="efc-sl">Sync</div></div>
              </div>
              <div style={{ fontSize:".65rem", color:"var(--text-3)", letterSpacing:".08em", textTransform:"uppercase", fontWeight:700 }}>Collaborators</div>
              <div style={{ display:"flex", flexDirection:"column", gap:".5rem" }}>
                {[
                  { name:"You",     color:"#4FC1FF", bg:"rgba(79,193,255,.18)",  inits:"Y",  status:"Typing…",       isMe:true },
                  { name:"Aria K.", color:"#FF6B9D", bg:"rgba(255,107,157,.18)", inits:"AK", status:"Ln 42, Col 18" },
                  { name:"Dev M.",  color:"#4EC9B0", bg:"rgba(78,201,176,.18)",  inits:"DM", status:"Reviewing diff" },
                  { name:"Sam T.",  color:"#DCDCAA", bg:"rgba(220,220,170,.18)", inits:"ST", status:"Ln 17, Col 3"  },
                ].map((u,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:".55rem" }}>
                    <div style={{ width:26, height:26, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".57rem", fontWeight:700, background:u.bg, color:u.color, fontFamily:"var(--mono)", flexShrink:0 }}>{u.inits}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:".75rem", color:"var(--text)", fontWeight:500 }}>{u.name}{u.isMe&&<span style={{ fontSize:".58rem", color:"var(--text-3)", marginLeft:4 }}>(you)</span>}</div>
                      <div style={{ fontSize:".62rem", color:u.color+"99", marginTop:1 }}>{u.status}</div>
                    </div>
                    {u.isMe && <span className="a-blink live-dot" style={{ width:5, height:5, background:u.color, boxShadow:`0 0 5px ${u.color}` }}/>}
                  </div>
                ))}
              </div>
              <button className="btn-primary" onClick={onLaunch} style={{ fontSize:".8rem", padding:"10px 18px", width:"100%", justifyContent:"center" }}>
                ⚡ Join Session Now <span className="arrow">→</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── COGNITIVE ANALYTICS SPOTLIGHT BANNER ── */}
        <div style={{ marginTop:"3rem" }}>
          <div className="s-label" style={{ color:"#FFB547", letterSpacing:".14em" }}>Module 13 — Featured</div>
          <div
            className="cog-banner"
            onClick={onOpenCognitive}
            role="button" tabIndex={0}
            onKeyDown={e => e.key === "Enter" && onOpenCognitive()}
          >
            <div className="cog-banner-grid"/>
            <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:"1.4rem" }}>
              <div style={{ flex:1, minWidth:260 }}>
                <div className="cog-preview-bar">
                  <div style={{ width:8, height:8, borderRadius:"50%", background:"#4ade80", boxShadow:"0 0 8px #4ade80" }}/>
                  <span style={{ fontSize:10, letterSpacing:".18em", color:"rgba(148,163,184,.6)", fontFamily:"var(--mono)" }}>AI-POWERED · REAL-TIME · ADAPTIVE</span>
                </div>
                <h3 style={{ fontFamily:"var(--disp)", fontSize:"clamp(1.3rem,2.8vw,2rem)", fontWeight:800, letterSpacing:"-.03em", color:"#fff", marginBottom:".5rem", lineHeight:1.1 }}>
                  Cognitive <span className="hp-grad-amber">Analytics Dashboard</span>
                </h3>
                <p style={{ fontSize:".88rem", color:"var(--text-2)", maxWidth:480, lineHeight:1.75 }}>
                  Track productivity trends, measure focus depth, and surface weak concepts — all powered by the CKC-OS knowledge engine with real-time AI insights.
                </p>
                <div style={{ display:"flex", gap:"2rem", marginTop:"1.4rem" }}>
                  {[["84%","Productivity"],["3.2h","Avg Focus"],["5","Weak Concepts"],["18","Sessions"]].map(([v,l]) => (
                    <div key={l}>
                      <div style={{ fontFamily:"var(--disp)", fontSize:"1.4rem", fontWeight:800, color:"#FFB547" }}>{v}</div>
                      <div style={{ fontSize:".6rem", color:"rgba(148,163,184,.5)", letterSpacing:".1em", textTransform:"uppercase", marginTop:2 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex", gap:8, marginTop:"1.4rem", flexWrap:"wrap" }}>
                  <span className="cog-pill cog-pill-amber">📊 Productivity Trends</span>
                  <span className="cog-pill cog-pill-rose">◎ Focus Levels</span>
                  <span className="cog-pill cog-pill-viol">⚠ Weak Concepts</span>
                </div>
              </div>
              {/* Mini preview panel */}
              <div style={{ width:260, background:"rgba(6,11,20,.85)", border:"1px solid rgba(255,181,71,.18)", borderRadius:12, overflow:"hidden", flexShrink:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", background:"rgba(255,255,255,.02)", borderBottom:"1px solid rgba(255,181,71,.1)" }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:"#FF5F56" }}/><span style={{ width:7, height:7, borderRadius:"50%", background:"#FFBD2E" }}/><span style={{ width:7, height:7, borderRadius:"50%", background:"#27C93F" }}/>
                  <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"rgba(148,163,184,.4)", marginLeft:4 }}>cognitive.tsx</span>
                </div>
                <div style={{ padding:"12px 14px" }}>
                  {[
                    { lbl:"Productivity score", val:"84%",  color:"#38bdf8", data:[68,75,82,91,87,55,60] },
                    { lbl:"Avg focus depth",    val:"3.2h", color:"#2dd4bf", data:[2.1,3,3.5,4.2,3.8,1.2,1.5] },
                    { lbl:"Weak concepts",      val:"5",    color:"#f87171", data:[5,5,5,5,5,5,5] },
                  ].map(row => (
                    <div key={row.lbl} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                      <div>
                        <div style={{ fontSize:9, color:"rgba(148,163,184,.45)", letterSpacing:".06em", marginBottom:2 }}>{row.lbl.toUpperCase()}</div>
                        <div style={{ fontFamily:"var(--mono)", fontSize:13, fontWeight:700, color:"#e2e8f0" }}>{row.val}</div>
                      </div>
                      <MiniSparkline values={row.data} color={row.color} />
                    </div>
                  ))}
                  <div style={{ marginTop:8, borderTop:"1px solid rgba(255,181,71,.08)", paddingTop:8 }}>
                    <div style={{ fontSize:9, color:"rgba(148,163,184,.35)", letterSpacing:".08em", marginBottom:6 }}>FOCUS HEATMAP</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(8,1fr)", gap:2 }}>
                      {[1,2,4,3,5,4,3,2,0,3,5,4,5,5,4,3,2,3,4,5,5,3,2,1].map((v,i) => (
                        <div key={i} style={{ height:8, borderRadius:2, background:v===0?"rgba(255,255,255,.04)":`rgba(56,189,248,${v*0.18})`, border:"1px solid rgba(56,189,248,.06)" }}/>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ padding:"8px 14px 10px", borderTop:"1px solid rgba(255,181,71,.1)", display:"flex", alignItems:"center", justifyContent:"center", gap:6, cursor:"pointer", background:"rgba(255,181,71,.04)" }}>
                  <span style={{ fontSize:10, color:"#FFB547", fontWeight:700, letterSpacing:".06em", fontFamily:"var(--mono)" }}>OPEN DASHBOARD</span>
                  <span style={{ color:"#FFB547", fontSize:12 }}>→</span>
                </div>
              </div>
            </div>
            <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"center", gap:12, marginTop:"1.6rem", paddingTop:"1.4rem", borderTop:"1px solid rgba(255,181,71,.1)" }}>
              <button onClick={e => { e.stopPropagation(); onOpenCognitive(); }} className="btn-amber" style={{ fontSize:".85rem", padding:"10px 22px" }}>
                📊 Open Cognitive Analytics <span style={{ transition:"transform .2s", display:"inline-block" }}>→</span>
              </button>
              <span style={{ fontSize:".78rem", color:"rgba(148,163,184,.45)", fontFamily:"var(--mono)" }}>cognitive.jsx · Module 13 · v2.4.1</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── GIT BRIDGE SPOTLIGHT ── */}
      <section className="section" style={{ paddingTop:"3rem", paddingBottom:"3rem" }}>
        <div className="s-label" style={{ color:"#4EC9B0" }}>Module 14 — Featured</div>
        <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"1.4rem", alignItems:"flex-end" }}>
          <div>
            <h2 className="s-title">Version Control Integration</h2>
            <p className="s-desc">Connect GitHub / GitLab repositories directly inside the editor — live diffs, commit history, branch status, and AI-powered commit message generation.</p>
          </div>
          <button className="btn-primary" onClick={onOpenGitBridge} style={{ fontSize:".85rem", padding:"11px 22px", background:"linear-gradient(135deg,#4EC9B0,#4FC1FF)" }}>
            Open Git Bridge <span className="arrow">→</span>
          </button>
        </div>
        <div className="efc" style={{ borderColor:"rgba(78,201,176,.18)" }}>
          <div className="efc-bar">
            <div className="efc-dots"><span className="dot-r"/><span className="dot-y"/><span className="dot-g"/></div>
            <div style={{ display:"flex", alignItems:"center", gap:7, fontFamily:"var(--mono)", fontSize:".68rem", color:"var(--text-2)" }}>
              <span className="a-blink live-dot" style={{ width:6, height:6, background:"#4EC9B0", boxShadow:"0 0 7px #4EC9B0" }}/>
              feat/git-bridge · 4 commits ahead · GitHub REST API
            </div>
            <div className="efc-pills">
              <span className="pill-sm" style={{ background:"rgba(78,201,176,.1)",color:"#4EC9B0",borderColor:"rgba(78,201,176,.3)" }}>● Live Diff</span>
              <span className="pill-sm" style={{ background:"rgba(167,139,250,.1)",color:"#A78BFA",borderColor:"rgba(167,139,250,.3)" }}>✨ AI Commits</span>
              <span className="pill-sm" style={{ background:"rgba(79,193,255,.1)", color:"#4FC1FF",borderColor:"rgba(79,193,255,.3)"  }}>🔀 PRs</span>
            </div>
          </div>
          <div className="efc-body">
            <div className="efc-preview">
              <div className="efc-ph">GitBridge.jsx — Live Diff · feat/git-bridge → main</div>
              <div className="efc-pb">
                {[
                  <><span className="c-cmt">@@ -14,6 +14,18 @@ import {'{'} useState {'}'} from 'react';</span></>,
                  <><span style={{color:"rgba(255,255,255,.35)"}}> import {'{'} simpleGit {'}'} from 'simple-git';</span></>,
                  <><span className="c-kw" style={{color:"#FF6B9D",textDecoration:"line-through",opacity:.6}}>-const git = simpleGit();</span></>,
                  <><span style={{color:"#4EC9B0"}}>+const git = simpleGit({'{'} baseDir: process.cwd() {'}'});</span></>,
                  <><span style={{color:"#4EC9B0"}}>+const ws  = new WebSocketServer({'{'} port: 9001 {'}'});</span></>,
                  <><span style={{color:"rgba(255,255,255,.35)"}}> </span></>,
                  <><span style={{color:"#4EC9B0"}}>+export async function streamDiff(sessionId) {'{'}</span></>,
                  <><span style={{color:"#4EC9B0"}}>+  ws.clients.forEach(c =&gt; c.send(diff));</span></>,
                ].map((l,i) => <div key={i} style={{ fontFamily:"var(--mono)", fontSize:".68rem", lineHeight:"21px", whiteSpace:"pre" }}>{l}</div>)}
              </div>
            </div>
            <div className="efc-right">
              <div className="efc-stats">
                <div className="efc-stat"><div className="efc-sv" style={{color:"#4EC9B0"}}>14</div><div className="efc-sl">Module</div></div>
                <div className="efc-stat"><div className="efc-sv" style={{color:"#4FC1FF"}}>6</div><div className="efc-sl">Files Changed</div></div>
                <div className="efc-stat"><div className="efc-sv" style={{color:"#A78BFA"}}>AI</div><div className="efc-sl">Commit Gen</div></div>
              </div>
              <div style={{ fontSize:".65rem", color:"var(--text-3)", letterSpacing:".08em", textTransform:"uppercase", fontWeight:700 }}>Tech Stack</div>
              <div style={{ display:"flex", flexDirection:"column", gap:".5rem" }}>
                {[
                  { icon:"🐙", name:"GitHub REST API / GraphQL", sub:"Repos, branches, PRs, commits" },
                  { icon:"🦊", name:"GitLab Integration",         sub:"MR, pipelines, branch status" },
                  { icon:"⚙️", name:"simple-git (Node.js)",        sub:"Local git ops over WebSocket" },
                  { icon:"✨", name:"CKC-AI Commit Engine",        sub:"Context-aware message gen" },
                ].map((t,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:".55rem" }}>
                    <div style={{ width:26, height:26, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:".85rem", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.06)", flexShrink:0 }}>{t.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:".75rem", color:"var(--text)", fontWeight:500 }}>{t.name}</div>
                      <div style={{ fontSize:".62rem", color:"rgba(255,255,255,.28)", marginTop:1 }}>{t.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn-primary" onClick={onOpenGitBridge} style={{ fontSize:".8rem", padding:"10px 18px", width:"100%", justifyContent:"center", background:"linear-gradient(135deg,#4EC9B0,#4FC1FF)", boxShadow:"0 8px 32px rgba(78,201,176,.35)" }}>
                🔀 Open Git Bridge <span className="arrow">→</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI PAIR PROGRAMMER SPOTLIGHT ── */}
      <section className="section dark" style={{ paddingTop:"3rem", paddingBottom:"3rem" }}>
        <div className="s-label" style={{ color:"#a5abff" }}>Module 15 — Featured</div>
        <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"1.4rem", alignItems:"flex-end" }}>
          <div>
            <h2 className="s-title">AI Pair Programmer</h2>
            <p className="s-desc">
              An inline coding co-pilot powered by Claude API and RAG — suggests next lines,
              explains selected code in plain English, generates boilerplate, and refactors on demand.
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={onOpenAIPair}
            style={{ fontSize:".85rem", padding:"11px 22px", background:"linear-gradient(135deg,#7c83ff,#a78bfa)", boxShadow:"0 8px 32px rgba(124,131,255,.35)" }}
          >
            Open AI Copilot <span className="arrow">→</span>
          </button>
        </div>

        <div className="efc" style={{ borderColor:"rgba(124,131,255,.18)" }}>
          <div className="efc-bar">
            <div className="efc-dots"><span className="dot-r"/><span className="dot-y"/><span className="dot-g"/></div>
            <div style={{ display:"flex", alignItems:"center", gap:7, fontFamily:"var(--mono)", fontSize:".68rem", color:"var(--text-2)" }}>
              <span className="a-blink live-dot" style={{ width:6, height:6, background:"#7c83ff", boxShadow:"0 0 7px #7c83ff" }}/>
              copilot.ts · Claude API · RAG-enhanced · 42 files indexed
            </div>
            <div className="efc-pills">
              <span className="pill-sm" style={{ background:"rgba(124,131,255,.1)", color:"#a5abff", borderColor:"rgba(124,131,255,.3)" }}>⌥ Copilot</span>
              <span className="pill-sm" style={{ background:"rgba(167,139,250,.1)", color:"#A78BFA", borderColor:"rgba(167,139,250,.3)" }}>RAG</span>
              <span className="pill-sm" style={{ background:"rgba(79,193,255,.1)",  color:"#4FC1FF", borderColor:"rgba(79,193,255,.3)"  }}>Claude API</span>
            </div>
          </div>
          <div className="efc-body">
            <div className="efc-preview">
              <div className="efc-ph">useAuth.ts — TypeScript · Suggestion Active</div>
              <div className="efc-pb">
                {[
                  <><span className="c-kw">import</span> {"{"} <span className="c-fn">useState</span>, <span className="c-fn">useCallback</span> {"}"} <span className="c-kw">from</span> <span className="c-str">'react'</span>;</>,
                  <></>,
                  <><span className="c-cmt">// ⌥ AI: detected pattern → custom hook</span></>,
                  <><span className="c-kw">export function</span> <span className="c-fn">useAuth</span>() {"{"}</>,
                  <>{"  "}<span className="c-kw">const</span> [<span className="c-var">user</span>, <span className="c-var">setUser</span>] = <span className="c-fn">useState</span>(<span className="c-kw">null</span>);</>,
                  <>{"  "}<span className="c-kw">const</span> [<span className="c-var">loading</span>, <span className="c-var">setLoading</span>] = <span className="c-fn">useState</span>(<span className="c-kw">false</span>);</>,
                  <></>,
                  <>{"  "}<span style={{ background:"rgba(124,131,255,.13)", borderRadius:3, padding:"1px 4px", borderBottom:"1px dashed #7c83ff" }}>
                      <span className="c-kw">const</span> <span className="c-var">login</span> = <span className="c-fn">useCallback</span>(<span className="c-kw">async</span> (<span className="c-var">creds</span>) =&gt; {"{"}</span></>,
                  <>{"    "}<span style={{ opacity:.45, fontStyle:"italic", color:"#7c83ff" }}>▸ suggested: setLoading(true); await…</span></>,
                  <>{"  "}{"})"}</>,
                ].map((l,i) => (
                  <div key={i} style={{ fontFamily:"var(--mono)", fontSize:".68rem", lineHeight:"21px", whiteSpace:"pre" }}>{l}</div>
                ))}
              </div>
            </div>
            <div className="efc-right">
              <div className="efc-stats">
                <div className="efc-stat"><div className="efc-sv" style={{color:"#a5abff"}}>15</div><div className="efc-sl">Module</div></div>
                <div className="efc-stat"><div className="efc-sv" style={{color:"#4FC1FF"}}>~40ms</div><div className="efc-sl">Latency</div></div>
                <div className="efc-stat"><div className="efc-sv" style={{color:"#4EC9B0"}}>RAG</div><div className="efc-sl">Context</div></div>
              </div>
              <div style={{ fontSize:".65rem", color:"var(--text-3)", letterSpacing:".08em", textTransform:"uppercase", fontWeight:700 }}>Capabilities</div>
              <div style={{ display:"flex", flexDirection:"column", gap:".5rem" }}>
                {[
                  { icon:"✦", label:"Inline Suggestions",   sub:"Next-line completions from code context", color:"#a5abff" },
                  { icon:"◈", label:"Code Explanation",      sub:"Plain-English breakdown of any selection", color:"#4FC1FF" },
                  { icon:"⊞", label:"Boilerplate Generator", sub:"React, Express, FastAPI, Hooks & more",   color:"#4EC9B0" },
                  { icon:"⟳", label:"Refactor on Demand",    sub:"TypeScript, a11y, performance upgrades",  color:"#A78BFA" },
                ].map((f,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:".55rem" }}>
                    <div style={{ width:26, height:26, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:".8rem", background:`${f.color}18`, border:`1px solid ${f.color}30`, flexShrink:0, color:f.color }}>{f.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:".75rem", color:"var(--text)", fontWeight:500 }}>{f.label}</div>
                      <div style={{ fontSize:".62rem", color:"rgba(255,255,255,.28)", marginTop:1 }}>{f.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="btn-primary"
                onClick={onOpenAIPair}
                style={{ fontSize:".8rem", padding:"10px 18px", width:"100%", justifyContent:"center", background:"linear-gradient(135deg,#7c83ff,#a78bfa)", boxShadow:"0 8px 32px rgba(124,131,255,.3)" }}
              >
                ⌥ Open AI Copilot <span className="arrow">→</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── AI Pair compact spotlight banner ── */}
        <div
          className="aip-banner"
          onClick={onOpenAIPair}
          role="button" tabIndex={0}
          onKeyDown={e => e.key === "Enter" && onOpenAIPair()}
        >
          <div className="aip-banner-grid"/>
          <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:"1.4rem" }}>
            <div style={{ flex:1, minWidth:260 }}>
              <div className="cog-preview-bar">
                <div style={{ width:8, height:8, borderRadius:"50%", background:"#a5abff", boxShadow:"0 0 8px #7c83ff" }}/>
                <span style={{ fontSize:10, letterSpacing:".18em", color:"rgba(148,163,184,.6)", fontFamily:"var(--mono)" }}>CLAUDE API · RAG · CODEX-STYLE · REAL-TIME</span>
              </div>
              <h3 style={{ fontFamily:"var(--disp)", fontSize:"clamp(1.2rem,2.6vw,1.8rem)", fontWeight:800, letterSpacing:"-.03em", color:"#fff", marginBottom:".5rem", lineHeight:1.1 }}>
                Your Intelligent <span className="hp-grad-indigo">Coding Co-Pilot</span>
              </h3>
              <p style={{ fontSize:".88rem", color:"var(--text-2)", maxWidth:480, lineHeight:1.75 }}>
                Powered by Claude API with RAG-enhanced retrieval — context-aware completions,
                instant refactoring, and plain-English explanations directly in your editor.
              </p>
              <div style={{ display:"flex", gap:"2rem", marginTop:"1.4rem" }}>
                {[["~40ms","Suggestion"],["4","Modes"],["42+","Files RAG"],["8","Languages"]].map(([v,l]) => (
                  <div key={l}>
                    <div style={{ fontFamily:"var(--disp)", fontSize:"1.35rem", fontWeight:800, color:"#a5abff" }}>{v}</div>
                    <div style={{ fontSize:".6rem", color:"rgba(148,163,184,.5)", letterSpacing:".1em", textTransform:"uppercase", marginTop:2 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:8, marginTop:"1.4rem", flexWrap:"wrap" }}>
                <span className="cog-pill aip-pill-indigo">✦ Inline Suggestions</span>
                <span className="cog-pill aip-pill-violet">◈ Code Explanation</span>
                <span className="cog-pill aip-pill-blue">⟳ Refactor Mode</span>
              </div>
            </div>

            <div style={{ width:250, background:"rgba(6,11,20,.88)", border:"1px solid rgba(124,131,255,.18)", borderRadius:12, overflow:"hidden", flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", background:"rgba(255,255,255,.02)", borderBottom:"1px solid rgba(124,131,255,.1)" }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:"#FF5F56" }}/><span style={{ width:7, height:7, borderRadius:"50%", background:"#FFBD2E" }}/><span style={{ width:7, height:7, borderRadius:"50%", background:"#27C93F" }}/>
                <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"rgba(148,163,184,.4)", marginLeft:4 }}>copilot.ts</span>
                <span style={{ marginLeft:"auto", fontSize:9, color:"#a5abff", fontFamily:"var(--mono)" }}>⌥ active</span>
              </div>
              <div style={{ padding:"12px 14px" }}>
                {[
                  { label:"Next line",     val:"useCallback", color:"#a5abff", data:[3,5,4,5,4,5,4] },
                  { label:"Refactor type", val:"TypeScript",  color:"#A78BFA", data:[2,3,5,4,3,5,4] },
                  { label:"Boilerplate",   val:"React Hook",  color:"#4FC1FF", data:[4,3,5,5,4,3,5] },
                ].map(row => (
                  <div key={row.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:9, color:"rgba(148,163,184,.45)", letterSpacing:".06em", marginBottom:2 }}>{row.label.toUpperCase()}</div>
                      <div style={{ fontFamily:"var(--mono)", fontSize:12, fontWeight:700, color:"#e2e8f0" }}>{row.val}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:20 }}>
                      {row.data.map((v,i) => (
                        <div key={i} style={{ width:6, borderRadius:2, height:`${v*18}%`, background:row.color, opacity:0.4+v*0.12 }}/>
                      ))}
                    </div>
                  </div>
                ))}
                <div style={{ marginTop:8, borderTop:"1px solid rgba(124,131,255,.08)", paddingTop:8 }}>
                  <div style={{ fontSize:9, color:"rgba(148,163,184,.35)", letterSpacing:".08em", marginBottom:6 }}>ACTIVE TABS</div>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    {["Suggest","Explain","Refactor","Templates"].map((t,i) => (
                      <span key={t} style={{ fontSize:8, padding:"2px 6px", borderRadius:4, background:i===0?"rgba(124,131,255,.2)":"rgba(255,255,255,.04)", color:i===0?"#a5abff":"rgba(148,163,184,.4)", border:`1px solid ${i===0?"rgba(124,131,255,.4)":"rgba(255,255,255,.06)"}`, fontFamily:"var(--mono)" }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ padding:"8px 14px 10px", borderTop:"1px solid rgba(124,131,255,.1)", display:"flex", alignItems:"center", justifyContent:"center", gap:6, cursor:"pointer", background:"rgba(124,131,255,.04)" }}>
                <span style={{ fontSize:10, color:"#a5abff", fontWeight:700, letterSpacing:".06em", fontFamily:"var(--mono)" }}>OPEN COPILOT</span>
                <span style={{ color:"#a5abff", fontSize:12 }}>→</span>
              </div>
            </div>
          </div>

          <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"center", gap:12, marginTop:"1.6rem", paddingTop:"1.4rem", borderTop:"1px solid rgba(124,131,255,.1)" }}>
            <button
              onClick={e => { e.stopPropagation(); onOpenAIPair(); }}
              className="btn-indigo"
              style={{ fontSize:".85rem", padding:"10px 22px" }}
            >
              ⌥ Open AI Pair Programmer <span style={{ display:"inline-block", transition:"transform .2s" }}>→</span>
            </button>
            <span style={{ fontSize:".78rem", color:"rgba(148,163,184,.45)", fontFamily:"var(--mono)" }}>aipair.jsx · Module 15 · Claude API</span>
          </div>
        </div>
      </section>

      {/* ── 3 LAYERS ── */}
      <section className="section darker">
        <div className="s-label">System Overview</div>
        <h2 className="s-title">Three Intelligent Layers<br/>Working in Concert</h2>
        <p className="s-desc">CKC-OS bridges isolated tools into a unified, behavior-aware platform.</p>
        <div className="layers-grid">
          <div className="layer-card bc"><div className="layer-num">01</div><div className="layer-icon">🧠</div><h3>Cognitive Layer</h3><p>Tracks real-time developer behavior — typing cadence, error frequency, idle periods — to infer frustration, focus, and proficiency.</p><div className="layer-pills"><span className="pill pill-b">Behavior Tracking</span><span className="pill pill-b">Frustration Detection</span></div></div>
          <div className="layer-card tc"><div className="layer-num">02</div><div className="layer-icon">🕸️</div><h3>Knowledge Layer</h3><p>Transforms raw code into structured knowledge: concepts, errors, and fixes linked in a live Neo4j graph that grows each session.</p><div className="layer-pills"><span className="pill pill-t">Knowledge Graph</span><span className="pill pill-t">Neo4j</span></div></div>
          <div className="layer-card vc"><div className="layer-num">03</div><div className="layer-icon">🔧</div><h3>Collaboration &amp; DevOps</h3><p>Real-time code editing, shared debugging, run-in-browser for 8 languages, live monitoring — all via WebSockets + CodeMirror 6.</p><div className="layer-pills"><span className="pill pill-v">WebSockets</span><span className="pill pill-v">CRDT/OT</span><span className="pill pill-v">CodeMirror 6</span></div></div>
        </div>
      </section>

      {/* ── MODULES ── */}
      <section className="section" id="modules">
        <div className="s-label">Core Modules</div>
        <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"1.4rem", alignItems:"flex-end", marginBottom:"1.8rem" }}>
          <div><h2 className="s-title">15 Integrated Modules</h2><p className="s-desc">Every module communicates in real time, forming a cohesive ecosystem.</p></div>
        </div>
        <div className="tabs">
          {[["all","All Modules"],["collab","Collaboration"],["ai","AI & Cognition"]].map(([v,l]) => (
            <button key={v} className={`tab-btn${activeTab===v?" active":""}`} onClick={() => setActiveTab(v)}>{l}</button>
          ))}
        </div>
        <div className="modules-grid">
          {filtered.map((m, idx) => {
            const bk         = getBadgeKey(m);
            const badge      = bk ? BADGE_CFG[bk] : null;
            const clickKey   = CLICKABLE.find(k => m[k]);
            const clickColor = clickKey ? CLICK_COLOR[clickKey] : null;
            const cardClass  = `mod-card${m.isCognitive?" mod-cog":m.isGitBridge?" mod-git":m.isAIPair?" mod-aipair":""}`;
            return (
              <div
                className={cardClass}
                key={`${m.idx}-${idx}`}
                onClick={getHandler(m)}
                style={{ cursor: isClickable(m) ? "pointer" : undefined }}
              >
                {badge && (
                  <span style={{
                    position:"absolute", top:".9rem", right:".9rem",
                    fontSize:".6rem",
                    background: badge.bg,
                    color: badge.color,
                    border:`1px solid ${badge.border}`,
                    borderRadius:"100px", padding:"2px 9px", fontWeight:700,
                  }}>
                    {badge.label}
                  </span>
                )}
                <div className="mod-idx">{m.idx}</div>
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
                {isClickable(m) && (
                  <p style={{ fontSize:".75rem", color: clickColor || "var(--blue)", marginTop:".65rem", fontWeight:700 }}>
                    {m.isCognitive ? "Click to open analytics →" : "Click to open →"}
                  </p>
                )}
                <div className="mod-accent" style={{ background:m.accent }}/>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── LANGUAGES ── */}
      <section className="section dark" id="langs">
        <div className="s-label">Code Execution</div>
        <h2 className="s-title">Run Code in 8 Languages</h2>
        <p className="s-desc">Select your language at session start — full syntax highlighting, autocomplete, and in-browser execution powered by CodeMirror 6.</p>
        <div className="lang-grid">
          {LK.map(k => {
            const l = LANGS[k];
            return (
              <div key={k} className="lang-chip" style={{ borderColor:`${l.c}22` }}
                onMouseEnter={e => e.currentTarget.style.borderColor = l.c+"66"}
                onMouseLeave={e => e.currentTarget.style.borderColor = `${l.c}22`}>
                <div style={{ fontFamily:"var(--mono)", fontSize:".9rem", fontWeight:700, color:l.c, background:l.bg, borderRadius:6, padding:"3px 8px" }}>{l.ic}</div>
                <div style={{ fontFamily:"var(--disp)", fontSize:".82rem", fontWeight:700, color:"#fff" }}>{l.n}</div>
                <div style={{ fontFamily:"var(--mono)", fontSize:".6rem", color:l.c, background:`${l.c}14`, borderRadius:100, padding:"2px 8px", border:`1px solid ${l.c}33` }}>{l.ext}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── ARCHITECTURE ── */}
      <section className="section darker" id="arch">
        <div className="s-label">System Architecture</div>
        <h2 className="s-title">Full-Stack Pipeline</h2>
        <p className="s-desc">A layered architecture connecting frontend intelligence to AI execution and graph storage.</p>
        <div style={{ marginTop:"3rem" }}>
          <div style={{ background:"rgba(17,19,24,.85)", border:"1px solid rgba(255,255,255,.07)", borderRadius:18, padding:"2.2rem" }}>
            <div style={{ marginBottom:"1.4rem" }}>
              <div style={{ fontSize:".65rem", color:"var(--text-3)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:".9rem", fontWeight:600 }}>Request Flow</div>
              <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:0 }}>
                {["React + CodeMirror 6","WebSocket + CRDT/OT","Node.js Backend","AI Engine (Python)","Docker Sandbox"].map((n,i,arr) => (
                  <span key={n}>
                    <span style={{ background:"rgba(255,255,255,.035)", border:`1px solid ${(i===0||i===3)?"rgba(79,193,255,.45)":"rgba(255,255,255,.07)"}`, borderRadius:10, padding:".85rem 1.3rem", fontFamily:"var(--mono)", fontSize:".72rem", color:(i===0||i===3)?"#8DD8FF":"#e0e6ff", fontWeight:500, whiteSpace:"nowrap", display:"inline-block" }}>{n}</span>
                    {i < arr.length-1 && <span style={{ padding:"0 .4rem", color:"var(--text-3)" }}>→</span>}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ borderTop:"1px solid rgba(255,255,255,.05)", paddingTop:"1.4rem" }}>
              <div style={{ fontSize:".65rem", color:"var(--text-3)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:".9rem", fontWeight:600 }}>Data Stores</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"1rem" }}>
                {[{ic:"🐘",n:"PostgreSQL",r:"Users · Projects · Sessions"},{ic:"🕸️",n:"Neo4j",r:"Concepts · Errors · Fixes"},{ic:"🔴",n:"Redis",r:"Events · Caching"}].map(db => (
                  <div key={db.n} style={{ background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)", borderRadius:11, padding:"1.1rem", textAlign:"center" }}>
                    <div style={{ fontSize:"1.3rem", marginBottom:".4rem" }}>{db.ic}</div>
                    <div style={{ fontFamily:"var(--disp)", fontSize:".9rem", fontWeight:700, color:"#fff", marginBottom:".25rem" }}>{db.n}</div>
                    <div style={{ fontSize:".72rem", color:"var(--text-3)" }}>{db.r}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WORKFLOW ── */}
      <section className="section">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"3.5rem", alignItems:"start" }}>
          <div>
            <div className="s-label">System Workflow</div>
            <h2 className="s-title">How It Works</h2>
            <p className="s-desc">Six orchestrated steps from session join to adaptive response — seamless and invisible to the user.</p>
            <button className="btn-primary" onClick={onLaunch} style={{ marginTop:"2rem" }}>Try It Live <span className="arrow">→</span></button>
          </div>
          <div className="wf-steps">
            {WORKFLOW_STEPS.map(s => (
              <div className="wf-step" key={s.n}>
                <div className="wf-num">{s.n}</div>
                <div className="wf-body"><h4>{s.title}</h4><p>{s.desc}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── APPS ── */}
      <section className="section dark">
        <div className="s-label">Applications</div>
        <h2 className="s-title">Built for Two Audiences</h2>
        <p className="s-desc">Designed to serve both learning journeys and professional development workflows.</p>
        <div className="apps-grid">
          <div className="app-card students">
            <div className="app-label">For Students</div>
            <h3>Learn by Doing,<br/>Together</h3>
            <ul className="app-list">
              <li>Learn coding through live visual knowledge graphs</li>
              <li>Debug with AI-guided hints and explanations</li>
              <li>Practice collaboratively in shared sessions</li>
              <li>Run code in 8 languages directly in the browser</li>
            </ul>
          </div>
          <div className="app-card devs">
            <div className="app-label">For Developers</div>
            <h3>Build Faster,<br/>Debug Smarter</h3>
            <ul className="app-list">
              <li>Collaborate on code in real time with full CRDT/OT</li>
              <li>Monitor live system performance and server logs</li>
              <li>Execute and share output across 8 languages</li>
              <li>Test APIs collaboratively with real-time tooling</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── NOVELTY ── */}
      <section className="section darker">
        <div className="s-label">Innovation</div>
        <h2 className="s-title">What Makes CKC-OS Unique</h2>
        <p className="s-desc">The first platform to integrate cognitive analysis, real-time collaboration, and live knowledge graph learning.</p>
        <div className="novelty-grid">
          {[
            { icon:"🧠", cls:"ni-b", title:"Behavior-Aware Coding",  desc:"The system understands how you code — not just what you type — and responds accordingly." },
            { icon:"🕸️", cls:"ni-t", title:"Live Knowledge Graphs",   desc:"Code is automatically transformed into interconnected concept maps powered by Neo4j." },
            { icon:"▶",  cls:"ni-v", title:"8-Language Execution",    desc:"Run TypeScript, Python, Java, Go, Rust, C++, JavaScript, and SQL in the browser via CodeMirror 6." },
            { icon:"🎯", cls:"ni-r", title:"Unified Dev + Learning",  desc:"No more context-switching. Everything lives in one adaptive, intelligent environment." },
          ].map(n => (
            <div key={n.title} className="novelty-card">
              <div className={`novelty-icon ${n.cls}`}>{n.icon}</div>
              <h4>{n.title}</h4><p>{n.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <h2>Code Together,<br/><span className="hp-grad-blue">Run Instantly</span></h2>
        <p>CKC-OS transforms how developers build and students learn — collaboratively, adaptively, in any language.</p>
        <div className="cta-btns">
          <button className="btn-primary" onClick={onLaunch}>⚡ Launch Collaborative Editor <span className="arrow">→</span></button>
          <button
            onClick={onOpenAIPair}
            style={{ background:"transparent", color:"#a5abff", border:"1px solid rgba(124,131,255,.35)", borderRadius:10, padding:"13px 30px", fontSize:".95rem", fontWeight:700, cursor:"pointer", fontFamily:"var(--disp)", transition:"all .2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(124,131,255,.7)"; e.currentTarget.style.background="rgba(124,131,255,.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(124,131,255,.35)"; e.currentTarget.style.background="transparent"; }}
          >
            ⌥ AI Copilot
          </button>
          <button
            onClick={onOpenCognitive}
            style={{ background:"transparent", color:"#FFB547", border:"1px solid rgba(255,181,71,.35)", borderRadius:10, padding:"13px 30px", fontSize:".95rem", fontWeight:700, cursor:"pointer", fontFamily:"var(--disp)", transition:"all .2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(255,181,71,.7)"; e.currentTarget.style.background="rgba(255,181,71,.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,181,71,.35)"; e.currentTarget.style.background="transparent"; }}
          >
            📊 View Analytics
          </button>
          <button className="btn-ghost" onClick={() => scrollTo("overview")}>Read System Overview</button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div className="nav-logo-mark" style={{ width:22, height:22, fontSize:10 }}>⚡</div>
          <span style={{ fontFamily:"var(--disp)", fontWeight:800, fontSize:".95rem", color:"var(--text-2)" }}>CKC-OS</span>
        </div>
        <div style={{ fontSize:".75rem", color:"var(--text-3)" }}>Cognitive Knowledge Coding OS · CRDT/OT · CodeMirror 6 · 2025</div>
        <div style={{ fontSize:".75rem", color:"var(--text-3)" }}>15 Modules · 8 Languages · AI-Powered · Real-Time</div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOGIN SCREEN
═══════════════════════════════════════════════════════════════ */
function LoginScreen({ onJoin, onBack }) {
  const [name,    setName]  = useState("");
  const [ci,      setCI]    = useState(0);
  const [sid,     setSid]   = useState(genSid);
  const [lang,    setLang]  = useState("ts");
  const [busy,    setBusy]  = useState(false);
  const [stepTxt, setStep]  = useState("Connecting…");

  const go = () => {
    if (!name.trim()) return;
    setBusy(true);
    const steps = ["Connecting to session…","Syncing CRDT/OT…","Loading CodeMirror 6…","You're in!"];
    let i = 0;
    const iv = setInterval(() => {
      setStep(steps[i++]);
      if (i >= steps.length) {
        clearInterval(iv);
        const c = PALETTE[ci];
        setTimeout(() => onJoin(
          { name: name.trim(), color: c.hex, bg: c.bg, inits: initials(name.trim()) },
          sid,
          lang
        ), 300);
      }
    }, 420);
  };

  return (
    <div className="page-in" style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", background:"#0d0f14" }}>
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse 55% 45% at 65% 22%,rgba(79,193,255,.11),transparent 62%),radial-gradient(ellipse 38% 34% at 15% 78%,rgba(78,201,176,.08),transparent 58%)" }}/>
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", backgroundImage:"linear-gradient(rgba(79,193,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(79,193,255,.03) 1px,transparent 1px)", backgroundSize:"52px 52px" }}/>

      <div className="a-cin" style={{ position:"relative", zIndex:1, width:440, background:"rgba(17,19,24,.97)", border:"1px solid rgba(255,255,255,.08)", borderRadius:18, boxShadow:"0 40px 80px rgba(0,0,0,.75),0 0 0 1px rgba(79,193,255,.06)", padding:"2.1rem 2.1rem 1.7rem" }}>
        <button onClick={onBack}
          style={{ position:"absolute", top:".9rem", left:".9rem", background:"none", border:"none", color:"rgba(255,255,255,.22)", cursor:"pointer", fontSize:".72rem", fontFamily:"var(--sans)", transition:"color .15s" }}
          onMouseEnter={e => e.currentTarget.style.color="var(--blue-l)"}
          onMouseLeave={e => e.currentTarget.style.color="rgba(255,255,255,.22)"}>
          ← Back to Home
        </button>

        <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:"1.5rem", marginTop:".4rem" }}>
          <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,var(--blue),var(--teal))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, boxShadow:"0 8px 22px rgba(79,193,255,.32)" }}>⚡</div>
          <div>
            <div style={{ fontFamily:"var(--disp)", fontSize:"1.1rem", fontWeight:800, color:"#fff", lineHeight:1 }}>CKC-OS</div>
            <div style={{ fontSize:".62rem", color:"rgba(255,255,255,.22)", marginTop:1 }}>Collaborative Editor · CRDT/OT · CodeMirror 6</div>
          </div>
        </div>

        <h2 style={{ fontFamily:"var(--disp)", fontSize:"1.35rem", fontWeight:800, color:"#fff", marginBottom:".3rem" }}>Join Session</h2>
        <p style={{ fontSize:".8rem", color:"rgba(255,255,255,.28)", marginBottom:"1.4rem", lineHeight:1.6 }}>Your cursor and edits sync live. Pick a language to start coding.</p>

        <div style={{ marginBottom:".85rem" }}>
          <label style={{ display:"block", fontSize:".62rem", fontWeight:700, color:"rgba(255,255,255,.3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:".35rem" }}>Your Name</label>
          <input className="login-input" placeholder="e.g. Aria, Dev, Sam…" maxLength={22}
            value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && name.trim() && go()}/>
        </div>

        <div style={{ marginBottom:".85rem" }}>
          <label style={{ display:"block", fontSize:".62rem", fontWeight:700, color:"rgba(255,255,255,.3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:".38rem" }}>Language</label>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:".3rem" }}>
            {LK.map(k => {
              const l = LANGS[k]; const on = lang === k;
              return (
                <button key={k} onClick={() => setLang(k)}
                  style={{ padding:"6px 4px", borderRadius:6, border:`1px solid ${on?l.c+"66":"rgba(255,255,255,.06)"}`, background:on?l.bg:"rgba(255,255,255,.02)", color:on?l.c:"rgba(255,255,255,.35)", cursor:"pointer", fontFamily:"var(--mono)", fontSize:".6rem", fontWeight:700, transition:"all .12s", textAlign:"center" }}>
                  <div style={{ fontSize:".75rem", marginBottom:1 }}>{l.ic}</div>
                  <div style={{ fontSize:".52rem", fontFamily:"var(--sans)", fontWeight:500 }}>{l.n}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom:".85rem" }}>
          <label style={{ display:"block", fontSize:".62rem", fontWeight:700, color:"rgba(255,255,255,.3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:".38rem" }}>Cursor Color</label>
          <div style={{ display:"flex", gap:".4rem" }}>
            {PALETTE.map((c,i) => (
              <div key={i} onClick={() => setCI(i)}
                style={{ width:22, height:22, borderRadius:"50%", cursor:"pointer", background:c.hex, border:i===ci?"2px solid #fff":"2px solid transparent", transform:i===ci?"scale(1.18)":"scale(1)", transition:"transform .12s,border-color .12s" }}/>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:".5rem" }}>
          <label style={{ display:"block", fontSize:".62rem", fontWeight:700, color:"rgba(255,255,255,.3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:".35rem" }}>Session ID</label>
          <div style={{ display:"flex", gap:".4rem" }}>
            <input className="login-input" value={sid} onChange={e => setSid(e.target.value)} maxLength={20}
              style={{ flex:1, fontFamily:"var(--mono)", fontSize:".73rem" }}/>
            <button onClick={() => setSid(genSid())}
              style={{ background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", borderRadius:7, padding:"0 .8rem", fontSize:".7rem", color:"rgba(255,255,255,.38)", cursor:"pointer", whiteSpace:"nowrap", fontFamily:"var(--sans)", transition:"all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(79,193,255,.4)"; e.currentTarget.style.color="var(--blue-l)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,.08)"; e.currentTarget.style.color="rgba(255,255,255,.38)"; }}>
              New
            </button>
          </div>
        </div>

        <button disabled={!name.trim()} onClick={go}
          style={{ width:"100%", marginTop:".7rem", background:"linear-gradient(135deg,var(--blue),var(--teal))", color:"#0d0f14", border:"none", borderRadius:9, padding:".78rem", fontSize:".9rem", fontWeight:800, cursor:name.trim()?"pointer":"not-allowed", fontFamily:"var(--disp)", boxShadow:"0 8px 26px rgba(79,193,255,.32)", opacity:name.trim()?1:.4, transition:"transform .2s,box-shadow .2s" }}
          onMouseEnter={e => name.trim() && (e.currentTarget.style.transform="translateY(-2px)", e.currentTarget.style.boxShadow="0 14px 36px rgba(79,193,255,.5)")}
          onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 8px 26px rgba(79,193,255,.32)"; }}>
          Launch Session →
        </button>

        <div style={{ marginTop:"1rem", textAlign:"center", fontSize:".65rem", color:"rgba(255,255,255,.18)" }}>
          Auth-protected · <span style={{ color:"var(--blue-l)" }}>CRDT/OT · CodeMirror 6 · 8 Languages</span>
        </div>

        {busy && (
          <div style={{ position:"absolute", inset:0, borderRadius:18, background:"rgba(13,15,20,.97)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:".7rem", zIndex:2 }}>
            <div className="a-spin" style={{ width:30, height:30, borderRadius:"50%", border:"2px solid rgba(79,193,255,.15)", borderTopColor:"var(--blue)" }}/>
            <div style={{ fontFamily:"var(--mono)", fontSize:".75rem", color:"var(--blue-l)" }}>{stepTxt}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════════ */
export default function Index() {
  const navigate = useNavigate();
  const [route, setRoute] = useState("home");

  const toEditor      = (me, sid, lang) => {
    authStore.set({ me, sid, lang });
    navigate("/editor", { state: { me, sid, lang } });
  };

  const toChat        = () => navigate("/devchat");
  const toSandbox     = () => navigate("/sandbox");
  const toApi         = () => navigate("/api");
  const toPerf        = () => navigate("/performance");
  const toBehavior    = () => navigate("/behavior");
  const toFrustration = () => navigate("/frustration");
  const toCognitive   = () => navigate("/cognitive");
  const toGitBridge   = () => navigate("/gitbridge");
  const toAIPair      = () => navigate("/aipair");
  const toDebug       = () => navigate("/debug");
  const toLogs        = () => navigate("/logs");
  const toKnowledge   = () => navigate("/knowledge");
  const toAiMentor    = () => navigate("/aimentor");

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      {route === "home" && (
        <HomePage
          onLaunch={() => setRoute("login")}
          onOpenChat={toChat}
          onOpenSandbox={toSandbox}
          onOpenApi={toApi}
          onOpenPerf={toPerf}
          onOpenBehavior={toBehavior}
          onOpenFrustration={toFrustration}
          onOpenCognitive={toCognitive}
          onOpenDebug={toDebug}
          onOpenLogs={toLogs}
          onOpenKnowledge={toKnowledge}
          onOpenAiMentor={toAiMentor}
          onOpenGitBridge={toGitBridge}
          onOpenAIPair={toAIPair}
        />
      )}
      {route === "login" && <LoginScreen onJoin={toEditor} onBack={() => setRoute("home")} />}
    </>
  );
}