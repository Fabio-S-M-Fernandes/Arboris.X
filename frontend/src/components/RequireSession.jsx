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

const SESSION_CHECK_TIMEOUT_MS = 12_000;
const SESSION_RETRY_DELAYS_MS = [300, 800];

const isTemporarySessionError = (error) => [0, 408, 500, 502, 503, 504].includes(error?.status)
  || ['REQUEST_TIMEOUT', 'SESSION_CHECK_TIMEOUT'].includes(error?.code)
  || error?.name === 'AbortError' || error?.name === 'AuthRetryableFetchError'
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
      const retryLimit = ['REQUEST_TIMEOUT', 'SESSION_CHECK_TIMEOUT'].includes(error?.code)
        ? 1 : SESSION_RETRY_DELAYS_MS.length;
      if (signal.aborted || !isTemporarySessionError(error) || attempt >= retryLimit) throw error;
      await waitBeforeRetry(SESSION_RETRY_DELAYS_MS[attempt], signal);
      attempt += 1;
    }
  }
};

const refreshSupabaseSession = async (sessionSnapshot, signal) => {
  let result;
  try {
    result = await retryTemporarySessionErrors(
      () => waitWithSignal(supabase.auth.refreshSession(sessionSnapshot), signal), signal,
    );
  } catch (error) {
    if (signal.aborted || error?.status === 429 || isTemporarySessionError(error)) throw error;
    throw Object.assign(new Error('A sessão do Supabase não pôde ser renovada.'), {
      status: 401, code: 'SESSION_REFRESH_REJECTED', cause: error,
    });
  }
  if (result.error) {
    if (result.error.status === 429 || isTemporarySessionError(result.error)) throw result.error;
    throw Object.assign(new Error('A sessão do Supabase não pôde ser renovada.'), {
      status: 401, code: 'SESSION_REFRESH_REJECTED', cause: result.error,
    });
  }
  if (!result.data?.session) {
    throw Object.assign(new Error('A sessão do Supabase expirou.'), { status: 401, code: 'SESSION_REFRESH_REJECTED' });
  }
  return result.data.session;
};

