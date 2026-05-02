/**
 * ═══════════════════════════════════════════════════════════════════
 *  NEXUS CHAT — Supabase Realtime Edition
 *  Uses: channels, messages, profiles, reactions tables
 * ═══════════════════════════════════════════════════════════════════
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Config ──
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || "https://kljsouytovludochnyxl.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsanNvdXl0b3ZsdWRvY2hueXhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNzgwNTcsImV4cCI6MjA5MjY1NDA1N30.I4eSCP0mk4L3dZJFSgcifa0M54pxd2MU6yS2CAgB-vc";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Helpers ──
const COLORS = [["#60a5fa","rgba(96,165,250,0.1)"],["#a78bfa","rgba(167,139,250,0.1)"],["#4ade80","rgba(74,222,128,0.1)"],["#f472b6","rgba(244,114,182,0.1)"],["#fb923c","rgba(251,146,60,0.1)"]];
const getColor = (id) => { if(!id) return COLORS[0]; let h=0; for(let i=0;i<id.length;i++) h=id.charCodeAt(i)+((h<<5)-h); return COLORS[Math.abs(h)%COLORS.length]; };
const initials = (n) => (n||"?").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);

// ── Styles ──
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600&display=swap');
:root {
  --wa-bg: #111b21;
  --wa-panel: #202c33;
  --wa-chat-bg: #0b141a;
  --wa-bubble-in: #202c33;
  --wa-bubble-out: #005c4b;
  --wa-text: #e9edef;
  --wa-text-dim: #8696a0;
  --wa-green: #00a884;
  --wa-border: #222d34;
  --wa-hover: #202c33;
  --wa-hover-list: #2a3942;
  --wa-input: #2a3942;
  --font: 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
.nx-wrap { font-family: var(--font); background: var(--wa-bg); color: var(--wa-text); height: 100vh; display: flex; overflow: hidden; }

/* SIDEBAR */
.nx-side { width: 30%; min-width: 300px; max-width: 420px; background: var(--wa-bg); border-right: 1px solid var(--wa-border); display: flex; flex-direction: column; z-index: 2; }
.nx-side-hd { height: 59px; background: var(--wa-panel); padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; border-right: 1px solid var(--wa-border); flex-shrink: 0; }
.wa-user-profile { display: flex; align-items: center; gap: 12px; cursor: pointer; }
.nx-logo { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; background: linear-gradient(135deg, #00a884, #005c4b); font-weight: bold; }
.wa-icons { display: flex; gap: 16px; color: var(--wa-text-dim); font-size: 20px; }
.wa-icon { cursor: pointer; padding: 8px; border-radius: 50%; transition: background .2s; display: flex; align-items: center; justify-content: center; }
.wa-icon:hover { background: rgba(255,255,255,0.05); }

/* SEARCH BAR */
.wa-search-bar { padding: 8px 12px; background: var(--wa-bg); border-bottom: 1px solid var(--wa-border); display: flex; align-items: center; }
.wa-search-inner { flex: 1; display: flex; align-items: center; background: var(--wa-panel); border-radius: 8px; padding: 6px 12px; gap: 10px; }
.wa-search-inner input { flex: 1; background: transparent; border: none; color: var(--wa-text); font-size: 14px; outline: none; font-family: var(--font); }
.wa-search-inner input::placeholder { color: var(--wa-text-dim); }

/* CHAT LIST */
.nx-chlist { flex: 1; overflow-y: auto; background: var(--wa-bg); }
.nx-ch { width: 100%; padding: 0; border: none; background: transparent; color: var(--wa-text); display: flex; align-items: center; cursor: pointer; text-align: left; }
.nx-ch:hover .nx-ch-inner { background: var(--wa-hover-list); }
.nx-ch.on .nx-ch-inner { background: var(--wa-hover-list); }
.nx-ch-av { width: 48px; height: 48px; border-radius: 50%; background: var(--wa-panel); margin: 0 14px 0 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; color: var(--wa-text-dim); }
.nx-ch-inner { flex: 1; padding: 12px 14px 12px 0; border-bottom: 1px solid var(--wa-border); display: flex; flex-direction: column; gap: 4px; transition: background .2s; overflow: hidden; }
.nx-ch-title { font-size: 16px; display: flex; justify-content: space-between; align-items: center; }
.nx-ch-time { font-size: 12px; color: var(--wa-text-dim); }
.nx-ch-desc { font-size: 13px; color: var(--wa-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90%; }

/* MAIN CHAT AREA */
.nx-main { flex: 1; display: flex; flex-direction: column; background: var(--wa-chat-bg); position: relative; }
.nx-main::before { content: ""; position: absolute; inset: 0; background-image: url('https://static.whatsapp.net/rsrc.php/v3/yl/r/1sMocOydvN8.png'); opacity: 0.05; background-size: 400px; pointer-events: none; z-index: 0; }
.nx-top { height: 59px; background: var(--wa-panel); padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; z-index: 1; border-bottom: 1px solid var(--wa-border); flex-shrink: 0; }
.wa-chat-header-info { display: flex; align-items: center; gap: 14px; cursor: pointer; }
.wa-chat-avatar { width: 40px; height: 40px; border-radius: 50%; background: #3b4a54; display: flex; align-items: center; justify-content: center; font-size: 18px; color: var(--wa-text-dim); }

/* MESSAGES */
.nx-msgs { flex: 1; overflow-y: auto; padding: 20px 60px; display: flex; flex-direction: column; gap: 8px; z-index: 1; }
.nx-row { display: flex; width: 100%; margin-bottom: 2px; }
.nx-row.mine { justify-content: flex-end; }
.nx-row:not(.mine) { justify-content: flex-start; }

/* BUBBLES */
.nx-bub { position: relative; max-width: 65%; padding: 6px 9px 8px 9px; border-radius: 7.5px; font-size: 14.2px; line-height: 19px; box-shadow: 0 1px 0.5px rgba(11,20,26,.13); word-break: break-word; }
.nx-bub.in { background: var(--wa-bubble-in); color: var(--wa-text); border-top-left-radius: 0; margin-left: 10px; }
.nx-bub.out { background: var(--wa-bubble-out); color: var(--wa-text); border-top-right-radius: 0; margin-right: 10px; }
.nx-bub::after { content: ""; display: table; clear: both; }

/* TAILS */
.wa-tail { position: absolute; top: 0; width: 8px; height: 13px; }
.nx-bub.in .wa-tail { left: -8px; color: var(--wa-bubble-in); }
.nx-bub.out .wa-tail { right: -8px; color: var(--wa-bubble-out); }

.wa-sender { font-size: 12.8px; font-weight: 600; margin-bottom: 2px; line-height: 22px; cursor: pointer; display: block; }
.wa-msg-content { display: inline; word-wrap: break-word; }
.wa-msg-spacer { display: inline-block; width: 60px; height: 11px; vertical-align: middle; }
.wa-timestamp { float: right; margin-top: 4px; margin-left: -50px; position: relative; z-index: 2; font-size: 11px; color: rgba(255,255,255,0.6); display: flex; align-items: center; gap: 4px; }

/* EMOJI PICKER */
.wa-emoji-picker { position: absolute; bottom: 70px; left: 16px; background: var(--wa-panel); border-radius: 8px; padding: 12px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 1px solid var(--wa-border); z-index: 10; }
.wa-emoji-btn { background: transparent; border: none; font-size: 24px; cursor: pointer; transition: transform .2s; }
.wa-emoji-btn:hover { transform: scale(1.2); }

/* INPUT ZONE */
.nx-input-zone { background: var(--wa-panel); padding: 10px 16px; display: flex; align-items: flex-end; gap: 12px; z-index: 1; min-height: 62px; flex-shrink: 0; }
.wa-attach-btn { color: var(--wa-text-dim); font-size: 24px; padding: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; height: 42px; border: none; background: transparent; }
.nx-input-box { flex: 1; background: var(--wa-input); border-radius: 8px; padding: 9px 12px; display: flex; align-items: center; min-height: 42px; }
.nx-inp { width: 100%; background: transparent; border: none; color: var(--wa-text); font-size: 15px; outline: none; font-family: var(--font); }
.nx-send { width: 42px; height: 42px; border-radius: 50%; background: var(--wa-green); border: none; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; transition: transform .2s; }
.nx-send:hover { transform: scale(1.05); }

.nx-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--wa-text-dim); gap: 16px; z-index: 1; background: var(--wa-panel); }
.nx-empty h1 { font-size: 32px; font-weight: 300; color: var(--wa-text); margin-top: 24px; }
.nx-empty p { font-size: 14px; max-width: 440px; text-align: center; line-height: 1.6; }
`;

// ═══════════════════════════════════════════════
//  LOGIN PAGE
// ═══════════════════════════════════════════════
function AuthPage({ onAuth }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const submit = async () => {
    if (!email || !pass) { setError("Please enter your email and password."); return; }
    setLoading(true); setError("");
    try {
      let user = null;

      if (isSignUp) {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email, password: pass,
          options: { data: { username: email.split("@")[0] } }
        });

        // "Database error saving new user" means the trigger failed but the
        // user MAY have been created — try signing them in to confirm.
        if (signUpErr) {
          const em = signUpErr.message?.toLowerCase() || "";
          // Any of these errors mean the account likely exists — fall back to sign-in
          const existsErr = em.includes("database error") || em.includes("rate limit") ||
            em.includes("already registered") || em.includes("already been registered");
          if (existsErr) {
            const { data: siData, error: siErr } = await supabase.auth.signInWithPassword({ email, password: pass });
            if (!siErr && siData?.user) {
              user = siData.user;
            } else {
              setError("This email is already registered. Click \"Sign In\" below.");
              setLoading(false);
              setIsSignUp(false);
              return;
            }
          } else {
            throw signUpErr;
          }
        } else {
          user = data?.user || null;
          // If email confirmation required, Supabase returns user but no session
          if (!user) {
            setError("✅ Account created! Check your email to confirm, then Sign In.");
            setLoading(false);
            setIsSignUp(false);
            return;
          }
        }
      } else {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (signInErr) throw signInErr;
        user = data.user;
      }

      if (user) {
        // Ensure profile row exists (trigger may have failed)
        const username = user.user_metadata?.username || user.email?.split("@")[0] || "anon";
        const { error: profileErr } = await supabase.from("profiles").upsert({
          id: user.id,
          email: user.email,
          username: username,
        }, { onConflict: "id" });
        if (profileErr) console.warn("Profile upsert warning:", profileErr.message);
        onAuth(user);
      }
    } catch (e) {
      const em = (e.message || "").toLowerCase();
      if (em.includes("rate limit") || em.includes("already registered")) {
        setError("This email is already registered. Click \"Sign In\" below.");
        setIsSignUp(false);
      } else {
        setError(e.message || "Authentication failed. Please try again.");
      }
    }
    setLoading(false);
  };

  return (
    <div style={{width:'100%',height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',
      background:'radial-gradient(ellipse at top,rgba(59,130,246,0.08) 0%,transparent 60%)'}}>
      <div style={{background:'var(--glass)',padding:44,borderRadius:32,border:'1px solid var(--rim)',
        width:420,boxShadow:'0 24px 80px rgba(0,0,0,0.5)',backdropFilter:'blur(20px)'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:44,marginBottom:10}}>🚀</div>
          <h2 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.5px'}}>
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h2>
          <p style={{fontSize:13,color:'var(--dim)',marginTop:6}}>
            {isSignUp ? "Join the Nexus community" : "Sign in to Nexus Chat"}
          </p>
        </div>

        {error && (
          <div style={{color: error.startsWith('✅') ? '#4ade80' : '#ef4444',
            fontSize:13,marginBottom:16,textAlign:'center',padding:'10px 14px',
            background: error.startsWith('✅') ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)',
            borderRadius:10,border:`1px solid ${error.startsWith('✅') ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`}}>
            {error}
          </div>
        )}

        <input
          className="nx-inp"
          style={{width:'100%',background:'rgba(255,255,255,0.04)',padding:'14px 16px',
            borderRadius:14,marginBottom:12,border:'1px solid var(--rim)',fontSize:15}}
          placeholder="Email address"
          type="email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&submit()}
        />

        <div style={{position:'relative',marginBottom:20}}>
          <input
            className="nx-inp"
            type={showPass ? "text" : "password"}
            style={{width:'100%',background:'rgba(255,255,255,0.04)',padding:'14px 44px 14px 16px',
              borderRadius:14,border:'1px solid var(--rim)',fontSize:15}}
            placeholder="Password"
            value={pass}
            onChange={e=>setPass(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&submit()}
          />
          <button
            onClick={()=>setShowPass(!showPass)}
            style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',
              background:'none',border:'none',cursor:'pointer',color:'var(--dim)',fontSize:18,padding:0}}>
            {showPass ? '🙈' : '👁'}
          </button>
        </div>

        <button
          style={{width:'100%',borderRadius:14,height:52,fontWeight:700,fontSize:16,border:'none',
            background: loading ? 'rgba(59,130,246,0.4)' : 'linear-gradient(135deg,#3b82f6,#6366f1)',
            color:'#fff',cursor:loading?'default':'pointer',transition:'all .2s',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(59,130,246,0.4)'}}
          onClick={submit}
          disabled={loading}>
          {loading ? (
            <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              <span style={{width:18,height:18,border:'2px solid rgba(255,255,255,0.3)',
                borderTop:'2px solid #fff',borderRadius:'50%',
                display:'inline-block',animation:'sp 0.8s linear infinite'}}/>
              {isSignUp ? "Creating account…" : "Signing in…"}
            </span>
          ) : (isSignUp ? "Create Account" : "Sign In")}
        </button>

        <div style={{textAlign:'center',marginTop:20,fontSize:13,color:'var(--dim)',cursor:'pointer'}}
          onClick={()=>{setIsSignUp(!isSignUp);setError("");}}>
          {isSignUp
            ? <span>Already have an account? <span style={{color:'var(--accent)',fontWeight:600}}>Sign In</span></span>
            : <span>No account yet? <span style={{color:'var(--accent)',fontWeight:600}}>Sign Up</span></span>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  CHAT APP (Supabase Realtime)
// ═══════════════════════════════════════════════
function ChatApp({ authUser, onSignOut }) {
  const [channels, setChannels] = useState([]);
  const [activeChId, setActiveChId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [input, setInput] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [sendError, setSendError] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const endRef = useRef(null);
  const channelRef = useRef(null);
  const fileInputRef = useRef(null);

  const EMOJIS = ["😀","😂","🥰","😎","🤔","😢","😡","👍","🙏","🔥","❤️","🎉","✨","🚀","👀","💯","🤷‍♂️","🤦‍♂️","🙌","💡"];
  
  const addEmoji = (emoji) => {
    setInput(prev => prev + emoji);
    setShowEmoji(false);
  };

  const handleAttachment = () => {
    // We just trigger a visual alert for now
    alert("Attachment uploads require Supabase Storage configuration which is not currently set up.");
  };

  const currentUser = useMemo(() => ({
    id: authUser.id,
    email: authUser.email || "",
    username: authUser.user_metadata?.username || authUser.email?.split("@")[0] || "anon",
  }), [authUser]);

  const activeChannel = channels.find(c => c.id === activeChId);

  // ── Ensure profile exists (handles users created before the trigger) ──
  useEffect(() => {
    (async () => {
      const { data: existing, error: fetchErr } = await supabase
        .from("profiles").select("id").eq("id", currentUser.id).maybeSingle();
      
      if (!existing) {
        // Append random string to username to avoid unique constraint violations
        const safeUsername = `${currentUser.username}_${Math.floor(Math.random() * 10000)}`;
        const { error } = await supabase.from("profiles").upsert({
          id: currentUser.id,
          email: currentUser.email,
          username: safeUsername,
        }, { onConflict: "id" });
        
        if (error) {
          console.error("Profile create error:", error.message);
          setSendError(`Profile missing and auto-create failed: ${error.message}`);
        } else {
          console.log("Profile auto-created for", safeUsername);
        }
      }
    })();
  }, [currentUser]);

  // ── Load channels ──
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("channels").select("*").order("created_at");
      if (error) console.error("Channels load error:", error.message);
      if (data?.length) {
        setChannels(data);
        setActiveChId(data[0].id);
      }
    })();
  }, []);

  // ── Load messages for active channel ──
  useEffect(() => {
    if (!activeChId) return;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("channel_id", activeChId)
        .order("created_at", { ascending: true })
        .limit(200);
      setMessages(data || []);
    })();
  }, [activeChId]);

  // ── Load profiles cache ──
  const loadProfile = useCallback(async (userId) => {
    if (profiles[userId]) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfiles(prev => ({ ...prev, [userId]: data }));
  }, [profiles]);

  useEffect(() => {
    messages.forEach(m => loadProfile(m.user_id));
  }, [messages, loadProfile]);

  // ── Supabase Realtime subscription ──
  useEffect(() => {
    if (!activeChId) return;

    // Unsubscribe previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const ch = supabase.channel(`room:${activeChId}`, {
      config: { presence: { key: currentUser.id } },
    });

    // Listen for new messages via Postgres Changes
    ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${activeChId}` },
      (payload) => {
        setMessages(prev => {
          // Already have the real message
          if (prev.some(m => m.id === payload.new.id)) return prev;
          // Replace matching optimistic message (same user + content) with the real one
          const optIdx = prev.findIndex(
            m => m.id?.startsWith("opt-") &&
              m.user_id === payload.new.user_id &&
              m.content === payload.new.content
          );
          if (optIdx !== -1) {
            const updated = [...prev];
            updated[optIdx] = payload.new;
            return updated;
          }
          return [...prev, payload.new];
        });
        loadProfile(payload.new.user_id);
      }
    );

    // Listen for deletes
    ch.on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" },
      (payload) => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      }
    );

    // Presence
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      setOnlineUsers(Object.keys(state));
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setConnected(true);
        await ch.track({ user_id: currentUser.id, username: currentUser.username, online_at: new Date().toISOString() });
      }
    });

    channelRef.current = ch;

    return () => {
      supabase.removeChannel(ch);
    };
  }, [activeChId, currentUser]);

  // Auto-scroll
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Send message ──
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !activeChId) return;
    setSendError("");
    setInput("");

    // Optimistic: show message immediately with a temp id
    // The realtime handler will replace it with the real DB row
    const optimisticId = `opt-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: optimisticId,
      channel_id: activeChId,
      user_id: currentUser.id,
      content: text,
      created_at: new Date().toISOString(),
    }]);

    const { error } = await supabase.from("messages").insert({
      channel_id: activeChId,
      user_id: currentUser.id,
      content: text,
    });
    if (error) {
      console.error("Send error:", error.message, error);
      setSendError(error.message);
      // Remove the optimistic message if insert failed
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
    }
    // On success: the realtime INSERT event will replace the optimistic row automatically
  }, [input, activeChId, currentUser.id]);

  const getProfile = (userId) => profiles[userId] || { username: "...", email: "" };

  return (
    <div className="nx-wrap">
      {/* SIDEBAR */}
      <div className="nx-side">
        <div className="nx-side-hd">
          <div className="wa-user-profile" onClick={onSignOut} title="Click to Sign Out">
            <div className="nx-logo">{initials(currentUser.username)}</div>
            <span style={{fontWeight:600, fontSize:15}}>{currentUser.username}</span>
          </div>
          <div className="wa-icons">
            <div className="wa-icon" title="Status">↻</div>
            <div className="wa-icon" title="New Chat">💬</div>
            <div className="wa-icon" title="Menu">⋮</div>
          </div>
        </div>
        
        <div className="wa-search-bar">
          <div className="wa-search-inner">
            <span style={{color:'var(--wa-text-dim)', fontSize: 14}}>🔍</span>
            <input placeholder="Search or start new chat" />
          </div>
        </div>

        <div className="nx-chlist">
          {channels.map(ch => (
            <button key={ch.id} className={`nx-ch${activeChId===ch.id?' on':''}`} onClick={()=>setActiveChId(ch.id)}>
              <div className="nx-ch-av">#</div>
              <div className="nx-ch-inner">
                <div className="nx-ch-title">
                  <span>{ch.name}</span>
                  <span className="nx-ch-time">12:00 PM</span>
                </div>
                <div className="nx-ch-desc">{ch.description || "Tap to view channel"}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div className="nx-main">
        {activeChId ? (
          <>
            <div className="nx-top">
              <div className="wa-chat-header-info">
                <div className="wa-chat-avatar">#</div>
                <div style={{display:'flex', flexDirection:'column'}}>
                  <h3 style={{fontSize:16,fontWeight:600}}>{activeChannel?.name || "..."}</h3>
                  <span style={{fontSize:13,color:'var(--wa-text-dim)'}}>
                    {connected ? `${onlineUsers.length} online` : 'Connecting...'}
                  </span>
                </div>
              </div>
              <div className="wa-icons">
                <div className="wa-icon" title="Search">🔍</div>
                <div className="wa-icon" title="Menu">⋮</div>
              </div>
            </div>

            <div className="nx-msgs">
              {messages.length === 0 && (
                <div style={{textAlign:'center', padding:'8px 12px', color:'var(--wa-text-dim)', fontSize:'12.5px', background:'rgba(32,44,51,0.8)', borderRadius:'8px', alignSelf:'center', marginTop:'20px'}}>
                  No messages yet. Send a message to start the conversation!
                </div>
              )}
              {messages.map((m, i) => {
                const isMine = m.user_id === currentUser.id;
                const prof = getProfile(m.user_id);
                const [col, _bg] = getColor(m.user_id);
                const time = m.created_at ? new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : "";
                
                // Only show tail for first message in a group by same user
                const showTail = i === 0 || messages[i-1].user_id !== m.user_id;

                return (
                  <div key={m.id} className={`nx-row${isMine?' mine':''}`}>
                    <div className={`nx-bub ${isMine?'out':'in'}`}>
                      {showTail && (
                        <svg className="wa-tail" viewBox="0 0 8 13" preserveAspectRatio="none">
                          <path d={isMine ? "M0,0 L8,0 L8,13 Z" : "M8,0 L0,0 L0,13 Z"} fill="currentColor" />
                        </svg>
                      )}
                      
                      {!isMine && showTail && (
                        <div className="wa-sender" style={{color:col}}>{prof.username}</div>
                      )}
                      
                      <div className="wa-msg-content">
                        {m.content}
                        <span className="wa-msg-spacer"></span>
                      </div>
                      
                      <div className="wa-timestamp">
                        {time}
                        {isMine && <span style={{color: '#53bdeb', marginLeft: '2px', fontSize: 13}}>✓✓</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            {sendError && (
              <div style={{padding:'8px 30px',background:'rgba(239,68,68,0.1)',color:'#ef4444',fontSize:12,borderTop:'1px solid rgba(239,68,68,0.2)', zIndex:2}}>
                ⚠ Send failed: {sendError}
              </div>
            )}
            
            <div className="nx-input-zone">
              {showEmoji && (
                <div className="wa-emoji-picker">
                  {EMOJIS.map((em, idx) => (
                    <button key={idx} className="wa-emoji-btn" onClick={() => addEmoji(em)}>{em}</button>
                  ))}
                </div>
              )}
              
              <button className="wa-attach-btn" title="Emojis" onClick={() => setShowEmoji(!showEmoji)}>😊</button>
              <button className="wa-attach-btn" title="Attach" onClick={handleAttachment}>📎</button>
              
              <div className="nx-input-box">
                <input className="nx-inp" placeholder="Type a message" value={input}
                  onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} />
              </div>
              
              {input.trim() ? (
                <button className="nx-send" onClick={send}>➤</button>
              ) : (
                <button className="wa-attach-btn" style={{fontSize:20}}>🎤</button>
              )}
            </div>
          </>
        ) : (
          <div className="nx-empty">
            <svg width="200" height="200" viewBox="0 0 200 200" opacity="0.3">
              <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="4"/>
              <path d="M100,50 L100,100 L140,140" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
            </svg>
            <h1>Nexus for Web</h1>
            <p>Send and receive messages without keeping your phone online.<br/>Use Nexus on up to 4 linked devices and 1 phone at the same time.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  ROOT
// ═══════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({data:{session}}) => setUser(session?.user || null));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user || null));
    return () => subscription.unsubscribe();
  }, []);

  if (user === undefined) return <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#05070a'}}><div className="loader"/></div>;

  return (
    <div style={{height:'100vh'}}>
      <style>{CSS}</style>
      {!user ? <AuthPage onAuth={setUser} /> : <ChatApp authUser={user} onSignOut={()=>supabase.auth.signOut()} />}
    </div>
  );
}