import { useState, useEffect, useRef, useCallback } from "react";

const GIT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0c0e14;--bg2:#111420;--bg3:#161925;--bg4:#1c2030;
  --border:rgba(255,255,255,.07);--border2:rgba(255,255,255,.12);
  --text:#e8eaf0;--text2:rgba(232,234,240,.55);--text3:rgba(232,234,240,.28);
  --teal:#00d4aa;--teal2:rgba(0,212,170,.12);--teal3:rgba(0,212,170,.06);
  --blue:#4d9fff;--blue2:rgba(77,159,255,.12);
  --pink:#ff5fa0;--pink2:rgba(255,95,160,.1);
  --amber:#f5a623;--amber2:rgba(245,166,35,.1);
  --violet:#9b6dff;--violet2:rgba(155,109,255,.12);
  --red:#ff4f4f;--red2:rgba(255,79,79,.1);
  --green:#3dd68c;--green2:rgba(61,214,140,.1);
  --mono:'JetBrains Mono',monospace;
  --sans:'Space Grotesk',sans-serif;
  --r:8px;--r2:12px;--r3:16px;
}

@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(20px) scale(.97)}to{opacity:1;transform:none}}
@keyframes slideIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}
@keyframes shimmer{from{background-position:-200% 0}to{background-position:200% 0}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pushSuccess{0%{transform:scale(1)}50%{transform:scale(1.08)}100%{transform:scale(1)}}

.gb-shell{display:flex;flex-direction:column;height:100vh;max-height:100vh;overflow:hidden;font-family:var(--sans);background:var(--bg);color:var(--text)}
.gb-header{display:flex;align-items:center;gap:12px;padding:10px 16px;background:var(--bg2);border-bottom:1px solid var(--border);flex-shrink:0;min-height:52px}
.gb-body{display:grid;grid-template-columns:260px 1fr;flex:1;overflow:hidden;position:relative}
.gb-sidebar{border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;background:var(--bg2)}
.gb-main{display:flex;flex-direction:column;overflow:hidden;background:var(--bg)}
.gb-footer{display:flex;align-items:center;gap:10px;padding:7px 16px;background:var(--bg2);border-top:1px solid var(--border);flex-shrink:0;font-family:var(--mono);font-size:11px;color:var(--text3)}

.gb-logo-text{font-weight:700;font-size:15px;color:var(--text)}
.gb-logo-sub{font-size:11px;color:var(--text3);font-family:var(--mono)}

.gb-repo-badge{display:inline-flex;align-items:center;gap:6px;background:var(--bg4);border:1px solid var(--border2);border-radius:var(--r);padding:4px 10px;font-family:var(--mono);font-size:11px;color:var(--text2);cursor:pointer;transition:all .2s}
.gb-repo-badge:hover{border-color:var(--teal);color:var(--teal)}
.gb-branch-badge{display:inline-flex;align-items:center;gap:5px;background:var(--bg4);border:1px solid var(--border);border-radius:var(--r);padding:4px 10px;font-family:var(--mono);font-size:11px;color:var(--text2)}

.gb-status-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;display:inline-block}
.gb-status-dot.live{background:var(--teal);box-shadow:0 0 8px var(--teal);animation:pulse 2s infinite}
.gb-status-dot.off{background:#444}

.gb-status-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:100px;border:1px solid;font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.04em}
.gb-status-pill.on{background:rgba(0,212,170,.08);color:var(--teal);border-color:rgba(0,212,170,.3)}
.gb-status-pill.off{background:rgba(255,79,79,.08);color:var(--red);border-color:rgba(255,79,79,.25)}

.gb-btn{display:inline-flex;align-items:center;gap:6px;border-radius:var(--r);border:1px solid;cursor:pointer;font-family:var(--mono);font-size:11px;font-weight:600;padding:5px 12px;transition:all .15s;white-space:nowrap;letter-spacing:.02em;background:none}
.gb-btn:disabled{opacity:.3;cursor:not-allowed}
.gb-btn-teal{background:rgba(0,212,170,.1);color:var(--teal);border-color:rgba(0,212,170,.3)}
.gb-btn-teal:hover:not(:disabled){background:rgba(0,212,170,.2);border-color:rgba(0,212,170,.6)}
.gb-btn-violet{background:var(--violet2);color:var(--violet);border-color:rgba(155,109,255,.35)}
.gb-btn-violet:hover:not(:disabled){background:rgba(155,109,255,.22);border-color:rgba(155,109,255,.6)}
.gb-btn-ghost{background:transparent;color:var(--text3);border-color:var(--border2)}
.gb-btn-ghost:hover:not(:disabled){color:var(--text);border-color:var(--border2)}
.gb-btn-rose{background:var(--pink2);color:var(--pink);border-color:rgba(255,95,160,.3)}
.gb-btn-rose:hover:not(:disabled){background:rgba(255,95,160,.2)}
.gb-btn-blue{background:var(--blue2);color:var(--blue);border-color:rgba(77,159,255,.3)}
.gb-btn-amber{background:var(--amber2);color:var(--amber);border-color:rgba(245,166,35,.3)}

.gb-tabs{display:flex;gap:2px;padding:8px 10px 6px;border-bottom:1px solid var(--border);flex-shrink:0}
.gb-tab{font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;padding:4px 10px;border-radius:6px;border:none;cursor:pointer;transition:all .15s;background:transparent;font-family:var(--mono)}
.gb-tab.active{background:rgba(0,212,170,.12);color:var(--teal)}
.gb-tab:not(.active){color:var(--text3)}
.gb-tab:not(.active):hover{color:var(--text2);background:var(--bg4)}

.gb-sec-label{font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--text3);padding:10px 14px 6px;font-family:var(--mono);display:flex;align-items:center;gap:6px}

