import { useState, useRef, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useChat } from "../hooks/useChat";
import { usePresence } from "../hooks/usePresence";
import { supabase } from "../lib/supabase";
import { Navigate } from "react-router-dom";

/* ─────────────────────── STYLES ─────────────────────── */
const G = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body,#root{height:100%;overflow:hidden;}

:root{
  --bg0:#04060e;
  --bg1:#070b14;
  --bg2:#0a0f1c;
  --bg3:#0e1525;
  --bg4:#12192d;
  --b1:rgba(255,255,255,0.05);
  --b2:rgba(255,255,255,0.08);
  --b3:rgba(255,255,255,0.12);
  --b4:rgba(255,255,255,0.18);
  --sky:#7dd3fc;
  --sky2:#38bdf8;
  --sky3:#0ea5e9;
  --skyd:rgba(125,211,252,0.1);
  --skyd2:rgba(56,189,248,0.06);
  --teal:#5eead4;
  --teald:rgba(94,234,212,0.1);
  --violet:#c4b5fd;
  --violetd:rgba(196,181,253,0.1);
  --rose:#fda4af;
  --rosed:rgba(253,164,175,0.1);
  --amber:#fcd34d;
  --green:#6ee7b7;
  --greend:rgba(110,231,183,0.1);
  --t1:#f0f4ff;
  --t2:#94a3b8;
  --t3:#475569;
  --t4:#1e2d40;
  --mono:'IBM Plex Mono',monospace;
  --sans:'Inter',sans-serif;
  --sw:264px;
  --tw:376px;
}

::-webkit-scrollbar{width:2px;height:2px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:var(--b3);border-radius:2px;}
::-webkit-scrollbar-thumb:hover{background:rgba(125,211,252,0.3);}

body{font-family:var(--sans);background:var(--bg0);color:var(--t1);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}

