import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useChat } from "../hooks/useChat";
import { usePresence } from "../hooks/usePresence";
import { supabase } from "../lib/supabase";
import { Navigate } from "react-router-dom";

/* ─────────────────────────── GLOBAL STYLES ─────────────────────────── */
const G = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700;800&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;overflow:hidden;}

:root{
  --bg0:#050709;--bg1:#080c12;--bg2:#0d1320;--bg3:#111928;--bg4:#162035;
  --border:#ffffff0d;--border2:#ffffff14;--border3:#ffffff1f;
  --cyan:#22d3ee;--cyan2:#06b6d4;--cyan-glow:rgba(34,211,238,0.18);
  --teal:#2dd4bf;--teal-glow:rgba(45,212,191,0.15);
  --violet:#a78bfa;--violet-glow:rgba(167,139,250,0.15);
  --rose:#f87171;--rose-glow:rgba(248,113,113,0.15);
  --amber:#fbbf24;--amber-glow:rgba(251,191,36,0.12);
  --green:#4ade80;--green-glow:rgba(74,222,128,0.15);
  --text1:#f1f5f9;--text2:#94a3b8;--text3:#475569;--text4:#1e293b;
  --mono:'IBM Plex Mono',monospace;--sans:'Outfit',sans-serif;
  --r4:4px;--r8:8px;--r12:12px;--r16:16px;--r20:20px;--r999:999px;
}

::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:var(--border3);border-radius:2px;}
::-webkit-scrollbar-thumb:hover{background:rgba(34,211,238,0.3);}

body{font-family:var(--sans);background:var(--bg0);color:var(--text1);}

