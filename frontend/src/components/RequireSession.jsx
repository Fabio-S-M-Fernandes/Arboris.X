import { cloneElement, useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useScreenReady } from './BootGate';
import { beginSupabaseChallenge, getSessionWithApi } from '../lib/api';
import { clearLocalAuthState } from '../lib/auth';
import { supabase } from '../lib/supabase';

export default function RequireSession({ children }) {
  const [status, setStatus] = useState('checking');
  const [sessionUser, setSessionUser] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [retry, setRetry] = useState(0);
  const shell = useRef(null);
  useScreenReady(shell);

  useEffect(() => {
    let active = true;
    let timer;
    let authEventTimer;
    let controller;
    const verify = async () => {
      clearTimeout(timer);
      controller?.abort();
      controller = new AbortController();
      const currentController = controller;
      const token = localStorage.getItem('token');
      if (token) {
        clearLocalAuthState();
        setStatus('invalid');
        return;
      }
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) { if (active) setStatus('invalid'); return; }
        const timeout = setTimeout(() => currentController.abort('timeout'), 8000);
        let result;
        try { result = await getSessionWithApi(currentController.signal); }
        finally { clearTimeout(timeout); }
        if (!active || controller !== currentController) return;
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
          void supabase.auth.signOut({ scope: 'local' });
        } else if (error.status === 403) {
          try {
            const issued = await beginSupabaseChallenge(currentController.signal);
            if (active) { setChallenge({ ...issued, method: 'supabase' }); setStatus('verification'); }
          } catch (challengeError) {
            if (active) setStatus(challengeError.status === 401 ? 'invalid' : 'offline');
          }
        } else {
          // Uma falha de rede não autoriza o acesso nem elimina credenciais válidas.
          setStatus('offline');
        }
      }
    };
    const onVisible = () => { if (!document.hidden) verify(); };
    const onSessionChange = () => { setStatus('checking'); verify(); };
    verify();
    window.addEventListener('storage', onSessionChange);
    window.addEventListener('arboris-session-change', onSessionChange);
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION') return;
      clearTimeout(authEventTimer);
      authEventTimer = setTimeout(onSessionChange, 0);
    });
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false; clearTimeout(timer); clearTimeout(authEventTimer); controller?.abort();
      window.removeEventListener('storage', onSessionChange);
      window.removeEventListener('arboris-session-change', onSessionChange);
      authListener.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [retry]);

  if (status === 'invalid') return <Navigate to="/login" replace />;
  if (status === 'verification') return <Navigate to="/login" replace state={{ challenge }} />;
  if (status === 'valid') return cloneElement(children, { sessionUser });
  return (
    <main className="dashboard-shell" ref={shell}>
      <section className="dashboard-preparation" role="status">
        <p>{status === 'checking' ? 'Verificando sua sessão...' : 'Não foi possível verificar sua sessão.'}</p>
        {status === 'offline' && <button className="dashboard-preparation__logout" type="button" onClick={() => setRetry((value) => value + 1)}>Tentar novamente</button>}
      </section>
    </main>
  );
}