@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideR{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
@keyframes pop{from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
@keyframes bounce{0%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes breathe{0%,100%{opacity:0.6}50%{opacity:1}}

.fu{animation:fadeUp .2s cubic-bezier(.2,0,0,1) both;}
.fi{animation:fadeIn .16s ease both;}
.sr{animation:slideR .24s cubic-bezier(.2,0,0,1) both;}
.pop{animation:pop .18s cubic-bezier(.34,1.5,.64,1) both;}
.blink{animation:pulse 2s ease infinite;}

/* ── APP SHELL ── */
.app{display:flex;height:100vh;overflow:hidden;background:var(--bg0);position:relative;}
.app::after{
  content:'';position:fixed;inset:0;pointer-events:none;z-index:0;
  background:
    radial-gradient(ellipse 900px 600px at -100px -100px,rgba(56,189,248,0.04) 0%,transparent 70%),
    radial-gradient(ellipse 600px 800px at 110% 110%,rgba(196,181,253,0.03) 0%,transparent 70%);
}

/* ── SIDEBAR ── */
.sb{
  width:var(--sw);min-width:var(--sw);
  background:var(--bg1);
  border-right:1px solid var(--b2);
  display:flex;flex-direction:column;
  position:relative;z-index:20;
  transition:width .28s cubic-bezier(.4,0,.2,1),min-width .28s cubic-bezier(.4,0,.2,1);
  overflow:hidden;flex-shrink:0;
}
.sb.gone{width:0;min-width:0;}

/* Sidebar top accent line */
.sb::before{
  content:'';position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(125,211,252,0.35),transparent);
}

.sb-logo{
  display:flex;align-items:center;gap:10px;
  padding:14px 14px 13px;border-bottom:1px solid var(--b1);
  flex-shrink:0;position:relative;
}
.sb-icon{
  width:30px;height:30px;border-radius:8px;
  display:flex;align-items:center;justify-content:center;
  font-size:14px;flex-shrink:0;
  background:linear-gradient(135deg,#0ea5e9,#2dd4bf);
  box-shadow:0 2px 12px rgba(14,165,233,0.4);
}
.sb-name{font-family:var(--mono);font-weight:700;font-size:13px;letter-spacing:.05em;color:var(--t1);white-space:nowrap;}
.sb-live{
  margin-left:auto;display:inline-flex;align-items:center;gap:4px;
  padding:2px 7px;border-radius:99px;
  background:rgba(110,231,183,0.08);border:1px solid rgba(110,231,183,0.2);
  font-family:var(--mono);font-size:8px;font-weight:700;
  color:var(--green);letter-spacing:.12em;white-space:nowrap;flex-shrink:0;
}

.sb-scroll{flex:1;overflow-y:auto;padding:6px 8px 8px;}

.sb-sec{padding:14px 8px 4px;}
.sb-sec-label{
  font-family:var(--mono);font-size:8px;font-weight:600;
  color:var(--t3);letter-spacing:.22em;text-transform:uppercase;
  display:block;padding:0 6px 6px;
}

.ch{
  display:flex;align-items:center;gap:8px;
  width:100%;padding:6px 8px;border-radius:8px;
  font-size:13px;font-weight:500;color:var(--t2);
  background:transparent;border:none;cursor:pointer;
  transition:background .08s,color .08s;
  text-align:left;font-family:var(--sans);
  position:relative;overflow:hidden;white-space:nowrap;
  margin-bottom:1px;
}
.ch:hover{color:var(--t1);background:var(--b1);}
.ch.on{color:var(--sky);background:var(--skyd);}
.ch.on::before{
  content:'';position:absolute;left:0;top:25%;bottom:25%;
  width:2px;background:var(--sky2);border-radius:0 2px 2px 0;
}
.ch-hash{font-family:var(--mono);font-size:15px;font-weight:300;opacity:.3;flex-shrink:0;transition:opacity .08s;}
.ch:hover .ch-hash,.ch.on .ch-hash{opacity:.8;}
.ch-unread{
  margin-left:auto;width:18px;height:18px;border-radius:50%;
  background:var(--rose);color:#1a0a0c;
  font-family:var(--mono);font-size:8px;font-weight:800;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}

.u-row{
  display:flex;align-items:center;gap:8px;
  padding:5px 8px;border-radius:8px;
  margin-bottom:1px;
}
.u-dot{width:5px;height:5px;border-radius:50%;background:var(--green);flex-shrink:0;box-shadow:0 0 6px rgba(110,231,183,0.6);}

.me{
  display:flex;align-items:center;gap:10px;
  padding:10px 14px;border-top:1px solid var(--b2);
  background:var(--bg0);flex-shrink:0;
  position:relative;
}
.me::before{
  content:'';position:absolute;top:0;left:14px;right:14px;height:1px;
  background:linear-gradient(90deg,transparent,var(--b3),transparent);
}
.me-name{font-size:13px;font-weight:600;color:var(--t1);}
.me-tag{
  font-family:var(--mono);font-size:8.5px;color:var(--green);
  letter-spacing:.08em;display:flex;align-items:center;gap:3px;margin-top:1px;
}

/* ── MAIN ── */
.main{display:flex;flex-direction:column;flex:1;min-width:0;overflow:hidden;position:relative;z-index:1;}

/* ── TOPBAR ── */
.topbar{
  display:flex;align-items:center;gap:8px;padding:0 16px;height:50px;
  background:rgba(7,11,20,0.7);backdrop-filter:blur(24px) saturate(160%);
  border-bottom:1px solid var(--b2);flex-shrink:0;position:relative;z-index:10;
}
.topbar::after{
  content:'';position:absolute;bottom:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(125,211,252,0.12),transparent);
  pointer-events:none;
}
.tog{
  width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;
  background:transparent;border:1px solid var(--b2);color:var(--t3);
  cursor:pointer;font-size:12px;transition:all .12s;flex-shrink:0;
}
.tog:hover{color:var(--t1);border-color:var(--b3);background:var(--b1);}
.tb-hash{font-family:var(--mono);font-size:16px;font-weight:300;color:var(--sky2);opacity:.5;flex-shrink:0;}
.tb-name{font-size:14px;font-weight:700;letter-spacing:-.01em;}
.tb-desc{font-family:var(--mono);font-size:9px;color:var(--t3);margin-top:.5px;}
.tb-sep{width:1px;height:18px;background:var(--b2);margin:0 4px;flex-shrink:0;}

.pill{
  display:inline-flex;align-items:center;gap:5px;
  padding:3px 9px;border-radius:99px;
  border:1px solid;font-family:var(--mono);font-size:9px;
  white-space:nowrap;cursor:default;
}
.pill-green{color:var(--green);background:var(--greend);border-color:rgba(110,231,183,0.2);}
.pill-sky{color:var(--sky);background:var(--skyd);border-color:rgba(125,211,252,0.2);}

.ib{
  width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;
  background:transparent;border:1px solid var(--b2);color:var(--t3);
  cursor:pointer;font-size:12px;transition:all .12s;flex-shrink:0;
}
.ib:hover{color:var(--t1);border-color:var(--b3);background:var(--b1);}
.ib.on{color:var(--sky);border-color:rgba(125,211,252,0.3);background:var(--skyd);}

/* ── MSG AREA ── */
.msgs{flex:1;overflow-y:auto;padding:0 0 8px;}

.day-div{
  display:flex;align-items:center;gap:12px;
  padding:20px 20px 10px;
}
.day-line{flex:1;height:1px;background:var(--b2);}
.day-txt{font-family:var(--mono);font-size:9px;color:var(--t3);letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;}

/* Message group: avatar only on first, indent rest */
.msg-group{margin-bottom:2px;}
.msg-r{
  display:flex;gap:10px;padding:3px 16px 3px;
  border-radius:8px;transition:background .07s;
  position:relative;
}
.msg-r:hover{background:rgba(255,255,255,0.013);}
.msg-r:hover .msg-act{opacity:1;transform:translateY(0);}
.msg-r.compact{padding-top:1px;padding-bottom:1px;}
.msg-r.compact .av-slot{visibility:hidden;}

.av-slot{width:34px;flex-shrink:0;margin-top:2px;}

.msg-act{
  position:absolute;right:10px;top:-11px;
  display:flex;gap:1px;background:var(--bg3);
  border:1px solid var(--b3);border-radius:9px;padding:2px;
  opacity:0;transform:translateY(3px);
  transition:all .13s;z-index:30;
  box-shadow:0 6px 24px rgba(0,0,0,.7);
}
.act-b{
  width:25px;height:25px;border-radius:7px;
  display:flex;align-items:center;justify-content:center;
  font-size:12px;background:transparent;border:none;
  cursor:pointer;color:var(--t2);transition:background .08s,color .08s;
}
.act-b:hover{background:var(--b2);color:var(--t1);}
.act-sep{width:1px;height:14px;background:var(--b2);margin:auto 1px;}

.msg-body-wrap{flex:1;min-width:0;}
.msg-head{display:flex;align-items:baseline;gap:7px;margin-bottom:2px;}
.msg-name{font-weight:700;font-size:13px;}
.msg-time{font-family:var(--mono);font-size:9px;color:var(--t3);}
.msg-body{
  font-size:13.5px;line-height:1.7;
  color:rgba(240,244,255,.78);word-break:break-word;
}
.tag-m{
  color:var(--sky);background:var(--skyd);
  border-radius:4px;padding:1px 5px;font-weight:700;
  cursor:pointer;transition:background .08s;
}
.tag-m:hover{background:rgba(125,211,252,0.18);}

/* Code block */
.code-wrap{
  margin-top:9px;border-radius:11px;overflow:hidden;
  border:1px solid var(--b3);background:#020508;
}
.code-head{
  display:flex;align-items:center;gap:8px;padding:7px 13px;
  border-bottom:1px solid var(--b2);background:rgba(255,255,255,0.016);
}
.code-dots{display:flex;gap:4px;}
.cd{width:8px;height:8px;border-radius:50%;}
.code-lang{font-family:var(--mono);font-size:9px;color:var(--t3);letter-spacing:.08em;margin-left:4px;}
.code-cp{
  margin-left:auto;font-family:var(--mono);font-size:9px;
  padding:2px 8px;border-radius:4px;
  border:1px solid var(--b2);background:transparent;
  cursor:pointer;transition:all .1s;color:var(--t3);
}
.code-cp:hover{color:var(--sky);border-color:rgba(125,211,252,0.3);background:var(--skyd);}
.code-body{
  padding:13px 15px;font-family:var(--mono);font-size:11.5px;
  line-height:1.75;overflow-x:auto;color:rgba(240,244,255,.6);
}

/* Reactions */
.rxns{display:flex;flex-wrap:wrap;gap:3px;margin-top:6px;}
.rxn{
  display:inline-flex;align-items:center;gap:4px;
  padding:2px 8px;border-radius:99px;font-size:12px;
  cursor:pointer;transition:all .1s;border:1px solid;
}
.rxn.me{color:var(--sky);background:var(--skyd);border-color:rgba(125,211,252,0.28);}
.rxn.me:hover{background:rgba(125,211,252,0.16);}
.rxn.ot{color:var(--t2);background:rgba(255,255,255,0.025);border-color:var(--b2);}
.rxn.ot:hover{color:var(--t1);border-color:var(--b3);background:var(--b1);}
.rxn-n{font-family:var(--mono);font-size:10px;opacity:.7;}

/* Emoji picker */
.ep{
  position:absolute;
  background:var(--bg3);border:1px solid var(--b3);
  border-radius:11px;padding:7px;
  display:flex;flex-wrap:wrap;gap:3px;width:162px;
  box-shadow:0 10px 40px rgba(0,0,0,.8);z-index:50;
  animation:pop .13s ease;
}
.ep-e{
  width:30px;height:30px;border-radius:6px;
  display:flex;align-items:center;justify-content:center;
  font-size:16px;cursor:pointer;border:none;
  background:transparent;transition:background .08s;
}
.ep-e:hover{background:var(--b3);}

/* Thread button */
.t-bar{
  display:inline-flex;align-items:center;gap:6px;
  padding:3px 9px;margin-top:6px;
  border-radius:7px;background:transparent;
  border:1px solid var(--b2);cursor:pointer;
  transition:all .1s;font-size:12px;
}
.t-bar:hover{background:var(--skyd);border-color:rgba(125,211,252,0.22);}
.t-cnt{color:var(--sky);font-weight:700;}
.t-hint{color:var(--t3);font-family:var(--mono);font-size:9px;}

/* ── TYPING ── */
.typing{
  display:flex;align-items:center;gap:9px;
  padding:4px 16px 6px 60px;min-height:22px;
}
.tyd{width:4px;height:4px;border-radius:50%;background:var(--t3);}
.tyd:nth-child(1){animation:bounce 1.2s ease 0s infinite;}
.tyd:nth-child(2){animation:bounce 1.2s ease .16s infinite;}
.tyd:nth-child(3){animation:bounce 1.2s ease .32s infinite;}
.ty-label{font-family:var(--mono);font-size:9.5px;color:var(--t3);letter-spacing:.04em;}

/* ── EMPTY ── */
.empty{
  flex:1;display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  gap:10px;padding:32px;
}
.empty-icon{font-size:36px;opacity:.2;animation:breathe 3s ease infinite;}
.empty-txt{font-family:var(--mono);font-size:10px;color:var(--t3);letter-spacing:.1em;text-align:center;line-height:1.8;}

/* ── INPUT ── */
.input-z{
  padding:8px 14px 12px;
  background:var(--bg0);flex-shrink:0;
  border-top:1px solid var(--b1);
}
.input-z::before{
  content:'';display:block;height:1px;
  background:linear-gradient(90deg,transparent,rgba(125,211,252,0.08),transparent);
  margin-bottom:8px;
}
.input-wrap{position:relative;max-width:1000px;margin:0 auto;}
.input-box{
  background:var(--bg3);
  border:1px solid var(--b3);border-radius:16px;
  overflow:hidden;transition:border-color .16s,box-shadow .16s;
}
.input-box:focus-within{
  border-color:rgba(125,211,252,0.28);
  box-shadow:0 0 0 3px rgba(56,189,248,0.05),0 4px 20px rgba(0,0,0,.35);
}
.input-ta{
  width:100%;background:transparent;padding:12px 16px 6px;
  font-size:13.5px;color:var(--t1);font-family:var(--sans);
  border:none;line-height:1.6;resize:none;max-height:140px;overflow-y:auto;
}
.input-ta::placeholder{color:var(--t3);}
.input-ta:focus{outline:none;}
.input-foot{
  display:flex;align-items:center;gap:4px;
  padding:0 12px 10px;
}
.tb-b{
  width:26px;height:26px;display:flex;align-items:center;justify-content:center;
  border-radius:7px;font-size:13px;color:var(--t3);
  background:transparent;border:none;cursor:pointer;transition:all .08s;
}
.tb-b:hover{color:var(--t2);background:var(--b2);}
.send-b{
  margin-left:auto;display:flex;align-items:center;gap:5px;
  padding:6px 16px;border-radius:10px;
  font-family:var(--sans);font-size:12px;font-weight:700;
  color:#000;border:none;cursor:pointer;
  background:linear-gradient(135deg,var(--sky2),var(--teal));
  box-shadow:0 2px 14px rgba(14,165,233,0.25);
  transition:all .15s;letter-spacing:-.01em;
}
.send-b:hover:not(:disabled){
  box-shadow:0 2px 22px rgba(14,165,233,0.45);
  transform:translateY(-1px);
}
.send-b:disabled{opacity:.2;cursor:not-allowed;transform:none;box-shadow:none;}
.hint-t{font-family:var(--mono);font-size:8px;color:var(--t3);opacity:.5;margin-right:4px;}

/* Mention dropdown */
.men-dd{
  position:absolute;bottom:calc(100% + 8px);left:0;right:0;
  background:var(--bg3);border:1px solid var(--b3);
  border-radius:11px;overflow:hidden;
  box-shadow:0 -10px 40px rgba(0,0,0,.8);z-index:100;
  animation:pop .13s ease;
}
.men-hd{
  padding:6px 12px;border-bottom:1px solid var(--b2);
  font-family:var(--mono);font-size:8px;color:var(--t3);letter-spacing:.2em;text-transform:uppercase;
}
.men-r{
  display:flex;align-items:center;gap:9px;
  padding:7px 12px;cursor:pointer;transition:background .07s;
}
.men-r.sel{background:var(--skyd);}
.men-r:hover{background:var(--b1);}
.men-kbd{margin-left:auto;font-family:var(--mono);font-size:8px;color:var(--t3);}

/* ── THREAD PANEL ── */
.tp{
  width:var(--tw);min-width:var(--tw);
  display:flex;flex-direction:column;
  background:var(--bg1);border-left:1px solid var(--b2);
  position:relative;z-index:10;
  animation:slideR .22s cubic-bezier(.2,0,0,1);
}
.tp::before{
  content:'';position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(125,211,252,0.18),transparent);
}
.tp-head{
  display:flex;align-items:center;justify-content:space-between;
  padding:0 14px;height:50px;
  border-bottom:1px solid var(--b2);flex-shrink:0;
}
.tp-title{
  font-weight:700;font-size:13.5px;
  display:flex;align-items:center;gap:7px;
}
.tp-badge{
  font-family:var(--mono);font-size:8.5px;
  padding:2px 7px;border-radius:99px;
  background:var(--skyd);color:var(--sky);
  border:1px solid rgba(125,211,252,0.2);
}
.tp-close{
  width:26px;height:26px;border-radius:7px;
  display:flex;align-items:center;justify-content:center;
  background:transparent;border:1px solid transparent;
  cursor:pointer;color:var(--t3);font-size:13px;
  transition:all .1s;
}
.tp-close:hover{color:var(--rose);background:var(--rosed);border-color:rgba(253,164,175,0.2);}
.tp-divider{margin:10px 14px;height:1px;background:var(--b2);}
.tp-msgs{flex:1;overflow-y:auto;padding:4px 0;}
.tp-input{padding:10px 12px 12px;border-top:1px solid var(--b2);flex-shrink:0;}
.tp-box{
  background:var(--bg2);border:1px solid var(--b2);border-radius:11px;
  overflow:hidden;transition:border-color .16s;
}
.tp-box:focus-within{border-color:rgba(125,211,252,0.24);}
.tp-ta{
  width:100%;background:transparent;padding:9px 13px 5px;
  font-size:13px;color:var(--t1);font-family:var(--sans);
  border:none;resize:none;line-height:1.55;
}
.tp-ta::placeholder{color:var(--t3);}
.tp-ta:focus{outline:none;}
.tp-foot{
  display:flex;align-items:center;justify-content:space-between;
  padding:0 10px 8px;
}
.tp-hint{font-family:var(--mono);font-size:8.5px;color:var(--t3);}
.tp-send{
  font-family:var(--sans);font-size:11.5px;font-weight:700;
  padding:4px 13px;border-radius:8px;
  background:var(--sky2);color:#000;border:none;cursor:pointer;
  transition:all .12s;opacity:1;
}
.tp-send:disabled{opacity:.2;cursor:not-allowed;}
.tp-send:not(:disabled):hover{background:var(--sky);box-shadow:0 2px 10px rgba(14,165,233,0.3);}

/* ── STATUS BAR ── */
.sbar{
  display:flex;align-items:center;gap:8px;padding:3px 14px;
  background:rgba(4,6,14,0.9);border-top:1px solid var(--b1);
  flex-shrink:0;font-family:var(--mono);font-size:8.5px;color:var(--t3);
}
.sbar-dot{width:5px;height:5px;border-radius:50%;}
.sbar-sep{color:var(--t4);}
`;

/* ─────────────────────── UTILS ─────────────────────── */
function colorForStr(str) {
  const palette = ['#7dd3fc','#5eead4','#c4b5fd','#fda4af','#fcd34d','#6ee7b7','#f9a8d4','#a5b4fc'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function bgForColor(c) {
  const map = {
    '#7dd3fc':'rgba(125,211,252,0.1)','#5eead4':'rgba(94,234,212,0.1)',
    '#c4b5fd':'rgba(196,181,253,0.1)','#fda4af':'rgba(253,164,175,0.1)',
    '#fcd34d':'rgba(252,211,77,0.1)','#6ee7b7':'rgba(110,231,183,0.1)',
    '#f9a8d4':'rgba(249,168,212,0.1)','#a5b4fc':'rgba(165,180,252,0.1)',
  };
  return map[c] || 'rgba(125,211,252,0.1)';
}

function hl(src = '') {
  return src.split('\n').map((line, i) => {
    const t = line.trimStart();
    let col = 'rgba(240,244,255,.58)';
    if (t.startsWith('//') || t.startsWith('#') || t.startsWith('/*')) col = '#334a5e';
    else if (/^(async|function|const|let|var|return|await|export|import|if|else|for|while|switch|case|break|default|try|catch|finally|throw|from|of|in|new|typeof|instanceof)\b/.test(t)) col = '#b0a0f0';
    else if (/^(class|extends|interface|type|enum|implements)\b/.test(t)) col = '#e8c97a';
    return (
      <div key={i} style={{ color: col }}>
        {line.split(/(["'`][^"'`\n]*["'`])/g).map((p, j) =>
          /^["'`]/.test(p) ? <span key={j} style={{ color: '#90c980' }}>{p}</span> : p
        )}
      </div>
    );
  });
}