.gb-file-item{display:flex;align-items:center;gap:8px;padding:7px 14px;cursor:pointer;transition:background .12s;border-left:2px solid transparent}
.gb-file-item:hover{background:var(--bg4)}
.gb-file-item.sel{background:var(--teal3);border-left-color:var(--teal)}
.gb-fs-badge{width:15px;height:15px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0;font-family:var(--mono)}
.gb-fs-M{background:rgba(245,166,35,.15);color:var(--amber)}
.gb-fs-A{background:rgba(0,212,170,.14);color:var(--teal)}
.gb-fs-D{background:var(--red2);color:var(--red)}
.gb-fs-R{background:var(--blue2);color:var(--blue)}
.gb-file-name{font-family:var(--mono);font-size:12px;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gb-file-path{font-size:10px;color:var(--text3);font-family:var(--mono)}

.gb-branch-item{display:flex;align-items:center;gap:8px;padding:7px 14px;cursor:pointer;transition:background .12s;border-left:2px solid transparent;font-size:12px}
.gb-branch-item:hover{background:var(--bg4)}
.gb-branch-item.active{background:rgba(0,212,170,.06);border-left-color:var(--teal)}
.gb-branch-name{flex:1;font-family:var(--mono);font-size:11px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gb-branch-name.dim{color:var(--text3)}
.gb-ahead-pill{font-size:10px;background:var(--blue2);color:var(--blue);border:1px solid rgba(77,159,255,.25);border-radius:100px;padding:1px 7px;font-family:var(--mono)}

.gb-diff-header{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border);flex-shrink:0;background:rgba(255,255,255,.015)}
.gb-diff-filename{font-family:var(--mono);font-size:12px;color:var(--text);flex:1}
.gb-diff-add{font-size:11px;color:var(--teal);font-family:var(--mono);font-weight:700}
.gb-diff-del{font-size:11px;color:var(--pink);font-family:var(--mono);font-weight:700}
.gb-diff-scroll{flex:1;overflow-y:auto;font-family:var(--mono);font-size:12px;line-height:1.8}
.gb-diff-line{display:flex;align-items:flex-start;padding:0 16px;min-height:22px}
.gb-diff-line:hover{background:rgba(255,255,255,.025)}
.gb-diff-ln{width:32px;color:var(--text3);flex-shrink:0;text-align:right;padding-right:10px;user-select:none;font-size:11px}
.gb-diff-gutter{width:16px;text-align:center;flex-shrink:0;color:var(--text3);font-size:12px}
.gb-diff-code{flex:1;white-space:pre-wrap;word-break:break-all}
.gb-diff-line.add{background:rgba(0,212,170,.06)}
.gb-diff-line.add .gb-diff-code{color:var(--teal)}
.gb-diff-line.add .gb-diff-gutter{color:var(--teal)}
.gb-diff-line.del{background:rgba(255,95,160,.06)}
.gb-diff-line.del .gb-diff-code{color:var(--pink);text-decoration:line-through;opacity:.7}
.gb-diff-line.del .gb-diff-gutter{color:var(--pink)}
.gb-diff-line.ctx .gb-diff-code{color:var(--text3)}
.gb-diff-line.hunk{background:rgba(77,159,255,.05)}
.gb-diff-line.hunk .gb-diff-code{color:rgba(77,159,255,.65);font-style:italic}

.gb-commit-item{padding:10px 16px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .12s}
.gb-commit-item:hover{background:var(--bg4)}
.gb-commit-item.sel{background:rgba(0,212,170,.04)}
.gb-commit-sha{font-family:var(--mono);font-size:11px;color:var(--teal)}
.gb-commit-msg{font-size:13px;color:var(--text);margin:3px 0;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gb-commit-meta{font-size:11px;color:var(--text3);display:flex;gap:8px;align-items:center;font-family:var(--mono)}
.gb-avatar{width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;flex-shrink:0}

.gb-ai-panel{border-top:1px solid var(--border);padding:14px;flex-shrink:0;background:rgba(155,109,255,.03)}
.gb-ai-label{display:flex;align-items:center;gap:7px;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(155,109,255,.8);font-family:var(--mono);margin-bottom:10px}
.gb-ai-textarea{width:100%;background:rgba(255,255,255,.04);border:1px solid var(--border2);border-radius:var(--r);padding:8px 12px;font-size:12px;color:var(--text);font-family:var(--mono);outline:none;resize:none;transition:border-color .2s;line-height:1.6;box-sizing:border-box}
.gb-ai-textarea:focus{border-color:rgba(155,109,255,.4);box-shadow:0 0 0 3px rgba(155,109,255,.06)}
.gb-ai-actions{display:flex;gap:6px;margin-top:8px;align-items:center;flex-wrap:wrap}

.gb-fn-row{display:flex;align-items:center;gap:6px;margin-bottom:9px;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:var(--r);padding:6px 10px}
.gb-fn-input{flex:1;background:transparent;border:none;outline:none;font-family:var(--mono);font-size:11px;color:var(--text);min-width:0}
.gb-fn-input::placeholder{color:var(--text3)}
.gb-fn-toggle{display:flex;gap:2px;background:rgba(255,255,255,.04);border-radius:5px;padding:2px;flex-shrink:0}
.gb-fn-btn{font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;border:none;cursor:pointer;font-family:var(--mono);transition:all .15s;letter-spacing:.05em;color:var(--text3);background:transparent}
.gb-fn-btn.active{background:rgba(0,212,170,.16);color:var(--teal)}
.gb-fn-auto{font-size:10px;font-family:var(--mono);color:var(--text3);background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:100px;padding:1px 7px;flex-shrink:0}

.gb-push-bar{height:2px;background:rgba(255,255,255,.04);flex-shrink:0}
.gb-push-bar-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--teal),var(--blue),var(--violet));transition:width .4s ease}

.gb-pr-card{margin:8px 14px;padding:12px;background:rgba(255,255,255,.025);border:1px solid var(--border);border-radius:var(--r2);cursor:pointer;transition:all .18s;border-left-width:2px;border-left-style:solid}
.gb-pr-card:hover{background:rgba(255,255,255,.042)}
.gb-pr-card.open{border-left-color:var(--teal)}
.gb-pr-card.merged{border-left-color:var(--violet)}
.gb-pr-card.closed{border-left-color:rgba(255,95,160,.5)}

.gb-activity-item{display:flex;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border);animation:slideIn .2s ease both}
.gb-activity-icon{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;margin-top:1px}

.gb-stats-bar{display:flex;gap:16px;padding:8px 14px;border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap}
.gb-stat-chip{display:flex;align-items:center;gap:5px;font-family:var(--mono);font-size:11px;color:var(--text3)}
.gb-stat-chip strong{color:var(--text);font-weight:600}

.gb-modal-overlay{position:absolute;inset:0;z-index:10;background:rgba(6,8,14,.92);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;animation:fadeIn .18s ease both}
.gb-modal-card{width:420px;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--r3);padding:28px;box-shadow:0 30px 70px rgba(0,0,0,.7);animation:slideUp .28s cubic-bezier(.22,1,.36,1) both}
.gb-input-field{width:100%;background:rgba(255,255,255,.04);border:1px solid var(--border2);border-radius:var(--r);padding:9px 12px;font-size:13px;color:var(--text);font-family:var(--mono);outline:none;transition:border-color .2s;box-sizing:border-box}
.gb-input-field:focus{border-color:rgba(0,212,170,.4);box-shadow:0 0 0 3px rgba(0,212,170,.06)}
.gb-input-label{display:block;font-size:10px;font-weight:700;color:var(--text3);letter-spacing:.12em;text-transform:uppercase;font-family:var(--mono);margin-bottom:5px}

.gb-toast{position:absolute;top:14px;right:14px;z-index:50;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--r2);padding:10px 14px;display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text);box-shadow:0 8px 28px rgba(0,0,0,.5);animation:slideUp .22s cubic-bezier(.22,1,.36,1) both;min-width:220px;max-width:360px}

.gb-result-overlay{position:absolute;inset:0;z-index:30;background:rgba(6,8,14,.9);backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;animation:fadeIn .18s ease both}
.gb-result-card{width:380px;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--r3);padding:28px;text-align:center;box-shadow:0 30px 70px rgba(0,0,0,.6);animation:slideUp .28s cubic-bezier(.22,1,.36,1) both}

.gb-shimmer{background:linear-gradient(90deg,rgba(155,109,255,.04) 25%,rgba(155,109,255,.14) 50%,rgba(155,109,255,.04) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:6px}

.gb-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:12px;padding:40px;text-align:center}
.gb-empty-icon{font-size:42px;opacity:.18}