export default function RequireSession({ children }) {
  const location = useLocation();
  const returnTo = getDashboardReturnTo(`${location.pathname}${location.search}${location.hash}`);
  const [status, setStatus] = useState('checking');
  const [sessionUser, setSessionUser] = useState(null);
  const [revalidationWarning, setRevalidationWarning] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [consentRequired, setConsentRequired] = useState(false);
  const [retry, setRetry] = useState(0);
  const [retryAfterUntil, setRetryAfterUntil] = useState(0);
  const [retryClock, setRetryClock] = useState(0);
  const shell = useRef(null);
  const authorizedUser = useRef(null);
  const authorizedSessionId = useRef(null);
  const authorizedExpiresAt = useRef(0);
  const retryAfterUntilRef = useRef(0);
  const statusRef = useRef(status);
  const { cancelTransition } = useAuthTransition();
  useScreenReady(shell);
  const retryAfterSeconds = Math.max(0, Math.ceil((retryAfterUntil - retryClock) / 1000));

  useEffect(() => {
    if (!retryAfterUntil) return undefined;
    const timer = window.setInterval(() => setRetryClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [retryAfterUntil]);

  useLayoutEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (status === 'offline' || status === 'invalid' || status === 'verification') cancelTransition();
  }, [status, cancelTransition]);

  useEffect(() => {
    let active = true;
    let authEventTimer;
    let controller;
    let verifyInProgress = false;
    let verifyQueued = false;
    let inFlightSessionId = null;
    let inFlightUserId = null;
    let refreshingSession = false;
    let authRevision = 0;
    let lastVisibilityCheckAt = 0;
    let lastVerifiedAt = 0;
    const clearAuthorization = () => {
      authorizedUser.current = null;
      authorizedSessionId.current = null;
      authorizedExpiresAt.current = 0;
    };
    const updateVerifiedUser = (user) => setSessionUser((current) => {
      const currentProviders = current?.authProviders || [];
      const nextProviders = user.authProviders || [];
      const sameProviders = currentProviders.length === nextProviders.length
        && currentProviders.every((provider, index) => provider === nextProviders[index]);
      return current?.id === user.id && current.email === user.email
        && current.emailConfirmed === user.emailConfirmed && current.googleLinked === user.googleLinked
        && current.userMetadata?.full_name === user.userMetadata?.full_name
        && current.userMetadata?.name === user.userMetadata?.name && sameProviders ? current : user;
    });
    const applyRetryAfter = (error, showCountdown) => {
      let seconds = error.retryAfterSeconds;
      if (!Number.isInteger(seconds) || seconds < 1) seconds = takeAuthRetryAfter('session_refresh');
      if (!Number.isInteger(seconds) || seconds < 1) seconds = 30;
      const retryAt = Date.now() + seconds * 1000;
      retryAfterUntilRef.current = retryAt;
      if (showCountdown) {
        setRetryAfterUntil(retryAt);
        setRetryClock(Date.now());
      }
    };
    const refreshSession = async (sessionSnapshot, signal) => {
      refreshingSession = true;
      try {
        return await refreshSupabaseSession(sessionSnapshot, signal);
      } finally {
        refreshingSession = false;
      }
    };
    const verify = async () => {
      if (!active || verifyInProgress || retryAfterUntilRef.current > Date.now()) return;
      verifyInProgress = true;
      verifyQueued = false;
      const currentAuthRevision = authRevision;
      let wasAuthorizedSession = Boolean(authorizedUser.current && authorizedSessionId.current
        && authorizedExpiresAt.current * 1000 > Date.now());
      let hadAuthorizedSession = false;
      let currentSessionId = null;
      controller?.abort();
      controller = new AbortController();
      const currentController = controller;
      const checkTimeout = window.setTimeout(() => currentController.abort('timeout'), SESSION_CHECK_TIMEOUT_MS);
      let currentSupabaseSession = null;
      try {
        const token = localStorage.getItem('token');
        if (token) clearLocalAuthState({ notify: false });
        let { data, error } = await retryTemporarySessionErrors(
          () => waitWithSignal(supabase.auth.getSession(), currentController.signal), currentController.signal,
        );
        if (!active || controller !== currentController) return;
        if (authRevision !== currentAuthRevision) { verifyQueued = true; return; }
        if (error?.status === 429) throw error;
        if (error?.status === 401) {
          currentSupabaseSession = await refreshSession(null, currentController.signal);
          data = { session: currentSupabaseSession };
          error = null;
        }
        if (error || !data.session) {
          clearAuthorization();
          setSessionUser(null);
          setStatus('invalid');
          return;
        }
        currentSupabaseSession = data.session;
        currentSessionId = authSessionId(data.session);
        inFlightSessionId = currentSessionId;
        inFlightUserId = data.session.user?.id || null;
        hadAuthorizedSession = Boolean(authorizedUser.current && currentSessionId
          && currentSessionId === authorizedSessionId.current
          && data.session.user?.id === authorizedUser.current.id);
        wasAuthorizedSession = hadAuthorizedSession && authorizedExpiresAt.current * 1000 > Date.now();
        if (authorizedUser.current && !wasAuthorizedSession) {
          clearAuthorization();
          setSessionUser(null);
          setRevalidationWarning('');
          setStatus('checking');
        }
        let result;
        try {
          result = await retryTemporarySessionErrors(
            () => waitWithSignal(getSessionWithApi(currentController.signal, currentSupabaseSession), currentController.signal),
            currentController.signal,
          );
        } catch (sessionError) {
          if (sessionError.status !== 401) throw sessionError;
          const refreshedSession = await refreshSession(currentSupabaseSession, currentController.signal);
          const refreshedSessionId = authSessionId(refreshedSession);
          if (refreshedSessionId !== currentSessionId || refreshedSession.user?.id !== inFlightUserId) {
            wasAuthorizedSession = false;
            hadAuthorizedSession = false;
            clearAuthorization();
            setSessionUser(null);
            setRevalidationWarning('');
            setStatus('checking');
          }
          currentSupabaseSession = refreshedSession;
          currentSessionId = refreshedSessionId;
          inFlightSessionId = currentSessionId;
          inFlightUserId = refreshedSession.user?.id || null;
          result = await retryTemporarySessionErrors(
            () => waitWithSignal(getSessionWithApi(currentController.signal, currentSupabaseSession), currentController.signal),
            currentController.signal,
          );
        }
        if (!active || controller !== currentController) return;
        if (authRevision !== currentAuthRevision) { verifyQueued = true; return; }
        if (!result.user?.id || !Number.isFinite(result.expiresAt) || result.expiresAt * 1000 <= Date.now()) {
          clearLocalAuthState({ notify: false });
          clearAuthorization();
          setSessionUser(null);
          setStatus('invalid');
          return;
        }
        authorizedUser.current = result.user;
        authorizedSessionId.current = currentSessionId;
        authorizedExpiresAt.current = result.expiresAt;
        updateVerifiedUser(result.user);
        setRevalidationWarning('');
        retryAfterUntilRef.current = 0;
        setRetryAfterUntil(0);
        setStatus('valid');
        lastVerifiedAt = Date.now();
      } catch (error) {
        if (!active || controller !== currentController) return;
        if (authRevision !== currentAuthRevision) { verifyQueued = true; return; }
        let handledError = error;
        if (handledError.status === 429 && !Number.isInteger(handledError.retryAfterSeconds)) {
          const retryAfterSeconds = takeAuthRetryAfter('session_refresh');
          if (Number.isInteger(retryAfterSeconds) && retryAfterSeconds > 0) handledError = { ...error, retryAfterSeconds };
        }
        if (handledError.status === 401) {
          clearLocalAuthState({ notify: false });
          clearAuthorization();
          setSessionUser(null);
          setRevalidationWarning('');
          setStatus('invalid');
          void supabase.auth.signOut({ scope: 'local' });
        } else if (handledError.status === 403 && handledError.code === 'TERMS_REQUIRED') {
          clearAuthorization();
          setSessionUser(null);
          setConsentRequired(true);
        } else if (handledError.status === 403 && handledError.code === 'ADDITIONAL_VERIFICATION_REQUIRED'
          && !hadAuthorizedSession) {
          clearAuthorization();
          setSessionUser(null);
          setStatus('checking');
          try {
            const issued = await waitWithSignal(
              beginSupabaseChallenge(currentController.signal), currentController.signal,
            );
            if (active && controller === currentController && authRevision === currentAuthRevision) {
              if (issued.authorized === true) {
                const authorized = await retryTemporarySessionErrors(
                  () => waitWithSignal(getSessionWithApi(currentController.signal, currentSupabaseSession), currentController.signal),
                  currentController.signal,
                );
                if (!active || controller !== currentController) return;
                if (authRevision !== currentAuthRevision) { verifyQueued = true; return; }
                if (!authorized.user?.id || !Number.isFinite(authorized.expiresAt)
                  || authorized.expiresAt * 1000 <= Date.now()) {
                  clearAuthorization();
                  setSessionUser(null);
                  setStatus('invalid');
                  return;
                }
                authorizedUser.current = authorized.user;
                authorizedSessionId.current = currentSessionId;
                authorizedExpiresAt.current = authorized.expiresAt;
                updateVerifiedUser(authorized.user);
                setRevalidationWarning('');
                setStatus('valid');
                lastVerifiedAt = Date.now();
              } else {
                setChallenge({ ...issued, method: 'supabase' });
                setStatus('verification');
              }
            }
          } catch (challengeError) {
            if (active && controller === currentController) {
              if (authRevision !== currentAuthRevision) { verifyQueued = true; return; }
              if (challengeError.code === 'TERMS_REQUIRED') setConsentRequired(true);
              else if (challengeError.status === 401 || challengeError.status === 403) {
                clearAuthorization();
                setSessionUser(null);
                setStatus('invalid');
                if (challengeError.status === 401) void supabase.auth.signOut({ scope: 'local' });
              }
              else {
                if (challengeError.status === 429) applyRetryAfter(challengeError, true);
                setStatus('offline');
              }
            }
          }
        } else if (handledError.status === 403) {
          clearAuthorization();
          setSessionUser(null);
          setRevalidationWarning('');
          setStatus('invalid');
          void supabase.auth.signOut({ scope: 'local' });
        } else if (wasAuthorizedSession && authorizedExpiresAt.current * 1000 > Date.now()
          && (isTemporarySessionError(handledError) || handledError.status === 429)) {
          if (handledError.status === 429) {
            applyRetryAfter(handledError, false);
            setRevalidationWarning('A validação foi limitada temporariamente. Sua última autorização continua em vigor; tentaremos novamente após o período indicado.');
          } else {
            retryAfterUntilRef.current = Date.now() + 30_000;
            setRevalidationWarning('O serviço está temporariamente indisponível. A última autorização permanece válida enquanto sua sessão não expirar; a verificação será retomada ao retornar à aba.');
          }
          setStatus('valid');
        } else {
          if (handledError.status === 429) applyRetryAfter(handledError, true);
          clearAuthorization();
          setSessionUser(null);
          setStatus('offline');
        }
      } finally {
        window.clearTimeout(checkTimeout);
        verifyInProgress = false;
        inFlightSessionId = null;
        inFlightUserId = null;
        if (controller === currentController) controller = null;
        if (active && verifyQueued && retryAfterUntilRef.current <= Date.now()) {
          verifyQueued = false;
          Promise.resolve().then(() => { if (active) void verify(); });
        }
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
      if (currentStatus === 'offline') setStatus('checking');
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
    Promise.resolve().then(() => { if (active) void verify(); });
    window.addEventListener('storage', onSessionChange);
    window.addEventListener('arboris-session-change', onSessionChange);
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      if (event === 'SIGNED_OUT') {
        authRevision += 1;
        verifyQueued = false;
        controller?.abort();
        controller = null;
        clearAuthorization();
        setSessionUser(null);
        setRevalidationWarning('');
        setStatus('invalid');
        return;
      }
      if (retryAfterUntilRef.current > Date.now() && statusRef.current !== 'valid') return;
      const nextSessionId = authSessionId(session);
      const sameAuthorizedSession = Boolean(authorizedUser.current && nextSessionId
        && nextSessionId === authorizedSessionId.current && session?.user?.id === authorizedUser.current.id);
      const sameInFlightSession = Boolean(inFlightSessionId && nextSessionId
        && nextSessionId === inFlightSessionId && session?.user?.id === inFlightUserId);
      if (refreshingSession && event === 'TOKEN_REFRESHED') return;
      if (['TOKEN_REFRESHED', 'SIGNED_IN'].includes(event) && (sameAuthorizedSession || sameInFlightSession)) return;
      authRevision += 1;
      const sessionChanged = !sameAuthorizedSession && !sameInFlightSession;
      if (sessionChanged) {
        clearAuthorization();
        setSessionUser(null);
        setRevalidationWarning('');
        setStatus('checking');
      }
      if (verifyInProgress) {
        verifyQueued = true;
        if (sessionChanged) {
          controller?.abort();
          controller = null;
        }
        return;
      }
      clearTimeout(authEventTimer);
      authEventTimer = setTimeout(() => {
        if (verifyInProgress || retryAfterUntilRef.current > Date.now()) return;
        if (sessionChanged) setStatus('checking');
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
  if (status === 'invalid') return <Navigate to="/login" replace state={{ from: returnTo, sessionCheckFailed: true }} />;
  if (status === 'verification') return <Navigate to="/login" replace state={{ challenge, from: returnTo }} />;
  if (status === 'valid') {
    return typeof children.type === 'string' ? children : cloneElement(children, { sessionUser, sessionWarning: revalidationWarning });
  }
  if (status === 'checking') return (
    <main className="auth-session-pending" ref={shell} role="status" aria-label="Confirmando seu acesso" aria-busy="true">
      <span className="auth-session-pending__indicator" aria-hidden="true" />
    </main>
  );
  return (
    <main className="auth-session-screen" ref={shell} aria-busy="false">
      <section className="auth-session-screen__message" role="status" aria-live="polite" data-state="offline">
        <img className="auth-session-screen__emblem" src="/arboris-tree.webp" alt="" aria-hidden="true" />
        <span className="auth-session-screen__eyebrow">ARBORIS.X · ACESSO SEGURO</span>
        <h1>Não foi possível confirmar seu acesso</h1>
        <p>{retryAfterSeconds > 0
          ? `Aguarde ${retryAfterSeconds}s antes de tentar novamente.`
          : 'O serviço pode estar temporariamente indisponível. Sua página e o progresso salvo continuam preservados.'}</p>
        {status === 'offline' && <button type="button" disabled={retryAfterSeconds > 0} onClick={() => {
          setStatus('checking');
          setRetry((value) => value + 1);
        }}>{retryAfterSeconds > 0 ? `Aguarde ${retryAfterSeconds}s` : 'Tentar novamente'}</button>}
      </section>
    </main>
  );
}
