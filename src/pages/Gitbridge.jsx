import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════
// ════════ GIT BRIDGE — Version Control Integration ════
// ═══════════════════════════════════════════════════════

/* ── CSS ── */
const GIT_CSS = `
@keyframes gitSlideIn  { from{opacity:0;transform:translateY(18px) scale(.97)} to{opacity:1;transform:none} }
@keyframes gitFadeIn   { from{opacity:0} to{opacity:1} }
@keyframes gitPulse    { 0%,100%{opacity:1} 50%{opacity:.35} }
@keyframes gitSpin     { to{transform:rotate(360deg)} }
@keyframes diffIn      { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:none} }
@keyframes shimmer     { from{background-position:-200% 0} to{background-position:200% 0} }
@keyframes branchPop   { from{opacity:0;transform:scale(.9) translateY(-4px)} to{opacity:1;transform:none} }

.gb-overlay {
  position:fixed;inset:0;z-index:200;
  background:rgba(6,8,14,.85);backdrop-filter:blur(18px);
  display:flex;align-items:center;justify-content:center;
  padding:1rem;
  animation:gitFadeIn .22s ease both;
}

.gb-panel {
  width:min(1160px,96vw);height:min(820px,92vh);
  background:#0a0c11;
  border:1px solid rgba(255,255,255,.08);
  border-radius:18px;
  box-shadow:0 60px 120px rgba(0,0,0,.8),0 0 0 1px rgba(78,201,176,.06);
  display:flex;flex-direction:column;overflow:hidden;
  animation:gitSlideIn .32s cubic-bezier(.22,1,.36,1) both;
}

/* ─ Header ─ */
.gb-header {
  display:flex;align-items:center;gap:10px;
  padding:.85rem 1.4rem;
  background:rgba(255,255,255,.02);
  border-bottom:1px solid rgba(255,255,255,.06);
  flex-shrink:0;
}
.gb-header-left { display:flex;align-items:center;gap:10px;flex:1;min-width:0; }
.gb-title { font-family:'Syne',sans-serif;font-size:.92rem;font-weight:800;color:#fff; }
.gb-subtitle { font-size:.68rem;color:rgba(255,255,255,.25);font-family:'JetBrains Mono',monospace; }

.gb-repo-badge {
  display:inline-flex;align-items:center;gap:6px;
  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.09);
  border-radius:8px;padding:4px 10px;
  font-family:'JetBrains Mono',monospace;font-size:.68rem;color:rgba(255,255,255,.55);
  cursor:pointer;transition:all .2s;
}
.gb-repo-badge:hover { border-color:rgba(78,201,176,.4);color:var(--teal,#4EC9B0); }

.gb-status-pill {
  display:inline-flex;align-items:center;gap:5px;
  font-size:.62rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
  padding:3px 10px;border-radius:100px;border:1px solid;
  font-family:'JetBrains Mono',monospace;
}
.gb-status-connected { background:rgba(78,201,176,.1);color:#4EC9B0;border-color:rgba(78,201,176,.3); }
.gb-status-offline   { background:rgba(255,107,157,.08);color:#FF6B9D;border-color:rgba(255,107,157,.25); }

/* ─ Body layout ─ */
.gb-body {
  display:grid;grid-template-columns:260px 1fr;
  flex:1;overflow:hidden;
}
.gb-sidebar {
  border-right:1px solid rgba(255,255,255,.05);
  display:flex;flex-direction:column;overflow:hidden;
  background:rgba(255,255,255,.012);
}
.gb-main { display:flex;flex-direction:column;overflow:hidden; }

/* ─ Tabs ─ */
.gb-tabs {
  display:flex;gap:2px;padding:.6rem .8rem .4rem;
  border-bottom:1px solid rgba(255,255,255,.05);flex-shrink:0;
}
.gb-tab {
  font-size:.66rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  padding:4px 10px;border-radius:6px;border:none;cursor:pointer;
  transition:all .18s;background:transparent;
  font-family:'JetBrains Mono',monospace;
}
.gb-tab.active { background:rgba(78,201,176,.14);color:#4EC9B0; }
.gb-tab:not(.active) { color:rgba(255,255,255,.28); }
.gb-tab:not(.active):hover { color:rgba(255,255,255,.55);background:rgba(255,255,255,.04); }

/* ─ Section labels ─ */
.gb-sec-label {
  font-size:.6rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
  color:rgba(255,255,255,.2);padding:.75rem 1rem .45rem;
  font-family:'JetBrains Mono',monospace;
}

/* ─ Branch item ─ */
.gb-branch-item {
  display:flex;align-items:center;gap:8px;
  padding:.52rem 1rem;cursor:pointer;
  transition:background .15s;border-left:2px solid transparent;
  font-size:.77rem;
}
.gb-branch-item:hover { background:rgba(255,255,255,.04); }
.gb-branch-item.active { background:rgba(78,201,176,.06);border-left-color:#4EC9B0; }
.gb-branch-dot { width:7px;height:7px;border-radius:50%;flex-shrink:0; }
.gb-branch-name { flex:1;font-family:'JetBrains Mono',monospace;font-size:.72rem;color:#e0e6ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.gb-branch-name.dim { color:rgba(255,255,255,.38); }
.gb-branch-ahead { font-size:.58rem;background:rgba(79,193,255,.1);color:#4FC1FF;border:1px solid rgba(79,193,255,.25);border-radius:100px;padding:1px 7px;font-family:'JetBrains Mono',monospace; }

/* ─ Commit item ─ */
.gb-commit-item {
  padding:.65rem 1rem;cursor:pointer;
  border-bottom:1px solid rgba(255,255,255,.03);
  transition:background .15s;
}
.gb-commit-item:hover { background:rgba(255,255,255,.035); }
.gb-commit-item.selected { background:rgba(78,201,176,.05); }
.gb-commit-sha { font-family:'JetBrains Mono',monospace;font-size:.62rem;color:#4EC9B0; }
.gb-commit-msg { font-size:.75rem;color:#e0e6ff;margin:.2rem 0 .18rem;line-height:1.4;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.gb-commit-meta { font-size:.63rem;color:rgba(255,255,255,.28);display:flex;gap:8px;align-items:center; }
.gb-commit-avatar {
  width:18px;height:18px;border-radius:50%;
  display:inline-flex;align-items:center;justify-content:center;
  font-size:.5rem;font-weight:700;flex-shrink:0;
}

/* ─ Diff area ─ */
.gb-diff-header {
  display:flex;align-items:center;gap:10px;
  padding:.75rem 1.2rem;
  border-bottom:1px solid rgba(255,255,255,.05);
  flex-shrink:0;background:rgba(255,255,255,.015);
}
.gb-diff-filename {
  font-family:'JetBrains Mono',monospace;font-size:.75rem;color:#e0e6ff;flex:1;
}
.gb-diff-stat { display:flex;gap:6px;align-items:center; }
.gb-diff-add { font-size:.7rem;color:#4EC9B0;font-family:'JetBrains Mono',monospace;font-weight:700; }
.gb-diff-del { font-size:.7rem;color:#FF6B9D;font-family:'JetBrains Mono',monospace;font-weight:700; }

.gb-diff-scroll { flex:1;overflow-y:auto;font-family:'JetBrains Mono',monospace;font-size:.72rem;line-height:1.7; }
.gb-diff-line { display:flex;align-items:flex-start;padding:0 1.2rem;min-height:22px; }
.gb-diff-line:hover { background:rgba(255,255,255,.03); }
.gb-diff-ln { width:36px;color:rgba(255,255,255,.15);flex-shrink:0;user-select:none;padding-right:8px;text-align:right; }
.gb-diff-gutter { width:16px;text-align:center;flex-shrink:0;color:rgba(255,255,255,.2); }
.gb-diff-code { flex:1;white-space:pre-wrap;word-break:break-all; }
.gb-diff-line.add  { background:rgba(78,201,176,.07); }
.gb-diff-line.add  .gb-diff-code { color:#4EC9B0; }
.gb-diff-line.add  .gb-diff-gutter { color:#4EC9B0; }
.gb-diff-line.del  { background:rgba(255,107,157,.07); }
.gb-diff-line.del  .gb-diff-code { color:#FF6B9D;text-decoration:line-through;opacity:.7; }
.gb-diff-line.del  .gb-diff-gutter { color:#FF6B9D; }
.gb-diff-line.ctx  .gb-diff-code { color:rgba(255,255,255,.42); }
.gb-diff-line.hunk { background:rgba(79,193,255,.05); }
.gb-diff-line.hunk .gb-diff-code { color:rgba(79,193,255,.6);font-style:italic; }

/* ─ File tree ─ */
.gb-file-item {
  display:flex;align-items:center;gap:7px;
  padding:.42rem 1rem;cursor:pointer;font-size:.74rem;
  transition:background .14s;
}
.gb-file-item:hover { background:rgba(255,255,255,.04); }
.gb-file-item.selected { background:rgba(78,201,176,.07); }
.gb-file-status { width:14px;height:14px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:.55rem;font-weight:800;flex-shrink:0; }
.gb-fs-M { background:rgba(220,220,170,.15);color:#DCDCAA; }
.gb-fs-A { background:rgba(78,201,176,.15);color:#4EC9B0; }
.gb-fs-D { background:rgba(255,107,157,.13);color:#FF6B9D; }
.gb-fs-R { background:rgba(79,193,255,.12);color:#4FC1FF; }
.gb-file-name { font-family:'JetBrains Mono',monospace;color:#e0e6ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.gb-file-path { font-size:.6rem;color:rgba(255,255,255,.25);font-family:'JetBrains Mono',monospace; }

/* ─ AI commit panel ─ */
.gb-ai-panel {
  border-top:1px solid rgba(255,255,255,.06);
  padding:1rem 1.2rem;flex-shrink:0;
  background:rgba(255,255,255,.012);
}
.gb-ai-label {
  display:flex;align-items:center;gap:7px;
  font-size:.65rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  color:rgba(167,139,250,.7);font-family:'JetBrains Mono',monospace;margin-bottom:.65rem;
}
.gb-ai-textarea {
  width:100%;background:rgba(255,255,255,.035);
  border:1px solid rgba(255,255,255,.08);border-radius:8px;
  padding:.6rem .85rem;font-size:.78rem;color:#e0e6ff;
  font-family:'JetBrains Mono',monospace;outline:none;resize:none;
  transition:border-color .2s;line-height:1.6;
}
.gb-ai-textarea:focus { border-color:rgba(167,139,250,.45);box-shadow:0 0 0 3px rgba(167,139,250,.07); }
.gb-ai-actions { display:flex;gap:.5rem;margin-top:.55rem;align-items:center; }

.gb-btn {
  display:inline-flex;align-items:center;gap:6px;
  border-radius:7px;border:1px solid;cursor:pointer;
  font-family:'JetBrains Mono',monospace;font-size:.7rem;font-weight:700;
  padding:5px 14px;transition:all .18s;white-space:nowrap;
}
.gb-btn-violet { background:rgba(167,139,250,.1);color:#A78BFA;border-color:rgba(167,139,250,.3); }
.gb-btn-violet:hover { background:rgba(167,139,250,.2);border-color:rgba(167,139,250,.55); }
.gb-btn-teal   { background:rgba(78,201,176,.1);color:#4EC9B0;border-color:rgba(78,201,176,.3); }
.gb-btn-teal:hover   { background:rgba(78,201,176,.2);border-color:rgba(78,201,176,.55); }
.gb-btn-ghost  { background:transparent;color:rgba(255,255,255,.35);border-color:rgba(255,255,255,.1); }
.gb-btn-ghost:hover  { color:rgba(255,255,255,.65);border-color:rgba(255,255,255,.22); }
.gb-btn-rose   { background:rgba(255,107,157,.09);color:#FF6B9D;border-color:rgba(255,107,157,.28); }
.gb-btn-rose:hover   { background:rgba(255,107,157,.18);border-color:rgba(255,107,157,.5); }
.gb-btn-blue   { background:rgba(79,193,255,.1);color:#4FC1FF;border-color:rgba(79,193,255,.3); }
.gb-btn-blue:hover   { background:rgba(79,193,255,.2);border-color:rgba(79,193,255,.5); }
.gb-btn:disabled { opacity:.35;cursor:not-allowed; }

/* ─ Activity feed (right panel) ─ */
.gb-activity-item {
  display:flex;gap:10px;padding:.7rem 1.2rem;
  border-bottom:1px solid rgba(255,255,255,.03);
  animation:diffIn .2s ease both;
}
.gb-activity-icon { width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:.85rem;flex-shrink:0;margin-top:1px; }
.gb-activity-body { flex:1;min-width:0; }
.gb-activity-title { font-size:.76rem;color:#e0e6ff;line-height:1.4; }
.gb-activity-meta  { font-size:.63rem;color:rgba(255,255,255,.3);margin-top:.15rem;font-family:'JetBrains Mono',monospace; }

/* ─ PR / Merge request card ─ */
.gb-pr-card {
  margin:.55rem 1rem;padding:.85rem 1rem;
  background:rgba(255,255,255,.025);
  border:1px solid rgba(255,255,255,.07);
  border-radius:10px;cursor:pointer;transition:all .18s;
}
.gb-pr-card:hover { background:rgba(255,255,255,.042);border-color:rgba(79,193,255,.25); }
.gb-pr-card.open   { border-left:2px solid #4EC9B0; }
.gb-pr-card.merged { border-left:2px solid #A78BFA; }
.gb-pr-card.closed { border-left:2px solid rgba(255,107,157,.5); }

/* ─ Stats bar ─ */
.gb-stats-bar {
  display:flex;gap:1rem;padding:.65rem 1.2rem;
  border-bottom:1px solid rgba(255,255,255,.05);
  flex-shrink:0;background:rgba(255,255,255,.01);
  flex-wrap:wrap;
}
.gb-stat-chip {
  display:flex;align-items:center;gap:5px;
  font-family:'JetBrains Mono',monospace;font-size:.66rem;
  color:rgba(255,255,255,.35);
}
.gb-stat-chip strong { font-weight:700; }

/* ─ AI thinking shimmer ─ */
.gb-ai-shimmer {
  background: linear-gradient(90deg,rgba(167,139,250,.04) 25%,rgba(167,139,250,.14) 50%,rgba(167,139,250,.04) 75%);
  background-size:200% 100%;
  animation:shimmer 1.4s infinite;
  border-radius:6px;height:1.5rem;
}

/* ─ Empty state ─ */
.gb-empty { display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:.7rem;padding:3rem; }
.gb-empty-icon { font-size:2.5rem;opacity:.25; }
.gb-empty-txt { font-size:.82rem;color:rgba(255,255,255,.25);text-align:center;line-height:1.7;font-family:'JetBrains Mono',monospace; }

/* ─ Connect repo modal ─ */
.gb-connect-overlay {
  position:absolute;inset:0;z-index:10;
  background:rgba(6,8,14,.92);backdrop-filter:blur(12px);
  display:flex;align-items:center;justify-content:center;
  border-radius:18px;animation:gitFadeIn .18s ease both;
}
.gb-connect-card {
  width:440px;background:#0d1017;
  border:1px solid rgba(255,255,255,.1);border-radius:14px;
  padding:2rem;box-shadow:0 30px 60px rgba(0,0,0,.6);
  animation:gitSlideIn .28s cubic-bezier(.22,1,.36,1) both;
}

/* ─ Scrollbar ─ */
.gb-sidebar ::-webkit-scrollbar,
.gb-diff-scroll::-webkit-scrollbar,
.gb-main ::-webkit-scrollbar { width:3px; }
.gb-sidebar ::-webkit-scrollbar-thumb,
.gb-diff-scroll::-webkit-scrollbar-thumb,
.gb-main ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.07);border-radius:2px; }

/* ─ Tooltip ─ */
.gb-tooltip { position:relative; }
.gb-tooltip-text {
  display:none;position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);
  background:#1a1f2e;border:1px solid rgba(255,255,255,.1);border-radius:6px;
  padding:4px 10px;font-size:.62rem;color:#e0e6ff;white-space:nowrap;
  font-family:'JetBrains Mono',monospace;pointer-events:none;z-index:20;
}
.gb-tooltip:hover .gb-tooltip-text { display:block; }

/* ─ Notification toast ─ */
.gb-toast {
  position:absolute;top:1rem;right:1rem;z-index:50;
  background:#111827;border:1px solid rgba(255,255,255,.12);
  border-radius:10px;padding:.65rem 1rem;
  display:flex;align-items:center;gap:.55rem;
  font-size:.75rem;color:#e0e6ff;
  box-shadow:0 8px 24px rgba(0,0,0,.5);
  animation:gitSlideIn .25s cubic-bezier(.22,1,.36,1) both;
  min-width:240px;max-width:340px;
}
`;

