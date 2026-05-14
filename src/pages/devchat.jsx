/**
 * CKC-OS DevChat — Live P2P via Supabase Realtime + Presence
 * Self-healing: seeds channels on first load if empty
 */
import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./auth.jsx";
import { initials } from "../constants.js";

const COLORS = ["#25d366","#00a884","#53bdeb","#7bcfb8","#e9af52","#f472b6","#a78bfa"];
const getColor = (id="") => COLORS[Math.abs(id.split("").reduce((a,b)=>a+b.charCodeAt(0),0)) % COLORS.length];
const fmtTime = (ts) => new Date(ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});

const DEFAULT_CHANNELS = [
  { name:"general",       description:"General discussion" },
  { name:"engineering",   description:"Engineering talk" },
  { name:"random",        description:"Off-topic fun" },
  { name:"announcements", description:"Team announcements" },
  { name:"devops",        description:"DevOps and deployment" },
  { name:"errors",        description:"Bug reports and error tracking" },
];

/* ── CSS ── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{--bg:#0b141a;--side:#111b21;--panel:#202c33;--border:#222d34;--text:#e9edef;--dim:#8696a0;--accent:#00a884;--out:#005c4b;--in:#202c33;--search:#2a3942;}
.dc-toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#ef4444;color:#fff;padding:8px 20px;border-radius:8px;font-size:13px;z-index:9998;animation:fadeIn .2s ease;}
@keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.dc{display:flex;height:100vh;background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;overflow:hidden;}
/* Auth */
.dc-auth{position:fixed;inset:0;background:rgba(11,20,26,.97);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(12px);}
.dc-card{width:100%;max-width:420px;padding:44px 40px;background:var(--panel);border-radius:18px;border:1px solid var(--border);box-shadow:0 24px 64px rgba(0,0,0,.6);text-align:center;}
.dc-logo{width:64px;height:64px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 20px;}
.dc-title{font-size:22px;font-weight:700;margin-bottom:6px;}
.dc-sub{color:var(--dim);font-size:13px;margin-bottom:28px;}
.dc-notice{border-radius:8px;padding:10px 14px;font-size:12.5px;margin-bottom:16px;text-align:left;}
.dc-notice.err{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);color:#ef4444;}
.dc-notice.ok{background:rgba(0,168,132,.12);border:1px solid rgba(0,168,132,.3);color:var(--accent);}
.dc-fi{width:100%;padding:13px 16px;background:var(--search);border:1px solid transparent;border-radius:10px;color:var(--text);font-size:14px;outline:none;margin-bottom:12px;font-family:'Inter',sans-serif;transition:border .2s;}
.dc-fi:focus{border-color:var(--accent);}
.dc-btn{width:100%;padding:13px;background:var(--accent);border:none;border-radius:10px;color:#fff;font-weight:600;font-size:14px;cursor:pointer;font-family:'Inter',sans-serif;transition:filter .2s;margin-top:4px;}
.dc-btn:hover{filter:brightness(1.1);}
.dc-btn:disabled{opacity:.6;cursor:not-allowed;}
.dc-sw{margin-top:18px;font-size:13px;color:var(--dim);cursor:pointer;user-select:none;}
.dc-sw span{color:var(--accent);font-weight:600;}
/* Sidebar */
.dc-side{width:340px;flex-shrink:0;background:var(--side);border-right:1px solid var(--border);display:flex;flex-direction:column;}
.dc-shdr{height:60px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;background:var(--panel);}
.dc-ava{width:40px;height:40px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;cursor:pointer;user-select:none;}
.dc-uname{font-size:15px;font-weight:600;margin-left:10px;}
.dc-icos{display:flex;gap:4px;}
.dc-ico{width:36px;height:36px;border-radius:50%;border:none;background:transparent;color:var(--dim);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;}
.dc-ico:hover{background:var(--search);}
.dc-srch{padding:8px 12px;}
.dc-sbox{display:flex;align-items:center;gap:10px;background:var(--search);border-radius:10px;padding:8px 14px;}
.dc-sbox input{background:transparent;border:none;outline:none;color:var(--text);font-size:14px;flex:1;font-family:'Inter',sans-serif;}
.dc-sbox input::placeholder{color:var(--dim);}
.dc-clist{flex:1;overflow-y:auto;}
.dc-clist::-webkit-scrollbar{width:4px;}
.dc-clist::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px;}
.dc-ch{width:100%;padding:12px 16px;display:flex;align-items:center;gap:13px;cursor:pointer;border:none;background:transparent;color:inherit;text-align:left;transition:background .15s;}
.dc-ch:hover,.dc-ch.active{background:var(--search);}
.dc-chava{width:48px;height:48px;border-radius:50%;background:#3b4a54;display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--dim);flex-shrink:0;}
.dc-chbody{flex:1;min-width:0;}
.dc-chrow{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;}
.dc-chname{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.dc-chtime{font-size:11.5px;color:var(--dim);flex-shrink:0;}
.dc-chdesc{font-size:12.5px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
/* Main */
.dc-main{flex:1;display:flex;flex-direction:column;min-width:0;}
.dc-mhdr{height:60px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;background:var(--panel);border-bottom:1px solid var(--border);flex-shrink:0;}
.dc-mhdrl{display:flex;align-items:center;gap:12px;}
.dc-ciname{font-size:15px;font-weight:600;}
.dc-cisub{font-size:12px;color:var(--accent);}
.dc-msgs{flex:1;overflow-y:auto;padding:16px 6%;display:flex;flex-direction:column;gap:4px;background:var(--bg);}
.dc-msgs::-webkit-scrollbar{width:4px;}
.dc-msgs::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px;}
.dc-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--dim);gap:10px;opacity:.5;}
.dc-typing{padding:4px 6%;font-size:12px;color:var(--dim);font-style:italic;min-height:22px;}
.dc-row{display:flex;width:100%;margin-bottom:1px;}
.dc-row.mine{justify-content:flex-end;}
.dc-bub{max-width:62%;padding:7px 10px 5px;border-radius:8px;font-size:14.5px;position:relative;line-height:1.4;word-break:break-word;box-shadow:0 1px 1px rgba(0,0,0,.25);}
.dc-row.mine .dc-bub{background:var(--out);border-top-right-radius:2px;}
.dc-row:not(.mine) .dc-bub{background:var(--in);border-top-left-radius:2px;}
.dc-muser{font-size:12px;font-weight:700;margin-bottom:3px;}
.dc-mfoot{display:flex;align-items:center;justify-content:flex-end;gap:4px;margin-top:3px;}
.dc-mtime{font-size:10.5px;color:rgba(255,255,255,.45);}
.dc-ticks{font-size:11px;color:#53bdeb;}
/* Input */
.dc-iarea{padding:10px 14px;background:var(--panel);display:flex;align-items:center;gap:10px;flex-shrink:0;}
.dc-minp{flex:1;background:var(--search);border:none;border-radius:10px;padding:11px 16px;color:var(--text);font-size:15px;outline:none;font-family:'Inter',sans-serif;}
.dc-minp::placeholder{color:var(--dim);}
.dc-send{width:42px;height:42px;border-radius:50%;background:var(--accent);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:filter .15s;}
.dc-send:hover{filter:brightness(1.1);}
.dc-send:disabled{opacity:.5;cursor:not-allowed;}
`;

export default function DevChat() {
  const { user: authUser, login, logout } = useAuth();

  const [channels,  setChannels]  = useState([]);
  const [chanId,    setChanId]    = useState(null);
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState("");
  const [online,    setOnline]    = useState(0);
  const [typing,    setTyping]    = useState("");
  const [search,    setSearch]    = useState("");
  const [isLogin,   setIsLogin]   = useState(true);
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [notice,    setNotice]    = useState({ text:"", ok:false });
  const [busy,      setBusy]      = useState(false);
  const [lastSeen,  setLastSeen]  = useState({});
  const [sendErr,   setSendErr]   = useState("");
  const [dbStatus,  setDbStatus]  = useState("checking");
  const [profileReady, setProfileReady] = useState(false); // true once profile row confirmed

  const endRef      = useRef(null);
  const typingTimer = useRef(null);
  const presenceRef = useRef(null);
  const searchRef   = useRef(null);
  // Refs so async callbacks always read latest values without stale closures
  const chanIdRef   = useRef(null);
  const authUserRef = useRef(null);
  chanIdRef.current   = chanId;
  authUserRef.current = authUser;

  const activeChan = useMemo(() => channels.find(c=>c.id===chanId), [channels, chanId]);
  const filtered   = useMemo(() => channels.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())), [channels, search]);

  /* ── Ensure profile + public.users row exist for logged-in user ── */
  useEffect(() => {
    if (!authUser || authUser.isGuest) return;

    async function ensureProfile() {
      // Always use the live Supabase session UID
      const { data: { user: liveUser } } = await supabase.auth.getUser();
      if (!liveUser) return;

      const uid   = liveUser.id;
      const email = liveUser.email || authUser.email || "";
      const base  = (authUser.name || email.split("@")[0] || "user").slice(0, 20);

      // ── Sync into public.users (messages_user_id_fkey points here) ──
      await supabase.from("users").upsert(
        { id: uid, email },
        { onConflict: "id", ignoreDuplicates: true }
      );

      // ── Sync into public.profiles ──
      const { data: existing } = await supabase
        .from("profiles").select("id").eq("id", uid).single();
      if (existing) { setProfileReady(true); return; }

      const suffix   = Math.random().toString(36).slice(2, 6);
      const username = `${base}_${suffix}`;

      const { error } = await supabase.from("profiles").upsert(
        { id: uid, username, email },
        { onConflict: "id" }
      );
      if (error) {
        const { error: e2 } = await supabase.from("profiles").upsert(
          { id: uid, username: `${base}_${Date.now().toString(36)}`, email },
          { onConflict: "id" }
        );
        if (!e2) setProfileReady(true);
        else console.warn("Profile creation failed:", e2.message);
      } else {
        setProfileReady(true);
      }
    }
    ensureProfile();
  }, [authUser]);

  /* ── Load channels; seed defaults if empty ── */
  useEffect(() => {
    async function loadChannels() {
      const { data, error } = await supabase.from("channels").select("*").order("name");
      if (error) { console.error("Channels fetch:", error.message); return; }

      if (data && data.length > 0) {
        setChannels(data);
        setChanId(data[0].id);
        return;
      }

      // Channels table is empty — seed defaults (requires auth insert policy)
      if (authUser && !authUser.isGuest) {
        const { data: seeded, error: se } = await supabase
          .from("channels")
          .insert(DEFAULT_CHANNELS)
          .select();
        if (se) {
          console.error("Seed channels:", se.message);
        } else if (seeded?.length) {
          setChannels(seeded);
          setChanId(seeded[0].id);
        }
      }
    }
    loadChannels();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  /* ── Messages + realtime ── */
  useEffect(() => {
    if (!chanId) return;
    setMessages([]);

    supabase.from("messages")
      .select("*, profiles:user_id(username)")
      .eq("channel_id", chanId)
      .order("created_at", { ascending: true })
      .limit(80)
      .then(({ data, error }) => {
        if (error) console.error("Fetch msgs:", error.message);
        if (data) setMessages(data);
      });

    const sub = supabase.channel(`msgs:${chanId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `channel_id=eq.${chanId}`
      }, async ({ new: row }) => {
        const { data: prof } = await supabase.from("profiles").select("username").eq("id", row.user_id).single();
        setMessages(prev => {
          if (prev.some(m => m.id === row.id)) return prev;
          return [...prev, { ...row, profiles: prof || { username:"User" } }];
        });
        setLastSeen(prev => ({ ...prev, [chanId]: row.created_at }));
      })
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [chanId]);

  /* ── Presence (online count + typing) ── */
  useEffect(() => {
    if (!chanId || !authUser) return;
    if (presenceRef.current) supabase.removeChannel(presenceRef.current);

    const room = supabase.channel(`presence:${chanId}`, {
      config: { presence: { key: authUser.id } }
    });

    room
      .on("presence", { event: "sync" }, () => {
        setOnline(Object.keys(room.presenceState()).length);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.userId === authUser.id) return;
        setTyping(`${payload.username} is typing…`);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(""), 3000);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await room.track({ userId: authUser.id, username: authUser.name, at: Date.now() });
        }
      });

    presenceRef.current = room;
    return () => { supabase.removeChannel(room); presenceRef.current = null; };
  }, [chanId, authUser]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  /* ── Auth handlers ── */
  const friendlyErr = (msg) => {
    if (!msg) return "Something went wrong";
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("fetch"))
      return "⚠️ Cannot reach Supabase — your project may be paused. Visit supabase.com/dashboard to unpause it.";
    return msg;
  };

  const handleLogin = async (e) => {
    e?.preventDefault(); setBusy(true); setNotice({ text:"", ok:false });
    try { await login(email, password); }
    catch (err) { setNotice({ text: friendlyErr(err.message), ok:false }); }
    finally { setBusy(false); }
  };

  const handleSignUp = async (e) => {
    e?.preventDefault(); setBusy(true); setNotice({ text:"", ok:false });
    try {
      const uname = email.split("@")[0];
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { username: uname, full_name: uname } }
      });
      if (error) throw error;
      setNotice({ text:"✅ Check your email to confirm your account!", ok:true });
    } catch (err) {
      setNotice({ text: friendlyErr(err.message), ok:false });
    } finally { setBusy(false); }
  };

  /* ── Send message ── */
  const onSend = async (e) => {
    e?.preventDefault();
    const currentChanId = chanIdRef.current;
    const text = input.trim();

    if (!text) return;
    if (!currentChanId) { setSendErr("No channel selected — please wait"); setTimeout(()=>setSendErr(""),3000); return; }

    // Always use the live Supabase session UID to avoid FK violations
    const { data: { user: liveUser } } = await supabase.auth.getUser();
    if (!liveUser) {
      setSendErr("You must be signed in to send messages");
      setTimeout(()=>setSendErr(""),3000);
      return;
    }

    if (!profileReady) { setSendErr("Setting up your profile… try again in a moment"); setTimeout(()=>setSendErr(""),4000); return; }

    setInput("");
    const tmpId = `opt-${Date.now()}`;
    const displayName = authUserRef.current?.name || liveUser.email?.split("@")[0] || "You";
    const optimistic = {
      id: tmpId,
      channel_id: currentChanId,
      user_id: liveUser.id,
      content: text,
      created_at: new Date().toISOString(),
      profiles: { username: displayName }
    };
    setMessages(prev => [...prev, optimistic]);

    const { data, error } = await supabase.from("messages")
      .insert({ content: text, channel_id: currentChanId, user_id: liveUser.id })
      .select("id").single();

    if (error) {
      console.error("Send error:", error.message, error.details);
      setSendErr(`Send failed: ${error.message}`);
      setTimeout(() => setSendErr(""), 4000);
      setMessages(prev => prev.filter(m => m.id !== tmpId));
      setInput(text);
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === tmpId ? { ...m, id: data.id } : m));
      setLastSeen(prev => ({ ...prev, [currentChanId]: optimistic.created_at }));
    }
  };

  const handleNewChannel = async () => {
    if (!authUser || authUser.isGuest) {
      setSendErr("Please sign in to create a channel.");
      setTimeout(()=>setSendErr(""),3000);
      return;
    }
    const name = window.prompt("Enter new channel name:");
    if (!name?.trim()) return;
    const description = window.prompt("Enter channel description (optional):") || "";
    
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const { data, error } = await supabase.from("channels").insert([{ name: slug, description }]).select().single();
    if (error) {
      setSendErr("Error creating channel: " + error.message);
      setTimeout(()=>setSendErr(""),4000);
    } else if (data) {
      setChannels(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name)));
      setChanId(data.id);
    }
  };

  /* ── Typing broadcast ── */
  const onType = (e) => {
    setInput(e.target.value);
    if (!presenceRef.current || !authUser) return;
    presenceRef.current.send({
      type: "broadcast", event: "typing",
      payload: { userId: authUser.id, username: authUser.name }
    });
  };

  const onKey = (e) => { if (e.key==="Enter" && !e.shiftKey) onSend(e); };
  const switchChan = (id) => { setChanId(id); setTyping(""); setMessages([]); };
  const showAuth = !authUser || authUser.isGuest;

  return (
    <div className="dc">
      <style>{CSS}</style>
      {sendErr && <div className="dc-toast">{sendErr}</div>}
      {/* ── AUTH OVERLAY ── */}
      {showAuth && (
        <div className="dc-auth">
          <div className="dc-card">
            <div className="dc-logo">💬</div>
            <div className="dc-title">{isLogin ? "Welcome back" : "Create account"}</div>
            <div className="dc-sub">Sign in to join live DevChat</div>
            {notice.text && <div className={`dc-notice ${notice.ok?"ok":"err"}`}>{notice.text}</div>}
            <form onSubmit={isLogin ? handleLogin : handleSignUp}>
              <input className="dc-fi" placeholder="Email address" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
              <input className="dc-fi" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
              <button className="dc-btn" disabled={busy}>{busy ? "Please wait…" : (isLogin ? "Sign In" : "Sign Up")}</button>
            </form>
            <div className="dc-sw" onClick={() => { setIsLogin(!isLogin); setNotice({ text:"", ok:false }); }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span>{isLogin ? "Sign Up" : "Sign In"}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <aside className="dc-side">
        <header className="dc-shdr">
          <div style={{display:"flex",alignItems:"center"}}>
            <div className="dc-ava" style={{background:authUser?.cursorColor||"#00a884"}}>
              {initials(authUser?.name)}
            </div>
            <span className="dc-uname">{authUser?.name||"DevChat"}</span>
          </div>
          <div className="dc-icos">
            <button className="dc-ico" title="Activity (Coming Soon)" onClick={() => alert("Activity view coming soon!")}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg></button>
            <button className="dc-ico" title="New Channel" onClick={handleNewChannel}><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg></button>
            <button className="dc-ico" title="Logout" onClick={logout}><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
          </div>
        </header>

        <div className="dc-srch">
          <div className="dc-sbox">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--dim)" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
            <input ref={searchRef} placeholder="Search or start new chat" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>

        <div className="dc-clist">
          {filtered.map(ch => (
            <button key={ch.id} className={`dc-ch${chanId===ch.id?" active":""}`} onClick={()=>switchChan(ch.id)}>
              <div className="dc-chava">#</div>
              <div className="dc-chbody">
                <div className="dc-chrow">
                  <span className="dc-chname">{ch.name}</span>
                  <span className="dc-chtime">{lastSeen[ch.id] ? fmtTime(lastSeen[ch.id]) : ""}</span>
                </div>
                <div className="dc-chdesc">{ch.description}</div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ── MAIN CHAT ── */}
      <main className="dc-main">
        <header className="dc-mhdr">
          <div className="dc-mhdrl">
            <div className="dc-chava" style={{width:42,height:42}}>#</div>
            <div>
              <div className="dc-ciname">{activeChan?.name||"Select a channel"}</div>
              {online>0 && <div className="dc-cisub">{online} online</div>}
            </div>
          </div>
          <div className="dc-icos">
            <button className="dc-ico" title="Search" onClick={() => searchRef.current?.focus()}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg></button>
            <button className="dc-ico" title="Settings" onClick={() => alert("Channel settings coming soon!")}><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
          </div>
        </header>

        <div className="dc-msgs">
          {messages.length === 0 ? (
            <div className="dc-empty">
              <div style={{fontSize:44}}>💬</div>
              <div style={{fontSize:13}}>No messages yet — say hello!</div>
            </div>
          ) : messages.map((m,i) => {
            const mine  = m.user_id === authUser?.id;
            const uname = m.profiles?.username || "User";
            const color = getColor(m.user_id);
            return (
              <div key={m.id||i} className={`dc-row${mine?" mine":""}`}>
                <div className="dc-bub">
                  {!mine && <div className="dc-muser" style={{color}}>{uname}</div>}
                  <div>{m.content}</div>
                  <div className="dc-mfoot">
                    <span className="dc-mtime">{fmtTime(m.created_at)}</span>
                    {mine && <span className="dc-ticks">✓✓</span>}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef}/>
        </div>

        <div className="dc-typing">{typing}</div>

        <form className="dc-iarea" onSubmit={onSend}>
          <button type="button" className="dc-ico">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--dim)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
          </button>
          <button type="button" className="dc-ico">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--dim)" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <input className="dc-minp" placeholder={showAuth ? "Sign in to chat…" : "Type a message"}
            value={input} onChange={onType} onKeyDown={onKey} disabled={showAuth}/>
          <button type="submit" className="dc-send" disabled={showAuth||!input.trim()}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </form>
      </main>
    </div>
  );
}