/* ── ANIMATIONS ── */
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideLeft{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
@keyframes slideRight{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
@keyframes popIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes ripple{0%{transform:scale(0);opacity:0.6}100%{transform:scale(2.5);opacity:0}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 12px var(--cyan-glow)}50%{box-shadow:0 0 28px rgba(34,211,238,0.4)}}

.anim-fadeUp{animation:fadeUp 0.2s ease both;}
.anim-slideLeft{animation:slideLeft 0.25s ease both;}
.anim-slideRight{animation:slideRight 0.28s ease both;}
.anim-popIn{animation:popIn 0.18s cubic-bezier(0.34,1.56,0.64,1) both;}
.anim-pulse{animation:pulse 2s ease infinite;}
.blink{animation:pulse 1.6s ease infinite;}

/* ── LAYOUT ── */
.app{display:flex;height:100vh;overflow:hidden;background:var(--bg0);position:relative;}
.app::before{
  content:'';position:absolute;inset:0;pointer-events:none;z-index:0;
  background:radial-gradient(ellipse 60% 40% at 20% 0%,rgba(34,211,238,0.04) 0%,transparent 70%),
             radial-gradient(ellipse 40% 60% at 80% 100%,rgba(167,139,250,0.03) 0%,transparent 70%);
}

/* ── SIDEBAR ── */
.sidebar{
  width:256px;min-width:256px;background:var(--bg1);border-right:1px solid var(--border);
  display:flex;flex-direction:column;flex-shrink:0;position:relative;z-index:1;
  transition:all 0.3s cubic-bezier(0.4,0,0.2,1);overflow:hidden;
}
.sidebar.collapsed{width:0;min-width:0;}

.sidebar-logo{
  display:flex;align-items:center;gap:10px;padding:16px;
  border-bottom:1px solid var(--border);flex-shrink:0;
}
.logo-icon{
  width:34px;height:34px;border-radius:var(--r8);display:flex;align-items:center;
  justify-content:center;font-size:16px;flex-shrink:0;position:relative;
  background:linear-gradient(135deg,#22d3ee,#2dd4bf);
  box-shadow:0 0 20px rgba(34,211,238,0.4);
  animation:glowPulse 3s ease infinite;
}
.logo-text{font-weight:800;font-size:16px;letter-spacing:-0.02em;}
.live-badge{
  margin-left:auto;display:flex;align-items:center;gap:4px;
  font-family:var(--mono);font-size:8px;font-weight:600;
  color:var(--cyan);background:rgba(34,211,238,0.1);
  border:1px solid rgba(34,211,238,0.25);padding:3px 8px;border-radius:var(--r999);
  letter-spacing:0.1em;
}

.sidebar-section{padding:16px 10px 6px;}
.section-label{
  font-family:var(--mono);font-size:8px;color:var(--text3);
  text-transform:uppercase;letter-spacing:0.2em;padding:0 8px 8px;
}
.ch-btn{
  width:100%;display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:var(--r8);
  font-size:13px;font-weight:500;color:var(--text2);background:transparent;border:none;
  cursor:pointer;transition:all 0.12s;margin-bottom:2px;text-align:left;font-family:var(--sans);
  position:relative;overflow:hidden;
}
.ch-btn::before{content:'';position:absolute;inset:0;background:transparent;transition:background 0.12s;}
.ch-btn:hover{color:var(--text1);background:var(--border);}
.ch-btn.active{color:var(--cyan);background:rgba(34,211,238,0.08);}
.ch-btn.active::after{content:'';position:absolute;left:0;top:20%;bottom:20%;width:2px;background:var(--cyan);border-radius:0 2px 2px 0;}
.ch-badge{
  margin-left:auto;font-family:var(--mono);font-size:9px;font-weight:700;
  padding:2px 7px;border-radius:var(--r999);flex-shrink:0;
}
.ch-badge.red{background:var(--rose);color:#fff;}
.ch-badge.cyan{background:var(--cyan);color:#000;}

.sidebar-bottom{padding:10px;border-top:1px solid var(--border);margin-top:auto;}
.quick-label{font-family:var(--mono);font-size:8px;color:var(--text3);text-transform:uppercase;letter-spacing:0.18em;padding:0 8px 8px;}
.quick-btn{
  width:100%;display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:var(--r8);
  font-family:var(--mono);font-size:11px;color:var(--text3);background:transparent;border:none;
  cursor:pointer;transition:all 0.12s;margin-bottom:1px;text-align:left;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;
}
.quick-btn:hover{color:var(--teal);background:var(--border);}

.me-row{display:flex;align-items:center;gap:10px;padding:12px 16px;border-top:1px solid var(--border);}
.online-dot{width:6px;height:6px;border-radius:50%;background:var(--green);flex-shrink:0;}

/* ── MAIN ── */
.main{display:flex;flex-direction:column;flex:1;min-width:0;overflow:hidden;position:relative;z-index:1;}

/* ── TOPBAR ── */
.topbar{
  display:flex;align-items:center;gap:10px;padding:12px 20px;
  background:var(--bg1);border-bottom:1px solid var(--border);flex-shrink:0;
}
.topbar-info{flex:1;min-width:0;}
.topbar-name{font-weight:700;font-size:15px;letter-spacing:-0.01em;}
.topbar-members{font-family:var(--mono);font-size:10px;color:var(--text3);margin-top:1px;}
.topbar-pills{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.pill{
  display:inline-flex;align-items:center;gap:4px;padding:4px 9px;border-radius:var(--r999);
  font-family:var(--mono);font-size:10px;cursor:pointer;transition:all 0.12s;border:1px solid;white-space:nowrap;
}
.pill-teal{color:var(--teal);background:var(--teal-glow);border-color:rgba(45,212,191,0.25);}
.pill-teal:hover{background:rgba(45,212,191,0.22);}
.pill-rose{color:var(--rose);background:var(--rose-glow);border-color:rgba(248,113,113,0.25);}
.pill-rose:hover{background:rgba(248,113,113,0.22);}
.pill-violet{color:var(--violet);background:var(--violet-glow);border-color:rgba(167,139,250,0.25);}
.pill-violet:hover{background:rgba(167,139,250,0.22);}

.icon-btn{
  width:32px;height:32px;border-radius:var(--r8);display:flex;align-items:center;justify-content:center;
  background:transparent;border:1px solid var(--border2);color:var(--text3);
  cursor:pointer;font-size:14px;transition:all 0.12s;flex-shrink:0;
}
.icon-btn:hover{color:var(--text1);border-color:var(--border3);background:var(--border);}
.icon-btn.active{color:var(--cyan);border-color:rgba(34,211,238,0.35);background:rgba(34,211,238,0.08);}
.menu-btn{background:transparent;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:4px;transition:color 0.12s;flex-shrink:0;}
.menu-btn:hover{color:var(--text1);}

/* ── CONTEXT PANEL ── */
.ctx-panel{
  background:var(--bg2);border-bottom:1px solid var(--border);flex-shrink:0;
  overflow:hidden;transition:max-height 0.3s cubic-bezier(0.4,0,0.2,1);
}
.ctx-tabs{display:flex;align-items:center;padding:10px 16px 0;gap:2px;}
.ctx-tab{
  display:flex;align-items:center;gap:5px;padding:7px 12px;
  font-family:var(--mono);font-size:10px;font-weight:600;
  background:transparent;border:none;border-bottom:2px solid transparent;
  cursor:pointer;transition:all 0.12s;letter-spacing:0.02em;
}
.ctx-tab.t-teal{color:var(--text3);}
.ctx-tab.t-teal.active{color:var(--teal);border-bottom-color:var(--teal);}
.ctx-tab.t-rose{color:var(--text3);}
.ctx-tab.t-rose.active{color:var(--rose);border-bottom-color:var(--rose);}
.ctx-tab.t-violet{color:var(--text3);}
.ctx-tab.t-violet.active{color:var(--violet);border-bottom-color:var(--violet);}
.ctx-count{border-radius:var(--r999);padding:1px 5px;font-size:8px;background:var(--border2);}

.ctx-cards{display:flex;gap:10px;padding:10px 16px 12px;overflow-x:auto;}
.ctx-card{
  flex-shrink:0;border-radius:var(--r12);border:1px solid var(--border2);
  background:var(--bg3);padding:12px;cursor:pointer;transition:all 0.18s ease;
  position:relative;overflow:hidden;
}
.ctx-card::before{
  content:'';position:absolute;inset:0;opacity:0;transition:opacity 0.18s;
  background:linear-gradient(135deg,rgba(255,255,255,0.03),transparent);
}
.ctx-card:hover::before{opacity:1;}
.ctx-card:hover{transform:translateY(-2px);}
.ctx-card-f{width:176px;}
.ctx-card-e{width:210px;}
.ctx-card-p{width:196px;}
.ctx-card:hover.hover-teal{border-color:rgba(45,212,191,0.3);box-shadow:0 4px 20px var(--teal-glow);}
.ctx-card:hover.hover-rose{border-color:rgba(248,113,113,0.3);box-shadow:0 4px 20px var(--rose-glow);}
.ctx-card:hover.hover-violet{border-color:rgba(167,139,250,0.3);box-shadow:0 4px 20px var(--violet-glow);}
.card-attached{border-color:rgba(34,211,238,0.4)!important;box-shadow:0 0 0 1px rgba(34,211,238,0.2)!important;}
.card-attached-badge{
  position:absolute;top:6px;right:6px;width:16px;height:16px;border-radius:50%;
  background:var(--cyan);display:flex;align-items:center;justify-content:center;
  font-size:8px;color:#000;font-weight:800;animation:popIn 0.2s ease;
}

/* ── MESSAGES ── */
.msg-area{flex:1;overflow-y:auto;padding:12px 0;}
.day-divider{display:flex;align-items:center;gap:12px;padding:4px 20px;margin-bottom:4px;}
.day-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--border3),transparent);opacity:0.5;}
.day-label{font-family:var(--mono);font-size:9px;color:var(--text3);flex-shrink:0;letter-spacing:0.1em;}

.msg-row{
  display:flex;gap:12px;padding:5px 16px;border-radius:var(--r12);
  transition:background 0.1s;position:relative;group:true;
}
.msg-row:hover{background:rgba(255,255,255,0.015);}
.msg-row:hover .msg-actions{opacity:1;transform:translateY(0);}
.msg-actions{
  position:absolute;right:16px;top:4px;
  display:flex;gap:3px;background:var(--bg3);
  border:1px solid var(--border2);border-radius:var(--r8);
  padding:3px;opacity:0;transform:translateY(-4px);
  transition:all 0.15s;z-index:10;
}
.action-btn{
  width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;
  font-size:13px;background:transparent;border:none;cursor:pointer;color:var(--text2);transition:all 0.1s;
}
.action-btn:hover{background:var(--border2);color:var(--text1);}

.msg-avatar{flex-shrink:0;margin-top:2px;}
.msg-content{flex:1;min-width:0;}
.msg-header{display:flex;align-items:baseline;gap:8px;margin-bottom:3px;}
.msg-name{font-weight:700;font-size:13px;}
.msg-role-badge{
  font-family:var(--mono);font-size:8px;font-weight:600;padding:2px 6px;
  border-radius:var(--r4);border:1px solid;letter-spacing:0.05em;
}
.msg-time{font-family:var(--mono);font-size:9px;color:var(--text3);}
.msg-body{font-size:13.5px;line-height:1.65;color:rgba(241,245,249,0.82);}

/* Inline tags */
.tag-mention{
  color:var(--cyan);background:rgba(34,211,238,0.1);border-radius:var(--r4);
  padding:1px 5px;font-weight:700;cursor:pointer;transition:background 0.1s;display:inline;
}
.tag-mention:hover{background:rgba(34,211,238,0.2);}
.tag-file{
  display:inline-flex;align-items:center;gap:3px;color:var(--teal);
  background:var(--teal-glow);border:1px solid rgba(45,212,191,0.2);
  border-radius:var(--r4);padding:1px 6px;font-family:var(--mono);font-size:11px;cursor:pointer;
  transition:background 0.1s;vertical-align:middle;
}
.tag-file:hover{background:rgba(45,212,191,0.2);}
.tag-err{
  display:inline-flex;align-items:center;gap:3px;color:var(--rose);
  background:var(--rose-glow);border:1px solid rgba(248,113,113,0.2);
  border-radius:var(--r4);padding:1px 6px;font-family:var(--mono);font-size:11px;cursor:pointer;
  transition:background 0.1s;vertical-align:middle;
}
.tag-err:hover{background:rgba(248,113,113,0.2);}
.tag-proj{
  display:inline-flex;align-items:center;gap:3px;color:var(--violet);
  background:var(--violet-glow);border:1px solid rgba(167,139,250,0.2);
  border-radius:var(--r4);padding:1px 6px;font-family:var(--mono);font-size:11px;cursor:pointer;
  transition:background 0.1s;vertical-align:middle;
}
.tag-proj:hover{background:rgba(167,139,250,0.2);}

/* Code block */
.code-block{margin-top:8px;border-radius:var(--r12);overflow:hidden;border:1px solid var(--border2);background:#030508;}
.code-header{
  display:flex;align-items:center;gap:8px;padding:8px 14px;
  border-bottom:1px solid var(--border);background:rgba(255,255,255,0.02);
}
.code-dots{display:flex;gap:5px;}
.code-dot{width:9px;height:9px;border-radius:50%;}
.code-lang{font-family:var(--mono);font-size:9px;color:var(--text3);letter-spacing:0.08em;margin-left:4px;}
.code-copy{
  margin-left:auto;font-family:var(--mono);font-size:9px;
  padding:3px 9px;border-radius:var(--r4);border:1px solid var(--border2);
  background:transparent;cursor:pointer;transition:all 0.12s;color:var(--text3);
}
.code-copy:hover{color:var(--cyan);border-color:rgba(34,211,238,0.3);}
.code-body{padding:12px 14px;font-family:var(--mono);font-size:11.5px;line-height:1.7;overflow-x:auto;color:rgba(241,245,249,0.7);}

/* Reactions */
.reactions{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;}
.rxn-btn{
  display:inline-flex;align-items:center;gap:4px;padding:3px 9px;
  border-radius:var(--r999);font-size:12px;cursor:pointer;transition:all 0.13s;border:1px solid;
}
.rxn-btn.mine{color:var(--cyan);background:rgba(34,211,238,0.08);border-color:rgba(34,211,238,0.35);}
.rxn-btn.other{color:var(--text2);background:rgba(255,255,255,0.03);border-color:var(--border2);}
.rxn-btn.other:hover{color:var(--text1);border-color:var(--border3);}
.rxn-add{
  display:inline-flex;align-items:center;padding:3px 8px;border-radius:var(--r999);
  font-size:12px;cursor:pointer;border:1px solid var(--border);background:transparent;
  color:var(--text3);transition:all 0.12s;
}
.rxn-add:hover{color:var(--text1);border-color:var(--border3);}

/* Thread bar */
.thread-bar{
  display:flex;align-items:center;gap:8px;padding:4px 8px;margin-top:6px;
  border-radius:var(--r8);background:transparent;border:none;cursor:pointer;
  transition:background 0.12s;width:fit-content;border:1px solid transparent;
}
.thread-bar:hover{background:rgba(34,211,238,0.05);border-color:rgba(34,211,238,0.15);}
.thread-avatars{display:flex;}
.thread-count{color:var(--cyan);font-size:12px;font-weight:700;}
.thread-hint{color:var(--text3);font-family:var(--mono);font-size:10px;}

/* ── INPUT ── */
.input-zone{padding:8px 16px 14px;background:var(--bg0);flex-shrink:0;}
.attached-row{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;}
.attached-chip{
  display:flex;align-items:center;gap:6px;padding:4px 10px;
  border-radius:var(--r8);font-family:var(--mono);font-size:11px;
  border:1px solid;transition:all 0.12s;animation:popIn 0.18s ease;
}
.chip-remove{
  background:transparent;border:none;cursor:pointer;color:inherit;opacity:0.4;
  padding:0;line-height:1;transition:opacity 0.12s;
}
.chip-remove:hover{opacity:1;}

.input-box{
  background:var(--bg3);border:1px solid var(--border2);border-radius:var(--r16);
  overflow:hidden;transition:all 0.2s;position:relative;
}
.input-box:focus-within{border-color:rgba(34,211,238,0.3);box-shadow:0 0 0 3px rgba(34,211,238,0.06);}
.input-ta{
  width:100%;background:transparent;padding:13px 18px 8px;
  font-size:13.5px;color:var(--text1);font-family:var(--sans);
  border:none;line-height:1.6;resize:none;
}
.input-ta::placeholder{color:var(--text3);}
.input-ta:focus{outline:none;}
.input-toolbar{display:flex;align-items:center;gap:4px;padding:0 12px 10px;}
.tb-btn{
  width:30px;height:30px;display:flex;align-items:center;justify-content:center;
  border-radius:var(--r8);font-size:14px;color:var(--text3);background:transparent;border:none;
  cursor:pointer;transition:all 0.12s;
}
.tb-btn:hover{color:var(--text1);background:var(--border);}
.tb-sep{width:1px;height:18px;background:var(--border2);margin:0 3px;}
.tb-fmt{
  width:28px;height:28px;display:flex;align-items:center;justify-content:center;
  border-radius:var(--r4);font-family:var(--mono);font-size:11px;color:var(--text3);
  background:transparent;border:none;cursor:pointer;transition:all 0.12s;
}
.tb-fmt:hover{color:var(--text1);background:var(--border);}
.send-btn{
  margin-left:auto;display:flex;align-items:center;gap:5px;
  padding:7px 18px;border-radius:var(--r12);font-family:var(--sans);
  font-size:12px;font-weight:700;color:#000;border:none;cursor:pointer;
  background:linear-gradient(135deg,var(--cyan),var(--teal));
  box-shadow:0 0 18px rgba(34,211,238,0.35);transition:all 0.2s;
}
.send-btn:hover:not(:disabled){box-shadow:0 0 28px rgba(34,211,238,0.55);transform:translateY(-1px);}
.send-btn:disabled{opacity:0.3;cursor:not-allowed;transform:none;}
.send-hint{font-family:var(--mono);font-size:9px;color:var(--text3);}

/* ── MENTION DROPDOWN ── */
.mention-dd{
  position:absolute;bottom:calc(100% + 6px);left:0;right:0;
  background:var(--bg3);border:1px solid var(--border2);border-radius:var(--r12);
  overflow:hidden;box-shadow:0 -8px 32px rgba(0,0,0,0.6);z-index:100;
  animation:popIn 0.15s ease;
}
.mention-header{padding:7px 12px;border-bottom:1px solid var(--border);font-family:var(--mono);font-size:8px;color:var(--text3);letter-spacing:0.2em;text-transform:uppercase;}
.mention-row{
  display:flex;align-items:center;gap:10px;padding:8px 12px;
  cursor:pointer;transition:background 0.1s;
}
.mention-row.sel{background:rgba(34,211,238,0.06);}
.mention-row:hover{background:var(--border);}
.mention-kbd{margin-left:auto;font-family:var(--mono);font-size:8px;color:var(--text3);}

/* ── THREAD PANEL ── */
.thread-panel{
  width:384px;min-width:384px;display:flex;flex-direction:column;
  background:var(--bg1);border-left:1px solid var(--border);
  animation:slideRight 0.25s ease;
}
.thread-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 16px;border-bottom:1px solid var(--border);flex-shrink:0;
}
.thread-title{font-weight:700;font-size:15px;letter-spacing:-0.01em;}
.thread-sub{font-family:var(--mono);font-size:10px;color:var(--text3);margin-top:2px;}
.thread-close{
  width:30px;height:30px;border-radius:var(--r8);display:flex;align-items:center;justify-content:center;
  background:transparent;border:1px solid transparent;cursor:pointer;color:var(--text3);
  font-size:16px;transition:all 0.12s;
}
.thread-close:hover{color:var(--rose);background:var(--rose-glow);border-color:rgba(248,113,113,0.3);}
.thread-divider{margin:8px 14px;height:1px;background:linear-gradient(90deg,transparent,var(--border3),transparent);}
.thread-input{padding:10px;border-top:1px solid var(--border);flex-shrink:0;}
.thread-box{
  background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r12);overflow:hidden;
  transition:border-color 0.2s;
}
.thread-box:focus-within{border-color:rgba(34,211,238,0.25);}
.thread-ta{
  width:100%;background:transparent;padding:10px 14px 6px;
  font-size:12.5px;color:var(--text1);font-family:var(--sans);
  border:none;resize:none;line-height:1.5;
}
.thread-ta::placeholder{color:var(--text3);}
.thread-ta:focus{outline:none;}
.thread-foot{display:flex;align-items:center;padding:0 10px 8px;}

/* ── STATUS BAR ── */
.statusbar{
  display:flex;align-items:center;gap:12px;padding:5px 16px;
  background:var(--bg1);border-top:1px solid var(--border);flex-shrink:0;
  font-family:var(--mono);font-size:9px;color:var(--text3);
}
.status-dot{width:5px;height:5px;border-radius:50%;}

/* ── AVATAR ── */
.av{
  display:flex;align-items:center;justify-content:center;
  font-family:var(--mono);font-weight:700;user-select:none;flex-shrink:0;letter-spacing:-0.5px;
}

/* Typing indicator */
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.typing-dot{width:4px;height:4px;border-radius:50%;background:var(--text3);display:inline-block;margin:0 1px;}
.typing-dot:nth-child(1){animation:bounce 1.2s ease 0s infinite;}
.typing-dot:nth-child(2){animation:bounce 1.2s ease 0.2s infinite;}
.typing-dot:nth-child(3){animation:bounce 1.2s ease 0.4s infinite;}

/* New msg badge */
.new-badge{
  position:absolute;bottom:80px;left:50%;transform:translateX(-50%);
  background:var(--cyan);color:#000;font-family:var(--mono);font-size:10px;font-weight:700;
  padding:5px 14px;border-radius:var(--r999);cursor:pointer;
  box-shadow:0 4px 16px rgba(34,211,238,0.4);animation:fadeUp 0.2s ease;
  z-index:20;border:none;
}
`;

/* ─────────────────────────── UTILS ─────────────────────────── */
function hl(src) {
  if (!src) return null;
  return src.split('\n').map((line, i) => {
    const t = line.trimStart();
    let ls = {};
    if (t.startsWith('//')) ls = { color:'#3d5166', fontStyle:'italic' };
    else if (/^(async|function|const|let|var|return|await|export|import|type|if|else|for|while|switch|case|break|default|try|catch|finally|throw)\b/.test(t)) ls = { color:'#c792ea' };
    else if (/^(class|extends|interface|enum|implements|namespace|package)\b/.test(t)) ls = { color:'#ffcb6b' };
    return (
      <div key={i} style={ls}>
        {line.split(/([\w$]+(?=\s*\())/g).map((p, j) =>
          /(analyzeCode|buildKnowledgeGraph|detectCognitiveState|merge|push|map|filter|reduce|find|forEach|useEffect|useState|useCallback|useMemo)/.test(p)
            ? <span key={j} style={{color:'#7fc1ff'}}>{p}</span>
            : p.startsWith('"') || p.startsWith("'") || p.startsWith('`')
              ? <span key={j} style={{color:'#b9e4a3'}}>{p}</span>
              : <span key={j}>{p}</span>
        )}
      </div>
    );
  });
}

