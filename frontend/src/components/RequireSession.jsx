import { cloneElement, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useScreenReady } from './BootGate';
import { useAuthTransition } from './AutenticacaoArboris/AuthTransitionController';
import { beginSupabaseChallenge, getSessionWithApi } from '../lib/api';
import { clearLocalAuthState } from '../lib/auth';
import { supabase, takeAuthRetryAfter } from '../lib/supabase';
import { getDashboardReturnTo } from '../lib/authReturnTo';

const authSessionId = (session) => {
  try { return JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).session_id || null; }
  catch { return null; }
};

const SESSION_CHECK_TIMEOUT_MS = 26_000;
const SESSION_RETRY_DELAYS_MS = [500, 1_200];

const isTemporarySessionError = (error) => error?.status === 503 || error?.status === 408 || error?.status === 0
  || error?.code === 'REQUEST_TIMEOUT' || error?.name === 'AuthRetryableFetchError'
  || error?.name === 'TypeError' || error?.cause?.name === 'TypeError';

const waitWithSignal = (promise, signal) => new Promise((resolve, reject) => {
  if (signal.aborted) {
    reject(Object.assign(new Error('Session check was interrupted.'), { name: 'AbortError' }));
    return;
  }
  let settled = false;
  const finish = (callback, value) => {
    if (settled) return;
    settled = true;
    signal.removeEventListener('abort', onAbort);
    callback(value);
  };
  const onAbort = () => finish(reject,
    Object.assign(new Error('Session check timed out.'), { name: 'AbortError', code: 'SESSION_CHECK_TIMEOUT' }));
  signal.addEventListener('abort', onAbort, { once: true });
  Promise.resolve(promise).then((value) => finish(resolve, value), (error) => finish(reject, error));
});

const waitBeforeRetry = (delayMs, signal) => new Promise((resolve, reject) => {
  if (signal.aborted) {
    reject(Object.assign(new Error('Session check was interrupted.'), { name: 'AbortError' }));
    return;
  }
  const timer = window.setTimeout(() => {
    signal.removeEventListener('abort', onAbort);
    resolve();
  }, delayMs);
  const onAbort = () => {
    window.clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
    reject(Object.assign(new Error('Session check was interrupted.'), { name: 'AbortError' }));
  };
  signal.addEventListener('abort', onAbort, { once: true });
});

const retryTemporarySessionErrors = async (operation, signal) => {
  let attempt = 0;
  while (true) {
    try {
      const result = await operation();
      if (result?.error && isTemporarySessionError(result.error)) throw result.error;
      return result;
    } catch (error) {
      const retryLimit = error?.code === 'REQUEST_TIMEOUT' ? 1 : SESSION_RETRY_DELAYS_MS.length;
      if (signal.aborted || !isTemporarySessionError(error) || attempt >= retryLimit) throw error;
      await waitBeforeRetry(SESSION_RETRY_DELAYS_MS[attempt], signal);
      attempt += 1;
    }
  }
};

