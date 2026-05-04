import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useChat } from "../hooks/useChat";
import { usePresence } from "../hooks/usePresence";
import { supabase } from "../lib/supabase.js";

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
  --glass: rgba(255,255,255,0.03);
  --rim: rgba(255,255,255,0.06);
  --accent: #22d3ee;
  --dim: #94a3b8;
}

::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:var(--border3);border-radius:2px;}
::-webkit-scrollbar-thumb:hover{background:rgba(34,211,238,0.3);}

body{font-family:var(--sans);background:var(--bg0);color:var(--text1);}

@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideLeft{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
@keyframes slideRight{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
@keyframes popIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 12px var(--cyan-glow)}50%{box-shadow:0 0 28px rgba(34,211,238,0.4)}}
@keyframes sp{to{transform:rotate(360deg)}}

.anim-fadeUp{animation:fadeUp 0.2s ease both;}
.anim-slideLeft{animation:slideLeft 0.25s ease both;}
.anim-slideRight{animation:slideRight 0.28s ease both;}
.anim-popIn{animation:popIn 0.18s cubic-bezier(0.34,1.56,0.64,1) both;}
.anim-pulse{animation:pulse 2s ease infinite;}
.blink{animation:pulse 1.6s ease infinite;}

.app{display:flex;height:100vh;overflow:hidden;background:var(--bg0);position:relative;}
.app::before{
  content:'';position:absolute;inset:0;pointer-events:none;z-index:0;
  background:radial-gradient(ellipse 60% 40% at 20% 0%,rgba(34,211,238,0.04) 0%,transparent 70%),
             radial-gradient(ellipse 40% 60% at 80% 100%,rgba(167,139,250,0.03) 0%,transparent 70%);
}

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
.ch-btn:hover{background:var(--border);color:var(--text1);}
.ch-btn.active{background:rgba(34,211,238,0.08);color:var(--cyan);}
.ch-btn.active::after{
  content:'';position:absolute;left:0;top:8px;bottom:8px;width:2px;
  background:var(--cyan);border-radius:0 2px 2px 0;
}

.main{flex:1;display:flex;flex-direction:column;min-width:0;position:relative;z-index:1;}
.topbar{
  height:64px;display:flex;align-items:center;padding:0 24px;
  border-bottom:1px solid var(--border);flex-shrink:0;
}
.topbar-info{display:flex;flex-direction:column;gap:1px;}
.topbar-name{font-weight:700;font-size:15px;}
.topbar-members{font-size:11px;color:var(--text3);}

.msg-area{flex:1;overflow-y:auto;padding:24px 0;}
.msg-row{display:flex;gap:14px;padding:6px 24px;transition:background 0.1s;}
.msg-row:hover{background:rgba(255,255,255,0.015);}
.msg-avatar{
  width:38px;height:38px;border-radius:var(--r12);display:flex;align-items:center;
  justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;
}
.msg-content{display:flex;flex-direction:column;gap:3px;min-width:0;}
.msg-header{display:flex;align-items:center;gap:8px;}
.msg-user{font-weight:700;font-size:14px;color:var(--text1);cursor:pointer;}
.msg-user:hover{text-decoration:underline;}
.msg-time{font-size:10px;color:var(--text3);font-family:var(--mono);}
.msg-text{font-size:14px;line-height:1.5;color:var(--text2);word-break:break-word;}

.input-zone{padding:0 24px 24px;flex-shrink:0;}
.input-box{
  background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r16);
  padding:4px;display:flex;flex-direction:column;
  transition:all 0.2s;box-shadow:0 4px 24px rgba(0,0,0,0.2);
}
.input-box:focus-within{border-color:rgba(34,211,238,0.3);box-shadow:0 8px 32px rgba(34,211,238,0.1);}
.input-box textarea{
  width:100%;background:transparent;border:none;outline:none;
  padding:12px 16px;color:var(--text1);font-family:var(--sans);
  font-size:14px;resize:none;min-height:48px;
}
.input-actions{display:flex;align-items:center;justify-content:space-between;padding:4px 12px 8px;}
.typing-dots{display:flex;gap:3px;align-items:center;}
.typing-dot{width:4px;height:4px;border-radius:50%;background:var(--cyan);animation:pulse 1s infinite;}
.typing-dot:nth-child(2){animation-delay:0.2s;}
.typing-dot:nth-child(3){animation-delay:0.4s;}