function parseText(text, onlineUsers) {
  if (!text) return [];
  const users = Object.values(onlineUsers);
  const segs = []; 
  let currentText = text;
  
  // Very simple parsing for @mentions
  // In a real app, this would use a more robust regex or markdown parser
  const mentionRegex = /@(\w+)/g;
  let match;
  let lastIdx = 0;

  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1];
    const user = users.find(u => u.username?.toLowerCase() === username.toLowerCase());
    
    if (user) {
      if (match.index > lastIdx) {
        segs.push({ t: 'text', v: text.slice(lastIdx, match.index) });
      }
      segs.push({ t: 'mention', user });
      lastIdx = mentionRegex.lastIndex;
    }
  }

  if (lastIdx < text.length) {
    segs.push({ t: 'text', v: text.slice(lastIdx) });
  }

  return segs.length > 0 ? segs : [{ t: 'text', v: text }];
}

/* ─────────────────────────── COMPONENTS ─────────────────────────── */
function Av({ user, size=32, r=8 }) {
  if (!user) return <div className="av" style={{ width:size, height:size, borderRadius:r, background:'var(--bg3)' }}/>;
  const initials = user.username?.slice(0, 2).toUpperCase() || '??';
  const color = user.color || '#22d3ee';
  const bg = user.bg || 'rgba(34,211,238,0.14)';
  return (
    <div className="av" style={{ width:size, height:size, borderRadius:r, fontSize:size*0.36,
      background:bg, color:color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800 }}>
      {initials}
    </div>
  );
}

