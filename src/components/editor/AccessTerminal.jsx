import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../pages/auth.jsx";
import { supabase } from "../../lib/supabase.js";
// ═══════════ ACCESS TERMINAL ═══════════
export function AccessTerminal() {
  const { login, loginLocal, loginGuest } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [colorIdx, setColorIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoBypassCounter, setAutoBypassCounter] = useState(3);
  const isConfigured = !!import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    if (!isConfigured && autoBypassCounter > 0) {
      const timer = setTimeout(() => setAutoBypassCounter(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (!isConfigured && autoBypassCounter === 0) { loginGuest(); navigate("/editor"); }
  }, [isConfigured, autoBypassCounter, loginGuest, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/editor");
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    setLoading(true); setError(null);
    try {
      const chosen = PALETTE[colorIdx];
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name || email.split("@")[0], cursor_color: chosen.hex } } });
      if (signUpError) throw signUpError;
      if (data?.user && !data.session) { setError("Activation required. Check your inbox."); }
      else { navigate("/editor"); }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="access-terminal">
      <div className="grid-overlay" />
      <div className="nebula blue" />
      <div className="nebula pink" />
      <div className="terminal-container fi-pop">
        <div className="terminal-header">
          <div className="terminal-brand">
            <div className="brand-icon">⚡</div>
            <div className="brand-text">
              <h1>CKC-OS</h1>
              <span>COLLABORATIVE OPERATING SYSTEM</span>
            </div>
          </div>
          <div className="terminal-status">
            <span className="pulse-dot" />
            {isConfigured ? "SYSTEM_ACTIVE_v4.2" : "CONFIG_REQUIRED"}
          </div>
        </div>
        {!isConfigured && (
          <div className="terminal-alert warning" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span>⚠</span>
              <div>
                <div style={{ fontWeight: 700 }}>Supabase not configured.</div>
                <div style={{ fontSize: 10, opacity: .8, marginTop: 4 }}>Auto-rectifying to Local Mode in {autoBypassCounter}s...</div>
              </div>
            </div>
            <button className="local-bypass-btn" onClick={() => { loginGuest(); navigate("/editor"); }}>Enter Local Mode Now</button>
          </div>
        )}
        <div className="terminal-nav">
          <div className="nav-indicator" style={{ transform: `translateX(${activeTab === "login" ? "0" : "100%"})` }} />
          <button className={`nav-item ${activeTab === "login" ? "active" : ""}`} onClick={() => setActiveTab("login")}>ACCESS</button>
          <button className={`nav-item ${activeTab === "register" ? "active" : ""}`} onClick={() => setActiveTab("register")}>REGISTER</button>
        </div>
        {error && (
          <div className={`terminal-alert ${error.includes("Activation") ? "info" : "error"}`}>
            <span>{error.includes("Activation") ? "✉" : "⚠"}</span>
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={activeTab === "login" ? handleLogin : handleRegister}>
          {activeTab === "register" && (
            <div className="terminal-input-group">
              <label>INITIAL_ID</label>
              <div className="input-wrapper"><input value={name} onChange={e => setName(e.target.value)} placeholder="Enter name..." required /></div>
            </div>
          )}
          <div className="terminal-input-group">
            <label>UPLINK_EMAIL</label>
            <div className="input-wrapper"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@ckc-os.io" required /></div>
          </div>
          <div className="terminal-input-group">
            <label>ACCESS_KEY</label>
            <div className="input-wrapper"><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required /></div>
          </div>
          {activeTab === "register" && (
            <div className="terminal-input-group">
              <label>WORKSPACE_HUE</label>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {PALETTE.map((p, i) => (
                  <div key={i} onClick={() => setColorIdx(i)} style={{ width: 28, height: 28, borderRadius: 8, background: p.bg, border: `2px solid ${colorIdx === i ? p.hex : "transparent"}`, cursor: "pointer", transition: "all .15s", boxShadow: colorIdx === i ? `0 0 10px ${p.hex}66` : "none" }} />
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            <button className="terminal-submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? "•••" : (activeTab === "login" ? "ESTABLISH CONNECTION →" : "INITIALIZE NODE →")}
            </button>
            <button type="button" className="local-bypass-btn" style={{ width: "100%", margin: 0, textTransform: "uppercase" }} onClick={() => {
              const guestName = name || (activeTab === "login" && email ? email.split("@")[0] : "") || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
              loginLocal({
                email: email || `${guestName.toLowerCase().replace(/\s+/g, "_")}@ckc-os.io`,
                name: guestName,
                cursorColor: PALETTE[colorIdx]?.hex || "#00d4ff",
                bg: PALETTE[colorIdx]?.bg || "rgba(0,212,255,0.15)",
                isGuest: true,
              });
              navigate("/editor");
            }}>
              ⚡ Bypass with Local Guest Session
            </button>
          </div>
        </form>
        <div className="terminal-footer">
          <div className="footer-line" />
          <div className="footer-content">
            <span>SECURE</span><span>v4.2.1</span><span>SUPABASE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

