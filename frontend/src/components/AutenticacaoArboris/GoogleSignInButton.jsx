import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { requestGoogleNonce } from '../../lib/api';

let googleScriptPromise;

const loadGoogleIdentity = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;
  googleScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      googleScriptPromise = undefined;
      reject(new Error('Não foi possível carregar o serviço de Login com Google.'));
    };
    document.head.appendChild(script);
  });
  return googleScriptPromise;
};

export default function GoogleSignInButton({ onCredential, refreshKey = 0, disabled = false }) {
  const mountRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [status, setStatus] = useState('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    let active = true;
    let nonce;
    const container = mountRef.current;

    const render = (nextNonce, clientId) => {
      nonce = nextNonce;
      container.replaceChildren();
      const handleCredential = async (response) => {
        if (!active || !response.credential) return;
        setBusy(true);
        setError('');
        let stop = false;
        try {
          const result = await callbackRef.current({ idToken: response.credential, nonce });
          stop = result?.requiresTerms || result?.complete;
        } catch (callbackError) {
          setError(callbackError.message || 'Não foi possível entrar com Google.');
        } finally {
          if (active && !stop) {
            try {
              const renewed = await requestGoogleNonce();
              if (active) render(renewed.nonce, clientId);
            } catch (nonceError) {
              setStatus('unavailable');
              setError(nonceError.message || 'Login com Google indisponível neste momento.');
            }
          }
          if (active) setBusy(false);
        }
      };

      window.google.accounts.id.initialize({ client_id: clientId, nonce, auto_select: false, callback: handleCredential });
      window.google.accounts.id.renderButton(container, {
        type: 'standard', theme: 'filled_black', size: 'large', shape: 'rectangular',
        text: 'signin_with', logo_alignment: 'left', locale: 'pt-BR', width: Math.min(400, Math.floor(container.clientWidth || 400)),
      });
    };

    const mount = async () => {
      if (!clientId) {
        setStatus('unconfigured');
        return;
      }
      try {
        const issued = await requestGoogleNonce();
        await loadGoogleIdentity();
        if (!active || !container) return;
        render(issued.nonce, clientId);
        setStatus('ready');
      } catch (loadError) {
        if (active) {
          setStatus('unavailable');
          setError(loadError.message || 'Login com Google indisponível neste momento.');
        }
      }
    };

    mount();
    return () => {
      active = false;
      if (container) container.replaceChildren();
    };
  }, [refreshKey]);

  return (
    <div className={`google-signin ${busy ? 'is-busy' : ''} ${disabled ? 'is-disabled' : ''}`} aria-busy={busy || disabled}>
      <div ref={mountRef} className="google-signin__mount" />
      {busy && <span className="google-signin__busy" role="status"><LoaderCircle size={17} className="animate-spin" />Verificando com Google…</span>}
      {status === 'unconfigured' && <>
        <button type="button" className="google-signin__fallback" disabled>
          <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.5 9.5 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.9 6-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.7-5.1c-1.8 1.2-4 1.9-6.8 1.9-5.2 0-9.5-3.5-11.1-8.2H6v5.2A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.9 27.8a12 12 0 0 1 0-7.6V15H6a20 20 0 0 0 0 18Z"/><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 6 15l6.9 5.2c1.6-4.7 5.9-8.2 11.1-8.2Z"/></svg>
          Entrar com Google
        </button>
        <p className="google-signin__notice" role="status">Configure o Client ID do Google para habilitar este acesso.</p>
      </>}
      {status === 'unavailable' && error && <p className="google-signin__notice" role="status">{error}</p>}
      {status === 'ready' && error && <p className="google-signin__notice" role="alert">{error}</p>}
      {status === 'loading' && <span className="google-signin__loading" aria-hidden="true"><LoaderCircle size={17} className="animate-spin" /> Carregando Google…</span>}
    </div>
  );
}
