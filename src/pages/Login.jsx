import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import { supabase } from "../lib/supabase.js";

const PALETTE = [
  { hex: "#4FC1FF", label: "Cyan", bg: "rgba(79,193,255,.15)" },
  { hex: "#FF6B9D", label: "Rose", bg: "rgba(255,107,157,.15)" },
  { hex: "#4EC9B0", label: "Teal", bg: "rgba(78,201,176,.15)" },
  { hex: "#DCDCAA", label: "Amber", bg: "rgba(220,220,170,.15)" },
];

export default function Login() {
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name || email.split("@")[0],
            cursor_color: chosen.hex,
          },
        },
      });

      if (error) {
        const em = error.message?.toLowerCase() || "";
        // If the database error happened in a trigger, the user might actually be created.
        if (em.includes("database error") || em.includes("already registered")) {
          const { error: siErr } = await supabase.auth.signInWithPassword({ email, password });
          if (!siErr) {
            navigate("/editor");
            return;
          }
        }
        throw error;
      }

      if (data?.user && !data.session) {
        setError("Registration successful! Please check your email for confirmation.");
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
    <div className="login-page">
      <style>{CSS}</style>
      <div className="login-bg">
        <div className="glow-1" />
        <div className="glow-2" />
      </div>

      <div className="login-card announce-pop">
        <div className="login-header">
          <div className="gem pulse">⚡</div>
          <div className="login-branding">
            <div className="login-title">CKC-OS</div>
            <div className="login-subtitle">Collaborative Knowledge Command</div>
          </div>
        </div>

        <div className="login-tabs">
          <button 
            className={`login-tab ${activeTab === "login" ? "active" : ""}`}
            onClick={() => setActiveTab("login")}
          >
            Login
          </button>
          <button 
            className={`login-tab ${activeTab === "register" ? "active" : ""}`}
            onClick={() => setActiveTab("register")}
          >
            Register
          </button>
        </div>

        {error && <div className={`login-error ${error.includes("successful") ? "success" : ""}`}>{error}</div>}

        <form className="login-form" onSubmit={activeTab === "login" ? handleLogin : handleRegister}>
          {activeTab === "register" && (
            <div className="input-group">
              <label>Display Name</label>
              <input 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                required
              />
            </div>
          )}

          <div className="input-group">
            <label>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {activeTab === "register" && (
            <div className="input-group">
              <label>Cursor Color</label>
              <div className="color-selector">
                {PALETTE.map((p, i) => (
                  <div 
                    key={i} 
                    className={`color-dot ${colorIdx === i ? "active" : ""}`}
                    style={{ background: p.hex, "--bg": p.bg }}
                    onClick={() => setColorIdx(i)}
                  />
                ))}
              </div>
            </div>
          )}

          <button className="submit-btn" disabled={loading}>
            {loading ? <span className="spin">⟳</span> : (activeTab === "login" ? "Access Workspace →" : "Create Account →")}
          </button>
        </form>

        <div className="login-footer">
          <p>Powered by Supabase Realtime & Forge AI</p>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');

  .login-page {
    min-height: 100vh;
    background: #05070a;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    color: #e0e0e0;
    font-family: 'Inter', sans-serif;
  }

  .login-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
  }

  .glow-1 {
    position: absolute;
    top: -10%;
    left: -10%;
    width: 60%;
    height: 60%;
    background: radial-gradient(circle, rgba(79,193,255,.08) 0%, transparent 70%);
    filter: blur(80px);
  }

  .glow-2 {
    position: absolute;
    bottom: -10%;
    right: -10%;
    width: 60%;
    height: 60%;
    background: radial-gradient(circle, rgba(255,107,157,.08) 0%, transparent 70%);
    filter: blur(80px);
  }

  .login-card {
    position: relative;
    z-index: 1;
    width: 440px;
    background: rgba(20,24,32,.85);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 24px;
    padding: 40px;
    box-shadow: 0 40px 120px rgba(0,0,0,.8);
  }

  .login-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 32px;
  }

  .gem {
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, #4FC1FF, #4EC9B0);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: #fff;
    box-shadow: 0 0 20px rgba(79,193,255,.3);
  }

  .login-title {
    font-family: 'Syne', sans-serif;
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -.02em;
    color: #fff;
  }

  .login-subtitle {
    font-size: 11px;
    color: #6b7a9e;
    text-transform: uppercase;
    letter-spacing: .1em;
    font-weight: 700;
    margin-top: 2px;
  }

  .login-tabs {
    display: flex;
    background: rgba(255,255,255,.03);
    padding: 4px;
    border-radius: 12px;
    margin-bottom: 24px;
    border: 1px solid rgba(255,255,255,.05);
  }

  .login-tab {
    flex: 1;
    padding: 10px;
    border: none;
    background: transparent;
    color: #6b7a9e;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    border-radius: 9px;
    transition: all .2s;
  }

  .login-tab.active {
    background: rgba(255,255,255,.06);
    color: #fff;
    box-shadow: 0 4px 12px rgba(0,0,0,.2);
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .input-group label {
    font-size: 11px;
    font-weight: 700;
    color: #4a5568;
    text-transform: uppercase;
    letter-spacing: .08em;
  }

  .input-group input {
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 10px;
    padding: 12px 14px;
    color: #fff;
    font-size: 14px;
    outline: none;
    transition: all .2s;
  }

  .input-group input:focus {
    border-color: #4FC1FF;
    background: rgba(79,193,255,.05);
    box-shadow: 0 0 15px rgba(79,193,255,.1);
  }

  .submit-btn {
    margin-top: 10px;
    padding: 14px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(90deg, #4FC1FF, #4EC9B0);
    color: #05070a;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    transition: all .2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .submit-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(79,193,255,.4);
  }

  .submit-btn:disabled {
    opacity: .6;
    cursor: not-allowed;
    transform: none;
  }

  .login-error {
    background: rgba(255,107,157,.12);
    border: 1px solid rgba(255,107,157,.25);
    color: #FF6B9D;
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 12px;
    margin-bottom: 20px;
    animation: shake .4s ease;
  }

  .login-error.success {
    background: rgba(78,201,176,.1);
    border-color: rgba(78,201,176,.25);
    color: #4EC9B0;
    animation: none;
  }

  .color-selector {
    display: flex;
    gap: 10px;
    margin-top: 4px;
  }

  .color-dot {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all .2s;
    position: relative;
  }

  .color-dot::after {
    content: '';
    position: absolute;
    inset: 4px;
    background: var(--bg);
    border-radius: 4px;
    opacity: 0;
    transition: opacity .2s;
  }

  .color-dot.active {
    border-color: #fff;
    transform: scale(1.1);
  }

  .login-footer {
    margin-top: 32px;
    text-align: center;
    font-size: 10px;
    color: #343d54;
    font-family: 'JetBrains Mono', monospace;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-6px); }
    75% { transform: translateX(6px); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: .8; transform: scale(.95); }
  }

  .pulse { animation: pulse 2s infinite ease-in-out; }
  .spin { display: inline-block; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .announce-pop {
    animation: announcePop .4s cubic-bezier(.34,1.56,.64,1) both;
  }

  @keyframes announcePop {
    0% { opacity: 0; transform: scale(.9) translateY(20px); }
    100% { opacity: 1; transform: none; }
  }
`;
