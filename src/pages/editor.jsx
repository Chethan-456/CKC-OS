import React, { useState, useEffect, useRef, useCallback, forwardRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "./auth.jsx";
import KnowledgeGraphEngine from "./Knowledge.jsx";

import { authStore, PALETTE, LANGS, LK, initials, genSid } from "../constants.js";


import { nowTs, applyOpToString, generateBotAnnotation, genLogEntry } from "../utils/editor/helpers.js";
import { validateCode, formatCode } from "../utils/editor/validator.js";
import { validateAndRun } from "../utils/editor/runners.js";
import { OTEngine } from "../utils/editor/legacyOT.js";
// ═══════════ STARTERS ═══════════
const STARTERS = {
  ts: ``,
  js: ``,
  py: ``,
  java: ``,
  cpp: ``,
  rs: ``,
  go: ``,
  sql: ``,
};

// ═══════════════════════════════════════════════════════════════
// ═══════════ CSS ═══════════
import "../assets/editor.css";

import { CMEditor } from "../components/editor/CMEditor.jsx";


import { ErrorPopup } from "../components/editor/ErrorPopup.jsx";
import { TypingIndicator } from "../components/editor/TypingIndicator.jsx";
import { DebuggingRoom } from "../components/editor/DebuggingRoom.jsx";
import { LiveServerLogs } from "../components/editor/LiveServerLogs.jsx";
import { AccessTerminal } from "../components/editor/AccessTerminal.jsx";
// ═══════════ MAIN APP ═══════════
export default function EditorPage() {
  const { user, loading: authLoading, logout } = useAuth();
  if (authLoading) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#05070a" }}>
      <div className="spin" style={{ width: 40, height: 40, border: "3px solid rgba(79,193,255,.1)", borderTopColor: "#4FC1FF", borderRadius: "50%" }} />
    </div>
  );
  if (!user) return (<><style dangerouslySetInnerHTML={{ __html: CSS }} /><AccessTerminal /></>);
  return (<><style dangerouslySetInnerHTML={{ __html: CSS }} /><Shell user={user} onLogout={logout} /></>);
}