function Seg({ s }) {
  if (s.t==='text')    return <span>{s.v}</span>;
  if (s.t==='mention') return <span className="tag-mention">@{s.user.username}</span>;
  return null;
}

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code.body); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  if (!code) return null;
  return (
    <div className="code-block my-3">
      <div className="code-header">
        <div className="code-dots">
          <div className="code-dot" style={{background:'rgba(248,113,113,0.7)'}}/>
          <div className="code-dot" style={{background:'rgba(251,191,36,0.7)'}}/>
          <div className="code-dot" style={{background:'rgba(74,222,128,0.7)'}}/>
        </div>
        <span className="code-lang">{code.lang || 'javascript'}</span>
        <button className="code-copy" onClick={copy}>{copied?'✓ copied':'copy'}</button>
      </div>
      <pre className="code-body">{hl(code.body)}</pre>
    </div>
  );
}

function Reactions({ reactions, onReact }) {
  if (!reactions?.length) return null;
  const grouped = reactions.reduce((acc, r) => {
    const existing = acc.find(x => x.e === r.emoji);
    if (existing) existing.n++;
    else acc.push({ e: r.emoji, n: 1, mine: false }); // mine logic needs profile check
    return acc;
  }, []);

  return (
    <div className="reactions">
      {grouped.map((r,i)=>(
        <button key={i} onClick={()=>onReact(r.e)}
          className={`rxn-btn ${r.mine?'mine':'other'}`}>
          {r.e}<span className="ml-1 opacity-60">{r.n}</span>
        </button>
      ))}
    </div>
  );
}

function ThreadBar({ count, onClick }) {
  return (
    <button className="thread-bar mt-2" onClick={onClick}>
      <span className="thread-count">{count} {count===1?'reply':'replies'}</span>
      <span className="thread-hint">View thread →</span>
    </button>
  );
}

function MsgRow({ msg, onlineUsers, messages, onThread, onReact, isThread=false }) {
  const user = msg.profiles || { username: 'System', color: '#94a3b8' };
  const segments = parseText(msg.content, onlineUsers);
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // Calculate reply count from the full messages list if not provided
  const replyCount = msg.reply_count || messages.filter(m => m.reply_to === msg.id).length;

  return (
    <div className="msg-row group">
      <div className="msg-avatar">
        <Av user={user}/>
      </div>
      <div className="msg-content">
        <div className="msg-header">
          <span className="msg-name" style={{color:user.color}}>{user.username}</span>
          <span className="msg-time ml-2 opacity-40">{time}</span>
        </div>
        <div className="msg-body">{segments.map((s,i)=><Seg key={i} s={s}/>)}</div>
        
        {/* Simple markdown code block detection */}
        {msg.content.includes('```') && (
          <CodeBlock code={{ 
            lang: msg.content.split('```')[1].split('\n')[0] || 'javascript',
            body: msg.content.split('```')[1].split('\n').slice(1).join('\n').split('```')[0]
          }}/>
        )}

        <Reactions reactions={msg.reactions} onReact={e=>onReact(msg.id,e)}/>
        {!isThread && replyCount > 0 && (
          <ThreadBar count={replyCount} onClick={()=>onThread(msg)}/>
        )}
      </div>
      <div className="msg-actions">
        <button className="action-btn" onClick={()=>onReact(msg.id, '👍')}>😊</button>
        {!isThread && <button className="action-btn" onClick={()=>onThread(msg)}>💬</button>}
      </div>
    </div>
  );
}