.auth-input{
  width:100%;background:rgba(255,255,255,0.04);padding:14px 16px;
  border-radius:14px;margin-bottom:12px;border:1px solid var(--rim);
  font-size:15px;color:white;outline:none;transition:border-color 0.2s;
}
.auth-input:focus{border-color:var(--cyan);}
`;

/* ─── COMPONENTS ─── */

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
        if (signUpErr) throw signUpErr;
        user = data?.user || null;
        if (!user) {
          setError("✅ Account created! Check your email to confirm, then Sign In.");
          setLoading(false); setIsSignUp(false); return;
        }
      } else {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (signInErr) throw signInErr;
        user = data.user;
      }
      if (user) onAuth(user);
    } catch (e) {
      setError(e.message || "Authentication failed.");
    }
    setLoading(false);
  };

  return (
    <div style={{width:'100%',height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg0)'}}>
      <div style={{background:'var(--bg2)',padding:40,borderRadius:24,border:'1px solid var(--border2)',width:400,boxShadow:'0 32px 64px rgba(0,0,0,0.4)'}} className="anim-popIn">
        <div style={{textAlign:'center',marginBottom:32}}>
          <div className="logo-icon" style={{margin:'0 auto 20px',width:48,height:48,fontSize:22}}>⚡</div>
          <h2 style={{fontSize:24,fontWeight:800}}>{isSignUp ? "Join CKC-OS" : "Welcome Back"}</h2>
          <p style={{fontSize:13,color:'var(--text3)',marginTop:6}}>DevChat · Real-time Module</p>
        </div>
        {error && <div style={{color:'#f87171',fontSize:12,marginBottom:16,textAlign:'center',padding:10,background:'rgba(248,113,113,0.08)',borderRadius:10,border:'1px solid rgba(248,113,113,0.2)'}}>{error}</div>}
        <input className="auth-input" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <div style={{position:'relative',marginBottom:24}}>
          <input className="auth-input" type={showPass?"text":"password"} placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)} />
          <button onClick={()=>setShowPass(!showPass)} style={{position:'absolute',right:14,top:16,background:'none',border:'none',cursor:'pointer',fontSize:16}}>
            {showPass ? '🙈' : '👁'}
          </button>
        </div>
        <button style={{width:'100%',borderRadius:14,height:52,fontWeight:700,fontSize:15,border:'none',background:'linear-gradient(135deg,#22d3ee,#2dd4bf)',color:'#000',cursor:loading?'default':'pointer',transition:'0.2s'}} onClick={submit} disabled={loading}>
          {loading ? "Processing…" : (isSignUp ? "Create Account" : "Sign In")}
        </button>
        <div style={{textAlign:'center',marginTop:20,fontSize:13,color:'var(--text3)',cursor:'pointer'}} onClick={()=>setIsSignUp(!isSignUp)}>
          {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
        </div>
      </div>
    </div>
  );
}

function MsgRow({ msg, onlineUsers }) {
  const isSystem = msg.user_id === 'system';
  const username = msg.profiles?.username || msg.username || "Developer";
  const initials = username.slice(0, 2).toUpperCase();
  const color = msg.profiles?.color || "#22d3ee";
  const bg = msg.profiles?.bg || "rgba(34,211,238,0.15)";

  return (
    <div className="msg-row">
      <div className="msg-avatar" style={{ background: bg, color: color, border: `1px solid ${color}33` }}>
        {initials}
      </div>
      <div className="msg-content">
        <div className="msg-header">
          <span className="msg-user">{username}</span>
          <span className="msg-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="msg-text">{msg.content}</div>
      </div>
    </div>
  );
}

const CHANNELS = [
  { id: 'general', name: 'general', icon: '#' },
  { id: 'engine-dev', name: 'engine-dev', icon: '⚙' },
  { id: 'analytics', name: 'analytics', icon: '📊' },
  { id: 'deployment', name: 'deployment', icon: '🚀' },
];

export default function DevChat() {
  const { user, profile, logout } = useAuth();
  const [activeChId, setActiveChId] = useState('general');
  const [input, setInput] = useState("");
  const [sideOpen, setSideOpen] = useState(true);
  
  const { messages, loading: chatLoading, sendMessage } = useChat(activeChId);
  const { onlineUsers, typingUsers, setTyping } = usePresence(activeChId);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const { error } = await sendMessage(input);
    if (!error) setInput("");
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    setTyping(e.target.value.length > 0);
  };

  if (!user) return <AuthPage onAuth={() => window.location.reload()} />;

  const curCh = CHANNELS.find(c => c.id === activeChId);
  const typingList = Object.keys(typingUsers).filter(uid => typingUsers[uid] && uid !== user.id);

  return (
    <>
      <style>{G}</style>
      <div className="app">
        <div className={`sidebar ${sideOpen ? '' : 'collapsed'}`}>
          <div className="sidebar-logo">
            <div className="logo-icon">⚡</div>
            <span className="logo-text">CKC-OS</span>
            <div className="live-badge">LIVE</div>
          </div>
          <div className="sidebar-section">
            <div className="section-label">MODULES</div>
            {CHANNELS.map(ch => (
              <button key={ch.id} className={`ch-btn ${activeChId === ch.id ? 'active' : ''}`} onClick={() => setActiveChId(ch.id)}>
                <span style={{opacity:0.6}}>{ch.icon}</span>
                {ch.name}
              </button>
            ))}
          </div>
          <div style={{marginTop:'auto',padding:16,borderTop:'1px solid var(--border)'}}>
            <button onClick={logout} style={{width:'100%',background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:8,padding:8,color: 'var(--rose)',fontSize:12,fontWeight:600,cursor:'pointer'}}>Sign Out</button>
          </div>
        </div>

        <div className="main">
          <div className="topbar bg-[#080c12]/80 backdrop-blur-xl">
            <button style={{background:'none',border:'none',color:'var(--text2)',fontSize:20,marginRight:16,cursor:'pointer'}} onClick={() => setSideOpen(!sideOpen)}>☰</button>
            <div className="topbar-info">
              <div className="topbar-name">#{curCh?.name}</div>
              <div className="topbar-members">{Object.keys(onlineUsers).length} active members</div>
            </div>
          </div>

          <div className="msg-area">
            {messages.map((m, i) => <MsgRow key={m.id || i} msg={m} onlineUsers={onlineUsers} />)}
            <div ref={endRef} />
          </div>

          <div className="input-zone">
            <div className="input-box">
              <textarea 
                value={input} 
                onChange={handleInput} 
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder={`Message #${curCh?.name}`} 
              />
              <div className="input-actions">
                <div className="typing-dots">
                  {typingList.length > 0 && (
                    <>
                      <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                      <span style={{fontSize:10,color:'var(--cyan)',marginLeft:6}}>{typingList.length} typing...</span>
                    </>
                  )}
                </div>
                <button onClick={handleSend} style={{background:'var(--cyan)',color:'#000',border:'none',borderRadius:8,padding:'6px 16px',fontSize:12,fontWeight:800,cursor:'pointer'}}>SEND ↵</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}