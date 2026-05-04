import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ejedxeonttqvgcicawkw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWR4ZW9udHRxdmdjaWNhd2t3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MzI4MTgsImV4cCI6MjA5MjQwODgxOH0.ZUWuWZ13J7TxR_a6vx7NAV20mXw00dHyzC82cJGNjDk";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 25 } },
});

const DOCUMENT_ID = "shared-document";
const DEFAULT_CONTENT = `// CKC-OS shared document
// Start typing to collaborate in real time.

function hello() {
  console.log("Welcome to the shared editor.");
}
`;

const COLORS = [
  { hex: "#4FC1FF", bg: "rgba(79,193,255,.14)" },
  { hex: "#FF6B9D", bg: "rgba(255,107,157,.14)" },
  { hex: "#4EC9B0", bg: "rgba(78,201,176,.14)" },
  { hex: "#CE9178", bg: "rgba(206,145,120,.14)" },
  { hex: "#DCDCAA", bg: "rgba(220,220,170,.14)" },
];

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "rust", label: "Rust" },
  { value: "sql", label: "SQL" },
];

function makeInitials(name) {
  return (name || "?").split(" ").map((part) => part[0] || "").join("").toUpperCase().slice(0, 2) || "?";
}

export default function EditorPage() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [language, setLanguage] = useState("javascript");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("Connecting to Supabase...");
  const [lineLocks, setLineLocks] = useState({});
  const [peers, setPeers] = useState({});
  const [toast, setToast] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(false);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const channelRef = useRef(null);
  const lockIdRef = useRef(null);
  const lastContentRef = useRef("");
  const toastTimerRef = useRef(null);

  useEffect(() => {
    const restore = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await loadProfile(session.user);
          setUser(profile);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setStatus("Ready");
      }
    };
    restore();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const profile = await loadProfile(session.user);
        setUser(profile);
      }
      if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });
    return () => listener?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    let channel;
    let active = true;

    const fetchDocument = async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("content")
        .eq("id", DOCUMENT_ID)
        .single();
      if (error && error.code === "PGRST116") {
        await supabase.from("documents").insert({ id: DOCUMENT_ID, content: DEFAULT_CONTENT });
        setContent(DEFAULT_CONTENT);
        lastContentRef.current = DEFAULT_CONTENT;
      } else {
        const next = data?.content ?? DEFAULT_CONTENT;
        setContent(next);
        lastContentRef.current = next;
      }
    };

    const fetchLocks = async () => {
      const { data } = await supabase
        .from("line_locks")
        .select("*")
        .eq("document_id", DOCUMENT_ID);
      if (data) {
        const next = {};
        data.forEach((lock) => {
          next[lock.line_number] = lock;
        });
        setLineLocks(next);
      }
    };

    const startRealtime = async () => {
      channel = supabase.channel(`editor:${DOCUMENT_ID}`, {
        config: { presence: { key: user.id }, broadcast: { self: false } },
      });

      channel.on("postgres_changes", { event: "UPDATE", schema: "public", table: "documents", filter: `id=eq.${DOCUMENT_ID}` }, (payload) => {
        const remote = payload.record?.content;
        if (!remote || remote === lastContentRef.current) return;
        lastContentRef.current = remote;
        if (editorRef.current) {
          editorRef.current.setValue(remote);
        }
        setContent(remote);
        notify("Document updated by collaborator.");
      });

      channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "line_locks", filter: `document_id=eq.${DOCUMENT_ID}` }, ({ record }) => addLock(record));
      channel.on("postgres_changes", { event: "UPDATE", schema: "public", table: "line_locks", filter: `document_id=eq.${DOCUMENT_ID}` }, ({ record }) => addLock(record));
      channel.on("postgres_changes", { event: "DELETE", schema: "public", table: "line_locks", filter: `document_id=eq.${DOCUMENT_ID}` }, ({ old_record }) => removeLock(old_record));

      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        if (!active) return;
        const next = {};
        Object.entries(state).forEach(([key, sessions]) => {
          if (!sessions?.[0]?.state) return;
          next[key] = { id: key, ...sessions[0].state };
        });
        setPeers(next);
      });

      channel.on("presence", { event: "join" }, ({ key, newPresences }) => {
        const meta = newPresences?.[0]?.state;
        if (!meta) return;
        setPeers((prev) => ({ ...prev, [key]: { id: key, ...meta } }));
      });

      channel.on("presence", { event: "leave" }, ({ key }) => {
        setPeers((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      });

      const { status } = await channel.subscribe();
      if (status === "SUBSCRIBED") {
        channelRef.current = channel;
        await channel.track({
          name: user.name,
          color: user.color,
          bg: user.bg,
          line: 1,
          column: 1,
        });
      }
    };

    fetchDocument().catch(console.error);
    fetchLocks().catch(console.error);
    startRealtime().catch(console.error);

    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
      releaseLock();
    };
  }, [user, releaseLock]);

  const loadProfile = async (authUser) => {
    const { data: profile } = await supabase
      .from("users")
      .select("username,email,color,color_bg")
      .eq("id", authUser.id)
      .single();
    const color = profile?.color ?? { hex: "#4FC1FF", bg: "rgba(79,193,255,.14)" };
    return {
      id: authUser.id,
      name: profile?.username || authUser.user_metadata?.username || authUser.email?.split("@")[0] || "User",
      email: authUser.email,
      color: color.hex || "#4FC1FF",
      bg: color.bg || "rgba(79,193,255,.14)",
      initials: makeInitials(profile?.username || authUser.email?.split("@")[0] || "U"),
    };
  };

  const notify = (message) => {
    setToast(message);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 3200);
  };

  const persistContent = async (newContent) => {
    try {
      await supabase.from("documents").update({ content: newContent }).eq("id", DOCUMENT_ID);
    } catch (error) {
      console.error(error);
      setStatus("Unable to sync document");
    }
  };

  const addLock = (record) => {
    if (!record || record.document_id !== DOCUMENT_ID) return;
    setLineLocks((prev) => ({ ...prev, [record.line_number]: record }));
  };

  const removeLock = (record) => {
    if (!record) return;
    setLineLocks((prev) => {
      const next = { ...prev };
      delete next[record.line_number];
      return next;
    });
  };

  const releaseLock = useCallback(async () => {
    if (!user || lockIdRef.current == null) return;
    const line = lockIdRef.current;
    try {
      await supabase.from("line_locks").delete().match({ document_id: DOCUMENT_ID, line_number: line, locked_by: user.id });
    } catch (error) {
      console.error(error);
    }
    lockIdRef.current = null;
  }, [user]);

  const lockLine = async (lineNumber) => {
    if (!user) return;
    if (lockIdRef.current === lineNumber) return;

    const existing = lineLocks[lineNumber];
    if (existing && existing.locked_by !== user.id) {
      notify(`Line ${lineNumber} is in use by ${existing.user_name}`);
      return;
    }

    await releaseLock();
    const lock = {
      document_id: DOCUMENT_ID,
      line_number: lineNumber,
      locked_by: user.id,
      user_name: user.name,
      color: user.color,
      timestamp: new Date().toISOString(),
    };
    try {
      await supabase.from("line_locks").upsert(lock, { onConflict: ["document_id", "line_number"] });
      lockIdRef.current = lineNumber;
    } catch (error) {
      console.error(error);
      notify("Unable to lock the current line.");
    }
  };

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.setValue(content);

    editor.onDidChangeCursorPosition((event) => {
      const { lineNumber, column } = event.position;
      if (channelRef.current) {
        channelRef.current.track({
          name: user.name,
          color: user.color,
          bg: user.bg,
          line: lineNumber,
          column,
        });
      }
      lockLine(lineNumber);
    });

    editor.onDidChangeModelContent((event) => {
      if (!user) return;
      const blocked = event.changes.some((change) => {
        const from = change.range.startLineNumber;
        const to = change.range.endLineNumber;
        for (let line = from; line <= to; line += 1) {
          const lock = lineLocks[line];
          if (lock && lock.locked_by !== user.id) {
            return true;
          }
        }
        return false;
      });
      if (blocked) {
        notify("Edit blocked: this line is locked by another collaborator.");
        const current = lastContentRef.current;
        editor.setValue(current);
        return;
      }
      const value = editor.getValue();
      setContent(value);
      lastContentRef.current = value;
      persistContent(value);
    });
  };

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const decorations = Object.values(lineLocks).map((lock) => ({
      range: new monaco.Range(lock.line_number, 1, lock.line_number, 1),
      options: {
        isWholeLine: true,
        className: lock.locked_by === user?.id ? "locked-line-self" : "locked-line",
        linesDecorationsClassName: lock.locked_by === user?.id ? "locked-line-gutter-self" : "locked-line-gutter",
        hoverMessage: {
          value: lock.locked_by === user?.id
            ? `You own line ${lock.line_number}`
            : `Line ${lock.line_number} in use by ${lock.user_name}`,
        },
      },
    }));
    const decorationIds = editor.deltaDecorations([], decorations);
    return () => editor.deltaDecorations(decorationIds, []);
  }, [lineLocks, user]);

  const lockedLineCount = Object.keys(lineLocks).length;
  const collaboratorList = useMemo(() => Object.values(peers).filter((peer) => peer.id !== user?.id), [peers, user]);

  if (!user) {
    return (
      <div className="collab-auth-shell">
        <style>{STYLE}</style>
        <AuthCard
          mode={authMode}
          onModeChange={setAuthMode}
          onSuccess={setUser}
          loading={loadingAuth}
          setLoading={setLoadingAuth}
          notify={notify}
        />
      </div>
    );
  }

  const currentLock = lineLocks[editorRef.current?.getPosition()?.lineNumber] || null;

  return (
    <div className="collab-shell">
      <style>{STYLE}</style>
      <header className="topbar">
        <div className="brand">CKC-OS</div>
        <div className="top-meta">
          <div className="status-pill">{status}</div>
          <div className="status-pill">{collaboratorList.length + 1} active</div>
          <select value={language} onChange={(event) => setLanguage(event.target.value)} className="lang-select">
            {LANGUAGES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <button className="btn-logout" onClick={() => supabase.auth.signOut()}>Logout</button>
        </div>
      </header>

      {currentLock && currentLock.locked_by !== user.id ? (
        <div className="alert-bar">Line {currentLock.line_number} in use by {currentLock.user_name}</div>
      ) : null}

      <main className="main-grid">
        <section className="editor-panel">
          <Editor
            height="100%"
            defaultLanguage={language}
            language={language}
            value={content}
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              automaticLayout: true,
              cursorSmoothCaretAnimation: true,
              scrollBeyondLastLine: false,
            }}
          />
        </section>

        <aside className="sidebar">
          <div className="panel">
            <div className="panel-title">Active users</div>
            <div className="user-card self">
              <div className="user-chip" style={{ background: user.bg, color: user.color }}>{user.initials}</div>
              <div>
                <div className="user-name">{user.name} <span className="label-self">you</span></div>
                <div className="user-meta">{user.email}</div>
              </div>
            </div>
            {collaboratorList.length === 0 ? (
              <div className="empty">No collaborators online yet.</div>
            ) : collaboratorList.map((peer) => (
              <div key={peer.id} className="user-card">
                <div className="user-chip" style={{ background: peer.bg, color: peer.color }}>{makeInitials(peer.name)}</div>
                <div>
                  <div className="user-name">{peer.name}</div>
                  <div className="user-meta">Line {peer.line || "-"}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="panel-title">Line locks</div>
            {lockedLineCount === 0 ? (
              <div className="empty">No locked lines</div>
            ) : Object.values(lineLocks)
              .sort((a, b) => a.line_number - b.line_number)
              .map((lock) => (
                <div key={`${lock.document_id}-${lock.line_number}`} className="lock-row">
                  <div>
                    <div className="lock-line">Line {lock.line_number}</div>
                    <div className="lock-owner">{lock.user_name}</div>
                  </div>
                  <span className="lock-dot" style={{ background: lock.color }} />
                </div>
              ))}
          </div>

          <div className="panel panel-note">
            <div className="note-title">Realtime state</div>
            <div className="note-row">Document: {DOCUMENT_ID}</div>
            <div className="note-row">Locked lines: {lockedLineCount}</div>
            <div className="note-row">Users: {collaboratorList.length + 1}</div>
          </div>
        </aside>
      </main>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

function AuthCard({ mode, onModeChange, onSuccess, loading, setLoading, notify }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [colorIdx, setColorIdx] = useState(0);
  const [error, setError] = useState("");

  const chosenColor = COLORS[colorIdx];

  const handleSignup = async () => {
    setError("");
    if (!email.trim() || !password.trim() || !username.trim()) {
      setError("Email, username, and password are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { username: username.trim(), color: chosenColor.hex, color_bg: chosenColor.bg } },
      });
      if (authError) throw authError;
      await supabase.from("users").upsert({
        id: data.user.id,
        username: username.trim(),
        email: email.trim(),
        color: { hex: chosenColor.hex, bg: chosenColor.bg },
        password_hash: "managed_by_supabase_auth",
      }, { onConflict: "id" });
      if (data.session) {
        onSuccess({
          id: data.user.id,
          name: username.trim(),
          email: data.user.email,
          color: chosenColor.hex,
          bg: chosenColor.bg,
          initials: makeInitials(username.trim()),
        });
      } else {
        notify("Signup complete. Check your email before signing in.");
        onModeChange("login");
      }
    } catch (err) {
      setError(err.message || "Signup failed.");
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;
      const { data: profile } = await supabase.from("users").select("username,email,color,color_bg").eq("id", data.user.id).single();
      const color = profile?.color ?? { hex: "#4FC1FF", bg: "rgba(79,193,255,.14)" };
      onSuccess({
        id: data.user.id,
        name: profile?.username || data.user.user_metadata?.username || email.split("@")[0],
        email: data.user.email,
        color: color.hex || "#4FC1FF",
        bg: color.bg || "rgba(79,193,255,.14)",
        initials: makeInitials(profile?.username || email.split("@")[0]),
      });
    } catch (err) {
      setError(err.message || "Login failed.");
    }
    setLoading(false);
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="auth-title">CKC-OS Editor</div>
        <div className="auth-subtitle">Realtime login and collaboration</div>
      </div>
      <div className="auth-tabs">
        {["login", "signup"].map((tab) => (
          <button type="button" key={tab} className={tab === mode ? "tab-button active" : "tab-button"} onClick={() => { setError(""); onModeChange(tab); }}>
            {tab === "login" ? "Sign In" : "Sign Up"}
          </button>
        ))}
      </div>
      {error ? <div className="auth-error">{error}</div> : null}
      <div className="auth-form">
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        {mode === "signup" ? (
          <>
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your display name" />
          </>
        ) : null}
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        {mode === "signup" ? (
          <>
            <label>Cursor color</label>
            <div className="color-picker">
              {COLORS.map((item, index) => (
                <button type="button" key={item.hex} className={colorIdx === index ? "color-swatch selected" : "color-swatch"} style={{ background: item.bg, borderColor: colorIdx === index ? item.hex : "transparent" }} onClick={() => setColorIdx(index)}>
                  <span style={{ background: item.hex }} />
                </button>
              ))}
            </div>
          </>
        ) : null}
        <button type="button" className="auth-submit" onClick={mode === "login" ? handleLogin : handleSignup} disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>
      </div>
    </div>
  );
}

const STYLE = `
:root { color-scheme: dark; }
*,*::before,*::after { box-sizing: border-box; }
body,html,#root { margin: 0; min-height: 100%; background: #070b14; }
body { font-family: Inter,system-ui,sans-serif; color: #e7eefc; }
button,input,select { font: inherit; }
button { cursor: pointer; }
.collab-shell { min-height: 100vh; display: flex; flex-direction: column; background: #07101f; }
.topbar { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid rgba(255,255,255,.08); gap: 12px; }
.brand { font-size: 1.35rem; font-weight: 800; letter-spacing: -.04em; }
.top-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.status-pill { background: rgba(79,193,255,.12); border: 1px solid rgba(79,193,255,.18); border-radius: 999px; padding: 8px 12px; color: #d4e5ff; font-size: .92rem; }
.lang-select { padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,.12); background: #0d1525; color: #eef4ff; }
.btn-logout { padding: 10px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); color: #eef4ff; }
.alert-bar { margin: 0 24px 12px; padding: 12px 16px; border-left: 4px solid #ff8c9c; background: rgba(255,111,143,.1); color: #ffccd5; font-weight: 600; }
.main-grid { display: grid; grid-template-columns: 1.8fr 0.95fr; gap: 18px; padding: 0 24px 24px; min-height: calc(100vh - 120px); }
.editor-panel { min-height: 0; border: 1px solid rgba(255,255,255,.08); border-radius: 22px; overflow: hidden; background: #09111f; }
.sidebar { display: grid; gap: 16px; }
.panel { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 20px; padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.panel-title { font-size: .95rem; font-weight: 700; color: #f0f5ff; }
.user-card { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: center; padding: 12px; border-radius: 16px; background: rgba(255,255,255,.02); }
.user-card.self { border: 1px solid rgba(79,193,255,.15); }
.user-chip { width: 44px; height: 44px; border-radius: 16px; display: grid; place-items: center; font-weight: 800; font-size: 1rem; }
.user-name { font-weight: 700; }
.label-self { margin-left: 8px; font-size: .75rem; color: #94b4ff; background: rgba(79,193,255,.12); border-radius: 999px; padding: 2px 8px; }
.user-meta { margin-top: 4px; font-size: .87rem; color: #a7b7d5; }
.empty { color: rgba(255,255,255,.55); font-size: .92rem; padding: 14px; border-radius: 14px; background: rgba(255,255,255,.02); }
.lock-row { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 12px; border-radius: 16px; background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.06); }
.lock-line { font-weight: 700; }
.lock-owner { margin-top: 4px; font-size: .86rem; color: #b0c3e9; }
.lock-dot { width: 14px; height: 14px; border-radius: 999px; box-shadow: 0 0 14px rgba(0,0,0,.12); }
.locked-line { background: rgba(255,111,143,.16) !important; }
.locked-line-self { background: rgba(78,201,176,.18) !important; }
.locked-line-gutter { background: rgba(255,111,143,.12) !important; }
.locked-line-gutter-self { background: rgba(78,201,176,.12) !important; }
.panel-note { gap: 10px; }
.note-title { font-weight: 700; color: #f0f5ff; }
.note-row { font-size: .9rem; color: #b7c3e3; }
.toast { position: fixed; bottom: 20px; right: 20px; background: rgba(13,20,36,.95); border: 1px solid rgba(79,193,255,.2); border-radius: 16px; padding: 12px 16px; color: #eef4ff; box-shadow: 0 24px 60px rgba(0,0,0,.35); }
.collab-auth-shell { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: radial-gradient(circle at top, rgba(79,193,255,.12), transparent 35%), radial-gradient(circle at right, rgba(78,201,176,.08), transparent 25%), #070b14; }
.auth-card { max-width: 520px; width: 100%; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 26px; padding: 28px; display: grid; gap: 18px; }
.auth-header { display: grid; gap: 6px; }
.auth-title { font-size: 2rem; font-weight: 800; }
.auth-subtitle { color: #a1b1d7; }
.auth-tabs { display: flex; gap: 10px; }
.tab-button { flex: 1; padding: 12px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.02); color: #cdd5ec; }
.tab-button.active { background: rgba(79,193,255,.16); border-color: rgba(79,193,255,.28); color: #f4fbff; }
.auth-error { background: rgba(255,111,143,.12); border: 1px solid rgba(255,111,143,.28); border-radius: 16px; padding: 12px 14px; color: #ffcad0; }
.auth-form { display: grid; gap: 12px; }
.auth-form label { font-size: .88rem; color: #9db0dc; }
.auth-form input { width: 100%; border-radius: 14px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); color: #eef4ff; padding: 12px 14px; }
.auth-submit { margin-top: 8px; padding: 14px 16px; border-radius: 16px; border: none; background: linear-gradient(135deg, #4FC1FF, #4EC9B0); color: #08101b; font-weight: 700; }
.color-picker { display: flex; gap: 10px; flex-wrap: wrap; }
.color-swatch { width: 46px; height: 46px; border-radius: 18px; border: 2px solid transparent; display: grid; place-items: center; }
.color-swatch span { width: 22px; height: 22px; border-radius: 999px; display: block; }
.color-swatch.selected { transform: scale(1.05); border-color: #f4fbff; }
`;