function parseText(text, onlineUsers = {}) {
  if (!text) return [];
  const users = Object.values(onlineUsers);
  const segs = [];
  const re = /@(\w+)/g;
  let m, last = 0;
  while ((m = re.exec(text)) !== null) {
    const u = users.find(u => u.username?.toLowerCase() === m[1].toLowerCase());
    if (u) {
      if (m.index > last) segs.push({ t: 'tx', v: text.slice(last, m.index) });
      segs.push({ t: 'mn', u });
      last = re.lastIndex;
    }
  }
  if (last < text.length) segs.push({ t: 'tx', v: text.slice(last) });
  return segs.length ? segs : [{ t: 'tx', v: text }];
}

const fmt = iso => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const sameMin = (a, b) => Math.abs(new Date(a) - new Date(b)) < 5 * 60000;
const EMOJIS = ['👍','❤️','🔥','🎉','👀','✅','💯','🚀','😂','💡'];

/* ─────────────────────── COMPONENTS ─────────────────────── */
function Av({ user, size = 32, r = 8 }) {
  if (!user) return <div style={{ width: size, height: size, borderRadius: r, background: 'var(--bg3)', flexShrink: 0 }} />;
  const initials = (user.username || '?').slice(0, 2).toUpperCase();
  const color = user.color || colorForStr(user.username || '');
  const bg = user.bg || bgForColor(color);
  return (
    <div style={{
      width: size, height: size, borderRadius: r, flexShrink: 0,
      fontSize: size * 0.365, fontWeight: 800,
      fontFamily: 'var(--mono)', background: bg, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      userSelect: 'none', letterSpacing: '-.5px',
      border: `1px solid ${bg.replace('0.1)', '0.25)')}`,
    }}>
      {initials}
    </div>
  );
}

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code.body).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="code-wrap">
      <div className="code-head">
        <div className="code-dots">
          <div className="cd" style={{ background: 'rgba(248,113,113,.6)' }} />
          <div className="cd" style={{ background: 'rgba(251,191,36,.6)' }} />
          <div className="cd" style={{ background: 'rgba(74,222,128,.6)' }} />
        </div>
        <span className="code-lang">{code.lang || 'js'}</span>
        <button className="code-cp" onClick={copy}>{copied ? '✓ copied' : 'copy'}</button>
      </div>
      <pre className="code-body">{hl(code.body)}</pre>
    </div>
  );
}

