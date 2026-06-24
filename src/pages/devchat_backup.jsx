import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useChat } from "../hooks/useChat";
import { usePresence } from "../hooks/usePresence";
import { supabase } from "../lib/supabase";
import { Navigate } from "react-router-dom";

/* ─────────────────────────── GLOBAL STYLES ─────────────────────────── */
const G = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700;800;900&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body,#root{height:100%;overflow:hidden;}

:root{
  --bg0:#060810;
  --bg1:#090d16;
  --bg2:#0c1120;
  --bg3:#101828;
  --bg4:#141f30;
  --border:#ffffff08;
  --border2:#ffffff10;
  --border3:#ffffff18;
  --border4:#ffffff22;
  --cyan:#38bdf8;
  --cyan2:#0ea5e9;
  --cyan-dim:rgba(56,189,248,0.12);
  --cyan-glow:rgba(56,189,248,0.2);
  --teal:#2dd4bf;
  --teal-dim:rgba(45,212,191,0.12);
  --teal-glow:rgba(45,212,191,0.2);
  --violet:#a78bfa;
  --violet-dim:rgba(167,139,250,0.1);
  --rose:#f87171;
  --rose-dim:rgba(248,113,113,0.1);
  --amber:#fbbf24;
  --green:#34d399;
  --green-dim:rgba(52,211,153,0.15);
  --text1:#e8edf5;
  --text2:#8b99b4;
  --text3:#4a5568;
  --text4:#2d3748;
  --mono:'IBM Plex Mono',monospace;
  --sans:'Inter',sans-serif;
  --r4:4px;--r6:6px;--r8:8px;--r10:10px;--r12:12px;--r16:16px;--r20:20px;--r24:24px;--r999:999px;
  --sidebar-w:260px;
  --thread-w:380px;
}

::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.06);border-radius:4px;}
::-webkit-scrollbar-thumb:hover{background:rgba(56,189,248,0.25);}

body{font-family:var(--sans);background:var(--bg0);color:var(--text1);-webkit-font-smoothing:antialiased;}

/* ── KEYFRAMES ── */
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideInLeft{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
@keyframes slideInRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:scale(1)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes glowBreath{0%,100%{box-shadow:0 0 14px rgba(56,189,248,0.3)}50%{box-shadow:0 0 32px rgba(56,189,248,0.55),0 0 60px rgba(56,189,248,0.15)}}
@keyframes shimmer{0%{opacity:0.4}50%{opacity:0.8}100%{opacity:0.4}}

.anim-fadeUp{animation:fadeUp 0.22s cubic-bezier(0.2,0,0,1) both;}
.anim-fadeIn{animation:fadeIn 0.18s ease both;}
.anim-scaleIn{animation:scaleIn 0.2s cubic-bezier(0.34,1.4,0.64,1) both;}
.anim-slideLeft{animation:slideInLeft 0.28s cubic-bezier(0.2,0,0,1) both;}
.anim-slideRight{animation:slideInRight 0.28s cubic-bezier(0.2,0,0,1) both;}
.blink{animation:pulse 1.8s ease infinite;}
.shimmer{animation:shimmer 2s ease infinite;}

/* ── LAYOUT ── */
.app{
  display:flex;height:100vh;overflow:hidden;
  background:var(--bg0);
  position:relative;
}
.app::before{
  content:'';position:absolute;inset:0;pointer-events:none;z-index:0;
  background:
    radial-gradient(ellipse 70% 50% at -5% -10%,rgba(56,189,248,0.05) 0%,transparent 65%),
    radial-gradient(ellipse 50% 70% at 105% 105%,rgba(167,139,250,0.04) 0%,transparent 65%);
}

/* ── SIDEBAR ── */
.sidebar{
  width:var(--sidebar-w);min-width:var(--sidebar-w);
  background:var(--bg1);
  border-right:1px solid var(--border2);
  display:flex;flex-direction:column;flex-shrink:0;
  position:relative;z-index:10;
  transition:width 0.3s cubic-bezier(0.4,0,0.2,1), min-width 0.3s cubic-bezier(0.4,0,0.2,1);
  overflow:hidden;
}
.sidebar.collapsed{width:0;min-width:0;}

/* Logo */
.logo-row{
  display:flex;align-items:center;gap:10px;
  padding:16px 14px 14px;
  border-bottom:1px solid var(--border2);
  flex-shrink:0;
}
.logo-icon{
  width:32px;height:32px;border-radius:var(--r8);
  display:flex;align-items:center;justify-content:center;
  font-size:15px;flex-shrink:0;
  background:linear-gradient(135deg,var(--cyan) 0%,var(--teal) 100%);
  animation:glowBreath 4s ease infinite;
}
.logo-name{
  font-family:var(--mono);font-weight:700;font-size:13px;
  letter-spacing:0.04em;color:var(--text1);
  white-space:nowrap;
}
.live-pill{
  margin-left:auto;display:flex;align-items:center;gap:4px;
  padding:3px 8px;border-radius:var(--r999);
  border:1px solid rgba(56,189,248,0.2);background:rgba(56,189,248,0.06);
  font-family:var(--mono);font-size:8px;font-weight:700;
  color:var(--cyan);letter-spacing:0.12em;white-space:nowrap;flex-shrink:0;
}

/* Nav sections */
.nav-section{padding:18px 8px 4px;}
.nav-label{
  font-family:var(--mono);font-size:8.5px;font-weight:600;
  color:var(--text3);letter-spacing:0.2em;text-transform:uppercase;
  padding:0 8px 8px;display:block;
}
.ch-item{
  display:flex;align-items:center;gap:8px;
  width:100%;padding:7px 10px;border-radius:var(--r8);
  font-size:13px;font-weight:500;color:var(--text2);
  background:transparent;border:none;cursor:pointer;
  transition:background 0.1s, color 0.1s;
  margin-bottom:1px;text-align:left;
  font-family:var(--sans);
  position:relative;overflow:hidden;white-space:nowrap;
}
.ch-item:hover{color:var(--text1);background:var(--border2);}
.ch-item.active{
  color:var(--cyan);background:var(--cyan-dim);
}
.ch-item.active::before{
  content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);
  width:2.5px;height:55%;background:var(--cyan);border-radius:0 2px 2px 0;
}
.ch-hash{
  font-family:var(--mono);font-size:14px;font-weight:400;
  opacity:0.35;flex-shrink:0;transition:opacity 0.1s;
}
.ch-item:hover .ch-hash,.ch-item.active .ch-hash{opacity:0.9;}