// ─── Mock data ──────────────────────────────────────────────

const MOCK_BRANCHES = [
  { name: "main",           sha: "a3f9e2c", ahead: 0,  behind: 0, isDefault: true,  isRemote: false },
  { name: "feat/git-bridge",sha: "b8d71fa", ahead: 4,  behind: 1, isDefault: false, isRemote: false },
  { name: "fix/diff-parser",sha: "c2e14bb", ahead: 1,  behind: 0, isDefault: false, isRemote: false },
  { name: "origin/main",    sha: "a3f9e2c", ahead: 0,  behind: 0, isDefault: true,  isRemote: true  },
  { name: "origin/develop", sha: "9c3f02d", ahead: 7,  behind: 3, isDefault: false, isRemote: true  },
];

const MOCK_COMMITS = [
  { sha:"b8d71fa", msg:"feat: add real-time diff streaming over WebSockets", author:"Aria K.", avatar:"AK", color:"#FF6B9D", bg:"rgba(255,107,157,.18)", time:"2m ago",   adds:182, dels:14 },
  { sha:"c2e14bb", msg:"fix: resolve diff parser edge case on empty hunks",   author:"Dev M.",  avatar:"DM", color:"#4EC9B0", bg:"rgba(78,201,176,.18)",  time:"17m ago",  adds:23,  dels:8  },
  { sha:"9a3d05e", msg:"refactor: extract GitBridgeEngine into separate module",author:"Sam T.", avatar:"ST", color:"#DCDCAA", bg:"rgba(220,220,170,.18)", time:"1h ago",   adds:95,  dels:67 },
  { sha:"f12cc3b", msg:"chore: update simple-git to v3.22",                   author:"You",     avatar:"Y",  color:"#4FC1FF", bg:"rgba(79,193,255,.18)",  time:"3h ago",   adds:4,   dels:4  },
  { sha:"e01bc47", msg:"feat: implement AI commit message generation",         author:"Aria K.", avatar:"AK", color:"#FF6B9D", bg:"rgba(255,107,157,.18)", time:"5h ago",   adds:137, dels:22 },
  { sha:"d7e8290", msg:"docs: update README with Git Bridge usage guide",      author:"Dev M.",  avatar:"DM", color:"#4EC9B0", bg:"rgba(78,201,176,.18)",  time:"1d ago",   adds:48,  dels:12 },
  { sha:"a3f9e2c", msg:"init: scaffold CKC-OS repository structure",           author:"You",     avatar:"Y",  color:"#4FC1FF", bg:"rgba(79,193,255,.18)",  time:"2d ago",   adds:312, dels:0  },
];