function EmojiPicker({ onPick }) {
  return (
    <div className="ep">
      {EMOJIS.map(e => <button key={e} className="ep-e" onClick={() => onPick(e)}>{e}</button>)}
    </div>
  );
}

function Reactions({ reactions, onReact, myUserId }) {
  if (!reactions?.length) return null;
  const grouped = reactions.reduce((acc, r) => {
    const ex = acc.find(x => x.e === r.emoji);
    if (ex) { ex.n++; if (r.user_id === myUserId) ex.mine = true; }
    else acc.push({ e: r.emoji, n: 1, mine: r.user_id === myUserId });
    return acc;
  }, []);
  return (
    <div className="rxns">
      {grouped.map((r, i) => (
        <button key={i} onClick={() => onReact(r.e)} className={`rxn ${r.mine ? 'me' : 'ot'}`}>
          {r.e}<span className="rxn-n">{r.n}</span>
        </button>
      ))}
    </div>
  );
}

/* Single message row — supports compact (grouped) mode */
function MsgRow({ msg, compact, onlineUsers, messages, onThread, onReact, isThread, myUserId }) {
  const user = msg.profiles || { username: 'System', color: '#94a3b8' };
  const color = user.color || colorForStr(user.username || '');
  const segs = parseText(msg.content, onlineUsers);
  const replyCount = msg.reply_count ?? messages.filter(m => m.reply_to === msg.id).length;
  const [showEP, setShowEP] = useState(false);
  const epRef = useRef(null);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEP) return;
    const h = e => { if (epRef.current && !epRef.current.contains(e.target)) setShowEP(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showEP]);

  // Parse code block
  let codeData = null, displayText = msg.content;
  if (msg.content?.includes('```')) {
    const parts = msg.content.split('```');
    if (parts.length >= 3) {
      const inner = parts[1];
      const firstNL = inner.indexOf('\n');
      codeData = { lang: firstNL > 0 ? inner.slice(0, firstNL).trim() : 'js', body: inner.slice(firstNL + 1).trimEnd() };
      displayText = parts[0].trim();
    }
  }

  return (
    <div className={`msg-r fu${compact ? ' compact' : ''}`} style={{ position: 'relative' }}>
      <div className="av-slot">{!compact && <Av user={user} />}</div>
      <div className="msg-body-wrap">
        {!compact && (
          <div className="msg-head">
            <span className="msg-name" style={{ color }}>{user.username}</span>
            <span className="msg-time">{fmt(msg.created_at)}</span>
          </div>
        )}
        {displayText && (
          <div className="msg-body">
            {segs.map((s, i) =>
              s.t === 'mn'
                ? <span key={i} className="tag-m">@{s.u.username}</span>
                : <span key={i}>{s.v}</span>
            )}
          </div>
        )}
        {codeData && <CodeBlock code={codeData} />}
        <Reactions reactions={msg.reactions} onReact={e => onReact(msg.id, e)} myUserId={myUserId} />
        {!isThread && replyCount > 0 && (
          <button className="t-bar" onClick={() => onThread(msg)}>
            <span className="t-cnt">{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
            <span className="t-hint">View thread →</span>
          </button>
        )}
      </div>

      {/* Hover toolbar */}
      <div className="msg-act">
        <div style={{ position: 'relative' }} ref={epRef}>
          <button className="act-b" onClick={() => setShowEP(v => !v)} title="React">😊</button>
          {showEP && (
            <div style={{ position: 'absolute', right: 0, top: '110%', zIndex: 50 }}>
              <EmojiPicker onPick={e => { onReact(msg.id, e); setShowEP(false); }} />
            </div>
          )}
        </div>
        {!isThread && (
          <>
            <div className="act-sep" />
            <button className="act-b" onClick={() => onThread(msg)} title="Thread">💬</button>
          </>
        )}
        {compact && <div className="act-sep" />}
        {compact && <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t3)', padding: '0 4px', alignSelf: 'center' }}>{fmt(msg.created_at)}</span>}
      </div>
    </div>
  );
}