/* Online users in sidebar */
.user-item{
  display:flex;align-items:center;gap:8px;
  width:100%;padding:6px 10px;border-radius:var(--r8);
  font-size:12.5px;font-weight:500;
  background:transparent;border:none;
  margin-bottom:1px;
}
.online-dot{
  width:5px;height:5px;border-radius:50%;
  background:var(--green);flex-shrink:0;
  box-shadow:0 0 6px var(--green);
}

/* Me row */
.me-row{
  display:flex;align-items:center;gap:10px;
  padding:12px 14px;border-top:1px solid var(--border2);
  background:var(--bg0);flex-shrink:0;
}
.me-name{font-size:13px;font-weight:600;color:var(--text1);}
.me-status{
  font-family:var(--mono);font-size:8.5px;color:var(--green);
  letter-spacing:0.1em;display:flex;align-items:center;gap:4px;
}

/* ── MAIN ── */
.main{
  display:flex;flex-direction:column;flex:1;min-width:0;
  overflow:hidden;position:relative;z-index:1;
}

/* ── TOPBAR ── */
.topbar{
  display:flex;align-items:center;gap:10px;padding:0 20px;height:52px;
  background:rgba(9,13,22,0.85);backdrop-filter:blur(20px);
  border-bottom:1px solid var(--border2);flex-shrink:0;
  position:relative;z-index:5;
}
.menu-btn{
  background:transparent;border:none;color:var(--text3);
  cursor:pointer;font-size:17px;padding:6px;
  border-radius:var(--r8);transition:color 0.1s, background 0.1s;
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;
}
.menu-btn:hover{color:var(--text1);background:var(--border2);}
.topbar-hash{
  font-family:var(--mono);font-size:16px;font-weight:500;
  color:var(--cyan);opacity:0.6;flex-shrink:0;
}
.topbar-name{font-size:15px;font-weight:700;letter-spacing:-0.01em;}
.topbar-desc{font-family:var(--mono);font-size:9.5px;color:var(--text3);margin-top:1px;}
.topbar-divider{width:1px;height:20px;background:var(--border3);margin:0 4px;flex-shrink:0;}

.icon-btn{
  width:30px;height:30px;border-radius:var(--r8);
  display:flex;align-items:center;justify-content:center;
  background:transparent;border:1px solid var(--border2);
  color:var(--text3);cursor:pointer;font-size:13px;
  transition:all 0.12s;flex-shrink:0;
}
.icon-btn:hover{color:var(--text1);border-color:var(--border3);background:var(--border2);}
.icon-btn.active{color:var(--cyan);border-color:rgba(56,189,248,0.3);background:var(--cyan-dim);}