const MOCK_FILES = [
  { status:"M", path:"src/",   name:"GitBridge.jsx",        adds:182, dels:14  },
  { status:"M", path:"src/",   name:"editor.jsx",           adds:34,  dels:8   },
  { status:"A", path:"src/",   name:"GitBridgeEngine.js",   adds:95,  dels:0   },
  { status:"M", path:"src/",   name:"index.jsx",            adds:23,  dels:6   },
  { status:"D", path:"utils/", name:"legacyDiff.js",        adds:0,   dels:47  },
  { status:"R", path:"src/",   name:"api.jsx → apiClient.jsx", adds:12, dels:12 },
];

const MOCK_DIFF = [
  { type:"hunk", ln1:null, ln2:null, code:"@@ -14,6 +14,18 @@ import { useState } from 'react';" },
  { type:"ctx",  ln1:14,  ln2:14,  code:" // ─── GitBridgeEngine ──────────────────────────────" },
  { type:"ctx",  ln1:15,  ln2:15,  code:" import { simpleGit } from 'simple-git';" },
  { type:"del",  ln1:16,  ln2:null, code:"-const git = simpleGit();" },
  { type:"add",  ln1:null, ln2:16, code:"+const git = simpleGit({ baseDir: process.cwd() });" },
  { type:"add",  ln1:null, ln2:17, code:"+const ws  = new WebSocketServer({ port: 9001 });" },
  { type:"ctx",  ln1:17,  ln2:18,  code:"" },
  { type:"del",  ln1:18,  ln2:null, code:"-export async function getDiff() {" },
  { type:"del",  ln1:19,  ln2:null, code:"-  return await git.diff();" },
  { type:"add",  ln1:null, ln2:19, code:"+export async function streamDiff(sessionId) {" },
  { type:"add",  ln1:null, ln2:20, code:"+  const diff = await git.diff(['--stat', 'HEAD']);" },
  { type:"add",  ln1:null, ln2:21, code:"+  ws.clients.forEach(c => {" },
  { type:"add",  ln1:null, ln2:22, code:"+    if (c.sessionId === sessionId) c.send(JSON.stringify({ diff }));" },
  { type:"add",  ln1:null, ln2:23, code:"+  });" },
  { type:"ctx",  ln1:20,  ln2:24,  code:"  return diff;" },
  { type:"ctx",  ln1:21,  ln2:25,  code:"}" },
  { type:"hunk", ln1:null, ln2:null, code:"@@ -34,4 +38,12 @@ export async function streamDiff(sessionId) {" },
  { type:"ctx",  ln1:34,  ln2:38,  code:" // AI commit message generation" },
  { type:"del",  ln1:35,  ln2:null, code:"-// TODO: implement AI suggestions" },
  { type:"add",  ln1:null, ln2:39, code:"+export async function generateCommitMessage(diff) {" },
  { type:"add",  ln1:null, ln2:40, code:"+  const summary = await analyzeWithClaude(diff);" },
  { type:"add",  ln1:null, ln2:41, code:"+  return summary.conventionalCommit;" },
  { type:"add",  ln1:null, ln2:42, code:"+}" },
];