function MentionDD({ query, users, selected, onSelect }) {
  const list = users.filter(u=>u.username?.toLowerCase().includes(query.toLowerCase())).slice(0,5);
  if (!list.length) return null;
  return (
    <div className="mention-dd">
      <div className="mention-header">Mention a teammate</div>
      {list.map((u,i)=>(
        <div key={u.id} onClick={()=>onSelect(u)}
          className={`mention-row${i===selected?' sel':''}`}>
          <Av user={u} size={24} r={6}/>
          <span className="ml-2 font-bold" style={{color:u.color}}>{u.username}</span>
          {i===selected && <span className="mention-kbd ml-auto text-[8px] opacity-40">↵ select</span>}
        </div>
      ))}
    </div>
  );
}

function ThreadPanel({ msg, onlineUsers, messages, onClose, onSend, onReact }) {
  const [val, setVal] = useState('');
  const endRef = useRef(null);
  const replies = messages.filter(m => m.reply_to === msg.id);
  
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}); }, [replies.length]);
  
  const send = () => { if(!val.trim()) return; onSend(val.trim(), msg.id); setVal(''); };
  
  return (
    <div className="thread-panel anim-slideRight">
      <div className="thread-header">
        <div>
          <div className="thread-title">Thread</div>
          <div className="thread-sub opacity-50">{replies.length} replies</div>
        </div>
        <button className="thread-close" onClick={onClose}>✕</button>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <MsgRow msg={msg} onlineUsers={onlineUsers} messages={messages} onThread={()=>{}} onReact={onReact} isThread/>
        <div className="thread-divider my-4 mx-4"/>
        {replies.map(r=><MsgRow key={r.id} msg={r} onlineUsers={onlineUsers} messages={messages} onThread={()=>{}} onReact={onReact} isThread/>)}
        <div ref={endRef}/>
      </div>
      <div className="thread-input p-4">
        <div className="thread-box bg-[#111928] border border-white/5 rounded-2xl overflow-hidden focus-within:border-cyan-500/30 transition-all">
          <textarea className="w-full bg-transparent p-4 text-sm text-white outline-none resize-none" 
            rows={2} value={val}
            onChange={e=>setVal(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
            placeholder="Reply in thread…"/>
          <div className="flex items-center justify-between px-4 pb-3">
            <span className="text-[10px] opacity-30 font-mono italic">shift+enter for newline</span>
            <button onClick={send} disabled={!val.trim()} 
              className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-20 text-black px-4 py-1.5 rounded-xl text-xs font-bold transition-all">
              Reply ↵
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── MAIN APP ─────────────────────────── */
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
  const msgAreaRef = useRef(null);

  // Supabase hooks
  const { messages, loading: chatLoading, sendMessage, addReaction } = useChat(activeChId);
  const { onlineUsers, typingUsers, setTyping } = usePresence(activeChId);

  // Fetch channels
  useEffect(() => {
    const fetchChannels = async () => {
      const { data } = await supabase.from('channels').select('*').order('name');
      if (data) {
        setChannels(data);
        if (!activeChId && data.length > 0) setActiveChId(data[0].id);
      }
    };
    fetchChannels();
  }, []);

  useEffect(()=>{
    if(msgAreaRef.current) {
      endRef.current?.scrollIntoView({behavior:'smooth'});
    }
  },[messages.length]);

  if (authLoading) return <div className="h-screen w-screen bg-[#050709] flex items-center justify-center text-cyan-500 font-bold tracking-widest animate-pulse">BOOTING ENGINE...</div>;
  if (!user) return <Navigate to="/login" />;

  const handleInput = e => {
    const v = e.target.value;
    setInput(v);
    setTyping(v.length > 0);
    const cur = e.target.selectionStart;
    const before = v.slice(0, cur);
    const at = before.lastIndexOf('@');
    if(at!==-1 && (at===0||/\s/.test(before[at-1]))) {
      const q = before.slice(at+1);
      if(!/\s/.test(q)){ setMention({query:q,start:at}); setMentionSel(0); return; }
    }
    setMention(null);
  };

  const pickMention = u => {
    if(!mention) return;
    const before = input.slice(0,mention.start);
    const after  = input.slice(mention.start+1+mention.query.length);
    setInput(before+'@'+u.username+' '+after);
    setMention(null);
    textRef.current?.focus();
  };

  const handleKeyDown = e => {
    const mentionList = Object.values(onlineUsers).filter(u=>u.username?.toLowerCase().includes((mention?.query||'').toLowerCase()));
    if(mention && mentionList.length) {
      if(e.key==='ArrowDown'){e.preventDefault();setMentionSel(s=>(s+1)%mentionList.length);return;}
      if(e.key==='ArrowUp'){e.preventDefault();setMentionSel(s=>(s-1+mentionList.length)%mentionList.length);return;}
      if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();pickMention(mentionList[mentionSel]);return;}
      if(e.key==='Escape'){setMention(null);return;}
    }
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault(); handleSend();}
  };

  const handleSend = () => {
    if(!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
    setMention(null);
  };

  const curCh = channels.find(c=>c.id===activeChId);
  const typingDisplay = Object.entries(typingUsers)
    .filter(([id, isTyping]) => isTyping && id !== user.id)
    .map(([id]) => onlineUsers[id]?.username || 'Someone');

  return (
    <>
      <style>{G}</style>
      <div className="app">

        {/* ── SIDEBAR ── */}
        <div className={`sidebar${sideOpen?'':' collapsed'}`}>
          <div className="sidebar-logo">
            <div className="logo-icon bg-gradient-to-br from-cyan-400 to-teal-500 shadow-cyan-500/50">⚡</div>
            <span className="logo-text tracking-tighter">CKC-OS</span>
            <div className="live-badge border-cyan-500/20 bg-cyan-500/5">
              <div className="blink bg-cyan-400" style={{width:5,height:5,borderRadius:'50%'}}/>
              LIVE
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pt-4">
            <div className="sidebar-section">
              <div className="section-label">Nodes</div>
              {channels.map(ch=>(
                <button key={ch.id} onClick={()=>setActiveChId(ch.id)}
                  className={`ch-btn group ${activeChId===ch.id?' active':''}`}>
                  <span className={`opacity-40 group-hover:opacity-100 transition-opacity ${activeChId===ch.id?'text-cyan-400 opacity-100':''}`}>#</span>
                  <span className="truncate">{ch.name}</span>
                </button>
              ))}
            </div>
            
            <div className="sidebar-section mt-8">
              <div className="section-label">Active Users</div>
              {Object.values(onlineUsers).map(u=>(
                <div key={u.id} className="ch-btn opacity-80 hover:opacity-100">
                  <Av user={u} size={18} r={6}/>
                  <span className="truncate ml-2" style={{color:u.color}}>{u.username}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-auto shadow-emerald-500/50 shadow-sm" />
                </div>
              ))}
            </div>
          </div>

          <div className="me-row bg-[#080c12]/50 backdrop-blur-md">
            <Av user={profile}/>
            <div className="flex-1 min-w-0 ml-3">
              <div className="text-sm font-bold truncate text-white">{profile?.username}</div>
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-400/80">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"/> ONLINE
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div className="main">
          {/* TOPBAR */}
          <div className="topbar bg-[#080c12]/80 backdrop-blur-xl border-b border-white/5">
            <button className="menu-btn mr-4 text-slate-500 hover:text-white transition-colors" onClick={()=>setSideOpen(s=>!s)}>☰</button>
            <span className="font-mono text-xl text-cyan-400 font-bold mr-2">#</span>
            <div className="topbar-info">
              <div className="topbar-name text-lg font-extrabold tracking-tight">{curCh?.name||'Loading...'}</div>
              <div className="topbar-members opacity-40 font-medium text-xs truncate max-w-md">{curCh?.description || 'Real-time collaborative chat'}</div>
            </div>
          </div>

          {/* MESSAGES */}
          <div className="msg-area px-2 md:px-6" ref={msgAreaRef}>
            <div className="day-divider my-8">
              <div className="day-line"/>
              <span className="day-label uppercase tracking-[0.3em] font-black opacity-30 text-[8px]">Session Start · {new Date().toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})}</span>
              <div className="day-line"/>
            </div>
            {messages.filter(m => !m.reply_to).map(m=>(
              <MsgRow key={m.id} msg={m} onlineUsers={onlineUsers} messages={messages} onThread={setActiveThread} onReact={addReaction}/>
            ))}

            {/* Typing indicator */}
            {typingDisplay.length > 0 && (
              <div className="msg-row opacity-60">
                <div className="w-8" />
                <div className="flex items-center gap-4 py-2 pl-4">
                  <div className="flex gap-1">
                    <div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/>
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
                    {typingDisplay.join(', ')} typing…
                  </span>
                </div>
              </div>
            )}
            <div ref={endRef}/>
          </div>

          {/* INPUT ZONE */}
          <div className="input-zone pb-6 px-6">
            <div className="relative max-w-4xl mx-auto">
              {mention && (
                <MentionDD query={mention.query} users={Object.values(onlineUsers)} selected={mentionSel} onSelect={pickMention}/>
              )}
              <div className="input-box bg-[#111928] border border-white/5 rounded-[24px] overflow-hidden shadow-2xl focus-within:border-cyan-500/40 transition-all focus-within:ring-4 focus-within:ring-cyan-500/5">
                <textarea className="w-full bg-transparent p-5 text-sm text-white outline-none resize-none placeholder:text-slate-700" 
                  ref={textRef} rows={1}
                  value={input} onChange={handleInput} onKeyDown={handleKeyDown}
                  placeholder={`Transmit to #${curCh?.name || '...'} — mention with @`}/>
                <div className="flex items-center px-5 pb-4">
                  <div className="flex gap-2">
                    <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/5 text-slate-500 transition-colors">📎</button>
                    <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/5 text-slate-500 transition-colors">😊</button>
                  </div>
                  <div className="ml-auto flex items-center gap-4">
                    <span className="text-[9px] font-mono opacity-20 hidden md:block">ENTER TO SEND · SHIFT+ENTER FOR NEWLINE</span>
                    <button onClick={handleSend} disabled={!input.trim()} 
                      className="bg-gradient-to-r from-cyan-400 to-teal-400 text-black px-6 py-2 rounded-2xl text-xs font-black shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all hover:-translate-y-0.5 disabled:opacity-20 disabled:translate-y-0">
                      SEND ↵
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* THREAD PANEL */}
        {activeThread && (
          <ThreadPanel
            msg={activeThread} 
            onlineUsers={onlineUsers}
            messages={messages}
            onClose={()=>setActiveThread(null)}
            onSend={sendMessage} 
            onReact={addReaction}/>
        )}
      </div>
    </>
  );
}