.members-pill{
  display:flex;align-items:center;gap:5px;
  padding:4px 10px;border-radius:var(--r999);
  border:1px solid var(--border2);background:var(--border);
  font-family:var(--mono);font-size:9.5px;color:var(--text3);
  cursor:default;white-space:nowrap;
}
.members-dot{width:5px;height:5px;border-radius:50%;background:var(--green);box-shadow:0 0 5px var(--green);}

/* ── MESSAGES AREA ── */
.msg-area{
  flex:1;overflow-y:auto;padding:8px 0 4px;
  display:flex;flex-direction:column;
}

/* Day divider */
.day-divider{
  display:flex;align-items:center;gap:12px;
  padding:16px 20px 8px;flex-shrink:0;
}
.day-line{flex:1;height:1px;background:var(--border2);}
.day-label{
  font-family:var(--mono);font-size:9px;color:var(--text3);
  letter-spacing:0.12em;text-transform:uppercase;white-space:nowrap;
}

/* Message row */
.msg-row{
  display:flex;gap:11px;padding:5px 16px 5px;
  border-radius:var(--r8);position:relative;
  transition:background 0.08s;
  group:true;
}
.msg-row:hover{background:rgba(255,255,255,0.012);}
.msg-row:hover .msg-actions{opacity:1;transform:translateY(0);}

/* Message action toolbar (hover) */
.msg-actions{
  position:absolute;right:12px;top:-12px;
  display:flex;gap:2px;
  background:var(--bg3);border:1px solid var(--border3);
  border-radius:var(--r10);padding:3px;
  opacity:0;transform:translateY(4px);
  transition:all 0.15s;z-index:20;
  box-shadow:0 4px 20px rgba(0,0,0,0.5);
}
.action-btn{
  width:26px;height:26px;border-radius:var(--r6);
  display:flex;align-items:center;justify-content:center;
  font-size:13px;background:transparent;border:none;
  cursor:pointer;color:var(--text2);transition:all 0.1s;
}
.action-btn:hover{background:var(--border3);color:var(--text1);}
.action-btn-sep{width:1px;height:18px;background:var(--border2);margin:auto 1px;}

/* Avatar */
.av{
  display:flex;align-items:center;justify-content:center;
  font-family:var(--mono);font-weight:800;user-select:none;
  flex-shrink:0;letter-spacing:-0.5px;
}
.msg-avatar{flex-shrink:0;margin-top:3px;}

/* Message content */
.msg-content{flex:1;min-width:0;}
.msg-header{display:flex;align-items:baseline;gap:8px;margin-bottom:3px;}
.msg-name{font-weight:700;font-size:13px;}
.msg-time{font-family:var(--mono);font-size:9px;color:var(--text3);margin-left:2px;}

.msg-body{
  font-size:13.5px;line-height:1.7;
  color:rgba(232,237,245,0.8);
  word-break:break-word;
}

/* Inline tags */
.tag-mention{
  color:var(--cyan);background:var(--cyan-dim);
  border-radius:var(--r4);padding:1px 5px;
  font-weight:700;cursor:pointer;
  transition:background 0.1s;display:inline;
}
.tag-mention:hover{background:rgba(56,189,248,0.2);}

/* Code block */
.code-block{
  margin-top:10px;border-radius:var(--r12);
  overflow:hidden;border:1px solid var(--border3);
  background:#020407;
}
.code-header{
  display:flex;align-items:center;gap:8px;padding:8px 14px;
  border-bottom:1px solid var(--border2);
  background:rgba(255,255,255,0.018);
}
.code-dots{display:flex;gap:5px;}
.code-dot{width:8px;height:8px;border-radius:50%;}
.code-lang{
  font-family:var(--mono);font-size:9px;color:var(--text3);
  letter-spacing:0.08em;margin-left:4px;
}
.code-copy{
  margin-left:auto;font-family:var(--mono);font-size:9px;
  padding:3px 9px;border-radius:var(--r4);
  border:1px solid var(--border2);background:transparent;
  cursor:pointer;transition:all 0.12s;color:var(--text3);
}
.code-copy:hover{color:var(--cyan);border-color:rgba(56,189,248,0.3);background:var(--cyan-dim);}
.code-body{
  padding:14px 16px;font-family:var(--mono);font-size:11.5px;
  line-height:1.75;overflow-x:auto;color:rgba(232,237,245,0.65);
}

/* Reactions */
.reactions{display:flex;flex-wrap:wrap;gap:4px;margin-top:7px;}
.rxn-btn{
  display:inline-flex;align-items:center;gap:4px;
  padding:3px 9px;border-radius:var(--r999);
  font-size:12px;cursor:pointer;transition:all 0.12s;border:1px solid;
  font-family:var(--sans);
}
.rxn-btn.mine{
  color:var(--cyan);background:var(--cyan-dim);
  border-color:rgba(56,189,248,0.3);
}
.rxn-btn.mine:hover{background:rgba(56,189,248,0.18);}
.rxn-btn.other{
  color:var(--text2);background:rgba(255,255,255,0.03);
  border-color:var(--border2);
}
.rxn-btn.other:hover{color:var(--text1);border-color:var(--border3);background:var(--border2);}
.rxn-count{font-family:var(--mono);font-size:10px;opacity:0.7;}

