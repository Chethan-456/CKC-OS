import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Same palette CKC-OS uses for live cursors / avatars
const PALETTE = [
  { hex: '#4FC1FF', bg: 'rgba(79,193,255,.22)',   label: 'Cyan'   },
  { hex: '#FF6B9D', bg: 'rgba(255,107,157,.22)',  label: 'Pink'   },
  { hex: '#4EC9B0', bg: 'rgba(78,201,176,.22)',   label: 'Teal'   },
  { hex: '#CE9178', bg: 'rgba(206,145,120,.22)',  label: 'Rust'   },
  { hex: '#DCDCAA', bg: 'rgba(220,220,170,.22)',  label: 'Gold'   },
  { hex: '#C586C0', bg: 'rgba(197,134,192,.22)',  label: 'Violet' },
]

function initials(n) {
  return (n || '?').split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || '?'
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap');
  .ckc-auth-page {
    --bg:#0a0d0f;--panel:#10151a;--line:#1f2a2f;--accent:#5eff9c;
    --accent-dim:#2f7a52;--text:#d7e3df;--text-dim:#6f8783;--danger:#ff6b6b;
    min-height:100vh;width:100%;background:var(--bg);
    background-image:
      radial-gradient(circle at 20% 20%,rgba(94,255,156,0.05),transparent 40%),
      radial-gradient(circle at 80% 70%,rgba(94,255,156,0.04),transparent 45%);
    display:flex;align-items:center;justify-content:center;
    font-family:'JetBrains Mono',monospace;color:var(--text);
    padding:24px;box-sizing:border-box;
  }
  .ckc-window {
    width:100%;max-width:460px;background:var(--panel);
    border:1px solid var(--line);border-radius:10px;
    box-shadow:0 0 0 1px rgba(94,255,156,0.04),0 30px 60px -20px rgba(0,0,0,0.6);
    overflow:hidden;animation:ckc-rise 0.45s ease-out;
  }
  @keyframes ckc-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .ckc-titlebar{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--line);background:#0d1216;}
  .ckc-dot{width:9px;height:9px;border-radius:50%;background:#2a3338;}
  .ckc-titlebar-label{margin-left:4px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-dim);}
  .ckc-badge{margin-left:auto;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;}
  .ckc-badge-editor{background:rgba(79,193,255,.12);color:#4FC1FF;border:1px solid rgba(79,193,255,.25);}
  .ckc-badge-chat{background:rgba(78,201,176,.12);color:#4EC9B0;border:1px solid rgba(78,201,176,.25);}
  .ckc-body{padding:28px 32px 28px;}
  .ckc-brand{display:flex;align-items:baseline;gap:8px;margin-bottom:4px;}
  .ckc-brand-mark{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:22px;color:var(--accent);letter-spacing:-.02em;}
  .ckc-brand-sub{font-size:11px;color:var(--text-dim);letter-spacing:.08em;}
  .ckc-prompt{margin:12px 0 18px;font-size:12px;color:var(--text-dim);display:flex;align-items:center;gap:6px;}
  .ckc-prompt::before{content:'>';color:var(--accent);}
  .ckc-cursor{display:inline-block;width:7px;height:14px;background:var(--accent);animation:ckc-blink 1s step-end infinite;}
  @keyframes ckc-blink{0%,50%{opacity:1}50.01%,100%{opacity:0}}
  .ckc-field{margin-bottom:14px;}
  .ckc-label{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--text-dim);margin-bottom:5px;}
  .ckc-input-wrap{display:flex;align-items:center;border:1px solid var(--line);border-radius:6px;background:#0c1014;transition:border-color .15s,box-shadow .15s;}
  .ckc-input-wrap::before{content:'$';color:var(--accent-dim);padding-left:12px;font-size:13px;user-select:none;}
  .ckc-input-wrap:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px rgba(94,255,156,0.08);}
  .ckc-input{flex:1;background:transparent;border:none;outline:none;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:14px;padding:10px 12px 10px 8px;width:100%;}
  .ckc-input::placeholder{color:#3c4a47;}
  .ckc-color-row{display:flex;gap:8px;align-items:center;padding:4px 0;}
  .ckc-color-swatch{width:24px;height:24px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:border-color .15s,transform .1s;}
  .ckc-color-swatch:hover{transform:scale(1.15);}
  .ckc-color-swatch.selected{border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.3);}
  .ckc-avatar-preview{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;margin-left:auto;border:2px solid;}
  .ckc-error{display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--danger);background:rgba(255,107,107,0.08);border:1px solid rgba(255,107,107,0.25);border-radius:6px;padding:9px 11px;margin-bottom:14px;line-height:1.4;}
  .ckc-error::before{content:'!';font-weight:700;color:var(--danger);}
  .ckc-success{font-size:12px;color:#4EC9B0;background:rgba(78,201,176,0.08);border:1px solid rgba(78,201,176,0.25);border-radius:6px;padding:9px 11px;margin-bottom:14px;line-height:1.4;}
  .ckc-submit{width:100%;padding:12px;border-radius:6px;border:1px solid var(--accent-dim);background:var(--accent);color:#06140c;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:13px;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:filter .15s,transform .05s;}
  .ckc-submit:hover:not(:disabled){filter:brightness(1.08);}
  .ckc-submit:active:not(:disabled){transform:scale(0.99);}
  .ckc-submit:disabled{opacity:0.6;cursor:not-allowed;}
  .ckc-footer{margin-top:20px;padding-top:16px;border-top:1px dashed var(--line);font-size:12px;color:var(--text-dim);text-align:center;}
  .ckc-footer a{color:var(--accent);text-decoration:none;border-bottom:1px solid rgba(94,255,156,0.35);}
  .ckc-footer a:hover{border-bottom-color:var(--accent);}
`

export default function SignupPage() {
  const [username, setUsername]               = useState('')
  const [email, setEmail]                     = useState('')
  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [colorIdx, setColorIdx]               = useState(0)
  const [error, setError]                     = useState('')
  const [success, setSuccess]                 = useState('')
  const [loading, setLoading]                 = useState(false)
  const navigate                              = useNavigate()
  const [params]                              = useSearchParams()

  const redirectTo   = params.get('redirect') || '/editor'
  const isEditorMode = redirectTo.includes('editor')
  const badgeClass   = isEditorMode ? 'ckc-badge-editor' : 'ckc-badge-chat'
  const badgeLabel   = isEditorMode ? 'Live Editor' : 'DevChat'
  const loginLink    = `/login?redirect=${encodeURIComponent(redirectTo)}`
  const chosen       = PALETTE[colorIdx]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!username.trim())          { setError('Pick a username.'); return }
    if (password.length < 6)       { setError('Password must be at least 6 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }

    setLoading(true)

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username:     username.trim(),
          full_name:    username.trim(),
          cursor_color: chosen.hex,
          color:        chosen.hex,
          bg:           chosen.bg,
        },
      },
    })

    if (signUpErr) { setError(signUpErr.message); setLoading(false); return }

    // Insert profile row (ignore error if table doesn't exist yet)
    if (data?.user) {
      await supabase.from('profiles').upsert({
        id:       data.user.id,
        username: username.trim(),
        email:    data.user.email,
        color:    chosen.hex,
      }, { onConflict: 'id' })
    }

    setLoading(false)

    if (data?.session) {
      // Immediate session — go straight in
      navigate(redirectTo, { replace: true })
    } else {
      // Email confirmation required
      setSuccess('Account created! Check your inbox to confirm, then log in.')
    }
  }

  return (
    <div className="ckc-auth-page">
      <style>{CSS}</style>
      <div className="ckc-window">
        <div className="ckc-titlebar">
          <span className="ckc-dot" />
          <span className="ckc-dot" />
          <span className="ckc-dot" />
          <span className="ckc-titlebar-label">session / register</span>
          <span className={`ckc-badge ${badgeClass}`}>{badgeLabel}</span>
        </div>

        <div className="ckc-body">
          <div className="ckc-brand">
            <span className="ckc-brand-mark">CKC-OS</span>
            <span className="ckc-brand-sub">v4.2</span>
          </div>
          <div className="ckc-prompt">
            create your account<span className="ckc-cursor" />
          </div>

          {success && <div className="ckc-success">✓ {success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="ckc-field">
              <label className="ckc-label" htmlFor="su-username">Username</label>
              <div className="ckc-input-wrap">
                <input id="su-username" className="ckc-input" type="text"
                  placeholder="alice_codes" value={username}
                  onChange={e => setUsername(e.target.value)} required />
              </div>
            </div>

            <div className="ckc-field">
              <label className="ckc-label" htmlFor="su-email">Email</label>
              <div className="ckc-input-wrap">
                <input id="su-email" className="ckc-input" type="email"
                  placeholder="you@domain.com" value={email}
                  onChange={e => setEmail(e.target.value)} autoComplete="email" required />
              </div>
            </div>

            <div className="ckc-field">
              <label className="ckc-label" htmlFor="su-password">Password</label>
              <div className="ckc-input-wrap">
                <input id="su-password" className="ckc-input" type="password"
                  placeholder="min 6 chars" value={password}
                  onChange={e => setPassword(e.target.value)} autoComplete="new-password" required />
              </div>
            </div>

            <div className="ckc-field">
              <label className="ckc-label" htmlFor="su-confirm">Confirm Password</label>
              <div className="ckc-input-wrap">
                <input id="su-confirm" className="ckc-input" type="password"
                  placeholder="repeat password" value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" required />
              </div>
            </div>

            <div className="ckc-field">
              <label className="ckc-label">Cursor Color</label>
              <div className="ckc-color-row">
                {PALETTE.map((p, i) => (
                  <div
                    key={p.hex}
                    className={`ckc-color-swatch${i === colorIdx ? ' selected' : ''}`}
                    style={{ background: p.hex }}
                    onClick={() => setColorIdx(i)}
                    title={p.label}
                  />
                ))}
                <div
                  className="ckc-avatar-preview"
                  style={{ background: chosen.bg, color: chosen.hex, borderColor: chosen.hex + '88' }}
                >
                  {initials(username) || '?'}
                </div>
              </div>
            </div>

            {error && <div className="ckc-error">{error}</div>}

            <button type="submit" className="ckc-submit" disabled={loading}>
              {loading ? 'Creating account…' : `Create Account → ${badgeLabel}`}
            </button>
          </form>

          <div className="ckc-footer">
            Already have an account? <Link to={loginLink}>Log in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}