function MentionDD({ query, users, selected, onSelect }) {
  const list = users.filter(u => u.username?.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
  if (!list.length) return null;
  return (
    <div className="men-dd">
      <div className="men-hd">Mention</div>
      {list.map((u, i) => (
        <div key={u.id} onClick={() => onSelect(u)} className={`men-r${i === selected ? ' sel' : ''}`}>
          <Av user={u} size={22} r={6} />
          <span style={{ fontWeight: 700, fontSize: 13, color: u.color || colorForStr(u.username || '') }}>{u.username}</span>
          {i === selected && <span className="men-kbd">↵</span>}
        </div>
      ))}
    </div>
  );
}

function ThreadPanel({ msg, onlineUsers, messages, onClose, onSend, onReact, myUserId }) {
  const [val, setVal] = useState('');
  const endRef = useRef(null);
  const replies = messages.filter(m => m.reply_to === msg.id);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [replies.length]);

  const send = () => { if (!val.trim()) return; onSend(val.trim(), msg.id); setVal(''); };

  return (
    <div className="tp">
      <div className="tp-head">
        <div className="tp-title">
          Thread
          <span className="tp-badge">{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
        </div>
        <button className="tp-close" onClick={onClose}>✕</button>
      </div>
      <div className="tp-msgs">
        <MsgRow msg={msg} compact={false} onlineUsers={onlineUsers} messages={messages} onThread={() => {}} onReact={onReact} isThread myUserId={myUserId} />
        {replies.length > 0 && <div className="tp-divider" />}
        {replies.map((r, i) => {
          const prev = replies[i - 1];
          const compact = prev && prev.profiles?.id === r.profiles?.id && sameMin(prev.created_at, r.created_at);
          return <MsgRow key={r.id} msg={r} compact={compact} onlineUsers={onlineUsers} messages={messages} onThread={() => {}} onReact={onReact} isThread myUserId={myUserId} />;
        })}
        <div ref={endRef} />
      </div>
      <div className="tp-input">
        <div className="tp-box">
          <textarea className="tp-ta" rows={2} value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Reply in thread…" />
          <div className="tp-foot">
            <span className="tp-hint">shift+enter for newline</span>
            <button className="tp-send" disabled={!val.trim()} onClick={send}>Reply ↵</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── MAIN APP ─────────────────────── */
export default function DevChat() {
  const { user, profile, loading: authLoading } = useAuth();
  const [activeChId, setActiveChId] = useState(null);
  const [channels, setChannels] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [sideOpen, setSideOpen] = useState(true);
  const [input, setInput] = useState('');
  const [mention, setMention] = useState(null);
  const [mentionSel, setMentionSel] = useState(0);

  const textRef = useRef(null);
  const endRef = useRef(null);
  const msgsRef = useRef(null);

  const { messages, loading: chatLoading, sendMessage, addReaction } = useChat(activeChId);
  const { onlineUsers, typingUsers, setTyping } = usePresence(activeChId);

  useEffect(() => {
    supabase.from('channels').select('*').order('name').then(({ data }) => {
      if (data) {
        setChannels(data);
        if (!activeChId && data.length > 0) setActiveChId(data[0].id);
      }
    });
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  if (authLoading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#04060e', color: '#38bdf8', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, letterSpacing: '.2em' }}>
      <style>{`@keyframes p{0%,100%{opacity:1}50%{opacity:.2}}`}</style>
      <span style={{ animation: 'p 1.6s ease infinite' }}>CONNECTING…</span>
    </div>
  );
  if (!user) return <Navigate to="/login" />;

  const handleInput = e => {
    const v = e.target.value;
    setInput(v);
    setTyping(v.length > 0);
    const cur = e.target.selectionStart;
    const before = v.slice(0, cur);
    const at = before.lastIndexOf('@');
    if (at !== -1 && (at === 0 || /\s/.test(before[at - 1]))) {
      const q = before.slice(at + 1);
      if (!/\s/.test(q)) { setMention({ query: q, start: at }); setMentionSel(0); return; }
    }
    setMention(null);
  };

  const pickMention = u => {
    if (!mention) return;
    const before = input.slice(0, mention.start);
    const after = input.slice(mention.start + 1 + mention.query.length);
    setInput(before + '@' + u.username + ' ' + after);
    setMention(null);
    textRef.current?.focus();
  };

  const handleKeyDown = e => {
    const ml = Object.values(onlineUsers).filter(u => u.username?.toLowerCase().includes((mention?.query || '').toLowerCase()));
    if (mention && ml.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionSel(s => (s + 1) % ml.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionSel(s => (s - 1 + ml.length) % ml.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(ml[mentionSel]); return; }
      if (e.key === 'Escape') { setMention(null); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
    setMention(null);
    setTyping(false);
  };

  const curCh = channels.find(c => c.id === activeChId);
  const onlineList = Object.values(onlineUsers);
  const typingDisplay = Object.entries(typingUsers)
    .filter(([id, v]) => v && id !== user?.id)
    .map(([id]) => onlineUsers[id]?.username || 'Someone');

  // Group top-level messages (collapse consecutive from same user within 5 min)
  const topMsgs = messages.filter(m => !m.reply_to);

  return (
    <>
      <style>{G}</style>
      <div className="app">

        {/* ── SIDEBAR ── */}
        <div className={`sb${sideOpen ? '' : ' gone'}`}>
          <div className="sb-logo">
            <div className="sb-icon">⚡</div>
            <span className="sb-name">CKC-OS</span>
            <div className="sb-live">
              <div className="blink" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
              LIVE
            </div>
          </div>

          <div className="sb-scroll">
            {/* Channels */}
            <div className="sb-sec">
              <span className="sb-sec-label">Channels</span>
              {channels.map(ch => (
                <button key={ch.id} onClick={() => setActiveChId(ch.id)} className={`ch${activeChId === ch.id ? ' on' : ''}`}>
                  <span className="ch-hash">#</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.name}</span>
                </button>
              ))}
            </div>

            {/* Online */}
            {onlineList.length > 0 && (
              <div className="sb-sec" style={{ marginTop: 12 }}>
                <span className="sb-sec-label">Online — {onlineList.length}</span>
                {onlineList.map(u => (
                  <div key={u.id} className="u-row">
                    <Av user={u} size={20} r={6} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12.5, fontWeight: 500, color: u.color || colorForStr(u.username || '') }}>{u.username}</span>
                    <div className="u-dot" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Me */}
          <div className="me">
            <Av user={profile} size={30} r={8} />
            <div style={{ flex: 1, minWidth: 0, marginLeft: 6 }}>
              <div className="me-name">{profile?.username || 'You'}</div>
              <div className="me-tag">
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px rgba(110,231,183,.6)', animation: 'pulse 2s ease infinite' }} />
                Online
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div className="main">

          {/* TOPBAR */}
          <div className="topbar">
            <button className="tog" onClick={() => setSideOpen(s => !s)} title="Toggle sidebar">
              {sideOpen ? '←' : '→'}
            </button>
            <span className="tb-hash">#</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="tb-name">{curCh?.name || 'Loading…'}</div>
              {curCh?.description && <div className="tb-desc">{curCh.description}</div>}
            </div>
            <div className="tb-sep" />
            <div className="pill pill-green">
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 5px rgba(110,231,183,.6)', flexShrink: 0 }} />
              {onlineList.length} online
            </div>
            <button className={`ib${activeThread ? ' on' : ''}`} onClick={() => setActiveThread(null)} title="Thread view" style={{ marginLeft: 4 }}>💬</button>
          </div>

          {/* MESSAGES */}
          <div className="msgs" ref={msgsRef}>
            <div className="day-div">
              <div className="day-line" />
              <span className="day-txt">{new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</span>
              <div className="day-line" />
            </div>

            {chatLoading && (
              <div className="empty">
                <div className="empty-icon">💬</div>
                <div className="empty-txt">Loading messages…</div>
              </div>
            )}

            {!chatLoading && topMsgs.length === 0 && (
              <div className="empty">
                <div className="empty-icon">🚀</div>
                <div className="empty-txt">No messages yet.<br />Be the first to say something!</div>
              </div>
            )}

            {topMsgs.map((m, i) => {
              const prev = topMsgs[i - 1];
              const compact = prev
                && (prev.profiles?.id || prev.user_id) === (m.profiles?.id || m.user_id)
                && sameMin(prev.created_at, m.created_at);
              return (
                <MsgRow
                  key={m.id}
                  msg={m}
                  compact={compact}
                  onlineUsers={onlineUsers}
                  messages={messages}
                  onThread={setActiveThread}
                  onReact={addReaction}
                  myUserId={user?.id}
                />
              );
            })}

            {typingDisplay.length > 0 && (
              <div className="typing fi">
                <div style={{ display: 'flex', gap: 3 }}>
                  <div className="tyd" /><div className="tyd" /><div className="tyd" />
                </div>
                <span className="ty-label">
                  {typingDisplay.join(', ')} {typingDisplay.length === 1 ? 'is' : 'are'} typing…
                </span>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* INPUT */}
          <div className="input-z">
            <div className="input-wrap">
              {mention && (
                <MentionDD query={mention.query} users={Object.values(onlineUsers)} selected={mentionSel} onSelect={pickMention} />
              )}
              <div className="input-box">
                <textarea
                  className="input-ta"
                  ref={textRef}
                  rows={1}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message #${curCh?.name || '…'} — @ to mention`}
                />
                <div className="input-foot">
                  <button className="tb-b" title="Attach">📎</button>
                  <button className="tb-b" title="Emoji">😊</button>
                  <span className="hint-t" style={{ marginLeft: 8 }}>ENTER · SHIFT+ENTER for newline</span>
                  <button className="send-b" onClick={handleSend} disabled={!input.trim()}>Send ↵</button>
                </div>
              </div>
            </div>
          </div>

          {/* STATUS BAR */}
          <div className="sbar">
            <div className="sbar-dot" style={{ background: 'var(--green)', boxShadow: '0 0 5px rgba(110,231,183,.5)' }} />
            Connected
            <span className="sbar-sep">·</span>
            {messages.length} messages
            <span className="sbar-sep">·</span>
            {onlineList.length} online
            {activeChId && <><span className="sbar-sep">·</span>#{curCh?.name}</>}
          </div>
        </div>

        {/* THREAD PANEL */}
        {activeThread && (
          <ThreadPanel
            msg={activeThread}
            onlineUsers={onlineUsers}
            messages={messages}
            onClose={() => setActiveThread(null)}
            onSend={sendMessage}
            onReact={addReaction}
            myUserId={user?.id}
          />
        )}
      </div>
    </>
  );
}