const MOCK_PRS = [
  { id:12, title:"feat: Git Bridge — real-time diff streaming", status:"open",   author:"Aria K.", color:"#FF6B9D", reviews:2, comments:5, branch:"feat/git-bridge" },
  { id:11, title:"fix: diff parser edge case on empty hunks",   status:"open",   author:"Dev M.",  color:"#4EC9B0", reviews:1, comments:2, branch:"fix/diff-parser" },
  { id:10, title:"refactor: extract GitBridgeEngine module",    status:"merged", author:"Sam T.",  color:"#DCDCAA", reviews:3, comments:8, branch:"refactor/engine" },
];

const MOCK_ACTIVITY = [
  { icon:"🔀", bg:"rgba(167,139,250,.12)", title:"PR #12 opened — feat: Git Bridge streaming", meta:"Aria K. · 2m ago" },
  { icon:"✅", bg:"rgba(78,201,176,.1)",   title:"Commit b8d71fa pushed to feat/git-bridge",    meta:"Aria K. · 2m ago" },
  { icon:"💬", bg:"rgba(79,193,255,.1)",   title:"Inline comment on GitBridge.jsx line 23",     meta:"Dev M. · 8m ago" },
  { icon:"🔍", bg:"rgba(220,220,170,.1)",  title:"Code review requested on PR #12",             meta:"Sam T. · 14m ago" },
  { icon:"⬆️", bg:"rgba(79,193,255,.08)",  title:"Branch feat/git-bridge pushed (4 commits)",   meta:"You · 17m ago" },
  { icon:"🏷️", bg:"rgba(255,107,157,.09)", title:"Tag v1.4.0 created on main",                  meta:"Dev M. · 3h ago" },
];

const AI_SUGGESTIONS = [
  "feat(git-bridge): add real-time diff streaming over WebSockets",
  "feat(editor): integrate version control panel with live diffs",
  "refactor(git): extract bridge engine and improve session handling",
];

// ─── Helpers ────────────────────────────────────────────────

