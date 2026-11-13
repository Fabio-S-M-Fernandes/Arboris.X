import { cloneElement, useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useScreenReady } from './BootGate';
import { getSessionWithApi } from '../lib/api';
import { clearLocalAuthState } from '../lib/auth';

export default function RequireSession({ children }) {
  const [status, setStatus] = useState('checking');
  const [sessionUser, setSessionUser] = useState(null);
  const [retry, setRetry] = useState(0);
  const shell = useRef(null);
  useScreenReady(shell);

  useEffect(() => {
    let active = true;
    let timer;
    let controller;
    const verify = async () => {
      clearTimeout(timer);
      controller?.abort();
      controller = new AbortController();
      const currentController = controller;
      const token = localStorage.getItem('token');
      if (!token) { setStatus('invalid'); return; }
      try {
        const timeout = setTimeout(() => currentController.abort('timeout'), 8000);
        let result;
        try { result = await getSessionWithApi(currentController.signal); }
        finally { clearTimeout(timeout); }
        if (!active || controller !== currentController || localStorage.getItem('token') !== token) return;
        if (!result.user?.id || !Number.isFinite(result.expiresAt) || result.expiresAt * 1000 <= Date.now()) {
          clearLocalAuthState(); setStatus('invalid'); return;
        }
        setSessionUser(result.user);
        setStatus('valid');
        timer = setTimeout(verify, Math.min(60000, Math.max(100, result.expiresAt * 1000 - Date.now())));
      } catch (error) {
        if (!active || controller !== currentController) return;
        if (error.status === 401) {
          clearLocalAuthState(); setStatus('invalid');
        } else {
          // Uma falha de rede n?o autoriza o acesso nem elimina credenciais v?lidas.
          setStatus('offline');
        }
      }
    };
    const onVisible = () => { if (!document.hidden) verify(); };
    const onSessionChange = () => { setStatus('checking'); verify(); };
    verify();
    window.addEventListener('storage', onSessionChange);
    window.addEventListener('arboris-session-change', onSessionChange);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false; clearTimeout(timer); controller?.abort();
      window.removeEventListener('storage', onSessionChange);
      window.removeEventListener('arboris-session-change', onSessionChange);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [retry]);

  if (status === 'invalid') return <Navigate to="/login" replace />;
  if (status === 'valid') return cloneElement(children, { sessionUser });
  return (
    <main className="dashboard-shell" ref={shell}>
      <section className="dashboard-preparation" role="status">
        <p>{status === 'checking' ? 'Verificando sua sess?o?' : 'N?o foi poss?vel verificar sua sess?o.'}</p>
        {status === 'offline' && <button className="dashboard-preparation__logout" type="button" onClick={() => setRetry((value) => value + 1)}>Tentar novamente</button>}
      </section>
    </main>
  );
}
