import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { authErrorMessage } from '../../lib/authMessages';

export default function GoogleSignInButton({ onCredential, disabled = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const start = async () => {
    if (disabled || busy) return;
    setBusy(true);
    setError('');
    try { await onCredential(); }
    catch (cause) { setError(authErrorMessage(cause, 'google')); }
    finally { setBusy(false); }
  };

  return (
    <div className={`google-signin ${busy ? 'is-busy' : ''}`} aria-busy={busy}>
      <button type="button" className="google-signin__fallback" onClick={start} disabled={disabled || busy}>
        <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.5 9.5 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.9 6-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.7-5.1c-1.8 1.2-4 1.9-6.8 1.9-5.2 0-9.5-3.5-11.1-8.2H6v5.2A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.9 27.8a12 12 0 0 1 0-7.6V15H6a20 20 0 0 0 0 18Z"/><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 6 15l6.9 5.2c1.6-4.7 5.9-8.2 11.1-8.2Z"/></svg>
        Entrar com Google
      </button>
      {busy && <span className="google-signin__busy" role="status"><LoaderCircle size={17} className="animate-spin" />Conectando ao Google…</span>}
      {error && <p className="google-signin__notice" role="alert">{error}</p>}
    </div>
  );
}