/* Emoji picker */
.emoji-picker{
  position:absolute;
  background:var(--bg3);border:1px solid var(--border3);
  border-radius:var(--r12);padding:8px;
  display:flex;gap:4px;flex-wrap:wrap;width:168px;
  box-shadow:0 8px 32px rgba(0,0,0,0.6);z-index:30;
  animation:scaleIn 0.15s ease;
}
.emoji-opt{
  width:30px;height:30px;border-radius:var(--r6);
  display:flex;align-items:center;justify-content:center;
  font-size:16px;cursor:pointer;border:none;
  background:transparent;transition:background 0.1s;
}
.emoji-opt:hover{background:var(--border3);}

/* Thread bar */
.thread-bar{
  display:inline-flex;align-items:center;gap:7px;
  padding:4px 10px;margin-top:7px;
  border-radius:var(--r8);background:transparent;
  border:1px solid var(--border2);cursor:pointer;
  transition:all 0.12s;
  font-size:12px;
}
.thread-bar:hover{
  background:var(--cyan-dim);
  border-color:rgba(56,189,248,0.25);
}
.thread-count{color:var(--cyan);font-weight:700;}
.thread-hint{color:var(--text3);font-family:var(--mono);font-size:9px;}

/* ── INPUT ZONE ── */
.input-zone{
  padding:8px 16px 14px;
  background:var(--bg0);flex-shrink:0;
  border-top:1px solid var(--border);
}
.input-wrap{position:relative;max-width:960px;margin:0 auto;}
.input-box{
  background:var(--bg3);
  border:1px solid var(--border3);border-radius:var(--r20);
  overflow:hidden;transition:all 0.18s;
}
.input-box:focus-within{
  border-color:rgba(56,189,248,0.35);
  box-shadow:0 0 0 3px rgba(56,189,248,0.06), 0 4px 24px rgba(0,0,0,0.3);
}
.input-ta{
  width:100%;background:transparent;padding:13px 18px 8px;
  font-size:13.5px;color:var(--text1);
  font-family:var(--sans);border:none;line-height:1.6;
  resize:none;max-height:160px;overflow-y:auto;
}
.input-ta::placeholder{color:var(--text3);}
.input-ta:focus{outline:none;}
.input-footer{
  display:flex;align-items:center;gap:4px;
  padding:0 12px 11px;
}
.tb-btn{
  width:28px;height:28px;display:flex;align-items:center;justify-content:center;
  border-radius:var(--r8);font-size:14px;color:var(--text3);
  background:transparent;border:none;cursor:pointer;
  transition:all 0.1s;
}
.tb-btn:hover{color:var(--text2);background:var(--border2);}
.send-btn{
  margin-left:auto;display:flex;align-items:center;gap:5px;
  padding:7px 18px;border-radius:var(--r12);
  font-family:var(--sans);font-size:12px;font-weight:700;
  color:#000;border:none;cursor:pointer;
  background:linear-gradient(135deg,var(--cyan) 0%,var(--teal) 100%);
  box-shadow:0 0 20px rgba(56,189,248,0.3);
  transition:all 0.18s;
}
.send-btn:hover:not(:disabled){
  box-shadow:0 0 30px rgba(56,189,248,0.5);
  transform:translateY(-1px);
}
.send-btn:disabled{opacity:0.25;cursor:not-allowed;transform:none;}
.hint-text{
  font-family:var(--mono);font-size:8.5px;color:var(--text3);
  opacity:0.6;margin-right:6px;
}

/* Mention dropdown */
.mention-dd{
  position:absolute;bottom:calc(100% + 8px);left:0;right:0;
  background:var(--bg3);border:1px solid var(--border3);
  border-radius:var(--r12);overflow:hidden;
  box-shadow:0 -8px 40px rgba(0,0,0,0.7);z-index:100;
  animation:scaleIn 0.14s ease;
}
.mention-header{
  padding:7px 12px;border-bottom:1px solid var(--border2);
  font-family:var(--mono);font-size:8px;color:var(--text3);
  letter-spacing:0.18em;text-transform:uppercase;
}
.mention-row{
  display:flex;align-items:center;gap:9px;
  padding:8px 12px;cursor:pointer;transition:background 0.08s;
}
.mention-row.sel{background:var(--cyan-dim);}
.mention-row:hover{background:var(--border2);}
.mention-kbd{
  margin-left:auto;font-family:var(--mono);font-size:8px;
  color:var(--text3);
}

