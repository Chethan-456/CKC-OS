import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "./auth.jsx";

const PALETTE = [
  { hex: "#4FC1FF", label: "CYAN", bg: "rgba(79,193,255,.15)", glow: "rgba(79,193,255,.4)" },
  { hex: "#FF6B9D", label: "ROSE", bg: "rgba(255,107,157,.15)", glow: "rgba(255,107,157,.4)" },
  { hex: "#4EC9B0", label: "TEAL", bg: "rgba(78,201,176,.15)", glow: "rgba(78,201,176,.4)" },
  { hex: "#A78BFA", label: "VIOLET", bg: "rgba(167,139,250,.15)", glow: "rgba(167,139,250,.4)" },
];

export default function EditorLogin() {
  const [activeTab, setActiveTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [colorIdx, setColorIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already logged in, we could redirect to editor,
    // but maybe they want to confirm their identity for the session first?
    // For now, let's auto-redirect if session is active.
    if (user) navigate("/editor");
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/editor");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const chosen = PALETTE[colorIdx];
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name || email.split("@")[0],
            cursor_color: chosen.hex,
          },
        },
      });

      if (signUpError) {
        // Handle case where user might already exist but session failed
        if (signUpError.message.includes("already registered")) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (!signInErr) {
            navigate("/editor");
            return;
          }
        }
        throw signUpError;
      }

      if (data?.user && !data.session) {
        setError("Activation required. Check your inbox.");
      } else {
        navigate("/editor");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="access-terminal">
      <style>{CSS}</style>
      
      {/* Dynamic Background */}
      <div className="terminal-bg">
        <div className="grid-overlay" />
        <div className="nebula blue" />
        <div className="nebula pink" />
      </div>

      <div className="terminal-container fi-pop">
        <div className="terminal-glass">
          {/* Header */}
          <div className="terminal-header">
            <div className="terminal-brand">
              <div className="brand-icon">⚡</div>
              <div className="brand-text">
                <h1>CKC-OS</h1>
                <span>COLLABORATIVE TERMINAL v4.2</span>
              </div>
            </div>
            <div className="terminal-status">
              <span className="pulse-dot" />
              SYSTEM READY
            </div>
          </div>

          {/* Navigation */}
          <div className="terminal-nav">
            <button 
              className={`nav-item ${activeTab === "login" ? "active" : ""}`}
              onClick={() => setActiveTab("login")}
            >
              ACCESS WORKSPACE
            </button>
            <button 
              className={`nav-item ${activeTab === "register" ? "active" : ""}`}
              onClick={() => setActiveTab("register")}
            >
              INITIALIZE IDENTITY
            </button>
            <div className="nav-indicator" style={{ 
              transform: `translateX(${activeTab === "login" ? "0" : "100"}%)` 
            }} />
          </div>

          {/* Error Message */}
          {error && (
            <div className={`terminal-alert ${error.includes("Activation") ? "info" : "error"}`}>
              <span className="alert-icon">{error.includes("Activation") ? "✉" : "⚠"}</span>
              <span className="alert-text">{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="terminal-form" onSubmit={activeTab === "login" ? handleLogin : handleRegister}>
            {activeTab === "register" && (
              <div className="terminal-input-group">
                <label>DISPLAY_NAME</label>
                <div className="input-wrapper">
                  <input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ENTER_ID..."
                    required
                  />
                  <div className="input-focus-border" />
                </div>
              </div>
            )}

            <div className="terminal-input-group">
              <label>NETWORK_EMAIL</label>
              <div className="input-wrapper">
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="USER@DOMAIN.COM"
                  required
                />
                <div className="input-focus-border" />
              </div>
            </div>

            <div className="terminal-input-group">
              <label>SECRET_ACCESS_KEY</label>
              <div className="input-wrapper">
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <div className="input-focus-border" />
              </div>
            </div>

            {activeTab === "register" && (
              <div className="terminal-input-group">
                <label>WORKSPACE_HUE</label>
                <div className="color-grid">
                  {PALETTE.map((p, i) => (
                    <div 
                      key={i} 
                      className={`color-slot ${colorIdx === i ? "selected" : ""}`}
                      style={{ 
                        "--hue": p.hex, 
                        "--hue-glow": p.glow,
                        "--hue-bg": p.bg 
                      }}
                      onClick={() => setColorIdx(i)}
                    >
                      <div className="color-core" />
                      {colorIdx === i && <div className="color-ring" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button className="terminal-submit" disabled={loading}>
              <div className="submit-content">
                {loading ? (
                  <span className="loader" />
                ) : (
                  <>
                    <span>{activeTab === "login" ? "ESTABLISH_CONNECTION" : "CREATE_NODE_IDENTITY"}</span>
                    <span className="submit-arrow">→</span>
                  </>
                )}
              </div>
              <div className="submit-glimmer" />
            </button>
          </form>

          {/* Footer */}
          <div className="terminal-footer">
            <div className="footer-line" />
            <div className="footer-content">
              <span>ENCRYPTION: AES-256</span>
              <span>PROTOCOL: SUPABASE_REALTIME</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');

  :root {
    --t-blue: #4FC1FF;
    --t-teal: #4EC9B0;
    --t-rose: #FF6B9D;
    --t-violet: #A78BFA;
    --t-bg: #05070a;
    --t-surface: rgba(13, 17, 23, 0.7);
    --t-border: rgba(255, 255, 255, 0.08);
  }

  .access-terminal {
    min-height: 100vh;
    background: var(--t-bg);
    color: #e0e6ed;
    font-family: 'Space Grotesk', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  /* --- Background --- */
  .terminal-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
  }

  .grid-overlay {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(79, 193, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(79, 193, 255, 0.03) 1px, transparent 1px);
    background-size: 50px 50px;
    mask-image: radial-gradient(circle at center, black, transparent 80%);
  }

  .nebula {
    position: absolute;
    width: 600px;
    height: 600px;
    filter: blur(120px);
    opacity: 0.15;
    border-radius: 50%;
  }

  .nebula.blue {
    top: -100px;
    left: -100px;
    background: var(--t-blue);
    animation: float 15s infinite alternate;
  }

  .nebula.pink {
    bottom: -100px;
    right: -100px;
    background: var(--t-rose);
    animation: float 18s infinite alternate-reverse;
  }

  @keyframes float {
    from { transform: translate(0, 0); }
    to { transform: translate(100px, 50px); }
  }

  /* --- Container --- */
  .terminal-container {
    width: 100%;
    max-width: 460px;
    padding: 20px;
    position: relative;
    z-index: 1;
  }

  .terminal-glass {
    background: var(--t-surface);
    backdrop-filter: blur(24px);
    border: 1px solid var(--t-border);
    border-radius: 28px;
    padding: 40px;
    box-shadow: 
      0 30px 100px rgba(0, 0, 0, 0.6),
      0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  }

  /* --- Header --- */
  .terminal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 32px;
  }

  .terminal-brand {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .brand-icon {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, var(--t-blue), var(--t-teal));
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: #fff;
    box-shadow: 0 8px 20px rgba(79, 193, 255, 0.3);
  }

  .brand-text h1 {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.01em;
    margin: 0;
    color: #fff;
  }

  .brand-text span {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: #4a5568;
    letter-spacing: 0.1em;
  }

  .terminal-status {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--t-teal);
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(78, 201, 176, 0.1);
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid rgba(78, 201, 176, 0.2);
  }

  .pulse-dot {
    width: 6px;
    height: 6px;
    background: var(--t-teal);
    border-radius: 50%;
    animation: statusPulse 1.5s infinite;
  }

  @keyframes statusPulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.5); opacity: 0.5; }
    100% { transform: scale(1); opacity: 1; }
  }

  /* --- Navigation --- */
  .terminal-nav {
    display: flex;
    position: relative;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    padding: 4px;
    margin-bottom: 28px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .nav-item {
    flex: 1;
    background: transparent;
    border: none;
    padding: 10px;
    font-size: 11px;
    font-weight: 700;
    color: #6b7a9e;
    cursor: pointer;
    z-index: 1;
    transition: color 0.3s;
    letter-spacing: 0.02em;
  }

  .nav-item.active {
    color: #fff;
  }

  .nav-indicator {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 4px;
    width: calc(50% - 4px);
    background: rgba(255, 255, 255, 0.08);
    border-radius: 9px;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }

  /* --- Form & Inputs --- */
  .terminal-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .terminal-input-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .terminal-input-group label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    color: #4a5568;
    letter-spacing: 0.1em;
  }

  .input-wrapper {
    position: relative;
  }

  .input-wrapper input {
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 14px 16px;
    color: #fff;
    font-size: 14px;
    font-family: 'Inter', sans-serif;
    outline: none;
    transition: all 0.3s;
  }

  .input-wrapper input:focus {
    background: rgba(79, 193, 255, 0.05);
    border-color: rgba(79, 193, 255, 0.3);
  }

  .input-focus-border {
    position: absolute;
    inset: 0;
    border-radius: 12px;
    pointer-events: none;
    box-shadow: 0 0 0 0 rgba(79, 193, 255, 0);
    transition: box-shadow 0.3s;
  }

  .input-wrapper input:focus + .input-focus-border {
    box-shadow: 0 0 0 2px rgba(79, 193, 255, 0.15);
  }

  /* --- Color Grid --- */
  .color-grid {
    display: flex;
    gap: 12px;
    margin-top: 4px;
  }

  .color-slot {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--hue-bg);
    cursor: pointer;
    position: relative;
    transition: transform 0.2s;
  }

  .color-slot:hover {
    transform: translateY(-2px);
  }

  .color-core {
    position: absolute;
    inset: 10px;
    background: var(--hue);
    border-radius: 4px;
    box-shadow: 0 0 10px var(--hue-glow);
  }

  .color-ring {
    position: absolute;
    inset: -3px;
    border: 2px solid var(--hue);
    border-radius: 13px;
    opacity: 0.5;
    animation: ringFade 0.3s ease;
  }

  @keyframes ringFade {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 0.5; transform: scale(1); }
  }

  /* --- Submit Button --- */
  .terminal-submit {
    margin-top: 10px;
    position: relative;
    padding: 16px;
    background: linear-gradient(90deg, var(--t-blue), var(--t-teal));
    border: none;
    border-radius: 14px;
    cursor: pointer;
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .terminal-submit:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 30px rgba(79, 193, 255, 0.4);
  }

  .terminal-submit:active:not(:disabled) {
    transform: translateY(0);
  }

  .terminal-submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .submit-content {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #05070a;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.05em;
  }

  .submit-arrow {
    font-size: 18px;
    transition: transform 0.2s;
  }

  .terminal-submit:hover .submit-arrow {
    transform: translateX(4px);
  }

  .submit-glimmer {
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
    transform: skewX(-25deg);
    transition: left 0.5s;
  }

  .terminal-submit:hover .submit-glimmer {
    left: 150%;
  }

  /* --- Alerts --- */
  .terminal-alert {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px;
    border-radius: 12px;
    margin-bottom: 24px;
    font-size: 12px;
    animation: slideDown 0.3s ease;
  }

  .terminal-alert.error {
    background: rgba(255, 107, 157, 0.1);
    border: 1px solid rgba(255, 107, 157, 0.2);
    color: var(--t-rose);
  }

  .terminal-alert.info {
    background: rgba(79, 193, 255, 0.1);
    border: 1px solid rgba(79, 193, 255, 0.2);
    color: var(--t-blue);
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* --- Footer --- */
  .terminal-footer {
    margin-top: 32px;
  }

  .footer-line {
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--t-border), transparent);
    margin-bottom: 16px;
  }

  .footer-content {
    display: flex;
    justify-content: space-between;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: #343d54;
    letter-spacing: 0.05em;
  }

  /* --- Utilities --- */
  .loader {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(0, 0, 0, 0.1);
    border-top-color: #000;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
  
  .fi-pop {
    animation: fiPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  @keyframes fiPop {
    0% { opacity: 0; transform: scale(0.95) translateY(20px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
`;