// ═══════════ SHELL ═══════════
function Shell({ user, onLogout }) {
  const me = {
    name: user?.name || "Developer",
    color: user?.cursorColor || "#4FC1FF",
    cursorColor: user?.cursorColor || "#4FC1FF",
    bg: user?.bg || "rgba(79,193,255,0.15)",
    inits: user?.inits || "D",
    id: user?.id || "anon",
    email: user?.email || "",
  };
  const sid = user?.sid || "default-session";
  const myId = useRef(user.id);
  const instanceId = useRef(Math.random().toString(36).substring(7)).current;
  const [cursors, setCursors] = useState([]);
  const [crdt, setCrdt] = useState([]);
  const [wsLog, setWsLog] = useState([]);
  const [opCnt, setOpCnt] = useState(0);
  const [lang, setLang] = useState("ts");
  const [tabs, setTabs] = useState([
    { id: "t_main", name: "main.ts", lang: "ts", dirty: false, isNew: false }
  ]);
  const [activeTab, setActiveTab] = useState("t_main");
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [rpTab, setRpTab] = useState("crdt");
  const [outTab, setOutTab] = useState("output");
  const [outOpen, setOutOpen] = useState(false);
  const [output, setOutput] = useState("");
  const [outIsErr, setOutIsErr] = useState(false);
  const [running, setRunning] = useState(false);
  const [pyReady, setPyReady] = useState(false);
  const [errPopup, setErrPopup] = useState(null);
  const [errShake, setErrShake] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQ, setCmdQ] = useState("");
  const [cmdSel, setCmdSel] = useState(0);
  const [notif, setNotif] = useState(null);
  const [newEdLang, setNewEdLang] = useState("ts");
  const [connectedCount, setConnectedCount] = useState(1);
  const [liveValidation, setLiveValidation] = useState(null);
  const [lineLocks, setLineLocks] = useState({});
  const [showDebugRoom, setShowDebugRoom] = useState(false);
  const [showServerLogs, setShowServerLogs] = useState(false);
  const [mobilePanelTab, setMobilePanelTab] = useState("editor");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [knowledgeCode, setKnowledgeCode] = useState("");

  const channelRef = useRef(null);
  const liveValTimer = useRef(null);
  const activeEditorRef = useRef(null);
  const notifTmr = useRef(null);

  const getEng = useCallback((lk) => WS.eng(lk), []);
  const toast = useCallback((msg, ms = 2500) => { clearTimeout(notifTmr.current); setNotif(msg); notifTmr.current = setTimeout(() => setNotif(null), ms); }, []);

  useEffect(() => {
    const channel = supabase.channel("global-workspace");
    channelRef.current = channel;
    const bc = new BroadcastChannel("ckc_os_sync");

    const handleMessage = ({ type, payload }) => {
      if (payload.instanceId === instanceId) return;
      
      switch (type) {
        case "join":
          bc.postMessage({ type: "presence", payload: { id: me.id, instanceId, name: me.name, color: me.cursorColor, line: cursor.line, col: cursor.col, tabId: activeTab } });
          break;
        case "op":
          if (payload.tabId === activeTab) {
            activeEditorRef.current?._applyRemoteOp?.(payload.op, payload.fullCode);
          }
          setTabs(prev => prev.map(t => t.id === payload.tabId ? { ...t, code: payload.fullCode ?? applyOpToString(t.code || "", payload.op) } : t));
          setOpCnt(c => c + 1);
          setCrdt(p => [{ ...payload.op, from: payload.name, t: nowTs() }, ...p].slice(0, 40));
          break;
        case "cursor":
          setCursors(prev => [...prev.filter(c => c.id !== payload.id), { ...payload, online: true }]);
          break;
        case "tabSync":
          setTabs(prev => {
            const exists = prev.find(t => t.id === payload.tab.id);
            if (exists) return prev;
            return [...prev, payload.tab];
          });
          toast(`${payload.name} opened ${payload.tab.name}`);
          bc.postMessage({ type: "stateRequest", payload: { tabId: payload.tab.id, requesterId: me.id, instanceId } });
          channel.send({ type: "broadcast", event: "stateRequest", payload: { tabId: payload.tab.id, requesterId: me.id, instanceId } });
          break;
        case "stateRequest":
          if (payload.requesterId !== me.id) {
            const tab = tabs.find(t => t.id === payload.tabId);
            const currentCode = (payload.tabId === activeTab) ? (activeEditorRef.current?._getText?.() || "") : (tab?.code || "");
            if (currentCode) {
              const resp = { type: "stateResponse", payload: { tabId: payload.tabId, code: currentCode, toId: payload.requesterId, instanceId } };
              bc.postMessage(resp);
              channel.send({ type: "broadcast", event: "stateResponse", payload: resp.payload });
            }
          }
          break;
        case "stateResponse":
          if (payload.toId === me.id) {
            setTabs(prev => prev.map(t => t.id === payload.tabId ? { ...t, code: payload.code } : t));
          }
          break;
        case "presence":
          setCursors(prev => {
            const exists = prev.find(c => c.id === payload.id);
            if (exists) return prev.map(c => c.id === payload.id ? { ...c, ...payload, online: true } : c);
            return [...prev, { ...payload, online: true }];
          });
          break;
      }
    };

    bc.onmessage = (e) => handleMessage(e.data);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat();
        setConnectedCount(users.length);
        setCursors(prev => {
          const remote = users.map(u => ({ id: u.user_id, name: u.name, color: u.color, line: u.line || 1, col: u.col || 1, tabId: u.tabId, online: true }));
          const local = prev.filter(c => c.id.startsWith("guest_") && !users.find(u => u.user_id === c.id));
          return [...remote, ...local];
        });
        const onlineUserIds = users.map(u => u.user_id);
        if (onlineUserIds.length > 0 && !me.id.startsWith("guest_")) {
          supabase.from("line_locks").select("user_id").then(({ data }) => {
            if (data) {
              const staleUserIds = data.map(l => l.user_id).filter(id => !onlineUserIds.includes(id) && !id.startsWith("guest_"));
              if (staleUserIds.length > 0) {
                supabase.from("line_locks").delete().in("user_id", staleUserIds).then();
              }
            }
          });
        }
      })
      .on("broadcast", { event: "op" }, ({ payload }) => handleMessage({ type: "op", payload }))
      .on("broadcast", { event: "cursor" }, ({ payload }) => handleMessage({ type: "cursor", payload }))
      .on("broadcast", { event: "tabSync" }, ({ payload }) => handleMessage({ type: "tabSync", payload }))
      .on("broadcast", { event: "stateRequest" }, ({ payload }) => handleMessage({ type: "stateRequest", payload }))
      .on("broadcast", { event: "stateResponse" }, ({ payload }) => handleMessage({ type: "stateResponse", payload }))
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: me.id, name: me.name, color: me.cursorColor, line: cursor.line, col: cursor.col, tabId: activeTab, online: true, instanceId });
          bc.postMessage({ type: "join", payload: { id: me.id, instanceId } });
          bc.postMessage({ type: "presence", payload: { id: me.id, instanceId, name: me.name, color: me.cursorColor, line: cursor.line, col: cursor.col, tabId: activeTab } });
          tabs.forEach(t => {
            channel.send({ type: "broadcast", event: "stateRequest", payload: { tabId: t.id, requesterId: me.id, instanceId } });
            bc.postMessage({ type: "stateRequest", payload: { tabId: t.id, requesterId: me.id, instanceId } });
          });
        }
      });

    const lockSub = supabase.channel("line_locks")
      .on("postgres_changes", { event: "*", schema: "public", table: "line_locks" }, payload => {
        if (payload.eventType === "DELETE") {
          setLineLocks(prev => { const next = { ...prev }; delete next[payload.old.line_number]; return next; });
        } else {
          setLineLocks(prev => ({ ...prev, [payload.new.line_number]: payload.new }));
        }
      }).subscribe();

    supabase.from("line_locks").select("*").then(({ data }) => {
      if (data) { const locks = {}; data.forEach(l => locks[l.line_number] = l); setLineLocks(locks); }
    });

    const handleLockToast = (e) => {
      const { line, userName } = e.detail;
      toast(`Line ${line} is locked by ${userName}`);
    };
    window.addEventListener("line-locked-toast", handleLockToast);

    return () => { 
      channel.unsubscribe(); 
      lockSub.unsubscribe(); 
      window.removeEventListener("line-locked-toast", handleLockToast);
      if (!me.id.startsWith("guest_")) {
        supabase.from("line_locks").delete().eq("user_id", me.id).then();
      }
    };
  }, [activeTab, tabs.length]);

  const triggerLiveValidation = useCallback((code, lk) => {
    clearTimeout(liveValTimer.current);
    liveValTimer.current = setTimeout(() => {
      if (!code || code.trim().length < 3) { setLiveValidation(null); return; }
      setLiveValidation(validateCode(lk, code));
    }, 600);
  }, []);

  const handleLocalOp = useCallback(op => {
    if (lineLocks[cursor.line] && lineLocks[cursor.line].user_id !== me.id) { toast("Line locked by " + lineLocks[cursor.line].user_name); return; }
    const fullCode = activeEditorRef.current?._getText?.() || "";
    const payload = { uid: me.id, instanceId, name: me.name, lang, op, tabId: activeTab, tabName: tabs.find(t => t.id === activeTab)?.name || "scratch", fullCode };
    channelRef.current?.send({ type: "broadcast", event: "op", payload });
    new BroadcastChannel("ckc_os_sync").postMessage({ type: "op", payload });

    setTabs(prev => prev.map(t => t.id === activeTab ? { ...t, code: fullCode, dirty: true } : t));
    setOpCnt(c => c + 1);
    setCrdt(p => [{ ...op, from: "me", t: nowTs() }, ...p].slice(0, 40));
    triggerLiveValidation(fullCode, lang);
  }, [lang, me, instanceId, cursor, lineLocks, toast, triggerLiveValidation, activeTab, tabs]);

  const handleCursorMove = useCallback(async (line, col) => {
    setCursor({ line, col });
    const payload = { id: me.id, instanceId, name: me.name, color: me.cursorColor, line, col, lang, tabId: activeTab };
    channelRef.current?.send({ type: "broadcast", event: "cursor", payload });
    new BroadcastChannel("ckc_os_sync").postMessage({ type: "cursor", payload });

    try {
      if (!me.id.startsWith("guest_")) {
        await supabase.from("line_locks").delete().eq("user_id", me.id);
        await supabase.from("line_locks").insert({ document_id: lang, line_number: line, user_id: me.id, user_name: me.name, color: me.cursorColor });
      }
    } catch (err) { console.error("Lock error:", err); }
  }, [lang, me, instanceId, activeTab]);

  const switchLang = useCallback(lk => {
    if (activeTab) { const txt = activeEditorRef.current?._getText() || ""; setTabs(p => p.map(t => t.id === activeTab ? { ...t, code: txt } : t)); }
    setLang(lk); setLiveValidation(null);
  }, [activeTab]);

  const triggerError = useCallback((msg, cLang) => {
    setErrPopup({ msg, lang: cLang }); setErrShake(true); setTimeout(() => setErrShake(false), 400);
  }, []);

  const handleRun = useCallback(async () => {
    setRunning(true); setOutOpen(true); setOutTab("output"); setErrPopup(null);
    const currentTab = tabs.find(t => t.id === activeTab);
    const cLang = currentTab?.lang || lang;
    let code = activeEditorRef.current?._getText?.() || "";
    if (!code.trim()) code = getEng(cLang).text;
    setOutput(`⟳  Validating ${LANGS[cLang]?.n || cLang} syntax…`);
    setOutIsErr(false);
    try {
      const result = await validateAndRun(cLang, code, pyReady, setPyReady);
      setOutput(result.output || (result.hasError ? "" : "(no output)"));
      setOutIsErr(result.hasError);
      if (result.hasError && result.errorMsg) triggerError(result.errorMsg, cLang);
    } catch (e) {
      const msg = "Execution Error: " + e.message;
      setOutput(msg); setOutIsErr(true); triggerError(msg, cLang);
    }
    setRunning(false);
  }, [lang, activeTab, tabs, getEng, pyReady, triggerError]);

  const createNewEditor = useCallback(() => {
    const id = "new-" + Date.now();
    const ext = LANGS[newEdLang]?.ext?.split(".")[1] || newEdLang;
    const shortName = me.name ? me.name.split(" ")[0].toLowerCase() : "user";
    const newTab = { id, name: `scratch-${shortName}.${ext}`, lang: newEdLang, dirty: false, isNew: true, code: "" };
    setTabs(p => [...p, newTab]);
    setActiveTab(id); switchLang(newEdLang);
    toast(`New ${LANGS[newEdLang]?.n} editor opened`);
    const payload = { uid: me.id, instanceId, name: me.name, tab: newTab };
    channelRef.current?.send({ type: "broadcast", event: "tabSync", payload });
    new BroadcastChannel("ckc_os_sync").postMessage({ type: "tabSync", payload });
  }, [newEdLang, switchLang, toast, me.id, me.name, instanceId]);

  const CMDS = [
    { ic: "▶", lb: "Run Code", kb: "Ctrl+Enter", fn: handleRun },
    { ic: "📄", lb: "New Editor", kb: "Ctrl+N", fn: createNewEditor },
    { ic: "💾", lb: "Save All", kb: "Ctrl+K S", fn: () => { setTabs(p => p.map(t => ({ ...t, dirty: false }))); toast("All files saved"); } },
    { ic: "🐛", lb: "Open Debugging Room", kb: "", fn: () => setShowDebugRoom(true) },
    { ic: "📡", lb: "Open Server Logs", kb: "", fn: () => setShowServerLogs(true) },
    { ic: "◈", lb: "Analyze with Knowledge Graph", kb: "", fn: () => { setKnowledgeCode(activeEditorRef.current?._getText?.() || ""); setOutOpen(true); setOutTab("knowledge"); } },
    { ic: "🚪", lb: "Sign Out", kb: "", fn: onLogout },
    ...LK.map(lk => ({ ic: LANGS[lk].ic, lb: `Switch to ${LANGS[lk].n}`, kb: "", fn: () => { switchLang(lk); setCmdOpen(false); } })),
  ];
  const filtCmds = cmdQ.replace(/^>/, "").trim() ? CMDS.filter(c => c.lb.toLowerCase().includes(cmdQ.replace(/^>/, "").trim().toLowerCase())) : CMDS;
  const runCmd = c => { c.fn(); setCmdOpen(false); setCmdQ(""); };

  useEffect(() => {
    const h = e => {
      const C = e.ctrlKey || e.metaKey;
      if (C && e.shiftKey && e.key === "P") { e.preventDefault(); setCmdOpen(o => !o); setCmdQ(""); }
      if (C && e.key === "Enter") { e.preventDefault(); handleRun(); }
      if (C && e.key === "n") { e.preventDefault(); createNewEditor(); }
      if (e.key === "Escape") { setCmdOpen(false); setErrPopup(null); setShowDebugRoom(false); setShowServerLogs(false); setMobileSidebarOpen(false); }
      if (cmdOpen) {
        if (e.key === "ArrowDown") { e.preventDefault(); setCmdSel(s => Math.min(s + 1, filtCmds.length - 1)); }
        if (e.key === "ArrowUp") { e.preventDefault(); setCmdSel(s => Math.max(s - 1, 0)); }
        if (e.key === "Enter") { e.preventDefault(); runCmd(filtCmds[cmdSel]); }
      }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [cmdOpen, cmdSel, handleRun, createNewEditor, filtCmds]);

  const closeTab = (id, e) => {
    e.stopPropagation();
    setTabs(p => { const nx = p.filter(t => t.id !== id); if (activeTab === id && nx.length) setActiveTab(nx[nx.length - 1].id); return nx; });
  };

  const activeCursors = cursors.filter(c => c.lang === lang && c.tabId === activeTab);
  const curEng = getEng(lang);
  const curTab = tabs.find(t => t.id === activeTab);
  const errCount = liveValidation?.errors?.length || 0;
  const warnCount = liveValidation?.warnings?.length || 0;

  const renderOutput = (text) => {
    if (!text) return <div className="ol-dim" style={{ fontFamily: "var(--mono)", fontSize: 12 }}>Press ▶ Run or Ctrl+Enter to execute</div>;
    return text.split("\n").map((line, i) => {
      let cls = "ol-info";
      if (/^❌/.test(line)) cls = "ol-err";
      else if (/^⚠/.test(line)) cls = "ol-warn";
      else if (/^\s*✖/.test(line)) cls = "ol-err";
      else if (/^✓|^✅/.test(line)) cls = "ol-ok";
      else if (/^(⟳|Compiled:|Compiling|Finished|Running|go build|g\+\+)/.test(line)) cls = "ol-build";
      else if (/^(traceback)/i.test(line.trim())) cls = "ol-warn";
      else if (/^(\w+error|\w+exception|syntaxerror)/i.test(line.trim())) cls = "ol-err";
      else if (/^(error(\[e\d+\])?:|sql error|compilation failed|fatal error)/i.test(line.trim())) cls = "ol-err";
      else if (/^warning/i.test(line.trim())) cls = "ol-warn";
      else if (line.startsWith("  File ") || /^\s+\^\s*$/.test(line)) cls = "ol-tb";
      else if (/^Process finished with exit code 0/.test(line)) cls = "ol-success";
      else if (/Query OK|row(s)? in set|row(s)? affected|Database changed/i.test(line)) cls = "ol-success";
      else if (/Fix the error/i.test(line)) cls = "ol-dim";
      return <div key={i} className={cls} style={{ fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.8 }}>{line || "\u00A0"}</div>;
    });
  };

  const renderValBadge = () => {
    if (!liveValidation) return null;
    if (liveValidation.hasError) return <div className="val-fail val-pop">⊗ {liveValidation.errors.length} error{liveValidation.errors.length > 1 ? "s" : ""}</div>;
    if (liveValidation.hasWarning) return <div className="val-warn val-pop">⚠ {liveValidation.warnings.length} warning{liveValidation.warnings.length > 1 ? "s" : ""}</div>;
    return <div className="val-pass val-pop">✓ Valid</div>;
  };

  const SB = ({ children, c, onClick }) => <span className="st" style={{ color: c || "#4a5568" }} onClick={onClick}>{children}</span>;

  // ── Sidebar content (reused for both desktop sidebar and mobile drawer) ──
  const SidebarContent = () => (
    <>
      <div className="sec-hdr">Explorer</div>
      {[{ id: "f_eng", name: "engine.ts", lang: "ts", icon: "🔷" }, { id: "f_rm", name: "README.md", lang: "md", icon: "📄" }, { id: "f_dir", name: "tests/", type: "d", icon: "📁" }, { id: "f_env", name: ".env", lang: "env", icon: "⚙" }].map(f => (
        <div key={f.id} className={`ft${activeTab === f.id ? " sel" : ""}`} onClick={() => {
          if (f.type === "d") { toast("tests/ folder"); setMobileSidebarOpen(false); return; }
          const lk = f.lang && LANGS[f.lang] ? f.lang : "ts";
          if (!tabs.find(t => t.id === f.id)) setTabs(p => [...p, { id: f.id, name: f.name, lang: lk, dirty: false, isNew: false }]);
          setActiveTab(f.id); switchLang(lk); setMobileSidebarOpen(false);
        }}>
          <span style={{ fontSize: 12, flexShrink: 0 }}>{f.icon}</span>
          <span style={{ color: activeTab === f.id ? "#4FC1FF" : "#c0c8d8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", fontSize: 12 }}>{f.name}</span>
          {f.lang && LANGS[f.lang] && <span style={{ fontSize: 9, fontWeight: 700, color: LANGS[f.lang]?.c, fontFamily: "var(--mono)", flexShrink: 0 }}>{LANGS[f.lang]?.ic}</span>}
        </div>
      ))}
      {tabs.filter(t => t.isNew).map(t => (
        <div key={t.id} className={`ft${activeTab === t.id ? " sel" : ""}`} onClick={() => { setActiveTab(t.id); switchLang(t.lang); setMobileSidebarOpen(false); }}>
          <span className="new-tab-dot" style={{ flexShrink: 0 }} />
          <span style={{ color: "#4EC9B0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", fontSize: 12 }}>{t.name}</span>
        </div>
      ))}
      <div className="divider" />
      <div className="sec-hdr" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>Collaborators</span>
        <span style={{ color: "#4EC9B0", fontSize: 9, fontWeight: 700, background: "rgba(78,201,176,.12)", border: "1px solid rgba(78,201,176,.2)", borderRadius: 10, padding: "1px 6px" }}>{connectedCount} online</span>
      </div>
      <div className="presence-card">
        <div className="presence-av" style={{ background: me.bg, color: me.color, borderColor: me.color + "66" }}>
          {me.inits}<div className="pdot" style={{ background: "#4EC9B0" }} />
        </div>
        <div className="presence-info">
          <div className="presence-name"><span style={{ color: "#e0e0e0" }}>{me.name}</span><span style={{ fontSize: 9, color: "#4a5568", background: "rgba(255,255,255,.05)", padding: "1px 5px", borderRadius: 4 }}>you</span></div>
          <div className="presence-pos" style={{ color: me.color }}>Ln {cursor.line} · Col {cursor.col}</div>
        </div>
      </div>
      {cursors.filter(c => c.id !== me.id).map((b, i) => (
        <div key={i} className="presence-card">
          <div className="presence-av" style={{ background: b.bg || "rgba(255,255,255,.05)", color: b.color, borderColor: b.color + "66" }}>
            {initials(b.name)}<div className="pdot" style={{ background: "#4EC9B0" }} />
          </div>
          <div className="presence-info">
            <div className="presence-name" style={{ color: "#c0c8d8" }}>{b.name}</div>
            <div className="presence-pos" style={{ color: b.color }}>Ln {b.line} · Col {b.col}</div>
          </div>
        </div>
      ))}
      <div className="divider" />
      <div style={{ padding: "8px 12px" }}>
        <div style={{ fontSize: 10, color: "#4a5568", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" }}>Session</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#6a7585", lineHeight: 1.8 }}>
          <div>ID: <span style={{ color: "#4FC1FF" }}>{sid.slice(0, 8)}</span></div>
          <div>Ops: <span style={{ color: "#4EC9B0" }}>{opCnt}</span></div>
          <div>Ver: <span style={{ color: "#DCDCAA" }}>v{curEng.version}</span></div>
          <div>Size: <span style={{ color: "#CE9178" }}>{curEng.text.length}ch</span></div>
        </div>
      </div>
      <div className="divider" />
      <div style={{ padding: "0 8px 8px" }}>
        <div style={{ fontSize: 10, color: "#4a5568", marginBottom: 5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" }}>Tools</div>
        <div onClick={() => { setShowDebugRoom(true); setMobileSidebarOpen(false); }} className="tool-btn dbg" style={{ marginBottom: 5, padding: "7px 10px", width: "100%" }}>
          <span>🔬</span> Debugging Room {errCount + warnCount > 0 && <span className="dbg-cnt">{errCount + warnCount}</span>}
        </div>
        <div onClick={() => { setShowServerLogs(true); setMobileSidebarOpen(false); }} className="tool-btn logs" style={{ padding: "7px 10px", width: "100%" }}>
          <span>📡</span> Server Logs Dashboard
        </div>
        <div onClick={onLogout} className="tool-btn" style={{ padding: "7px 10px", width: "100%", marginTop: 5, color: "#ff5555", background: "rgba(255,75,75,.08)", border: "1px solid rgba(255,75,75,.2)" }}>
          <span>🚪</span> Logout Session
        </div>
      </div>
    </>
  );

  return (
    <>
      
      <ErrorPopup error={errPopup?.msg || null} lang={errPopup?.lang || lang} onClose={() => setErrPopup(null)} onOpenOutput={() => { setOutOpen(true); setOutTab("output"); }} />
      {showDebugRoom && <DebuggingRoom errors={liveValidation?.errors || []} warnings={liveValidation?.warnings || []} lang={lang} me={me} onLocalOp={handleLocalOp} onClose={() => setShowDebugRoom(false)} />}
      {showServerLogs && <LiveServerLogs onClose={() => setShowServerLogs(false)} />}

      <div className="topbar">
        <div className="tb-logo"><div className="gem">⚡</div><span>CKC-OS</span></div>
        <div className="live-badge"><div className="live-dot" />LIVE · {connectedCount}</div>
        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,.06)", margin: "0 4px" }} className="divider-v" />
        
        <div onClick={() => setShowDebugRoom(true)} className="tool-btn dbg topbar-btn" style={{ marginLeft: 4 }}>
          <span>🔬</span> Debug Room {errCount + warnCount > 0 && <span className="dbg-cnt">{errCount + warnCount}</span>}
        </div>
        <div onClick={() => setShowServerLogs(true)} className="tool-btn logs topbar-btn" style={{ marginLeft: 4 }}>
          <span>📡</span> Server Logs
        </div>
        <div onClick={() => { 
          setKnowledgeCode(activeEditorRef.current?._getText?.() || "");
          setOutOpen(true); 
          setOutTab("knowledge"); 
        }} className="tool-btn logs topbar-btn" style={{ marginLeft: 4, background: "rgba(124,111,247,.12)", borderColor: "rgba(124,111,247,.3)", color: "#7c6ff7" }}>
          <span>◈</span> Knowledge Graph
        </div>

        <div style={{ flex: 1 }} />
        <div className="lang-switcher-row" style={{ display: "flex", gap: 3 }}>
          {LK.map(lk => (
            <div key={lk} className={`lp${lang === lk ? " on" : ""}`} style={{ color: LANGS[lk].c, background: lang === lk ? LANGS[lk].bg : "transparent" }} onClick={() => switchLang(lk)}>
              <span>{LANGS[lk].ic}</span><span>{LANGS[lk].n}</span>
            </div>
          ))}
        </div>
        <div className="av-group" style={{ display: "flex", alignItems: "center", gap: -5, marginLeft: 8 }}>
          {cursors.map((b, i) => (
            <div key={i} className={`av${b.id === me.id ? " me" : ""}`} style={{ background: b.bg || "rgba(255,255,255,.05)", color: b.color, border: `2px solid ${b.color}44`, marginLeft: i > 0 ? -8 : 0 }} title={b.name}>
              {initials(b.name)}<div className="online-dot" style={{ background: "#4EC9B0" }} />
            </div>
          ))}
        </div>
        <div className="new-ed-row" style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
          <select value={newEdLang} onChange={e => setNewEdLang(e.target.value)} className="new-ed-select" style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 5, color: "#8892a4", fontSize: 10, padding: "2px 4px", outline: "none" }}>
            {LK.map(lk => <option key={lk} value={lk}>{LANGS[lk].n}</option>)}
          </select>
          <button className="new-ed-btn" onClick={createNewEditor}>+ New</button>
        </div>
        <button className={`run-btn${running ? " running" : ""}`} onClick={handleRun} disabled={running} style={{ marginLeft: 8 }}>
          {running ? <span className="spin" style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: "1.5px solid currentColor", borderTopColor: "transparent" }} /> : "▶"}
          <span>{running ? "Running…" : "Run"}</span>
        </button>
        <button onClick={onLogout} style={{ padding: "5px 12px", borderRadius: 6, background: "rgba(255,75,75,.12)", border: "1px solid rgba(255,75,75,.3)", color: "#ff6b9d", cursor: "pointer", fontSize: 11, fontFamily: "Inter,sans-serif", fontWeight: 600, whiteSpace: "nowrap", marginLeft: 12, display: "flex", alignItems: "center", gap: 6, transition: "all .15s" }} onMouseEnter={e => { e.currentTarget.style.background="rgba(255,75,75,.2)"; }} onMouseLeave={e => { e.currentTarget.style.background="rgba(255,75,75,.12)"; }}>
          <span style={{ fontSize: 12 }}>🚪</span> Logout
        </button>
      </div>


      <div style={{ display: "flex", height: "calc(100vh - var(--topbar-h))", overflow: "hidden" }} className="main-layout">
        <div className="sidebar"><SidebarContent /></div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }} className="editor-main-area">
          <div style={{ display: "flex", background: "var(--bg3)", height: 36, flexShrink: 0, overflowX: "auto", overflowY: "hidden", alignItems: "flex-end", borderBottom: "1px solid var(--bdr)" }}>
            {tabs.map(t => {
              const tl = LANGS[t.lang] || LANGS.ts;
              return (
                <div key={t.id} className={`tab${activeTab === t.id ? " on" : " off"}`} onClick={() => { setActiveTab(t.id); setLang(t.lang); }} style={{ borderBottomColor: activeTab === t.id ? tl.c : "transparent" }}>
                  <span style={{ color: tl.c, fontSize: 10 }}>{tl.ic}</span>
                  <span style={{ color: activeTab === t.id ? "#fff" : "#8892a4" }}>{t.name}</span>
                  <div className="tx" onClick={e => closeTab(t.id, e)}>✕</div>
                </div>
              );
            })}
          </div>
          <div className="bc">
            <span>CKC-OS</span><span>›</span><span>workspace</span><span>›</span>
            <span style={{ color: "#fff" }}>{curTab?.name || "engine.ts"}</span>
            <div style={{ flex: 1 }} />
            {renderValBadge()}
          </div>
          <div style={{ flex: 1, overflow: "hidden", background: "#0d0f14" }} className={errShake ? "err-shake" : ""}>
            <CMEditor
              key={activeTab}
              ref={activeEditorRef}
              lang={lang}
              fileKey={activeTab}
              initText={curTab?.code || getEng(lang).text}
              onLocalOp={handleLocalOp}
              onCursorMove={handleCursorMove}
              cursors={activeCursors}
              lineLocks={lineLocks}
              myId={me.id}
            />
          </div>
          <div className="out-panel" style={{ height: outOpen ? (outTab === "knowledge" ? 450 : 220) : 32 }}>
            <div className="out-hdr">
              <div className={`out-tab${outTab === "output" ? " on" : ""}`} onClick={() => { setOutOpen(true); setOutTab("output"); }}><span>▣</span> Output</div>
              <div className={`out-tab${outTab === "problems" ? " on" : ""}`} onClick={() => { setOutOpen(true); setOutTab("problems"); }}>
                <span>⚠</span> Problems {errCount > 0 && <span style={{ background: "#FF6B9D", color: "#fff", borderRadius: 10, padding: "0 5px", fontSize: 9 }}>{errCount}</span>}
              </div>
              <div className={`out-tab${outTab === "knowledge" ? " on" : ""}`} onClick={() => { 
                setKnowledgeCode(activeEditorRef.current?._getText?.() || "");
                setOutOpen(true); 
                setOutTab("knowledge"); 
              }}>
                <span>◈</span> Knowledge Graph
              </div>
              <div style={{ flex: 1, height: "100%", cursor: "pointer" }} onClick={() => setOutOpen(!outOpen)} />
              <button onClick={() => setOutOpen(!outOpen)} style={{ background: "transparent", border: "none", color: "#4a5568", padding: "0 10px", cursor: "pointer", fontSize: 10 }}>{outOpen ? "▼" : "▲"}</button>
            </div>
            {outOpen && (
              <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px", background: "#080a0d" }}>
                {outTab === "output" ? renderOutput(output) : (
                  outTab === "problems" ? (
                    liveValidation?.errors.length ? liveValidation.errors.map((e, i) => <div key={i} style={{ color: "#ff8090", fontFamily: "var(--mono)", fontSize: 11, marginBottom: 4 }}>✖ {e}</div>) : <div style={{ color: "#4EC9B0", fontSize: 11 }}>✓ No problems detected</div>
                  ) : (
                    <KnowledgeGraphEngine isEmbedded={true} initialCode={knowledgeCode} />
                  )
                )}
              </div>
            )}
          </div>
        </div>
        <div className="right-panel">
          <div style={{ display: "flex", borderBottom: "1px solid var(--bdr)", flexShrink: 0, background: "var(--bg3)" }}>
            {[["crdt", "OT/CRDT"], ["ws", "WS Log"]].map(([id, lb]) => (
              <div key={id} className={`rp-tab${rpTab === id ? " on" : ""}`} onClick={() => setRpTab(id)} style={{ flex: 1, textAlign: "center" }}>{lb}</div>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {rpTab === "crdt" ? (
              crdt.length ? crdt.map((o, i) => (
                <div key={i} className={`op-card ${o.type}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                    <span className={`op-badge ${o.type}`}>{o.type.toUpperCase()}</span>
                    <span style={{ fontSize: 9, color: "#4a5568", fontFamily: "var(--mono)" }}>{o.from} · {o.t}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#e0e0e0", fontFamily: "var(--mono)", wordBreak: "break-all" }}>
                    {o.type === "insert" ? `"${o.chars}" at ${o.pos}` : `len ${o.len} from ${o.pos}`}
                  </div>
                </div>
              )) : <div style={{ padding: "20px", textAlign: "center", color: "#4a5568", fontSize: 11 }}>Waiting for ops..</div>
            ) : (
              wsLog.map((l, i) => <div key={i} className={`ws-entry ${l.type}`}>[{l.t}] {l.msg}</div>)
            )}
          </div>
        </div>
      </div>

      <div className="statusbar">
        <SB c="#4EC9B0">⬡ {connectedCount} online</SB>
        <SB c={errCount > 0 ? "#FF6B9D" : "#4a5568"} onClick={() => { setOutOpen(true); setOutTab("problems"); }}>⊗ {errCount} · ⚠ {warnCount}</SB>
        <SB c="#4FC1FF">OT v{curEng.version}</SB>
        <div style={{ flex: 1 }} />
        <SB onClick={() => setShowDebugRoom(true)} c="#FF6B9D" className="sb-tool">🔬 Debug Room</SB>
        <SB onClick={() => setShowServerLogs(true)} c="#4FC1FF" className="sb-tool">📡 Server Logs</SB>
        <SB>Ln {cursor.line}, Col {cursor.col}</SB>
        <SB>UTF-8</SB>
        <SB c="#4EC9B0">⬡ Live</SB>
        <SB c="#4FC1FF">CKC-OS v4.2</SB>
      </div>


      <div className="mobile-bottom-bar">
        <button className={`mbb-btn${mobilePanelTab === "editor" ? " active" : ""}`} onClick={() => setMobilePanelTab("editor")}>
          <span className="mbb-icon">📝</span><span>Editor</span>
        </button>
        <button className="mbb-btn" onClick={() => setMobileSidebarOpen(true)}>
          <span className="mbb-icon">📁</span><span>Files</span>
        </button>
        <button className={`mbb-btn${mobilePanelTab === "output" ? " active" : ""}`} onClick={() => { setMobilePanelTab("output"); setOutOpen(true); }}>
          <span className="mbb-icon">▣</span><span>Output</span>
        </button>
        <button className="mbb-btn" onClick={() => setShowServerLogs(true)}>
          <span className="mbb-icon">📡</span><span>Logs</span>
        </button>
      </div>

      <div className={`mobile-sidebar-overlay${mobileSidebarOpen ? " open" : ""}`} style={{ display: mobileSidebarOpen ? "block" : "none" }} onClick={() => setMobileSidebarOpen(false)} />
      <div className={`mobile-sidebar-drawer${mobileSidebarOpen ? " open" : ""}`}><SidebarContent /></div>

      {cmdOpen && (
        <div className="cp-ov" onClick={() => setCmdOpen(false)}>
          <div className="cp-box fi" onClick={e => e.stopPropagation()}>
            <input autoFocus className="cp-in" value={cmdQ} onChange={e => { setCmdQ(e.target.value); setCmdSel(0); }} placeholder="> Run, debug room, server logs, switch language…" />
            <div style={{ overflowY: "auto", flex: 1 }}>
              {filtCmds.map((c, i) => (
                <div key={i} className={`cp-row${cmdSel === i ? " hi" : ""}`} onMouseEnter={() => setCmdSel(i)} onClick={() => runCmd(c)}>
                  <span style={{ fontSize: 14 }}>{c.ic}</span><span style={{ flex: 1 }}>{c.lb}</span>
                  {c.kb && <span style={{ fontSize: 10, color: "#4a5568", fontFamily: "var(--mono)" }}>{c.kb}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {notif && <div className="toast">{notif}</div>}
    </>
  );
}