/* ── THREAD PANEL ── */
.thread-panel{
  width:var(--thread-w);min-width:var(--thread-w);
  display:flex;flex-direction:column;
  background:var(--bg1);border-left:1px solid var(--border2);
  position:relative;z-index:5;
  animation:slideInRight 0.25s cubic-bezier(0.2,0,0,1);
}
.thread-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:0 16px;height:52px;
  border-bottom:1px solid var(--border2);flex-shrink:0;
}
.thread-title{font-weight:700;font-size:14px;display:flex;align-items:center;gap:7px;}
.thread-badge{
  font-family:var(--mono);font-size:9px;
  padding:2px 7px;border-radius:var(--r999);
  background:var(--cyan-dim);color:var(--cyan);
  border:1px solid rgba(56,189,248,0.2);
}
.thread-close{
  width:28px;height:28px;border-radius:var(--r8);
  display:flex;align-items:center;justify-content:center;
  background:transparent;border:1px solid transparent;
  cursor:pointer;color:var(--text3);font-size:14px;
  transition:all 0.12s;
}
.thread-close:hover{color:var(--rose);background:var(--rose-dim);border-color:rgba(248,113,113,0.25);}
.thread-divider{
  margin:12px 16px;height:1px;
  background:var(--border2);
}
.thread-input-area{padding:10px 12px 14px;border-top:1px solid var(--border2);flex-shrink:0;}
.thread-box{
  background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r12);
  overflow:hidden;transition:border-color 0.18s;
}
.thread-box:focus-within{border-color:rgba(56,189,248,0.28);}
.thread-ta{
  width:100%;background:transparent;padding:10px 14px 6px;
  font-size:13px;color:var(--text1);font-family:var(--sans);
  border:none;resize:none;line-height:1.55;
}
.thread-ta::placeholder{color:var(--text3);}
.thread-ta:focus{outline:none;}
.thread-foot{display:flex;align-items:center;justify-content:space-between;padding:0 12px 10px;}
.thread-hint-text{font-family:var(--mono);font-size:8.5px;color:var(--text3);}

/* ── STATUS BAR ── */
.statusbar{
  display:flex;align-items:center;gap:10px;padding:4px 16px;
  background:rgba(6,8,16,0.9);border-top:1px solid var(--border);
  flex-shrink:0;
  font-family:var(--mono);font-size:9px;color:var(--text3);
}
.status-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;}

/* ── TYPING INDICATOR ── */
.typing-row{
  display:flex;align-items:center;gap:10px;
  padding:4px 16px 6px 52px;min-height:24px;
}
.typing-dots{display:flex;align-items:center;gap:3px;}
.typing-dot{
  width:4px;height:4px;border-radius:50%;background:var(--text3);
}
.typing-dot:nth-child(1){animation:bounce 1.3s ease 0s infinite;}
.typing-dot:nth-child(2){animation:bounce 1.3s ease 0.18s infinite;}
.typing-dot:nth-child(3){animation:bounce 1.3s ease 0.36s infinite;}
.typing-label{
  font-family:var(--mono);font-size:9.5px;color:var(--text3);
  letter-spacing:0.05em;
}

/* ── EMPTY STATE ── */
.empty-state{
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:12px;opacity:0.3;padding:24px;
}
.empty-icon{font-size:40px;}
.empty-label{font-family:var(--mono);font-size:11px;color:var(--text3);letter-spacing:0.1em;text-align:center;}
`;

/* ─────────────────────────── UTILS ─────────────────────────── */
function hl(src = '') {
  return src.split('\n').map((line, i) => {
    const t = line.trimStart();
    let color = 'rgba(232,237,245,0.6)';
    if (t.startsWith('//') || t.startsWith('#')) color = '#3d5a75';
    else if (/^(async|function|const|let|var|return|await|export|import|if|else|for|while|switch|case|break|default|try|catch|finally|throw|from|of|in)\b/.test(t)) color = '#c792ea';
    else if (/^(class|extends|interface|type|enum)\b/.test(t)) color = '#ffcb6b';
    return (
      <div key={i} style={{ color }}>
        {line.split(/(["'`][^"'`]*["'`])/g).map((p, j) =>
          /^["'`]/.test(p)
            ? <span key={j} style={{ color: '#b9e4a3' }}>{p}</span>
            : p
        )}
      </div>
    );
  });
}

