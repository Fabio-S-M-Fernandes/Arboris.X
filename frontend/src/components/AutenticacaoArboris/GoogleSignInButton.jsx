import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { getGoogleClientId, requestGoogleNonce } from '../../lib/api';

let googleScriptPromise;
const loadGoogleScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  googleScriptPromise ||= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = resolve;
    script.onerror = () => { googleScriptPromise = undefined; reject(new Error('Google indisponível.')); };
    document.head.appendChild(script);
  });
  return googleScriptPromise;
};

function LegacyGoogleButton({ onCredential, refreshKey = 0, disabled }) {
  const mountRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { callbackRef.current = onCredential; }, [onCredential]);
  useEffect(() => {
    let active = true;
    const container = mountRef.current;
    const mount = async () => {
      try {
        const [{ clientId }, issued] = await Promise.all([getGoogleClientId(), requestGoogleNonce()]);
        if (!clientId) throw new Error('Client ID do Google não configurado.');
        await loadGoogleScript();
        if (!active || !container) return;
        const render = (nonce) => {
          container.replaceChildren();
          window.google.accounts.id.initialize({
            client_id: clientId, nonce, auto_select: false,
            callback: async (response) => {
              if (!active || !response.credential) return;
              setBusy(true);
              try {
                const result = await callbackRef.current({ idToken: response.credential, nonce });
                if (!result?.complete && !result?.requiresTerms && active) {
                  const renewed = await requestGoogleNonce();
                  if (active) render(renewed.nonce);
                }
              } catch (cause) { if (active) setError(cause.message || 'Não foi possível vincular o Google.'); }
              finally { if (active) setBusy(false); }
            },
          });
          window.google.accounts.id.renderButton(container, {
            type: 'standard', theme: 'filled_black', size: 'large', shape: 'rectangular',
            text: 'signin_with', logo_alignment: 'left', locale: 'pt-BR',
            width: Math.min(400, Math.floor(container.clientWidth || 400)),
          });
        };
        render(issued.nonce);
      } catch (cause) { if (active) setError(cause.message || 'Google indisponível.'); }
    };
    mount();
    return () => { active = false; container?.replaceChildren(); };
  }, [refreshKey]);
  return <div className={`google-signin ${disabled ? 'is-disabled' : ''}`} aria-busy={busy || disabled}>
    <div className="google-signin__mount" ref={mountRef} />
    {busy && <span className="google-signin__busy" role="status"><LoaderCircle size={17} className="animate-spin" />Verificando com Google…</span>}
    {error && <p className="google-signin__notice" role="alert">{error}</p>}
  </div>;
}

function SupabaseGoogleButton({ onCredential, disabled = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const start = async () => {
    if (disabled || busy) return;
    setBusy(true);
    setError('');
    try { await onCredential(); }
    catch (cause) { setError(cause.message || 'Não foi possível iniciar o acesso com Google.'); }
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

export default function GoogleSignInButton({ legacy = false, ...props }) {
  return legacy ? <LegacyGoogleButton {...props} /> : <SupabaseGoogleButton {...props} />;
}