function BranchIcon({ color = "#4EC9B0" }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="3" cy="3" r="1.8" stroke={color} strokeWidth="1.4"/>
      <circle cx="10" cy="10" r="1.8" stroke={color} strokeWidth="1.4"/>
      <circle cx="10" cy="3" r="1.8" stroke={color} strokeWidth="1.4"/>
      <path d="M3 4.8V9a1 1 0 001 1h4.2M10 4.8V5" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function StatusDot({ live }) {
  return (
    <span style={{
      width:6, height:6, borderRadius:"50%", display:"inline-block",
      background: live ? "#4EC9B0" : "#4a5568",
      boxShadow: live ? "0 0 7px #4EC9B0" : "none",
      animation: live ? "gitPulse 2s infinite" : "none",
      flexShrink:0,
    }}/>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function DiffView({ file, diff }) {
  let addCount = 0, delCount = 0;
  diff.forEach(l => { if (l.type === "add") addCount++; if (l.type === "del") delCount++; });
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div className="gb-diff-header">
        <div style={{ width:22, height:22, borderRadius:5, display:"flex", alignItems:"center", justifyContent:"center", fontSize:".7rem", fontWeight:800,
          background: file.status === "M" ? "rgba(220,220,170,.15)" : file.status === "A" ? "rgba(78,201,176,.15)" : "rgba(255,107,157,.13)",
          color: file.status === "M" ? "#DCDCAA" : file.status === "A" ? "#4EC9B0" : "#FF6B9D",
        }}>{file.status}</div>
        <span className="gb-diff-filename">{file.path}{file.name}</span>
        <div className="gb-diff-stat">
          <span className="gb-diff-add">+{addCount}</span>
          <span className="gb-diff-del">−{delCount}</span>
        </div>
      </div>
      <div className="gb-diff-scroll">
        {diff.map((line, i) => (
          <div key={i} className={`gb-diff-line ${line.type}`} style={{ animationDelay:`${i*0.008}s` }}>
            <span className="gb-diff-ln">
              {line.type !== "hunk" ? (line.type === "add" ? line.ln2 : line.type === "del" ? line.ln1 : line.ln1) : ""}
            </span>
            <span className="gb-diff-gutter">
              {line.type === "add" ? "+" : line.type === "del" ? "−" : line.type === "hunk" ? "⋯" : " "}
            </span>
            <span className="gb-diff-code">{line.code}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommitHistory({ commits, selectedSha, onSelect }) {
  return (
    <div style={{ overflowY:"auto", flex:1 }}>
      <div className="gb-sec-label">Commit History</div>
      {commits.map(c => (
        <div key={c.sha} className={`gb-commit-item${selectedSha === c.sha ? " selected" : ""}`} onClick={() => onSelect(c)}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span className="gb-commit-sha">{c.sha.slice(0,7)}</span>
            <span style={{ fontSize:".58rem", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:100, padding:"1px 6px", color:"rgba(255,255,255,.28)", fontFamily:"'JetBrains Mono',monospace" }}>
              +{c.adds} −{c.dels}
            </span>
          </div>
          <div className="gb-commit-msg">{c.msg}</div>
          <div className="gb-commit-meta">
            <span className="gb-commit-avatar" style={{ background:c.bg, color:c.color }}>{c.avatar}</span>
            {c.author}
            <span style={{ marginLeft:"auto" }}>{c.time}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PRList({ prs }) {
  return (
    <div style={{ overflowY:"auto", flex:1 }}>
      <div className="gb-sec-label">Pull Requests</div>
      {prs.map(pr => (
        <div key={pr.id} className={`gb-pr-card ${pr.status}`}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:".3rem" }}>
                <span style={{ fontSize:".62rem", fontFamily:"'JetBrains Mono',monospace",
                  color: pr.status === "open" ? "#4EC9B0" : pr.status === "merged" ? "#A78BFA" : "#FF6B9D",
                  background: pr.status === "open" ? "rgba(78,201,176,.1)" : pr.status === "merged" ? "rgba(167,139,250,.1)" : "rgba(255,107,157,.08)",
                  border: `1px solid ${pr.status === "open" ? "rgba(78,201,176,.28)" : pr.status === "merged" ? "rgba(167,139,250,.28)" : "rgba(255,107,157,.22)"}`,
                  borderRadius:100, padding:"1px 8px", fontWeight:700,
                }}>
                  {pr.status === "open" ? "● OPEN" : pr.status === "merged" ? "⬡ MERGED" : "✕ CLOSED"}
                </span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:".62rem", color:"rgba(255,255,255,.28)" }}>#{pr.id}</span>
              </div>
              <div style={{ fontSize:".78rem", color:"#e0e6ff", lineHeight:1.4 }}>{pr.title}</div>
              <div style={{ fontSize:".63rem", color:"rgba(255,255,255,.3)", marginTop:".3rem", fontFamily:"'JetBrains Mono',monospace" }}>
                <span style={{ color:pr.color }}>{pr.author}</span>
                {" · "}{pr.branch}
                {" · "}💬 {pr.comments}
                {" · "}👁 {pr.reviews}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── AI Commit Panel ─────────────────────────────────────────

function AICommitPanel({ onCommit }) {
  const [msg, setMsg] = useState("");
  const [thinking, setThinking] = useState(false);
  const [suggIdx, setSuggIdx] = useState(0);

  const generateAI = () => {
    setThinking(true);
    setMsg("");
    let i = 0;
    const target = AI_SUGGESTIONS[suggIdx % AI_SUGGESTIONS.length];
    const iv = setInterval(() => {
      setMsg(target.slice(0, i + 1));
      i++;
      if (i >= target.length) { clearInterval(iv); setThinking(false); setSuggIdx(s => s + 1); }
    }, 28);
  };

  return (
    <div className="gb-ai-panel">
      <div className="gb-ai-label">
        <span style={{ width:18, height:18, borderRadius:5, background:"rgba(167,139,250,.18)", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:".7rem" }}>✨</span>
        AI Commit Message
        <span style={{ marginLeft:"auto", fontSize:".58rem", color:"rgba(167,139,250,.45)" }}>Powered by CKC-AI Engine</span>
      </div>
      {thinking ? (
        <div style={{ position:"relative", borderRadius:8, overflow:"hidden", marginBottom:".55rem" }}>
          <div className="gb-ai-shimmer" style={{ height:"2.8rem" }}/>
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", paddingLeft:".85rem", gap:7 }}>
            <div style={{ width:14, height:14, borderRadius:"50%", border:"2px solid rgba(167,139,250,.3)", borderTopColor:"#A78BFA", animation:"gitSpin .7s linear infinite" }}/>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:".7rem", color:"rgba(167,139,250,.6)" }}>Analyzing diff…</span>
          </div>
        </div>
      ) : (
        <textarea
          className="gb-ai-textarea"
          rows={2}
          placeholder="Type a commit message or generate one with AI…"
          value={msg}
          onChange={e => setMsg(e.target.value)}
        />
      )}
      <div className="gb-ai-actions">
        <button className="gb-btn gb-btn-violet" onClick={generateAI} disabled={thinking}>
          ✨ Generate
        </button>
        <button className="gb-btn gb-btn-teal" disabled={!msg.trim() || thinking} onClick={() => { if (msg.trim()) { onCommit(msg); setMsg(""); } }}>
          ⬆ Commit & Push
        </button>
        <button className="gb-btn gb-btn-ghost" disabled={!msg.trim()} onClick={() => setMsg("")}>
          Clear
        </button>
        <span style={{ marginLeft:"auto", fontFamily:"'JetBrains Mono',monospace", fontSize:".62rem", color:"rgba(255,255,255,.22)" }}>
          {msg.length}/72 chars
        </span>
      </div>
    </div>
  );
}

// ─── Connect Repo Modal ──────────────────────────────────────

function ConnectModal({ onConnect, onClose }) {
  const [provider, setProvider] = useState("github");
  const [repo, setRepo] = useState("");
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [step, setStep] = useState("");

  const connect = () => {
    if (!repo.trim()) return;
    setConnecting(true);
    const steps = ["Validating credentials…", "Fetching repository…", "Loading branches…", "Syncing commit history…", "Connected!"];
    let i = 0;
    const iv = setInterval(() => {
      setStep(steps[i++]);
      if (i >= steps.length) { clearInterval(iv); setTimeout(() => onConnect(repo.trim()), 300); }
    }, 550);
  };

  return (
    <div className="gb-connect-overlay" onClick={onClose}>
      <div className="gb-connect-card" onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:"1.4rem" }}>
          <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#4EC9B0,#4FC1FF)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>🔗</div>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, color:"#fff", fontSize:"1rem" }}>Connect Repository</div>
            <div style={{ fontSize:".65rem", color:"rgba(255,255,255,.25)", fontFamily:"'JetBrains Mono',monospace" }}>GitHub / GitLab integration</div>
          </div>
        </div>

        {/* Provider toggle */}
        <div style={{ display:"flex", gap:".4rem", marginBottom:"1.1rem" }}>
          {["github","gitlab"].map(p => (
            <button key={p} onClick={() => setProvider(p)} style={{
              flex:1, padding:"7px 0", borderRadius:7, border:"1px solid",
              background: provider === p ? "rgba(78,201,176,.1)" : "transparent",
              borderColor: provider === p ? "rgba(78,201,176,.35)" : "rgba(255,255,255,.08)",
              color: provider === p ? "#4EC9B0" : "rgba(255,255,255,.3)",
              fontFamily:"'JetBrains Mono',monospace", fontSize:".72rem", fontWeight:700, cursor:"pointer", transition:"all .15s",
            }}>
              {p === "github" ? "🐙 GitHub" : "🦊 GitLab"}
            </button>
          ))}
        </div>

        <div style={{ marginBottom:".8rem" }}>
          <label style={{ display:"block", fontSize:".6rem", fontWeight:700, color:"rgba(255,255,255,.28)", letterSpacing:".1em", textTransform:"uppercase", fontFamily:"'JetBrains Mono',monospace", marginBottom:".35rem" }}>Repository URL</label>
          <input
            style={{ width:"100%", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.09)", borderRadius:7, padding:".55rem .8rem", fontSize:".8rem", color:"#e0e6ff", fontFamily:"'JetBrains Mono',monospace", outline:"none" }}
            placeholder="github.com/user/repo"
            value={repo}
            onChange={e => setRepo(e.target.value)}
            onKeyDown={e => e.key === "Enter" && repo.trim() && connect()}
          />
        </div>
        <div style={{ marginBottom:"1.1rem" }}>
          <label style={{ display:"block", fontSize:".6rem", fontWeight:700, color:"rgba(255,255,255,.28)", letterSpacing:".1em", textTransform:"uppercase", fontFamily:"'JetBrains Mono',monospace", marginBottom:".35rem" }}>Personal Access Token</label>
          <input
            type="password"
            style={{ width:"100%", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.09)", borderRadius:7, padding:".55rem .8rem", fontSize:".8rem", color:"#e0e6ff", fontFamily:"'JetBrains Mono',monospace", outline:"none" }}
            placeholder="ghp_••••••••••••••••••••"
            value={token}
            onChange={e => setToken(e.target.value)}
          />
          <div style={{ fontSize:".6rem", color:"rgba(255,255,255,.2)", marginTop:".35rem", fontFamily:"'JetBrains Mono',monospace" }}>
            Requires repo, read:user scopes. Token never stored.
          </div>
        </div>

        {connecting ? (
          <div style={{ display:"flex", alignItems:"center", gap:9, padding:".8rem", background:"rgba(78,201,176,.06)", borderRadius:8, border:"1px solid rgba(78,201,176,.18)" }}>
            <div style={{ width:16, height:16, borderRadius:"50%", border:"2px solid rgba(78,201,176,.2)", borderTopColor:"#4EC9B0", animation:"gitSpin .7s linear infinite" }}/>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:".72rem", color:"#4EC9B0" }}>{step}</span>
          </div>
        ) : (
          <div style={{ display:"flex", gap:".5rem" }}>
            <button className="gb-btn gb-btn-teal" style={{ flex:1, justifyContent:"center", padding:"8px 0" }} onClick={connect} disabled={!repo.trim()}>
              🔗 Connect Repository
            </button>
            <button className="gb-btn gb-btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function GitBridge({ onClose }) {
  const [connected, setConnected] = useState(false);
  const [repoName, setRepoName]   = useState("");
  const [showConnect, setShowConnect] = useState(false);
  const [currentBranch, setCurrentBranch] = useState("feat/git-bridge");
  const [selectedCommit, setSelectedCommit] = useState(MOCK_COMMITS[0]);
  const [selectedFile,   setSelectedFile]   = useState(MOCK_FILES[0]);
  const [mainTab, setMainTab]   = useState("diff");    // diff | history | prs | activity
  const [sideTab, setSideTab]   = useState("files");   // files | branches
  const [toast, setToast]       = useState(null);
  const [liveActivity, setLiveActivity] = useState(MOCK_ACTIVITY);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, color = "#4EC9B0") => {
    setToast({ msg, color });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  /* Simulate live activity trickle */
  useEffect(() => {
    if (!connected) return;
    const LIVE = [
      { icon:"🔄", bg:"rgba(79,193,255,.1)",   title:"Remote sync: origin/main updated (2 commits behind)", meta:"Auto-fetch · just now" },
      { icon:"💡", bg:"rgba(167,139,250,.1)",   title:"AI suggested commit: 'refactor: clean up diff utilities'", meta:"CKC-AI · just now" },
      { icon:"✅", bg:"rgba(78,201,176,.1)",    title:"CI check passed on feat/git-bridge",                       meta:"GitHub Actions · 1m ago" },
      { icon:"🔀", bg:"rgba(220,220,170,.12)",  title:"Merge conflict detected in editor.jsx — 3 hunks",          meta:"CRDT/OT · 2m ago" },
    ];
    let idx = 0;
    const iv = setInterval(() => {
      setLiveActivity(prev => [LIVE[idx % LIVE.length], ...prev].slice(0, 14));
      idx++;
    }, 8000);
    return () => clearInterval(iv);
  }, [connected]);

  const handleConnect = (repo) => {
    setRepoName(repo);
    setConnected(true);
    setShowConnect(false);
    showToast(`Connected to ${repo} ✓`);
  };

  const handleCommit = (msg) => {
    showToast(`Pushed: "${msg.slice(0,44)}…"`, "#A78BFA");
  };

  const totalAdds = MOCK_FILES.reduce((s, f) => s + f.adds, 0);
  const totalDels = MOCK_FILES.reduce((s, f) => s + f.dels, 0);

  return (
    <>
      <style>{GIT_CSS}</style>
      <div className="gb-overlay" onClick={onClose}>
        <div className="gb-panel" onClick={e => e.stopPropagation()} style={{ position:"relative" }}>

          {/* Toast */}
          {toast && (
            <div className="gb-toast">
              <span style={{ width:8, height:8, borderRadius:"50%", background:toast.color, boxShadow:`0 0 7px ${toast.color}`, flexShrink:0 }}/>
              <span>{toast.msg}</span>
              <button onClick={() => setToast(null)} style={{ marginLeft:"auto", background:"none", border:"none", color:"rgba(255,255,255,.3)", cursor:"pointer", fontSize:".75rem" }}>✕</button>
            </div>
          )}

          {/* Connect Modal */}
          {showConnect && <ConnectModal onConnect={handleConnect} onClose={() => setShowConnect(false)}/>}

          {/* ─ HEADER ─ */}
          <div className="gb-header">
            <div className="gb-header-left">
              <div style={{ width:30, height:30, borderRadius:8, background:"linear-gradient(135deg,#4EC9B0,#4FC1FF)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, boxShadow:"0 4px 14px rgba(78,201,176,.32)", flexShrink:0 }}>
                🔀
              </div>
              <div>
                <div className="gb-title">Git Bridge</div>
                <div className="gb-subtitle">Version Control Integration · GitHub / GitLab</div>
              </div>

              {/* Repo badge */}
              {connected ? (
                <div className="gb-repo-badge" onClick={() => setShowConnect(true)}>
                  🐙 {repoName}
                </div>
              ) : (
                <button className="gb-btn gb-btn-teal" style={{ fontSize:".68rem", padding:"4px 12px" }} onClick={() => setShowConnect(true)}>
                  🔗 Connect Repo
                </button>
              )}

              {/* Branch selector */}
              {connected && (
                <div style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:8, padding:"4px 10px", cursor:"pointer" }}>
                  <BranchIcon color="#4EC9B0"/>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:".7rem", color:"#e0e6ff" }}>{currentBranch}</span>
                </div>
              )}
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div className={`gb-status-pill ${connected ? "gb-status-connected" : "gb-status-offline"}`}>
                <StatusDot live={connected}/>
                {connected ? "Connected" : "Disconnected"}
              </div>
              {connected && (
                <div className="gb-tooltip">
                  <button className="gb-btn gb-btn-ghost" style={{ padding:"4px 10px" }}>
                    ⬇ Fetch
                  </button>
                  <span className="gb-tooltip-text">Fetch from remote</span>
                </div>
              )}
              <button className="gb-btn gb-btn-ghost" style={{ padding:"4px 10px", fontSize:".72rem" }} onClick={onClose}>✕ Close</button>
            </div>
          </div>

          {/* ─ BODY ─ */}
          {!connected ? (
            /* NOT CONNECTED state */
            <div className="gb-empty" style={{ flex:1 }}>
              <div className="gb-empty-icon">🔀</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.1rem", color:"#fff" }}>Connect a Repository</div>
              <div className="gb-empty-txt">Link your GitHub or GitLab repo to view live diffs,<br/>commit history, branch status, and AI-generated commit messages.</div>
              <button className="gb-btn gb-btn-teal" style={{ fontSize:".8rem", padding:"8px 22px", marginTop:".5rem" }} onClick={() => setShowConnect(true)}>
                🔗 Connect GitHub / GitLab Repository
              </button>
              <div style={{ fontSize:".65rem", color:"rgba(255,255,255,.18)", fontFamily:"'JetBrains Mono',monospace", marginTop:".3rem" }}>
                Uses GitHub REST API / GraphQL · simple-git (Node.js)
              </div>
            </div>
          ) : (
            <div className="gb-body" style={{ flex:1, overflow:"hidden" }}>

              {/* ═══ SIDEBAR ═══ */}
              <div className="gb-sidebar">
                {/* Sidebar tabs */}
                <div className="gb-tabs">
                  {[["files","📄 Changed"],["branches","🌿 Branches"]].map(([v,l]) => (
                    <button key={v} className={`gb-tab${sideTab===v?" active":""}`} onClick={() => setSideTab(v)}>{l}</button>
                  ))}
                </div>

                {sideTab === "files" && (
                  <div style={{ overflowY:"auto", flex:1 }}>
                    <div className="gb-sec-label">
                      Working Tree
                      <span style={{ marginLeft:6, background:"rgba(255,255,255,.06)", color:"rgba(255,255,255,.35)", borderRadius:100, padding:"1px 7px", fontSize:".58rem" }}>
                        {MOCK_FILES.length}
                      </span>
                    </div>
                    {MOCK_FILES.map((f, i) => (
                      <div key={i} className={`gb-file-item${selectedFile === f ? " selected" : ""}`} onClick={() => { setSelectedFile(f); setMainTab("diff"); }}>
                        <div className={`gb-file-status gb-fs-${f.status}`}>{f.status}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div className="gb-file-name">{f.name}</div>
                          <div className="gb-file-path">{f.path}</div>
                        </div>
                        <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                          {f.adds > 0 && <span style={{ fontSize:".58rem", color:"#4EC9B0", fontFamily:"'JetBrains Mono',monospace" }}>+{f.adds}</span>}
                          {f.dels > 0 && <span style={{ fontSize:".58rem", color:"#FF6B9D", fontFamily:"'JetBrains Mono',monospace" }}>−{f.dels}</span>}
                        </div>
                      </div>
                    ))}
                    {/* Summary */}
                    <div style={{ padding:".65rem 1rem", borderTop:"1px solid rgba(255,255,255,.04)", marginTop:".3rem" }}>
                      <div style={{ fontSize:".62rem", color:"rgba(255,255,255,.25)", fontFamily:"'JetBrains Mono',monospace", lineHeight:1.8 }}>
                        <div><span style={{ color:"#4EC9B0" }}>+{totalAdds}</span> additions · <span style={{ color:"#FF6B9D" }}>−{totalDels}</span> deletions</div>
                        <div style={{ marginTop:2 }}>{MOCK_FILES.length} files changed</div>
                      </div>
                    </div>
                  </div>
                )}

                {sideTab === "branches" && (
                  <div style={{ overflowY:"auto", flex:1 }}>
                    <div className="gb-sec-label">Local</div>
                    {MOCK_BRANCHES.filter(b => !b.isRemote).map(b => (
                      <div key={b.name} className={`gb-branch-item${currentBranch === b.name ? " active" : ""}`}
                        onClick={() => { setCurrentBranch(b.name); showToast(`Switched to ${b.name}`); }}>
                        <span className="gb-branch-dot" style={{ background: b.isDefault ? "#4EC9B0" : currentBranch === b.name ? "#4FC1FF" : "rgba(255,255,255,.18)" }}/>
                        <BranchIcon color={currentBranch === b.name ? "#4FC1FF" : "rgba(255,255,255,.3)"}/>
                        <span className={`gb-branch-name${currentBranch !== b.name ? " dim" : ""}`}>{b.name}</span>
                        {b.ahead > 0 && <span className="gb-branch-ahead">↑{b.ahead}</span>}
                      </div>
                    ))}
                    <div className="gb-sec-label" style={{ marginTop:".3rem" }}>Remote</div>
                    {MOCK_BRANCHES.filter(b => b.isRemote).map(b => (
                      <div key={b.name} className="gb-branch-item">
                        <span className="gb-branch-dot" style={{ background:"rgba(255,255,255,.14)" }}/>
                        <BranchIcon color="rgba(255,255,255,.25)"/>
                        <span className="gb-branch-name dim">{b.name}</span>
                        {b.ahead > 0 && <span className="gb-branch-ahead" style={{ color:"rgba(255,107,157,.8)", background:"rgba(255,107,157,.08)", borderColor:"rgba(255,107,157,.22)" }}>↑{b.ahead}</span>}
                      </div>
                    ))}
                    <div style={{ padding:".7rem 1rem", borderTop:"1px solid rgba(255,255,255,.04)", marginTop:".3rem" }}>
                      <button className="gb-btn gb-btn-ghost" style={{ width:"100%", justifyContent:"center", padding:"5px 0", fontSize:".66rem" }}
                        onClick={() => showToast("New branch created: feat/new-feature")}>
                        + New Branch
                      </button>
                    </div>
                  </div>
                )}

                {/* AI Commit Panel always visible at bottom of sidebar */}
                <AICommitPanel onCommit={handleCommit}/>
              </div>

              {/* ═══ MAIN AREA ═══ */}
              <div className="gb-main">
                {/* Main tabs */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid rgba(255,255,255,.05)", flexShrink:0 }}>
                  <div className="gb-tabs" style={{ borderBottom:"none", flex:1 }}>
                    {[
                      ["diff",    "⬡ Diff Viewer"],
                      ["history", "⏱ Commit History"],
                      ["prs",     "🔀 Pull Requests"],
                      ["activity","⚡ Live Activity"],
                    ].map(([v,l]) => (
                      <button key={v} className={`gb-tab${mainTab===v?" active":""}`} onClick={() => setMainTab(v)}>{l}</button>
                    ))}
                  </div>
                  {/* Stats row */}
                  <div className="gb-stats-bar" style={{ borderBottom:"none", borderLeft:"1px solid rgba(255,255,255,.05)", padding:".4rem .9rem" }}>
                    <span className="gb-stat-chip"><StatusDot live={true}/> <strong style={{ color:"#4EC9B0" }}>Live</strong></span>
                    <span className="gb-stat-chip">🔀 <strong style={{ color:"#e0e6ff" }}>{MOCK_PRS.filter(p=>p.status==="open").length}</strong> open PRs</span>
                    <span className="gb-stat-chip">↑ <strong style={{ color:"#4FC1FF" }}>4</strong> ahead</span>
                  </div>
                </div>

                {/* ── Diff Viewer ── */}
                {mainTab === "diff" && (
                  <DiffView file={selectedFile} diff={MOCK_DIFF}/>
                )}

                {/* ── Commit History ── */}
                {mainTab === "history" && (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", height:"100%", overflow:"hidden" }}>
                    <CommitHistory commits={MOCK_COMMITS} selectedSha={selectedCommit?.sha} onSelect={setSelectedCommit}/>
                    {selectedCommit && (
                      <div style={{ borderLeft:"1px solid rgba(255,255,255,.05)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
                        <div style={{ padding:".9rem 1.2rem", borderBottom:"1px solid rgba(255,255,255,.05)", flexShrink:0 }}>
                          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:".72rem", color:"#4EC9B0", marginBottom:".3rem" }}>{selectedCommit.sha}</div>
                          <div style={{ fontSize:".85rem", color:"#e0e6ff", fontWeight:600, lineHeight:1.4 }}>{selectedCommit.msg}</div>
                          <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:".5rem" }}>
                            <span className="gb-commit-avatar" style={{ background:selectedCommit.bg, color:selectedCommit.color, width:22, height:22, fontSize:".6rem" }}>{selectedCommit.avatar}</span>
                            <span style={{ fontSize:".72rem", color:"rgba(255,255,255,.45)" }}>{selectedCommit.author} · {selectedCommit.time}</span>
                            <span style={{ marginLeft:"auto", color:"#4EC9B0", fontSize:".68rem", fontFamily:"'JetBrains Mono',monospace" }}>+{selectedCommit.adds}</span>
                            <span style={{ color:"#FF6B9D", fontSize:".68rem", fontFamily:"'JetBrains Mono',monospace" }}>−{selectedCommit.dels}</span>
                          </div>
                        </div>
                        <div style={{ overflowY:"auto", flex:1, padding:"1rem 1.2rem" }}>
                          {MOCK_FILES.slice(0, 3).map((f, i) => (
                            <div key={i} className="gb-file-item" style={{ padding:".5rem 0", borderBottom:"1px solid rgba(255,255,255,.03)" }}>
                              <div className={`gb-file-status gb-fs-${f.status}`}>{f.status}</div>
                              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:".72rem", color:"#e0e6ff", flex:1 }}>{f.name}</span>
                              <span style={{ color:"#4EC9B0", fontSize:".65rem", fontFamily:"'JetBrains Mono',monospace" }}>+{f.adds}</span>
                              <span style={{ color:"#FF6B9D", fontSize:".65rem", fontFamily:"'JetBrains Mono',monospace", marginLeft:5 }}>−{f.dels}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Pull Requests ── */}
                {mainTab === "prs" && (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", height:"100%", overflow:"hidden" }}>
                    <PRList prs={MOCK_PRS}/>
                    <div style={{ borderLeft:"1px solid rgba(255,255,255,.05)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
                      <div className="gb-sec-label">Open PR Summary</div>
                      <div style={{ padding:"0 1rem 1rem", overflowY:"auto", flex:1 }}>
                        {MOCK_PRS.filter(p => p.status === "open").map(pr => (
                          <div key={pr.id} style={{ marginBottom:".85rem", padding:"1rem", background:"rgba(255,255,255,.02)", borderRadius:10, border:"1px solid rgba(255,255,255,.06)" }}>
                            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:".65rem", color:"rgba(255,255,255,.25)", marginBottom:".3rem" }}>PR #{pr.id} · {pr.branch}</div>
                            <div style={{ fontSize:".82rem", color:"#e0e6ff", fontWeight:600, marginBottom:".5rem", lineHeight:1.4 }}>{pr.title}</div>
                            <div style={{ display:"flex", gap:6 }}>
                              <button className="gb-btn gb-btn-teal" style={{ fontSize:".64rem", padding:"3px 10px" }} onClick={() => showToast(`PR #${pr.id} approved ✓`, "#4EC9B0")}>✓ Approve</button>
                              <button className="gb-btn gb-btn-violet" style={{ fontSize:".64rem", padding:"3px 10px" }} onClick={() => showToast("Review submitted")}>💬 Review</button>
                              <button className="gb-btn gb-btn-rose" style={{ fontSize:".64rem", padding:"3px 10px" }} onClick={() => showToast("Changes requested")}>✕ Request Changes</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Live Activity ── */}
                {mainTab === "activity" && (
                  <div style={{ overflowY:"auto", flex:1 }}>
                    <div className="gb-sec-label" style={{ padding:".75rem 1.2rem .45rem", display:"flex", alignItems:"center", gap:7 }}>
                      Live Activity
                      <StatusDot live={true}/>
                      <span style={{ color:"rgba(78,201,176,.5)" }}>Streaming</span>
                    </div>
                    {liveActivity.map((item, i) => (
                      <div key={i} className="gb-activity-item" style={{ animationDelay:`${i*0.04}s` }}>
                        <div className="gb-activity-icon" style={{ background:item.bg }}>{item.icon}</div>
                        <div className="gb-activity-body">
                          <div className="gb-activity-title">{item.title}</div>
                          <div className="gb-activity-meta">{item.meta}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─ FOOTER ─ */}
          <div style={{
            display:"flex", alignItems:"center", gap:10, padding:".55rem 1.2rem",
            borderTop:"1px solid rgba(255,255,255,.05)", flexShrink:0,
            background:"rgba(255,255,255,.01)",
          }}>
            <StatusDot live={connected}/>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:".64rem", color:"rgba(255,255,255,.25)" }}>
              {connected ? `${repoName} · ${currentBranch} · simple-git v3.22` : "Not connected to any repository"}
            </span>
            <span style={{ marginLeft:"auto", fontFamily:"'JetBrains Mono',monospace", fontSize:".64rem", color:"rgba(255,255,255,.2)" }}>
              GitHub REST API / GraphQL · Module 14
            </span>
          </div>

        </div>
      </div>
    </>
  );
}