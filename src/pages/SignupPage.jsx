import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

// Same palette CKC-OS uses for live cursors / avatars, so a signed-up
// user's color matches what they'll see once they're in the editor.
const PALETTE = [
  { hex: "#4FC1FF", bg: "rgba(79,193,255,.22)", label: "Cyan" },
  { hex: "#FF6B9D", bg: "rgba(255,107,157,.22)", label: "Pink" },
  { hex: "#4EC9B0", bg: "rgba(78,201,176,.22)", label: "Teal" },
  { hex: "#CE9178", bg: "rgba(206,145,120,.22)", label: "Rust" },
  { hex: "#DCDCAA", bg: "rgba(220,220,170,.22)", label: "Gold" },
  { hex: "#C586C0", bg: "rgba(197,134,192,.22)", label: "Violet" },
]

function initials(n) {
  return (n || "?").split(" ").map(w => w[0] || "").join("").toUpperCase().slice(0, 2) || "?"
}

const SignupPage = () => {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [colorIdx, setColorIdx] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const chosen = PALETTE[colorIdx]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim()) {
      setError('Pick a username.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const { error, data } = await signUp(email, password, {
      data: { username: username.trim(), color: chosen.hex, color_bg: chosen.bg },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Mirror the profile into the `profiles` table — DevChat's <Av> component
    // reads user.username, user.color, and user.bg as flat fields (not nested JSON),
    // so we write them the same way here.
    const user = data?.user
    if (user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            username: username.trim(),
            email: email.trim(),
            color: chosen.hex,
            bg: chosen.bg,
          },
          { onConflict: 'id' }
        )

      if (profileError) {
        console.error('Failed to create profile row:', profileError.message)
      }
    }

    setLoading(false)

    // New signups land in dev chat first, not straight into the editor.
    // Change '/devchat' if your route is named differently.
    if (data?.session) {
      navigate('/devchat')
    } else {
      // Email confirmation required — no session yet, so they need to log in first.
      navigate('/login')
    }
  }

  return (
    <div className="ckc-signup-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');

        .ckc-signup-page {
          --bg: #0d0f14;
          --accent: #4FC1FF;
          --accent2: #4EC9B0;
          --danger: #FF6B9D;
          --txt: #e0e0e0;
          --txt-dim: #4a5568;

          min-height: 100vh;
          width: 100%;
          background: #080a0e;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          box-sizing: border-box;
          font-family: 'Inter', system-ui, sans-serif;
          color: var(--txt);
        }

        .ckc-signup-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 50% 0%, rgba(79,193,255,.06) 0%, transparent 70%),
            radial-gradient(ellipse 40% 40% at 80% 80%, rgba(78,201,176,.05) 0%, transparent 60%);
          pointer-events: none;
        }

        .ckc-signup-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.015) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        .ckc-signup-card {
          position: relative;
          z-index: 1;
          width: 440px;
          max-width: calc(100vw - 32px);
          background: rgba(21,24,32,.9);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 20px;
          padding: 40px;
          backdrop-filter: blur(20px);
          box-shadow: 0 40px 100px rgba(0,0,0,.8);
          animation: ckc-signup-rise 0.4s ease-out;
        }

        @keyframes ckc-signup-rise {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .ckc-signup-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
        }

        .ckc-signup-gem {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, #4FC1FF, #4EC9B0);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          box-shadow: 0 8px 24px rgba(79,193,255,.3);
          flex-shrink: 0;
        }

        .ckc-signup-brand { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -.03em; }
        .ckc-signup-sub { font-size: 12px; color: var(--txt-dim); font-family: 'JetBrains Mono', monospace; margin-top: 2px; }

        .ckc-signup-field { margin-bottom: 16px; }
        .ckc-signup-label {
          font-size: 11px;
          color: var(--txt-dim);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .1em;
          margin-bottom: 6px;
          display: block;
        }
        .ckc-signup-input {
          width: 100%;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 10px;
          padding: 11px 14px;
          color: var(--txt);
          font-size: 13px;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: all .2s;
        }
        .ckc-signup-input::placeholder { color: var(--txt-dim); }
        .ckc-signup-input:focus {
          border-color: rgba(79,193,255,.4);
          background: rgba(79,193,255,.05);
          box-shadow: 0 0 0 3px rgba(79,193,255,.08);
        }

        .ckc-color-swatches { display: flex; gap: 8px; flex-wrap: wrap; }
        .ckc-color-swatch {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          cursor: pointer;
          transition: transform .15s, border-color .15s;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid transparent;
        }
        .ckc-color-swatch.sel { transform: scale(1.15); }
        .ckc-color-swatch:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

        .ckc-signup-err {
          background: rgba(255,107,157,.1);
          border: 1px solid rgba(255,107,157,.25);
          border-radius: 8px;
          padding: 10px 14px;
          color: var(--danger);
          font-size: 12px;
          margin-bottom: 14px;
        }

        .ckc-signup-btn {
          width: 100%;
          padding: 13px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all .2s;
          border: 1px solid rgba(79,193,255,.4);
          background: linear-gradient(135deg, rgba(79,193,255,.3), rgba(78,201,176,.25));
          color: var(--accent);
          margin-top: 6px;
        }
        .ckc-signup-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(79,193,255,.45), rgba(78,201,176,.35));
          box-shadow: 0 8px 24px rgba(79,193,255,.2);
        }
        .ckc-signup-btn:disabled { opacity: .45; cursor: not-allowed; }

        .ckc-signup-footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: var(--txt-dim);
        }
        .ckc-signup-footer a {
          color: var(--accent);
          text-decoration: none;
          border-bottom: 1px solid rgba(79,193,255,.35);
        }
        .ckc-signup-footer a:hover { border-bottom-color: var(--accent); }

        .ckc-spin {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid currentColor;
          border-top-color: transparent;
          animation: ckc-spin 0.7s linear infinite;
        }
        @keyframes ckc-spin { to { transform: rotate(360deg); } }

        .ckc-signup-input:focus-visible,
        .ckc-signup-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        @media (prefers-reduced-motion: reduce) {
          .ckc-signup-card { animation: none; }
          .ckc-spin { animation: none; }
        }
      `}</style>

      <div className="ckc-signup-bg" />
      <div className="ckc-signup-grid" />

      <div className="ckc-signup-card">
        <div className="ckc-signup-logo">
          <div className="ckc-signup-gem">⚡</div>
          <div>
            <div className="ckc-signup-brand">CKC-OS</div>
            <div className="ckc-signup-sub">Create your account</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ckc-signup-field">
            <label className="ckc-signup-label" htmlFor="su-username">Username</label>
            <input
              id="su-username"
              className="ckc-signup-input"
              placeholder="your handle"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="ckc-signup-field">
            <label className="ckc-signup-label" htmlFor="su-email">Email</label>
            <input
              id="su-email"
              className="ckc-signup-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="ckc-signup-field">
            <label className="ckc-signup-label" htmlFor="su-password">Password</label>
            <input
              id="su-password"
              className="ckc-signup-input"
              type="password"
              placeholder="min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="ckc-signup-field">
            <label className="ckc-signup-label" htmlFor="su-confirm">Confirm password</label>
            <input
              id="su-confirm"
              className="ckc-signup-input"
              type="password"
              placeholder="repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="ckc-signup-field">
            <label className="ckc-signup-label">Cursor color</label>
            <div className="ckc-color-swatches">
              {PALETTE.map((p, i) => (
                <button
                  type="button"
                  key={i}
                  className={`ckc-color-swatch${colorIdx === i ? ' sel' : ''}`}
                  style={{ background: p.bg, borderColor: colorIdx === i ? p.hex : 'transparent' }}
                  onClick={() => setColorIdx(i)}
                  title={p.label}
                  aria-label={`Cursor color ${p.label}`}
                >
                  <div style={{ width: 14, height: 14, borderRadius: 4, background: p.hex }} />
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: chosen.hex, fontFamily: "'JetBrains Mono', monospace" }}>
              Selected: {chosen.label} · avatar preview{' '}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 20,
                height: 20,
                borderRadius: 6,
                background: chosen.bg,
                color: chosen.hex,
                fontSize: 9,
                fontWeight: 700,
                marginLeft: 4,
                verticalAlign: 'middle',
              }}>
                {initials(username || '?')}
              </span>
            </div>
          </div>

          {error && <div className="ckc-signup-err">⊗ {error}</div>}

          <button type="submit" className="ckc-signup-btn" disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <span className="ckc-spin" />
                Creating account…
              </span>
            ) : (
              'Create Account →'
            )}
          </button>
        </form>

        <div className="ckc-signup-footer">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  )
}

export default SignupPage