function parseText(text, onlineUsers = {}) {
  if (!text) return [];
  const users = Object.values(onlineUsers);
  const segs = [];
  const mentionRegex = /@(\w+)/g;
  let match;
  let lastIdx = 0;
  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1];
    const user = users.find(u => u.username?.toLowerCase() === username.toLowerCase());
    if (user) {
      if (match.index > lastIdx) segs.push({ t: 'text', v: text.slice(lastIdx, match.index) });
      segs.push({ t: 'mention', user });
      lastIdx = mentionRegex.lastIndex;
    }
  }
  if (lastIdx < text.length) segs.push({ t: 'text', v: text.slice(lastIdx) });
  return segs.length > 0 ? segs : [{ t: 'text', v: text }];
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const EMOJIS = ['👍','❤️','🔥','🎉','👀','✅','💯','🚀'];

/* ─────────────────────────── COMPONENTS ─────────────────────────── */
function Av({ user, size = 32, r = 8 }) {
  if (!user) return <div className="av" style={{ width: size, height: size, borderRadius: r, background: 'var(--bg3)' }} />;
  const initials = (user.username || '??').slice(0, 2).toUpperCase();
  const color = user.color || '#38bdf8';
  const bg = user.bg || 'rgba(56,189,248,0.13)';
  return (
    <div className="av" style={{
      width: size, height: size, borderRadius: r,
      fontSize: size * 0.36, background: bg, color,
    }}>
      {initials}
    </div>
  );
}

function Seg({ s }) {
  if (s.t === 'text') return <span>{s.v}</span>;
  if (s.t === 'mention') return <span className="tag-mention">@{s.user.username}</span>;
  return null;
}

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code.body).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  if (!code) return null;
  return (
    <div className="code-block">
      <div className="code-header">
        <div className="code-dots">
          <div className="code-dot" style={{ background: 'rgba(248,113,113,0.65)' }} />
          <div className="code-dot" style={{ background: 'rgba(251,191,36,0.65)' }} />
          <div className="code-dot" style={{ background: 'rgba(74,222,128,0.65)' }} />
        </div>
        <span className="code-lang">{code.lang || 'js'}</span>
        <button className="code-copy" onClick={copy}>{copied ? '✓ copied' : 'copy'}</button>
      </div>
      <pre className="code-body">{hl(code.body)}</pre>
    </div>
  );
}

function Reactions({ reactions, onReact, myUserId }) {
  if (!reactions?.length) return null;
  const grouped = reactions.reduce((acc, r) => {
    const ex = acc.find(x => x.e === r.emoji);
    if (ex) {
      ex.n++;
      if (r.user_id === myUserId) ex.mine = true;
    } else {
      acc.push({ e: r.emoji, n: 1, mine: r.user_id === myUserId });
    }
    return acc;
  }, []);
  return (
    <div className="reactions">
      {grouped.map((r, i) => (
        <button key={i} onClick={() => onReact(r.e)} className={`rxn-btn ${r.mine ? 'mine' : 'other'}`}>
          {r.e}<span className="rxn-count">{r.n}</span>
        </button>
      ))}
    </div>
  );
}

function EmojiPicker({ onPick, style }) {
  return (
    <div className="emoji-picker" style={style}>
      {EMOJIS.map(e => (
        <button key={e} className="emoji-opt" onClick={() => onPick(e)}>{e}</button>
      ))}
    </div>
  );
}

