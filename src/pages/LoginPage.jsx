import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error, data } = await signIn(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Grab the logged-in user, whether signIn returned it directly
    // or we need to ask the Supabase client for the current session.
    let user = data?.user
    if (!user) {
      const { data: userData } = await supabase.auth.getUser()
      user = userData?.user
    }

    if (user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email,
            last_seen: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )

      if (profileError) {
        // Login still succeeds even if the profile write fails;
        // just surface it in the console for debugging.
        console.error('Failed to update profile:', profileError.message)
      }
    }

    // Login goes straight into the CKC-OS editor.
    // Change '/editor' if your route is named differently.
    navigate('/editor')
    setLoading(false)
  }

  return (
    <div className="ckc-auth-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap');

        .ckc-auth-page {
          --bg: #0a0d0f;
          --panel: #10151a;
          --line: #1f2a2f;
          --accent: #5eff9c;
          --accent-dim: #2f7a52;
          --text: #d7e3df;
          --text-dim: #6f8783;
          --danger: #ff6b6b;

          min-height: 100vh;
          width: 100%;
          background: var(--bg);
          background-image:
            radial-gradient(circle at 20% 20%, rgba(94,255,156,0.05), transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(94,255,156,0.04), transparent 45%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'JetBrains Mono', monospace;
          color: var(--text);
          padding: 24px;
          box-sizing: border-box;
        }

        .ckc-window {
          width: 100%;
          max-width: 420px;
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 10px;
          box-shadow: 0 0 0 1px rgba(94,255,156,0.04), 0 30px 60px -20px rgba(0,0,0,0.6);
          overflow: hidden;
          animation: ckc-rise 0.5s ease-out;
        }

        @keyframes ckc-rise {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .ckc-titlebar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-bottom: 1px solid var(--line);
          background: #0d1216;
        }

        .ckc-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #2a3338;
        }

        .ckc-titlebar-label {
          margin-left: 4px;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-dim);
        }

        .ckc-body {
          padding: 32px 32px 28px;
        }

        .ckc-brand {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 4px;
        }

        .ckc-brand-mark {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 22px;
          color: var(--accent);
          letter-spacing: -0.02em;
        }

        .ckc-brand-sub {
          font-size: 11px;
          color: var(--text-dim);
          letter-spacing: 0.08em;
        }

        .ckc-prompt {
          margin: 18px 0 24px;
          font-size: 13px;
          color: var(--text-dim);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ckc-prompt::before {
          content: '>';
          color: var(--accent);
        }

        .ckc-cursor {
          display: inline-block;
          width: 7px;
          height: 14px;
          background: var(--accent);
          animation: ckc-blink 1s step-end infinite;
        }

        @keyframes ckc-blink {
          0%, 50% { opacity: 1; }
          50.01%, 100% { opacity: 0; }
        }

        .ckc-field {
          margin-bottom: 16px;
        }

        .ckc-label {
          display: block;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 6px;
        }

        .ckc-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          border: 1px solid var(--line);
          border-radius: 6px;
          background: #0c1014;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .ckc-input-wrap::before {
          content: '$';
          color: var(--accent-dim);
          padding-left: 12px;
          font-size: 13px;
          user-select: none;
        }

        .ckc-input-wrap:focus-within {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(94,255,156,0.08);
        }

        .ckc-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--text);
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          padding: 11px 12px 11px 8px;
          width: 100%;
        }

        .ckc-input::placeholder {
          color: #3c4a47;
        }

        .ckc-error {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 12px;
          color: var(--danger);
          background: rgba(255,107,107,0.08);
          border: 1px solid rgba(255,107,107,0.25);
          border-radius: 6px;
          padding: 9px 11px;
          margin-bottom: 16px;
          line-height: 1.4;
        }

        .ckc-error::before {
          content: '!';
          font-weight: 700;
          color: var(--danger);
        }

        .ckc-submit {
          width: 100%;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid var(--accent-dim);
          background: var(--accent);
          color: #06140c;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: filter 0.15s ease, transform 0.05s ease;
        }

        .ckc-submit:hover:not(:disabled) {
          filter: brightness(1.08);
        }

        .ckc-submit:active:not(:disabled) {
          transform: scale(0.99);
        }

        .ckc-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ckc-footer {
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px dashed var(--line);
          font-size: 12px;
          color: var(--text-dim);
          text-align: center;
        }

        .ckc-footer a {
          color: var(--accent);
          text-decoration: none;
          border-bottom: 1px solid rgba(94,255,156,0.35);
        }

        .ckc-footer a:hover {
          border-bottom-color: var(--accent);
        }

        .ckc-input:focus-visible,
        .ckc-submit:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        @media (prefers-reduced-motion: reduce) {
          .ckc-window { animation: none; }
          .ckc-cursor { animation: none; opacity: 1; }
        }
      `}</style>

      <div className="ckc-window">
        <div className="ckc-titlebar">
          <span className="ckc-dot" />
          <span className="ckc-dot" />
          <span className="ckc-dot" />
          <span className="ckc-titlebar-label">session / auth</span>
        </div>

        <div className="ckc-body">
          <div className="ckc-brand">
            <span className="ckc-brand-mark">CKC&#8203;-OS</span>
            <span className="ckc-brand-sub">v1.0</span>
          </div>
          <div className="ckc-prompt">
            authenticate to continue<span className="ckc-cursor" />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="ckc-field">
              <label className="ckc-label" htmlFor="ckc-email">Email</label>
              <div className="ckc-input-wrap">
                <input
                  id="ckc-email"
                  className="ckc-input"
                  type="email"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="ckc-field">
              <label className="ckc-label" htmlFor="ckc-password">Password</label>
              <div className="ckc-input-wrap">
                <input
                  id="ckc-password"
                  className="ckc-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error && <div className="ckc-error">{error}</div>}

            <button type="submit" className="ckc-submit" disabled={loading}>
              {loading ? 'Authenticating...' : 'Login'}
            </button>
          </form>

          <div className="ckc-footer">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage