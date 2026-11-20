import { cloneElement, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useScreenReady } from './BootGate';
import { useAuthTransition } from './AutenticacaoArboris/AuthTransitionController';
import { beginSupabaseChallenge, getSessionWithApi } from '../lib/api';
import { clearLocalAuthState } from '../lib/auth';
import { supabase } from '../lib/supabase';

const authSessionId = (session) => {
  try { return JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).session_id || null; }
  catch { return null; }
};

export default function RequireSession({ children }) {
  const [status, setStatus] = useState('checking');
  const [sessionUser, setSessionUser] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [retry, setRetry] = useState(0);
  const shell = useRef(null);
  const authorizedUser = useRef(null);
  const authorizedSessionId = useRef(null);
  const { cancelTransition, setVerificationActive } = useAuthTransition();
  useScreenReady(shell);

  useLayoutEffect(() => {
    setVerificationActive(status === 'checking');
  }, [setVerificationActive, status]);

  useEffect(() => {
    if (status === 'offline' || status === 'invalid' || status === 'verification') cancelTransition();
  }, [status, cancelTransition]);

  useEffect(() => {
    let active = true;
    let timer;
    let authEventTimer;
    let controller;
    const verify = async () => {
      let currentSessionId = null;
      clearTimeout(timer);
      controller?.abort();
      controller = new AbortController();
      const currentController = controller;
      const token = localStorage.getItem('token');
      if (token) {
        clearLocalAuthState({ notify: false });
        authorizedUser.current = null;
        authorizedSessionId.current = null;
        setStatus('invalid');
        return;
      }
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active || controller !== currentController) return;
        if (error || !data.session) {
          authorizedUser.current = null;
          authorizedSessionId.current = null;
          setStatus('invalid');
          return;
        }
        currentSessionId = authSessionId(data.session);
        if (authorizedUser.current && (!currentSessionId || currentSessionId !== authorizedSessionId.current)) {
          authorizedUser.current = null;
          authorizedSessionId.current = null;
          setStatus('checking');
        }
        const timeout = setTimeout(() => currentController.abort('timeout'), 8000);
        let result;
        try { result = await getSessionWithApi(currentController.signal); }
        finally { clearTimeout(timeout); }
        if (!active || controller !== currentController) return;
        if (!result.user?.id || !Number.isFinite(result.expiresAt) || result.expiresAt * 1000 <= Date.now()) {
          clearLocalAuthState({ notify: false }); authorizedUser.current = null; authorizedSessionId.current = null; setStatus('invalid'); return;
        }
        authorizedUser.current = result.user;
        authorizedSessionId.current = currentSessionId;
        setSessionUser(result.user);
        setStatus('valid');
        timer = setTimeout(verify, Math.min(60000, Math.max(100, result.expiresAt * 1000 - Date.now())));
      } catch (error) {
        if (!active || controller !== currentController) return;
        if (error.status === 401) {
          clearLocalAuthState({ notify: false }); authorizedUser.current = null; authorizedSessionId.current = null; setStatus('invalid');
          void supabase.auth.signOut({ scope: 'local' });
        } else if (error.status === 403) {
          authorizedUser.current = null;
          authorizedSessionId.current = null;
          setStatus('checking');
          try {
            const issued = await beginSupabaseChallenge(currentController.signal);
            if (active && controller === currentController) {
              if (issued.authorized === true) {
                const authorized = await getSessionWithApi(currentController.signal);
                if (!active || controller !== currentController) return;
                if (!authorized.user?.id || !Number.isFinite(authorized.expiresAt)
                  || authorized.expiresAt * 1000 <= Date.now()) { setStatus('invalid'); return; }
                authorizedUser.current = authorized.user;
                authorizedSessionId.current = currentSessionId;
                setSessionUser(authorized.user);
                setStatus('valid');
                timer = setTimeout(verify, Math.min(60000, Math.max(100, authorized.expiresAt * 1000 - Date.now())));
              } else {
                setChallenge({ ...issued, method: 'supabase' });
                setStatus('verification');
              }
            }
          } catch (challengeError) {
            if (active && controller === currentController) setStatus(challengeError.status === 401 ? 'invalid' : 'offline');
          }
        } else {
          // Uma falha de rede não autoriza o acesso nem elimina credenciais válidas.
          setStatus('offline');
        }
      }
    };
    const onVisible = () => { if (!document.hidden) verify(); };
    const onSessionChange = () => { setStatus((current) => current === 'valid' ? current : 'checking'); verify(); };
    verify();
    window.addEventListener('storage', onSessionChange);
    window.addEventListener('arboris-session-change', onSessionChange);
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      if (event === 'SIGNED_OUT') {
        controller?.abort();
        controller = null;
        clearTimeout(timer);
        authorizedUser.current = null;
        authorizedSessionId.current = null;
        setStatus('invalid');
        return;
      }
      clearTimeout(authEventTimer);
      authEventTimer = setTimeout(() => {
        const nextSessionId = authSessionId(session);
        if (!nextSessionId || session?.user?.id !== authorizedUser.current?.id || nextSessionId !== authorizedSessionId.current) setStatus('checking');
        verify();
      }, 0);
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
    <main className="auth-session-screen" ref={shell} aria-busy={status === 'checking'}>
      {status === 'offline' && <section className="auth-session-screen__message" role="status">
        <p>Não foi possível confirmar seu acesso. Tente novamente.</p>
        <button type="button" onClick={() => {
          setStatus('checking');
          setRetry((value) => value + 1);
        }}>Tentar novamente</button>
      </section>}
    </main>
  );
}