function MsgRow({ msg, onlineUsers, messages, onThread, onReact, isThread = false, myUserId }) {
  const user = msg.profiles || { username: 'System', color: '#8b99b4' };
  const segments = parseText(msg.content, onlineUsers);
  const replyCount = msg.reply_count ?? messages.filter(m => m.reply_to === msg.id).length;
  const [showEmoji, setShowEmoji] = useState(false);

  // Detect code block
  let codeData = null;
  if (msg.content?.includes('```')) {
    const parts = msg.content.split('```');
    if (parts.length >= 3) {
      const inner = parts[1];
      const firstLine = inner.split('\n')[0].trim();
      const body = inner.split('\n').slice(1).join('\n').trimEnd();
      codeData = { lang: firstLine || 'js', body };
    }
  }
  const displayText = codeData ? msg.content.split('```')[0].trim() : msg.content;

  return (
    <div className="msg-row anim-fadeUp" style={{ position: 'relative' }}>
      <div className="msg-avatar">
        <Av user={user} />
      </div>
      <div className="msg-content">
        <div className="msg-header">
          <span className="msg-name" style={{ color: user.color || '#38bdf8' }}>{user.username}</span>
          <span className="msg-time">{fmtTime(msg.created_at)}</span>
        </div>

        {displayText && (
          <div className="msg-body">
            {segments.map((s, i) => <Seg key={i} s={s} />)}
          </div>
        )}

        {codeData && <CodeBlock code={codeData} />}

        <Reactions reactions={msg.reactions} onReact={e => onReact(msg.id, e)} myUserId={myUserId} />

        {!isThread && replyCount > 0 && (
          <button className="thread-bar" onClick={() => onThread(msg)}>
            <span className="thread-count">{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
            <span className="thread-hint">View thread →</span>
          </button>
        )}
      </div>

      {/* Hover actions */}
      <div className="msg-actions" style={{ position: 'relative' }}>
        <button className="action-btn" title="React" onClick={() => setShowEmoji(v => !v)}>😊</button>
        {!isThread && (
          <>
            <div className="action-btn-sep" />
            <button className="action-btn" title="Reply in thread" onClick={() => onThread(msg)}>💬</button>
          </>
        )}
        {showEmoji && (
          <div style={{ position: 'absolute', right: 0, top: '110%' }}>
            <EmojiPicker
              onPick={e => { onReact(msg.id, e); setShowEmoji(false); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MentionDD({ query, users, selected, onSelect }) {
  const list = users
    .filter(u => u.username?.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6);
  if (!list.length) return null;
  return (
    <div className="mention-dd">
      <div className="mention-header">Mention a teammate</div>
      {list.map((u, i) => (
        <div key={u.id} onClick={() => onSelect(u)}
          className={`mention-row${i === selected ? ' sel' : ''}`}>
          <Av user={u} size={22} r={6} />
          <span style={{ fontWeight: 700, fontSize: 13, color: u.color || 'var(--cyan)' }}>{u.username}</span>
          {i === selected && <span className="mention-kbd">↵</span>}
        </div>
      ))}
    </div>
  );
}

function ThreadPanel({ msg, onlineUsers, messages, onClose, onSend, onReact, myUserId }) {
  const [val, setVal] = useState('');
  const endRef = useRef(null);
  const replies = messages.filter(m => m.reply_to === msg.id);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies.length]);

  const send = () => {
    if (!val.trim()) return;
    onSend(val.trim(), msg.id);
    setVal('');
  };

  return (
    <div className="thread-panel">
      <div className="thread-header">
        <div className="thread-title">
          Thread
          <span className="thread-badge">{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
        </div>
        <button className="thread-close" onClick={onClose} title="Close thread">✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {/* Parent message */}
        <MsgRow
          msg={msg} onlineUsers={onlineUsers} messages={messages}
          onThread={() => {}} onReact={onReact} isThread myUserId={myUserId}
        />
        {replies.length > 0 && <div className="thread-divider" />}
        {replies.map(r => (
          <MsgRow key={r.id} msg={r} onlineUsers={onlineUsers} messages={messages}
            onThread={() => {}} onReact={onReact} isThread myUserId={myUserId} />
        ))}
        <div ref={endRef} />
      </div>

      <div className="thread-input-area">
        <div className="thread-box">
          <textarea
            className="thread-ta"
            rows={2}
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Reply in thread…"
          />
          <div className="thread-foot">
            <span className="thread-hint-text">shift+enter for newline</span>
            <button
              onClick={send}
              disabled={!val.trim()}
              style={{
                background: val.trim() ? 'var(--cyan)' : 'transparent',
                border: '1px solid',
                borderColor: val.trim() ? 'transparent' : 'var(--border2)',
                color: val.trim() ? '#000' : 'var(--text3)',
                padding: '5px 14px',
                borderRadius: 'var(--r10)',
                fontSize: 12,
                fontWeight: 700,
                cursor: val.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
                fontFamily: 'var(--sans)',
              }}
            >
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

  // Auto-scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (authLoading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#060810', color: '#38bdf8',
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 700,
        letterSpacing: '0.2em',
      }}>
        <span style={{ animation: 'pulse 1.5s ease infinite' }}>CONNECTING…</span>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
      </div>
    );
  }
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
    const mentionList = Object.values(onlineUsers)
      .filter(u => u.username?.toLowerCase().includes((mention?.query || '').toLowerCase()));
    if (mention && mentionList.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionSel(s => (s + 1) % mentionList.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionSel(s => (s - 1 + mentionList.length) % mentionList.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(mentionList[mentionSel]); return; }
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
    .filter(([id, isTyping]) => isTyping && id !== user?.id)
    .map(([id]) => onlineUsers[id]?.username || 'Someone');

  const topLevelMsgs = messages.filter(m => !m.reply_to);

  return (
    <>
      <style>{G}</style>
      <div className="app">

        {/* ── SIDEBAR ── */}
        <div className={`sidebar${sideOpen ? '' : ' collapsed'}`}>
          {/* Logo */}
          <div className="logo-row">
            <div className="logo-icon">⚡</div>
            <span className="logo-name">CKC-OS</span>
            <div className="live-pill">
              <div className="blink" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--cyan)', flexShrink: 0 }} />
              LIVE
            </div>
          </div>

          {/* Scrollable nav */}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
            {/* Channels */}
            <div className="nav-section">
              <span className="nav-label">Channels</span>
              {channels.map(ch => (
                <button key={ch.id}
                  onClick={() => setActiveChId(ch.id)}
                  className={`ch-item${activeChId === ch.id ? ' active' : ''}`}
                >
                  <span className="ch-hash">#</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.name}</span>
                </button>
              ))}
            </div>

            {/* Online users */}
            {onlineList.length > 0 && (
              <div className="nav-section" style={{ marginTop: 12 }}>
                <span className="nav-label">Online — {onlineList.length}</span>
                {onlineList.map(u => (
                  <div key={u.id} className="user-item">
                    <Av user={u} size={18} r={5} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12.5, fontWeight: 500, color: u.color || 'var(--text2)' }}>{u.username}</span>
                    <div className="online-dot" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Me row */}
          <div className="me-row">
            <Av user={profile} />
            <div style={{ flex: 1, minWidth: 0, marginLeft: 8 }}>
              <div className="me-name">{profile?.username || 'You'}</div>
              <div className="me-status">
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 5px var(--green)', animation: 'pulse 2s ease infinite' }} />
                ONLINE
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN COLUMN ── */}
        <div className="main">

          {/* TOPBAR */}
          <div className="topbar">
            <button className="menu-btn" onClick={() => setSideOpen(s => !s)} title="Toggle sidebar">
              {sideOpen ? '◀' : '▶'}
            </button>
            <span className="topbar-hash">#</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="topbar-name">{curCh?.name || 'Loading…'}</div>
              {curCh?.description && (
                <div className="topbar-desc">{curCh.description}</div>
              )}
            </div>
            <div className="topbar-divider" />
            <div className="members-pill">
              <div className="members-dot" />
              {onlineList.length} online
            </div>
            <button
              className={`icon-btn${activeThread ? ' active' : ''}`}
              onClick={() => setActiveThread(null)}
              title="Close thread"
              style={{ marginLeft: 4 }}
            >
              💬
            </button>
          </div>

          {/* MESSAGES */}
          <div className="msg-area" ref={msgAreaRef}>
            <div className="day-divider">
              <div className="day-line" />
              <span className="day-label">
                {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
              <div className="day-line" />
            </div>

            {chatLoading && (
              <div className="empty-state">
                <div className="empty-icon shimmer">💬</div>
                <div className="empty-label">Loading messages…</div>
              </div>
            )}

            {!chatLoading && topLevelMsgs.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🚀</div>
                <div className="empty-label">No messages yet<br />Be the first to say something!</div>
              </div>
            )}

            {topLevelMsgs.map(m => (
              <MsgRow
                key={m.id}
                msg={m}
                onlineUsers={onlineUsers}
                messages={messages}
                onThread={setActiveThread}
                onReact={addReaction}
                myUserId={user?.id}
              />
            ))}

            {/* Typing indicator */}
            {typingDisplay.length > 0 && (
              <div className="typing-row anim-fadeIn">
                <div className="typing-dots">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
                <span className="typing-label">
                  {typingDisplay.join(', ')} {typingDisplay.length === 1 ? 'is' : 'are'} typing…
                </span>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* INPUT ZONE */}
          <div className="input-zone">
            <div className="input-wrap">
              {mention && (
                <MentionDD
                  query={mention.query}
                  users={Object.values(onlineUsers)}
                  selected={mentionSel}
                  onSelect={pickMention}
                />
              )}
              <div className="input-box">
                <textarea
                  className="input-ta"
                  ref={textRef}
                  rows={1}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message #${curCh?.name || '…'} — use @ to mention`}
                />
                <div className="input-footer">
                  <button className="tb-btn" title="Attach file">📎</button>
                  <button className="tb-btn" title="Emoji">😊</button>
                  <span className="hint-text" style={{ marginLeft: 8 }}>ENTER to send · SHIFT+ENTER for newline</span>
                  <button
                    className="send-btn"
                    onClick={handleSend}
                    disabled={!input.trim()}
                  >
                    Send ↵
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* STATUS BAR */}
          <div className="statusbar">
            <div className="status-dot" style={{ background: 'var(--green)', boxShadow: '0 0 5px var(--green)' }} />
            Connected
            <span style={{ marginLeft: 4, color: 'var(--text4)' }}>·</span>
            <span>{messages.length} messages</span>
            <span style={{ color: 'var(--text4)' }}>·</span>
            <span>{onlineList.length} online</span>
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