.gb-scroll-area{overflow-y:auto;flex:1}

::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,.07);border-radius:2px}

.gb-spinner{width:12px;height:12px;border-radius:50%;border:2px solid rgba(0,212,170,.2);border-top-color:var(--teal);flex-shrink:0;animation:spin .7s linear infinite}

.gb-no-token-banner{
  margin:10px 14px 0;
  padding:9px 12px;
  background:rgba(255,79,79,.07);
  border:1px solid rgba(255,79,79,.2);
  border-radius:var(--r);
  font-family:var(--mono);
  font-size:11px;
  color:rgba(255,120,120,.85);
  line-height:1.6;
  display:flex;
  align-items:flex-start;
  gap:8px;
}
.gb-no-token-banner-icon{flex-shrink:0;margin-top:1px}
`;

// ─── Mock data ───────────────────────────────────────────────

const MOCK_BRANCHES = [
  { name:"main",           sha:"a3f9e2c", ahead:0, behind:0, isDefault:true,  isRemote:false },
  { name:"feat/git-bridge",sha:"b8d71fa", ahead:4, behind:1, isDefault:false, isRemote:false },
  { name:"fix/diff-parser",sha:"c2e14bb", ahead:1, behind:0, isDefault:false, isRemote:false },
  { name:"origin/main",    sha:"a3f9e2c", ahead:0, behind:0, isDefault:true,  isRemote:true  },
  { name:"origin/develop", sha:"9c3f02d", ahead:7, behind:3, isDefault:false, isRemote:true  },
];

const MOCK_COMMITS = [
  { sha:"b8d71fa", msg:"feat: add real-time diff streaming over WebSockets",     author:"Aria K.", avatar:"AK", color:"#ff5fa0", bg:"rgba(255,95,160,.18)",  time:"2m ago",  adds:182, dels:14 },
  { sha:"c2e14bb", msg:"fix: resolve diff parser edge case on empty hunks",      author:"Dev M.",  avatar:"DM", color:"#00d4aa", bg:"rgba(0,212,170,.18)",   time:"17m ago", adds:23,  dels:8  },
  { sha:"9a3d05e", msg:"refactor: extract GitBridgeEngine into separate module", author:"Sam T.",  avatar:"ST", color:"#f5a623", bg:"rgba(245,166,35,.18)",  time:"1h ago",  adds:95,  dels:67 },
  { sha:"f12cc3b", msg:"chore: update simple-git to v3.22",                      author:"You",     avatar:"Y",  color:"#4d9fff", bg:"rgba(77,159,255,.18)",  time:"3h ago",  adds:4,   dels:4  },
  { sha:"e01bc47", msg:"feat: implement AI commit message generation",           author:"Aria K.", avatar:"AK", color:"#ff5fa0", bg:"rgba(255,95,160,.18)",  time:"5h ago",  adds:137, dels:22 },
  { sha:"d7e8290", msg:"docs: update README with Git Bridge usage guide",        author:"Dev M.",  avatar:"DM", color:"#00d4aa", bg:"rgba(0,212,170,.18)",   time:"1d ago",  adds:48,  dels:12 },
  { sha:"a3f9e2c", msg:"init: scaffold CKC-OS repository structure",            author:"You",     avatar:"Y",  color:"#4d9fff", bg:"rgba(77,159,255,.18)",  time:"2d ago",  adds:312, dels:0  },
];

const MOCK_FILES = [
  { status:"M", path:"src/",   name:"GitBridge.jsx",           adds:182, dels:14 },
  { status:"M", path:"src/",   name:"editor.jsx",              adds:34,  dels:8  },
  { status:"A", path:"src/",   name:"GitBridgeEngine.js",      adds:95,  dels:0  },
  { status:"M", path:"src/",   name:"index.jsx",               adds:23,  dels:6  },
  { status:"D", path:"utils/", name:"legacyDiff.js",           adds:0,   dels:47 },
  { status:"R", path:"src/",   name:"api.jsx → apiClient.jsx", adds:12,  dels:12 },
];

const MOCK_DIFF = [
  { type:"hunk", ln1:null, ln2:null, code:"@@ -14,6 +14,18 @@ import { useState } from 'react';" },
  { type:"ctx",  ln1:14,  ln2:14,  code:" // ─── GitBridgeEngine ──────────────────────────────" },
  { type:"ctx",  ln1:15,  ln2:15,  code:" import { simpleGit } from 'simple-git';" },
  { type:"del",  ln1:16,  ln2:null, code:"-const git = simpleGit();" },
  { type:"add",  ln1:null, ln2:16,  code:"+const git = simpleGit({ baseDir: process.cwd() });" },
  { type:"add",  ln1:null, ln2:17,  code:"+const ws  = new WebSocketServer({ port: 9001 });" },
  { type:"ctx",  ln1:17,  ln2:18,  code:"" },
  { type:"del",  ln1:18,  ln2:null, code:"-export async function getDiff() {" },
  { type:"del",  ln1:19,  ln2:null, code:"-  return await git.diff();" },
  { type:"add",  ln1:null, ln2:19,  code:"+export async function streamDiff(sessionId) {" },
  { type:"add",  ln1:null, ln2:20,  code:"+  const diff = await git.diff(['--stat', 'HEAD']);" },
  { type:"add",  ln1:null, ln2:21,  code:"+  ws.clients.forEach(c => {" },
  { type:"add",  ln1:null, ln2:22,  code:"+    if (c.sessionId === sessionId) c.send(JSON.stringify({ diff }));" },
  { type:"add",  ln1:null, ln2:23,  code:"+  });" },
  { type:"ctx",  ln1:20,  ln2:24,  code:"  return diff;" },
  { type:"ctx",  ln1:21,  ln2:25,  code:"}" },
  { type:"hunk", ln1:null, ln2:null, code:"@@ -34,4 +38,12 @@ export async function streamDiff(sessionId) {" },
  { type:"ctx",  ln1:34,  ln2:38,  code:" // AI commit message generation" },
  { type:"del",  ln1:35,  ln2:null, code:"-// TODO: implement AI suggestions" },
  { type:"add",  ln1:null, ln2:39,  code:"+export async function generateCommitMessage(diff) {" },
  { type:"add",  ln1:null, ln2:40,  code:"+  const summary = await analyzeWithClaude(diff);" },
  { type:"add",  ln1:null, ln2:41,  code:"+  return summary.conventionalCommit;" },
  { type:"add",  ln1:null, ln2:42,  code:"+}" },
];

const MOCK_PRS = [
  { id:12, title:"feat: Git Bridge — real-time diff streaming", status:"open",   author:"Aria K.", color:"#ff5fa0", reviews:2, comments:5, branch:"feat/git-bridge" },
  { id:11, title:"fix: diff parser edge case on empty hunks",   status:"open",   author:"Dev M.",  color:"#00d4aa", reviews:1, comments:2, branch:"fix/diff-parser" },
  { id:10, title:"refactor: extract GitBridgeEngine module",    status:"merged", author:"Sam T.",  color:"#f5a623", reviews:3, comments:8, branch:"refactor/engine" },
];

const MOCK_ACTIVITY = [
  { icon:"🔀", bg:"rgba(155,109,255,.12)", title:"PR #12 opened — feat: Git Bridge streaming",   meta:"Aria K. · 2m ago"  },
  { icon:"✅", bg:"rgba(0,212,170,.1)",    title:"Commit b8d71fa pushed to feat/git-bridge",     meta:"Aria K. · 2m ago"  },
  { icon:"💬", bg:"rgba(77,159,255,.1)",   title:"Inline comment on GitBridge.jsx line 23",      meta:"Dev M. · 8m ago"   },
  { icon:"🔍", bg:"rgba(245,166,35,.1)",   title:"Code review requested on PR #12",              meta:"Sam T. · 14m ago"  },
  { icon:"⬆️", bg:"rgba(77,159,255,.08)",  title:"Branch feat/git-bridge pushed (4 commits)",   meta:"You · 17m ago"     },
  { icon:"🏷️", bg:"rgba(255,95,160,.09)", title:"Tag v1.4.0 created on main",                   meta:"Dev M. · 3h ago"   },
];

const AI_SUGGESTIONS = [
  "feat(git-bridge): add real-time diff streaming over WebSockets",
  "feat(editor): integrate version control panel with live diffs",
  "refactor(git): extract bridge engine and improve session handling",
];

const DEFAULT_FILENAME = "workspace/session-code.js";

const FALLBACK_CODE = `// GitBridge session placeholder
// Connect your editor to push real content.
console.log("GitBridge ready");
`;

// ─── Helpers ─────────────────────────────────────────────────

function utf8ToB64(str) {
  try { return window.btoa(unescape(encodeURIComponent(str))); }
  catch (e) { return window.btoa(str); }
}

function StatusDot({ live, style = {} }) {
  return <span className={"gb-status-dot " + (live ? "live" : "off")} style={style} />;
}

function BranchSVG({ color = "#00d4aa" }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="2.5" cy="2.5" r="1.6" stroke={color} strokeWidth="1.3"/>
      <circle cx="9.5" cy="9.5" r="1.6" stroke={color} strokeWidth="1.3"/>
      <circle cx="9.5" cy="2.5" r="1.6" stroke={color} strokeWidth="1.3"/>
      <path d="M2.5 4.1V8.5a.8.8 0 00.8.8h4.6M9.5 4.1V5" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function DiffView({ file, diff }) {
  const adds = diff.filter(l => l.type === "add").length;
  const dels = diff.filter(l => l.type === "del").length;
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div className="gb-diff-header">
        <div className={"gb-fs-badge gb-fs-" + file.status}>{file.status}</div>
        <span className="gb-diff-filename">{file.path}{file.name}</span>
        <span className="gb-diff-add">+{adds}</span>
        <span className="gb-diff-del">−{dels}</span>
      </div>
      <div className="gb-diff-scroll">
        {diff.map((line, i) => (
          <div key={i} className={"gb-diff-line " + line.type}>
            <span className="gb-diff-ln">
              {line.type !== "hunk"
                ? (line.type === "add" ? line.ln2 : line.type === "del" ? line.ln1 : line.ln1) || ""
                : ""}
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
    <div className="gb-scroll-area" style={{ borderRight:"1px solid var(--border)" }}>
      <div className="gb-sec-label">Commit History</div>
      {commits.map(c => (
        <div
          key={c.sha}
          className={"gb-commit-item " + (selectedSha === c.sha ? "sel" : "")}
          onClick={() => onSelect(c)}
        >
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span className="gb-commit-sha">{c.sha.slice(0, 7)}</span>
            <span style={{ fontSize:10, background:"rgba(255,255,255,.04)", border:"1px solid var(--border)", borderRadius:100, padding:"1px 6px", color:"var(--text3)", fontFamily:"var(--mono)" }}>
              +{c.adds} −{c.dels}
            </span>
          </div>
          <div className="gb-commit-msg">{c.msg}</div>
          <div className="gb-commit-meta">
            <span className="gb-avatar" style={{ background:c.bg, color:c.color }}>{c.avatar}</span>
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
    <div className="gb-scroll-area" style={{ borderRight:"1px solid var(--border)" }}>
      <div className="gb-sec-label">Pull Requests</div>
      {prs.map(pr => (
        <div key={pr.id} className={"gb-pr-card " + pr.status}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
            <span style={{
              fontSize:10, fontFamily:"var(--mono)", padding:"1px 8px", borderRadius:100,
              border:"1px solid", fontWeight:700,
              ...(pr.status === "open"
                ? { color:"var(--teal)",   background:"rgba(0,212,170,.1)",  borderColor:"rgba(0,212,170,.3)" }
                : pr.status === "merged"
                ? { color:"var(--violet)", background:"var(--violet2)",       borderColor:"rgba(155,109,255,.3)" }
                : { color:"var(--pink)",   background:"var(--pink2)",         borderColor:"rgba(255,95,160,.25)" }),
            }}>
              {pr.status === "open" ? "● OPEN" : pr.status === "merged" ? "⬡ MERGED" : "✕ CLOSED"}
            </span>
            <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text3)" }}>#{pr.id}</span>
          </div>
          <div style={{ fontSize:13, color:"var(--text)", lineHeight:1.4 }}>{pr.title}</div>
          <div style={{ fontSize:11, color:"var(--text3)", marginTop:5, fontFamily:"var(--mono)" }}>
            <span style={{ color:pr.color }}>{pr.author}</span>
            {" · "}{pr.branch}{" · "}💬 {pr.comments}{" · "}👁 {pr.reviews}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── AI Commit Panel ─────────────────────────────────────────

function AICommitPanel({ onCommit, isPushing, hasToken }) {
  const [msg, setMsg]               = useState("");
  const [thinking, setThinking]     = useState(false);
  const [suggIdx, setSuggIdx]       = useState(0);
  const [fileMode, setFileMode]     = useState("default");
  const [customFile, setCustomFile] = useState("");
  const aiIntervalRef               = useRef(null);

  const effectiveFile = fileMode === "default"
    ? DEFAULT_FILENAME
    : (customFile.trim() || DEFAULT_FILENAME);

  const generateAI = () => {
    if (thinking) return;
    setThinking(true);
    setMsg("");
    let i = 0;
    const target = AI_SUGGESTIONS[suggIdx % AI_SUGGESTIONS.length];
    clearInterval(aiIntervalRef.current);
    aiIntervalRef.current = setInterval(() => {
      setMsg(target.slice(0, ++i));
      if (i >= target.length) {
        clearInterval(aiIntervalRef.current);
        setThinking(false);
        setSuggIdx(s => s + 1);
      }
    }, 26);
  };

  const handleCommit = () => {
    if (msg.trim()) { onCommit(msg, effectiveFile); setMsg(""); }
  };

  const charColor = msg.length > 72 ? "var(--pink)" : msg.length > 60 ? "var(--amber)" : "var(--text3)";

  return (
    <div className="gb-ai-panel">
      <div className="gb-ai-label">
        <span style={{ width:18, height:18, borderRadius:5, background:"rgba(155,109,255,.18)", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>✨</span>
        AI Commit &amp; Push
      </div>

      {!hasToken && (
        <div className="gb-no-token-banner">
          <span className="gb-no-token-banner-icon">⚠️</span>
          <span>No GitHub token saved. Click the repo badge in the header to reconnect with a token, then push will work.</span>
        </div>
      )}

      <div className="gb-fn-row" style={{ marginTop: hasToken ? 0 : 9 }}>
        <span style={{ fontSize:13 }}>📄</span>
        {fileMode === "custom" ? (
          <input
            className="gb-fn-input"
            placeholder="src/yourfile.js"
            value={customFile}
            onChange={e => setCustomFile(e.target.value)}
            autoFocus
          />
        ) : (
          <>
            <span style={{ flex:1, fontFamily:"var(--mono)", fontSize:11, color:"var(--text3)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {DEFAULT_FILENAME}
            </span>
            <span className="gb-fn-auto">AUTO</span>
          </>
        )}
        <div className="gb-fn-toggle">
          <button className={"gb-fn-btn " + (fileMode === "default" ? "active" : "")} onClick={() => setFileMode("default")}>AUTO</button>
          <button className={"gb-fn-btn " + (fileMode === "custom" ? "active" : "")} onClick={() => setFileMode("custom")}>CUSTOM</button>
        </div>
      </div>

      {thinking ? (
        <div style={{ position:"relative", borderRadius:8, overflow:"hidden", marginBottom:8 }}>
          <div className="gb-shimmer" style={{ height:44 }}/>
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", paddingLeft:12, gap:8 }}>
            <div className="gb-spinner"/>
            <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"rgba(155,109,255,.6)" }}>Analyzing diff…</span>
          </div>
        </div>
      ) : (
        <textarea
          className="gb-ai-textarea"
          rows={2}
          placeholder="Type a commit message or generate with AI…"
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleCommit(); }}
        />
      )}

      <div className="gb-ai-actions">
        <button className="gb-btn gb-btn-violet" onClick={generateAI} disabled={thinking || isPushing}>
          ✨ Generate
        </button>
        <button
          className="gb-btn gb-btn-teal"
          disabled={!msg.trim() || thinking || isPushing || !hasToken}
          onClick={handleCommit}
          title={!hasToken ? "Reconnect with a GitHub token first" : ""}
        >
          {isPushing ? <><div className="gb-spinner"/>Pushing…</> : <>⬆ Commit &amp; Push</>}
        </button>
        <button className="gb-btn gb-btn-ghost" disabled={!msg.trim() || isPushing} onClick={() => setMsg("")}>
          Clear
        </button>
        <span style={{ marginLeft:"auto", fontFamily:"var(--mono)", fontSize:11, color:charColor }}>
          {msg.length}/72
        </span>
      </div>

      <div style={{ marginTop:6, fontFamily:"var(--mono)", fontSize:10, color:"rgba(255,255,255,.18)", display:"flex", alignItems:"center", gap:5 }}>
        <span>→</span>
        <span style={{ color:"rgba(0,212,170,.45)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:140 }}>{effectiveFile}</span>
        <span style={{ marginLeft:"auto" }}>⌘↵ commit</span>
      </div>
    </div>
  );
}

// ─── Connect Modal ────────────────────────────────────────────

function ConnectModal({ onConnect, onClose, initialRepo = "" }) {
  const [provider,   setProvider]   = useState("github");
  const [repoInput,  setRepoInput]  = useState(initialRepo);
  const [tokenInput, setTokenInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [step,       setStep]       = useState("");

  const doConnect = () => {
    if (!repoInput.trim()) return;
    setConnecting(true);
    const steps = [
      "Validating credentials…",
      "Fetching repository…",
      "Loading branches…",
      "Syncing commit history…",
      "Connected!",
    ];
    let i = 0;
    setStep(steps[0]);
    const iv = setInterval(() => {
      setStep(steps[++i]);
      if (i >= steps.length - 1) {
        clearInterval(iv);
        setTimeout(() => {
          const cleanRepo = repoInput.trim()
            .replace(/^https?:\/\/(www\.)?github\.com\//, "")
            .replace(/^github\.com\//, "")
            .replace(/\.git$/, "");
          onConnect({ repo: cleanRepo, authToken: tokenInput.trim(), provider });
        }, 300);
      }
    }, 520);
  };

  return (
    <div className="gb-modal-overlay" onClick={onClose}>
      <div className="gb-modal-card" onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:"linear-gradient(135deg,#00d4aa,#4d9fff)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🔗</div>
          <div>
            <div style={{ fontWeight:700, fontSize:16, color:"var(--text)" }}>Connect Repository</div>
            <div style={{ fontSize:11, color:"var(--text3)", fontFamily:"var(--mono)" }}>GitHub / GitLab integration</div>
          </div>
        </div>

        <div style={{ display:"flex", gap:6, marginBottom:16 }}>
          {["github", "gitlab"].map(p => (
            <button key={p} onClick={() => setProvider(p)} style={{
              flex:1, padding:7, borderRadius:"var(--r)", border:"1px solid", cursor:"pointer",
              fontFamily:"var(--mono)", fontSize:11, fontWeight:700, transition:"all .15s",
              background:  provider === p ? "rgba(0,212,170,.1)"  : "transparent",
              borderColor: provider === p ? "rgba(0,212,170,.35)" : "var(--border2)",
              color:       provider === p ? "var(--teal)"         : "var(--text3)",
            }}>
              {p === "github" ? "🐙 GitHub" : "🦊 GitLab"}
            </button>
          ))}
        </div>

        <div style={{ marginBottom:12 }}>
          <label className="gb-input-label">Repository</label>
          <input
            className="gb-input-field"
            placeholder="owner/repo  or  github.com/owner/repo"
            value={repoInput}
            onChange={e => setRepoInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && repoInput.trim() && doConnect()}
          />
          <div style={{ fontSize:10, color:"var(--text3)", marginTop:4, fontFamily:"var(--mono)" }}>e.g. octocat/hello-world</div>
        </div>

        <div style={{ marginBottom:16 }}>
          <label className="gb-input-label">Personal Access Token</label>
          <input
            type="password"
            className="gb-input-field"
            placeholder="ghp_••••••••••••••••••"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
          />
          <div style={{ fontSize:10, color:"var(--text3)", marginTop:4, fontFamily:"var(--mono)", lineHeight:1.7 }}>
            Requires <strong style={{ color:"rgba(0,212,170,.55)" }}>repo</strong> scope.
            Token is session-only and never stored externally.
          </div>

          <div style={{ marginTop:8, padding:"10px 12px", background:"rgba(77,159,255,.06)", border:"1px solid rgba(77,159,255,.15)", borderRadius:"var(--r)", fontSize:11, fontFamily:"var(--mono)", color:"rgba(77,159,255,.75)", lineHeight:1.7 }}>
            ℹ️ Pushes via GitHub REST API (api.github.com). Ensure your token has <strong>repo</strong> scope for write access.
          </div>
        </div>

        {connecting ? (
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"rgba(0,212,170,.06)", borderRadius:"var(--r)", border:"1px solid rgba(0,212,170,.18)" }}>
            <div className="gb-spinner"/>
            <span style={{ fontFamily:"var(--mono)", fontSize:12, color:"var(--teal)" }}>{step}</span>
          </div>
        ) : (
          <div style={{ display:"flex", gap:8 }}>
            <button
              className="gb-btn gb-btn-teal"
              style={{ flex:1, justifyContent:"center", padding:8 }}
              onClick={doConnect}
              disabled={!repoInput.trim()}
            >
              🔗 Connect Repository
            </button>
            <button className="gb-btn gb-btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Push Result Overlay ──────────────────────────────────────

function PushResultOverlay({ result, onClose }) {
  const ok = result.ok;
  return (
    <div className="gb-result-overlay">
      <div className="gb-result-card">
        <div style={{ fontSize:40, marginBottom:12, animation: ok ? "pushSuccess .5s ease" : "none" }}>
          {ok ? "🚀" : "💥"}
        </div>
        <div style={{ fontWeight:700, fontSize:18, color: ok ? "var(--teal)" : "var(--pink)", marginBottom:8 }}>
          {ok ? "Pushed Successfully!" : "Push Failed"}
        </div>
        {ok ? (
          <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--text2)", marginBottom:10, lineHeight:1.9 }}>
            📄 {result.file}<br/>🔗 {result.repo}
            {result.commitUrl && (
              <><br/><a href={result.commitUrl} target="_blank" rel="noopener noreferrer" style={{ color:"var(--blue)", textDecoration:"none" }}>View commit on GitHub →</a></>
            )}
          </div>
        ) : (
          <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"rgba(255,100,100,.85)", background:"var(--red2)", border:"1px solid rgba(255,79,79,.2)", borderRadius:"var(--r2)", padding:"10px 12px", marginBottom:12, textAlign:"left", lineHeight:1.8, whiteSpace:"pre-wrap" }}>
            {result.error}
          </div>
        )}
        <button className="gb-btn gb-btn-ghost" style={{ width:"100%", justifyContent:"center", marginTop:6 }} onClick={onClose}>
          {ok ? "✓ Done" : "✕ Dismiss"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function GitBridge({ onClose, editorCode, editorLang }) {
  const [connected,      setConnected]      = useState(false);
  const [repoName,       setRepoName]       = useState("");
  const [savedToken,     setSavedToken]     = useState("");
  const [provider,       setProvider]       = useState("github");
  const [showConnect,    setShowConnect]    = useState(false);
  const [currentBranch,  setCurrentBranch]  = useState("feat/git-bridge");
  const [selectedCommit, setSelectedCommit] = useState(MOCK_COMMITS[0]);
  const [selectedFile,   setSelectedFile]   = useState(MOCK_FILES[0]);
  const [mainTab,        setMainTab]        = useState("diff");
  const [sideTab,        setSideTab]        = useState("files");
  const [toast,          setToast]          = useState(null);
  const [toastColor,     setToastColor]     = useState("#00d4aa");
  const [liveActivity,   setLiveActivity]   = useState(MOCK_ACTIVITY);
  const [isPushing,      setIsPushing]      = useState(false);
  const [pushProgress,   setPushProgress]   = useState(0);
  const [pushResult,     setPushResult]     = useState(null);

  const toastTimer = useRef(null);

  const showToast = useCallback((msg, color = "#00d4aa") => {
    setToast(msg);
    setToastColor(color);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(() => {
    if (!connected) return;
    const LIVE = [
      { icon:"🔄", bg:"rgba(77,159,255,.1)",  title:"Remote sync: origin/main updated (2 commits behind)", meta:"Auto-fetch · just now" },
      { icon:"💡", bg:"rgba(155,109,255,.1)", title:"AI suggested commit: 'refactor: clean up diff utilities'", meta:"CKC-AI · just now" },
      { icon:"✅", bg:"rgba(0,212,170,.1)",   title:"CI check passed on feat/git-bridge", meta:"GitHub Actions · 1m ago" },
    ];
    let idx = 0;
    const iv = setInterval(() => {
      setLiveActivity(prev => [LIVE[idx++ % LIVE.length], ...prev].slice(0, 14));
    }, 9000);
    return () => clearInterval(iv);
  }, [connected]);

  const handleConnect = useCallback(({ repo, authToken, provider: prov }) => {
    setRepoName(repo);
    setSavedToken(authToken);
    setProvider(prov || "github");
    setConnected(true);
    setShowConnect(false);
    if (!authToken) {
      showToast(`Connected to ${repo} (no token — push disabled)`, "#f5a623");
    } else {
      showToast(`Connected to ${repo} ✓`);
    }
  }, [showToast]);

  // ── FIXED: Real GitHub push using correct api.github.com endpoint ──
  const handleCommit = useCallback(async (commitMsg, targetFile) => {
    if (!savedToken || !repoName) {
      showToast("No GitHub token — reconnect repo with a token.", "#ff4f4f");
      return;
    }

    const code = (editorCode && editorCode.trim()) ? editorCode : FALLBACK_CODE;

    setIsPushing(true);
    setPushProgress(10);
    setPushResult(null);

    // ✅ FIX: Use the correct absolute GitHub API URL (not a relative path)
    const apiBase  = `https://api.github.com/repos/${repoName}/contents/${targetFile}`;
    const headers  = {
      "Authorization":        `Bearer ${savedToken}`,
      "Accept":               "application/vnd.github+json",
      "Content-Type":         "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    try {
      setPushProgress(30);

      // Step 1: GET existing file SHA (needed for updates; omit for new files)
      let existingSha;
      const getRes = await fetch(apiBase, { headers });

      if (getRes.ok) {
        const data = await getRes.json();
        existingSha = data.sha;
      } else if (getRes.status === 404) {
        // File doesn't exist yet — that's fine, we'll create it
        existingSha = undefined;
      } else if (getRes.status === 401) {
        throw new Error("Unauthorized — token missing 'repo' scope or expired.");
      } else if (getRes.status === 403) {
        throw new Error("Forbidden — no write access to this repository.");
      } else {
        const errBody = await getRes.json().catch(() => ({}));
        throw new Error(errBody.message || `GitHub API error ${getRes.status}`);
      }

      setPushProgress(65);

      // Step 2: PUT (create or update) the file
      const body = {
        message: commitMsg,
        content: utf8ToB64(code),
        ...(existingSha ? { sha: existingSha } : {}),
      };

      const putRes = await fetch(apiBase, {
        method:  "PUT",
        headers,
        body:    JSON.stringify(body),
      });

      setPushProgress(90);

      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        if (putRes.status === 401) throw new Error("Unauthorized: token invalid or missing 'repo' scope.");
        if (putRes.status === 403) throw new Error("Forbidden: no write access to this repository.");
        if (putRes.status === 409) throw new Error("Conflict: file modified remotely. Fetch latest and retry.");
        if (putRes.status === 422) throw new Error("Unprocessable: " + (err.message || "Invalid request."));
        throw new Error(err.message || `Push failed with status ${putRes.status}`);
      }

      const result = await putRes.json();
      setPushProgress(100);

      setLiveActivity(prev => [{
        icon: existingSha ? "✏️" : "✨",
        bg:   "rgba(0,212,170,.1)",
        title: `Pushed "${commitMsg.slice(0, 48)}${commitMsg.length > 48 ? "…" : ""}" → ${targetFile}`,
        meta: "You · just now",
      }, ...prev].slice(0, 14));

      setPushResult({ ok: true, file: targetFile, repo: repoName, commitUrl: result?.commit?.html_url });
      showToast(`Pushed to ${targetFile} ✓`);

    } catch (err) {
      console.error("[GitBridge push error]", err);
      setPushResult({ ok: false, error: err.message || "Unknown error occurred." });
      showToast("Push failed: " + (err.message?.slice(0, 60) ?? "unknown"), "#ff4f4f");
    } finally {
      setIsPushing(false);
      setTimeout(() => setPushProgress(0), 600);
    }
  }, [savedToken, repoName, editorCode, showToast]);

  const totalAdds = MOCK_FILES.reduce((s, f) => s + f.adds, 0);
  const totalDels = MOCK_FILES.reduce((s, f) => s + f.dels, 0);
  const hasToken  = Boolean(savedToken);

  return (
    <>
      <style>{GIT_CSS}</style>
      <div className="gb-shell">

        {/* ─ HEADER ─ */}
        <div className="gb-header">
          <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#00d4aa,#4d9fff)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>🔀</div>
          <div>
            <div className="gb-logo-text">Git Bridge</div>
            <div className="gb-logo-sub">Version Control · GitHub / GitLab</div>
          </div>

          {connected ? (
            <>
              <div
                className="gb-repo-badge"
                onClick={() => setShowConnect(true)}
                title="Click to reconnect / update token"
              >
                🐙 {repoName}
              </div>
              <div className="gb-branch-badge">
                <BranchSVG color="#00d4aa"/>
                {currentBranch}
              </div>
            </>
          ) : (
            <button className="gb-btn gb-btn-teal" onClick={() => setShowConnect(true)}>
              🔗 Connect Repo
            </button>
          )}

          <div style={{ flex:1 }}/>

          <div className={"gb-status-pill " + (connected ? "on" : "off")}>
            <StatusDot live={connected}/>
            {connected ? "Connected" : "Disconnected"}
          </div>

          {connected && (
            <button
              className="gb-btn gb-btn-ghost"
              style={{ fontSize:11, padding:"4px 10px" }}
              onClick={() => showToast("Fetching from remote…", "#4d9fff")}
            >
              ⬇ Fetch
            </button>
          )}

          {onClose && (
            <button className="gb-btn gb-btn-ghost" style={{ fontSize:11, padding:"4px 10px" }} onClick={onClose}>
              ✕ Close
            </button>
          )}
        </div>

        {/* Push progress bar */}
        {isPushing && pushProgress > 0 && (
          <div className="gb-push-bar">
            <div className="gb-push-bar-fill" style={{ width:`${pushProgress}%` }}/>
          </div>
        )}

        {/* ─ BODY ─ */}
        <div className="gb-body" style={{ flex:1 }}>

          {pushResult && <PushResultOverlay result={pushResult} onClose={() => setPushResult(null)}/>}
          {showConnect && (
            <ConnectModal
              onConnect={handleConnect}
              onClose={() => setShowConnect(false)}
              initialRepo={repoName}
            />
          )}

          {toast && (
            <div className="gb-toast">
              <span className="gb-status-dot" style={{ background:toastColor, boxShadow:`0 0 7px ${toastColor}` }}/>
              <span style={{ flex:1 }}>{toast}</span>
              <button onClick={() => setToast(null)} style={{ background:"none", border:"none", color:"var(--text3)", cursor:"pointer", fontSize:13 }}>✕</button>
            </div>
          )}

          {!connected ? (
            <div className="gb-empty" style={{ gridColumn:"1/-1" }}>
              <div className="gb-empty-icon">🔀</div>
              <div style={{ fontWeight:700, fontSize:18, color:"var(--text)" }}>Connect a Repository</div>
              <div style={{ fontSize:13, color:"var(--text3)", lineHeight:1.8, fontFamily:"var(--mono)", textAlign:"center" }}>
                Link your GitHub repo to view live diffs,<br/>commit history, branches, and push code.
              </div>
              <button
                className="gb-btn gb-btn-teal"
                style={{ fontSize:13, padding:"8px 22px", marginTop:6 }}
                onClick={() => setShowConnect(true)}
              >
                🔗 Connect GitHub / GitLab
              </button>
              <div style={{ fontSize:11, color:"var(--text3)", fontFamily:"var(--mono)", marginTop:4 }}>
                GitHub REST API · Token scoped to your repo only
              </div>
            </div>
          ) : (
            <>
              {/* ═══ SIDEBAR ═══ */}
              <div className="gb-sidebar">
                <div className="gb-tabs">
                  {[["files","📄 Changed"],["branches","🌿 Branches"]].map(([v, l]) => (
                    <button key={v} className={"gb-tab " + (sideTab === v ? "active" : "")} onClick={() => setSideTab(v)}>{l}</button>
                  ))}
                </div>

                {sideTab === "files" && (
                  <div className="gb-scroll-area">
                    <div className="gb-sec-label">
                      Working Tree
                      <span style={{ background:"rgba(255,255,255,.06)", color:"var(--text3)", borderRadius:100, padding:"1px 7px", fontSize:10 }}>{MOCK_FILES.length}</span>
                    </div>
                    {MOCK_FILES.map((f, i) => (
                      <div
                        key={i}
                        className={"gb-file-item " + (selectedFile === f ? "sel" : "")}
                        onClick={() => { setSelectedFile(f); setMainTab("diff"); }}
                      >
                        <div className={"gb-fs-badge gb-fs-" + f.status}>{f.status}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div className="gb-file-name">{f.name}</div>
                          <div className="gb-file-path">{f.path}</div>
                        </div>
                        <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                          {f.adds > 0 && <span style={{ fontSize:10, color:"var(--teal)", fontFamily:"var(--mono)" }}>+{f.adds}</span>}
                          {f.dels > 0 && <span style={{ fontSize:10, color:"var(--pink)", fontFamily:"var(--mono)" }}>−{f.dels}</span>}
                        </div>
                      </div>
                    ))}
                    <div style={{ padding:"10px 14px", borderTop:"1px solid var(--border)", fontFamily:"var(--mono)", fontSize:11, color:"var(--text3)" }}>
                      <span style={{ color:"var(--teal)" }}>+{totalAdds}</span> additions · <span style={{ color:"var(--pink)" }}>−{totalDels}</span> deletions
                    </div>
                  </div>
                )}

                {sideTab === "branches" && (
                  <div className="gb-scroll-area">
                    <div className="gb-sec-label">Local</div>
                    {MOCK_BRANCHES.filter(b => !b.isRemote).map(b => (
                      <div
                        key={b.name}
                        className={"gb-branch-item " + (currentBranch === b.name ? "active" : "")}
                        onClick={() => { setCurrentBranch(b.name); showToast(`Switched to ${b.name}`); }}
                      >
                        <StatusDot
                          live={b.isDefault}
                          style={{ background: b.isDefault ? "var(--teal)" : currentBranch === b.name ? "var(--blue)" : "rgba(255,255,255,.18)", boxShadow:"none", animation:"none" }}
                        />
                        <BranchSVG color={currentBranch === b.name ? "var(--blue)" : "rgba(255,255,255,.3)"}/>
                        <span className={"gb-branch-name " + (currentBranch !== b.name ? "dim" : "")}>{b.name}</span>
                        {b.ahead > 0 && <span className="gb-ahead-pill">↑{b.ahead}</span>}
                      </div>
                    ))}
                    <div className="gb-sec-label" style={{ marginTop:4 }}>Remote</div>
                    {MOCK_BRANCHES.filter(b => b.isRemote).map(b => (
                      <div key={b.name} className="gb-branch-item">
                        <StatusDot live={false}/>
                        <BranchSVG color="rgba(255,255,255,.25)"/>
                        <span className="gb-branch-name dim">{b.name}</span>
                        {b.ahead > 0 && <span className="gb-ahead-pill" style={{ color:"var(--pink)", background:"var(--pink2)", borderColor:"rgba(255,95,160,.22)" }}>↑{b.ahead}</span>}
                      </div>
                    ))}
                    <div style={{ padding:"10px 14px", borderTop:"1px solid var(--border)", marginTop:4 }}>
                      <button
                        className="gb-btn gb-btn-ghost"
                        style={{ width:"100%", justifyContent:"center", fontSize:11 }}
                        onClick={() => showToast("New branch created: feat/new-feature")}
                      >
                        + New Branch
                      </button>
                    </div>
                  </div>
                )}

                <AICommitPanel onCommit={handleCommit} isPushing={isPushing} hasToken={hasToken}/>
              </div>

              {/* ═══ MAIN ═══ */}
              <div className="gb-main">
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
                  <div className="gb-tabs" style={{ borderBottom:"none", flex:1 }}>
                    {[["diff","⬡ Diff"],["history","⏱ History"],["prs","🔀 Pull Requests"],["activity","⚡ Activity"]].map(([v, l]) => (
                      <button key={v} className={"gb-tab " + (mainTab === v ? "active" : "")} onClick={() => setMainTab(v)}>{l}</button>
                    ))}
                  </div>
                  <div className="gb-stats-bar" style={{ borderBottom:"none", borderLeft:"1px solid var(--border)" }}>
                    <span className="gb-stat-chip"><StatusDot live={true}/> <strong style={{ color:"var(--teal)" }}>Live</strong></span>
                    <span className="gb-stat-chip">🔀 <strong>{MOCK_PRS.filter(p => p.status === "open").length}</strong> PRs</span>
                    <span className="gb-stat-chip">↑ <strong style={{ color:"var(--blue)" }}>4</strong></span>
                  </div>
                </div>

                {mainTab === "diff" && <DiffView file={selectedFile} diff={MOCK_DIFF}/>}

                {mainTab === "history" && (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", height:"100%", overflow:"hidden" }}>
                    <CommitHistory commits={MOCK_COMMITS} selectedSha={selectedCommit?.sha} onSelect={setSelectedCommit}/>
                    {selectedCommit && (
                      <div style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>
                        <div style={{ padding:"14px 16px", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
                          <div className="gb-commit-sha" style={{ marginBottom:5 }}>{selectedCommit.sha}</div>
                          <div style={{ fontSize:14, color:"var(--text)", fontWeight:600, lineHeight:1.4 }}>{selectedCommit.msg}</div>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}>
                            <span className="gb-avatar" style={{ background:selectedCommit.bg, color:selectedCommit.color, width:22, height:22, fontSize:9 }}>{selectedCommit.avatar}</span>
                            <span style={{ fontSize:12, color:"var(--text2)" }}>{selectedCommit.author} · {selectedCommit.time}</span>
                            <span style={{ marginLeft:"auto", color:"var(--teal)", fontSize:11, fontFamily:"var(--mono)" }}>+{selectedCommit.adds}</span>
                            <span style={{ color:"var(--pink)", fontSize:11, fontFamily:"var(--mono)" }}>−{selectedCommit.dels}</span>
                          </div>
                        </div>
                        <div className="gb-scroll-area" style={{ padding:"12px 16px" }}>
                          {MOCK_FILES.slice(0, 3).map((f, i) => (
                            <div key={i} className="gb-file-item" style={{ padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
                              <div className={"gb-fs-badge gb-fs-" + f.status}>{f.status}</div>
                              <span style={{ fontFamily:"var(--mono)", fontSize:12, color:"var(--text)", flex:1 }}>{f.name}</span>
                              <span style={{ color:"var(--teal)", fontSize:11, fontFamily:"var(--mono)" }}>+{f.adds}</span>
                              <span style={{ color:"var(--pink)", fontSize:11, fontFamily:"var(--mono)", marginLeft:5 }}>−{f.dels}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {mainTab === "prs" && (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", height:"100%", overflow:"hidden" }}>
                    <PRList prs={MOCK_PRS}/>
                    <div style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>
                      <div className="gb-sec-label">Review Actions</div>
                      <div className="gb-scroll-area" style={{ padding:"0 14px" }}>
                        {MOCK_PRS.filter(p => p.status === "open").map(pr => (
                          <div key={pr.id} style={{ marginBottom:12, padding:14, background:"rgba(255,255,255,.02)", borderRadius:"var(--r2)", border:"1px solid var(--border)" }}>
                            <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text3)", marginBottom:5 }}>PR #{pr.id} · {pr.branch}</div>
                            <div style={{ fontSize:13, color:"var(--text)", fontWeight:600, marginBottom:10, lineHeight:1.4 }}>{pr.title}</div>
                            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                              <button className="gb-btn gb-btn-teal"   style={{ fontSize:10, padding:"3px 10px" }} onClick={() => showToast(`PR #${pr.id} approved ✓`)}>✓ Approve</button>
                              <button className="gb-btn gb-btn-violet" style={{ fontSize:10, padding:"3px 10px" }} onClick={() => showToast("Review submitted")}>💬 Review</button>
                              <button className="gb-btn gb-btn-rose"   style={{ fontSize:10, padding:"3px 10px" }} onClick={() => showToast("Changes requested")}>✕ Request Changes</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {mainTab === "activity" && (
                  <div className="gb-scroll-area">
                    <div className="gb-sec-label">
                      Live Activity
                      <StatusDot live={true}/>
                      <span style={{ color:"rgba(0,212,170,.5)", fontSize:10 }}>Streaming</span>
                    </div>
                    {liveActivity.map((item, i) => (
                      <div key={i} className="gb-activity-item" style={{ animationDelay:`${i * 0.04}s` }}>
                        <div className="gb-activity-icon" style={{ background:item.bg }}>{item.icon}</div>
                        <div>
                          <div style={{ fontSize:13, color:"var(--text)", lineHeight:1.4 }}>{item.title}</div>
                          <div style={{ fontSize:11, color:"var(--text3)", marginTop:2, fontFamily:"var(--mono)" }}>{item.meta}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ─ FOOTER ─ */}
        <div className="gb-footer">
          <StatusDot live={connected}/>
          <span>
            {connected
              ? `${repoName} · ${currentBranch} · GitHub REST API v3${!hasToken ? " · ⚠ no token" : ""}`
              : "Not connected to any repository"}
          </span>
          <span style={{ marginLeft:"auto", color:"rgba(232,234,240,.18)" }}>Token scoped to session · Module 14</span>
        </div>

      </div>
    </>
  );
}