import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../fluxchat/hooks/useAuth';
import FluxAuthPage from '../fluxchat/pages/AuthPage.jsx';

export default function AuthPage() {
  const navigate = useNavigate();
  const { session, loading, signIn, signUp } = useAuth();

  useEffect(() => {
    if (!loading && session) {
      navigate('/devchat', { replace: true });
    }
  }, [loading, session, navigate]);

  return (
    <>
      <style>{`
        .auth-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 32px;
          background: radial-gradient(circle at top left, rgba(14, 165, 233, 0.14), transparent 20%),
                      radial-gradient(circle at bottom right, rgba(34, 197, 94, 0.12), transparent 24%),
                      #f8fafc;
          color: #0f172a;
          font-family: Inter, system-ui, sans-serif;
        }
        .auth-card {
          width: min(540px, 100%);
          background: white;
          border-radius: 28px;
          box-shadow: 0 30px 80px rgba(15, 23, 42, 0.12);
          padding: 36px;
          border: 1px solid #e2e8f0;
        }
        .auth-logo {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 24px;
        }
        .logo-icon {
          width: 52px;
          height: 52px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          font-size: 1.35rem;
          background: linear-gradient(135deg, #0ea5e9, #22c55e);
          color: white;
        }
        .auth-title {
          margin: 0;
          font-size: 1.75rem;
          letter-spacing: -0.03em;
          font-weight: 800;
        }
        .auth-sub {
          margin: 4px 0 0;
          color: #475569;
          font-size: 0.95rem;
          line-height: 1.6;
        }
        .auth-tabs {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }
        .auth-tab {
          flex: 1;
          padding: 14px 18px;
          border-radius: 16px;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          color: #334155;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        .auth-tab.active {
          background: #0f172a;
          border-color: #0f172a;
          color: white;
        }
        .auth-form {
          display: grid;
          gap: 16px;
        }
        .field {
          display: grid;
          gap: 8px;
          text-align: left;
        }
        .field-label {
          color: #475569;
          font-size: 0.92rem;
          font-weight: 700;
        }
        .field-input {
          width: 100%;
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid #cbd5e1;
          outline: none;
          font-size: 0.95rem;
          color: #0f172a;
          background: #f8fafc;
        }
        .field-input:focus {
          border-color: #0ea5e9;
          box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.12);
        }
        .auth-error,
        .auth-success {
          border-radius: 14px;
          padding: 14px 16px;
          font-size: 0.92rem;
          line-height: 1.4;
        }
        .auth-error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
        .auth-success {
          background: #ecfdf5;
          color: #166534;
          border: 1px solid #bbf7d0;
        }
        .auth-submit {
          width: 100%;
          border: none;
          border-radius: 16px;
          padding: 16px 18px;
          background: #0f172a;
          color: white;
          cursor: pointer;
          font-weight: 700;
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .auth-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          background: #111827;
        }
        .auth-switch {
          border: none;
          background: transparent;
          color: #0f172a;
          font-weight: 700;
          cursor: pointer;
        }
        .auth-footer {
          margin-top: 20px;
          color: #64748b;
          font-size: 0.95rem;
        }
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.35);
          border-left-color: white;
          border-radius: 9999px;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <FluxAuthPage onSignIn={signIn} onSignUp={signUp} />
    </>
  );
}