export default function RequireSession({ children }) {
  const location = useLocation();
  const returnTo = getDashboardReturnTo(`${location.pathname}${location.search}${location.hash}`);
  const [status, setStatus] = useState('checking');
  const [sessionUser, setSessionUser] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [consentRequired, setConsentRequired] = useState(false);
  const [retry, setRetry] = useState(0);
  const [retryAfterUntil, setRetryAfterUntil] = useState(0);
  const [retryClock, setRetryClock] = useState(0);
  const shell = useRef(null);
  const authorizedUser = useRef(null);
  const authorizedSessionId = useRef(null);
  const retryAfterUntilRef = useRef(0);
  const statusRef = useRef(status);
  const { cancelTransition, setVerificationActive } = useAuthTransition();
  useScreenReady(shell);
  const retryAfterSeconds = Math.max(0, Math.ceil((retryAfterUntil - retryClock) / 1000));

  useEffect(() => {
    if (!retryAfterUntil) return undefined;
    const timer = window.setInterval(() => setRetryClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [retryAfterUntil]);

  useLayoutEffect(() => {
    statusRef.current = status;
    setVerificationActive(status === 'checking');
  }, [setVerificationActive, status]);

  useEffect(() => {
    if (status === 'offline' || status === 'invalid' || status === 'verification') cancelTransition();
  }, [status, cancelTransition]);

  useEffect(() => {
    let active = true;
    let authEventTimer;
    let controller;
    let verifyInProgress = false;
    let lastVisibilityCheckAt = 0;
    let lastVerifiedAt = 0;
    const verify = async () => {
      if (!active || verifyInProgress || retryAfterUntilRef.current > Date.now()) return;
      verifyInProgress = true;
      let currentSessionId = null;
      controller?.abort();
      controller = new AbortController();
      const currentController = controller;
      const checkTimeout = window.setTimeout(() => currentController.abort('timeout'), SESSION_CHECK_TIMEOUT_MS);
      let currentSupabaseSession = null;
      try {
        const token = localStorage.getItem('token');
        if (token) clearLocalAuthState({ notify: false });
        const { data, error } = await retryTemporarySessionErrors(
          () => waitWithSignal(supabase.auth.getSession(), currentController.signal), currentController.signal,
        );
        if (!active || controller !== currentController) return;
        if (error?.status === 429) throw error;
        if (error || !data.session) {
          authorizedUser.current = null;
          authorizedSessionId.current = null;
          setStatus('invalid');
          return;
        }
        currentSupabaseSession = data.session;
        currentSessionId = authSessionId(data.session);
        if (authorizedUser.current && (!currentSessionId || currentSessionId !== authorizedSessionId.current)) {
          authorizedUser.current = null;
          authorizedSessionId.current = null;
          setStatus('checking');
        }
        const result = await retryTemporarySessionErrors(
          () => waitWithSignal(getSessionWithApi(currentController.signal, data.session), currentController.signal),
          currentController.signal,
        );
        if (!active || controller !== currentController) return;
        if (!result.user?.id || !Number.isFinite(result.expiresAt) || result.expiresAt * 1000 <= Date.now()) {
          clearLocalAuthState({ notify: false }); authorizedUser.current = null; authorizedSessionId.current = null; setStatus('invalid'); return;
        }
        authorizedUser.current = result.user;
        authorizedSessionId.current = currentSessionId;
        setSessionUser(result.user);
        setStatus('valid');
        lastVerifiedAt = Date.now();
      } catch (error) {
        if (!active || controller !== currentController) return;
        let handledError = error;
        if (handledError.status === 429 && !Number.isInteger(handledError.retryAfterSeconds)) {
          const retryAfterSeconds = takeAuthRetryAfter('session_refresh');
          if (Number.isInteger(retryAfterSeconds) && retryAfterSeconds > 0) handledError = { ...error, retryAfterSeconds };
        }
        if (handledError.status === 401) {
          clearLocalAuthState({ notify: false }); authorizedUser.current = null; authorizedSessionId.current = null; setStatus('invalid');
          void supabase.auth.signOut({ scope: 'local' });
        } else if (handledError.status === 403) {
          authorizedUser.current = null;
          authorizedSessionId.current = null;
          setStatus('checking');
          try {
            const issued = await waitWithSignal(
              beginSupabaseChallenge(currentController.signal), currentController.signal,
            );
            if (active && controller === currentController) {
              if (issued.authorized === true) {
                const authorized = await retryTemporarySessionErrors(
                  () => waitWithSignal(getSessionWithApi(currentController.signal, currentSupabaseSession), currentController.signal),
                  currentController.signal,
                );
                if (!active || controller !== currentController) return;
                if (!authorized.user?.id || !Number.isFinite(authorized.expiresAt)
                  || authorized.expiresAt * 1000 <= Date.now()) { setStatus('invalid'); return; }
                authorizedUser.current = authorized.user;
                authorizedSessionId.current = currentSessionId;
                setSessionUser(authorized.user);
                setStatus('valid');
                lastVerifiedAt = Date.now();
              } else {
                setChallenge({ ...issued, method: 'supabase' });
                setStatus('verification');
              }
            }
          } catch (challengeError) {
            if (active && controller === currentController) {
              if (challengeError.code === 'TERMS_REQUIRED') setConsentRequired(true);
              else {
                if (challengeError.status === 429 && Number.isInteger(challengeError.retryAfterSeconds)
                  && challengeError.retryAfterSeconds > 0) {
                  const retryAt = Date.now() + challengeError.retryAfterSeconds * 1000;
                  retryAfterUntilRef.current = retryAt;
                  setRetryAfterUntil(retryAt);
                  setRetryClock(Date.now());
                }
                setStatus(challengeError.status === 401 ? 'invalid' : 'offline');
              }
            }
          }
        } else {
          // Uma falha de rede não autoriza o acesso nem elimina credenciais válidas.
          if (handledError.status === 429 && Number.isInteger(handledError.retryAfterSeconds) && handledError.retryAfterSeconds > 0) {
            const retryAt = Date.now() + handledError.retryAfterSeconds * 1000;
            retryAfterUntilRef.current = retryAt;
            setRetryAfterUntil(retryAt);
            setRetryClock(Date.now());
          }
          setStatus('offline');
        }
      } finally {
        window.clearTimeout(checkTimeout);
        verifyInProgress = false;
      }
    };
    const onVisible = () => {
      const currentStatus = statusRef.current;
      if (document.hidden || verifyInProgress || retryAfterUntilRef.current > Date.now()
        || !['valid', 'offline'].includes(currentStatus)) return;
      const now = Date.now();
      if (now - lastVisibilityCheckAt < 1_000
        || (currentStatus === 'valid' && now - lastVerifiedAt < 5 * 60_000)) return;
      lastVisibilityCheckAt = now;
      setStatus('checking');
      verify();
    };
    const onSessionChange = (event) => {
      if (event.type === 'storage' && event.key !== null
        && !['arboris-supabase-auth', 'token', 'logado'].includes(event.key)) return;
      if (verifyInProgress || ['invalid', 'verification'].includes(statusRef.current)
        || retryAfterUntilRef.current > Date.now()) return;
      setStatus((current) => current === 'valid' ? current : 'checking');
      verify();
    };
    verify();
    window.addEventListener('storage', onSessionChange);
    window.addEventListener('arboris-session-change', onSessionChange);
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      if (event === 'SIGNED_OUT') {
        controller?.abort();
        controller = null;
        authorizedUser.current = null;
        authorizedSessionId.current = null;
        setStatus('invalid');
        return;
      }
      clearTimeout(authEventTimer);
      authEventTimer = setTimeout(() => {
        if (verifyInProgress || retryAfterUntilRef.current > Date.now()) return;
        const nextSessionId = authSessionId(session);
        if (!nextSessionId || session?.user?.id !== authorizedUser.current?.id || nextSessionId !== authorizedSessionId.current) setStatus('checking');
        verify();
      }, 0);
    });
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false; clearTimeout(authEventTimer); controller?.abort();
      window.removeEventListener('storage', onSessionChange);
      window.removeEventListener('arboris-session-change', onSessionChange);
      authListener.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [retry]);

  if (consentRequired) return <Navigate to={`/consentimento?next=${encodeURIComponent(returnTo)}`} replace state={{ from: returnTo }} />;
  if (status === 'invalid') return <Navigate to="/login" replace state={{ from: returnTo }} />;
  if (status === 'verification') return <Navigate to="/login" replace state={{ challenge, from: returnTo }} />;
  if (status === 'valid') {
    return typeof children.type === 'string' ? children : cloneElement(children, { sessionUser });
  }
  return (
    <main className="auth-session-screen" ref={shell} aria-busy={status === 'checking'}>
      <section className="auth-session-screen__message" role="status" aria-live="polite" data-state={status}>
        <img className="auth-session-screen__emblem" src="/arboris-tree.webp" alt="" aria-hidden="true" />
        <span className="auth-session-screen__eyebrow">ARBORIS.X · ACESSO SEGURO</span>
        <h1>{status === 'checking' ? 'Confirmando seu acesso' : 'Não foi possível confirmar seu acesso'}</h1>
        {status === 'checking' ? <p>Estamos validando sua sessão para abrir o Dashboard com segurança.</p> : <p>{retryAfterSeconds > 0
          ? `Aguarde ${retryAfterSeconds}s antes de tentar novamente.`
          : 'O serviço pode estar temporariamente indisponível. Sua página e o progresso salvo continuam preservados.'}</p>}
        {status === 'offline' && <button type="button" disabled={retryAfterSeconds > 0} onClick={() => {
          setStatus('checking');
          setRetry((value) => value + 1);
        }}>{retryAfterSeconds > 0 ? `Aguarde ${retryAfterSeconds}s` : 'Tentar novamente'}</button>}
      </section>
    </main>
  );
}
