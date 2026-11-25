/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthTransition from './AuthTransition';
import HoloBackground from '../HoloBackground/HoloBackground';
import { getMotionDuration } from '../../lib/motion';

const IDLE = { phase: 'idle', target: null, mode: 'auth', direction: 'forward' };

export const AuthTransitionContext = createContext(null);

export function useAuthTransition() {
  const context = useContext(AuthTransitionContext);
  if (!context) throw new Error('useAuthTransition deve ser usado dentro de AuthTransitionProvider.');
  return context;
}

const nextPaint = () => new Promise((resolve) => {
  window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
});

/**
 * Confirma que o painel de destino está de fato na tela:
 * existe, está conectado, tem dimensões reais e não está escondido.
 * Não checa opacity: a animação de entrada vive num filho e faria o
 * controller esperar um tempo que não é sincronização, é latência.
 */
const confirmDestination = (mode) => {
  const selector = mode === 'welcome' ? '.dashboard-shell' : '.auth-panel-wrapper.active';
  const panel = document.querySelector(selector);
  if (!panel || !panel.isConnected) return false;

  const rect = panel.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;

  return getComputedStyle(panel).visibility !== 'hidden';
};

export function AuthTransitionProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const locationKey = `${location.pathname}${location.search}${location.hash}`;
  const locationKeyRef = useRef(locationKey);
  useLayoutEffect(() => { locationKeyRef.current = locationKey; }, [locationKey]);
  const [transition, setTransition] = useState(IDLE);
  const [verificationActive, setVerificationActive] = useState(
    location.pathname === '/auth/callback',
  );
  const [environmentReady, setEnvironmentReady] = useState(false);
  const [environmentAssetsReady, setEnvironmentAssetsReady] = useState(false);
  const [pageHidden, setPageHidden] = useState(document.hidden);
  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  const motionPaused = pageHidden;
  const requestRef = useRef(null);
  const fallbackRef = useRef(null);

  const requestTransition = useCallback((target, options = {}) => {
    if (requestRef.current || transition.phase !== 'idle' || locationKey === target
      || locationKeyRef.current !== locationKey) return;
    requestRef.current = {
      target,
      source: location.pathname,
      sourceKey: locationKey,
      state: options.state,
      mode: options.mode || 'auth',
      direction: options.direction || 'forward',
      userName: options.userName || '',
      isNewUser: Boolean(options.isNewUser),
    };
    if (requestRef.current.mode === 'welcome') {
      setTransition({ phase: 'verifying', ...requestRef.current });
      navigate(target);
    } else {
      setTransition({ phase: 'covering', ...requestRef.current });
    }
  }, [location.pathname, locationKey, navigate, transition.phase]);

  // A entrada no Dashboard começa pela verificação do guard; outras trocas usam a cobertura do card.
  const handleCovered = useCallback(() => {
    if (transition.phase !== 'covering' || !requestRef.current || requestRef.current.covered) return;
    requestRef.current.covered = true;
    setTransition((current) => ({ ...current, phase: 'switching' }));
    navigate(requestRef.current.target, requestRef.current.state ? { state: requestRef.current.state } : undefined);
  }, [navigate, transition.phase]);

  // A tela de destino sinaliza que montou. Só vale na janela da troca.
  const signalDestinationReady = useCallback(() => {
    if (!requestRef.current || locationKeyRef.current !== requestRef.current.target) return;
    setTransition((current) => {
      if (current.mode === 'welcome' && current.phase === 'verifying') return { ...current, phase: 'welcome' };
      if (current.mode === 'auth' && current.phase === 'switching') return { ...current, phase: 'waiting' };
      return current;
    });
  }, []);

  const cancelTransition = useCallback(() => {
    if (!requestRef.current) return;
    requestRef.current = null;
    window.clearTimeout(fallbackRef.current);
    setTransition(IDLE);
  }, []);

  const handleWelcomeComplete = useCallback(() => {
    setTransition((current) => current.mode === 'welcome' && current.phase === 'welcome'
      ? { ...current, phase: 'exiting' } : current);
  }, []);

  const handleWelcomeExit = useCallback(() => {
    setTransition((current) => current.mode === 'welcome' && current.phase === 'exiting'
      ? { ...current, phase: 'revealing' } : current);
  }, []);

  useEffect(() => {
    const request = requestRef.current;
    if (!request || transition.phase === 'idle') return;
    if (locationKey === request.target) request.arrived = true;
    const expected = request.mode === 'welcome'
      ? locationKey === request.target || (!request.arrived && locationKey === request.sourceKey)
      : transition.phase === 'revealing'
        ? locationKey === request.target
        : locationKey === request.sourceKey || (request.covered && locationKey === request.target);
    if (!expected) cancelTransition();
  }, [cancelTransition, locationKey, transition.phase]);

  // Para trocas entre formulários, a máscara abre após o painel de destino ter layout.
  useEffect(() => {
    if (transition.phase !== 'waiting' || transition.mode !== 'auth' || !requestRef.current) return undefined;
    if (locationKey !== requestRef.current.target) return undefined;

    let cancelled = false;
    let frame = 0;

    const confirm = () => {
      if (cancelled) return;
      if (confirmDestination(transition.mode)) {
        nextPaint().then(() => {
          if (!cancelled) setTransition((current) => ({ ...current, phase: 'revealing' }));
        });
        return;
      }
      frame = window.requestAnimationFrame(confirm);
    };

    frame = window.requestAnimationFrame(confirm);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [locationKey, transition.mode, transition.phase]);

  const handleRevealComplete = useCallback(() => {
    if (transition.phase !== 'revealing' || !requestRef.current) return;
    requestRef.current = null;
    window.clearTimeout(fallbackRef.current);
    setTransition(IDLE);
  }, [transition.phase]);

  useEffect(() => {
    // O watchdog só cobre eventos visuais da troca de formulário; a autorização
    // do Dashboard avança exclusivamente pelo sinal de RequireSession/DashboardPage.
    if (transition.mode !== 'auth' || (transition.phase !== 'covering' && transition.phase !== 'revealing')) return undefined;
    window.clearTimeout(fallbackRef.current);
    const fallbackDuration = getMotionDuration(
      '--motion-auth-transition',
      500,
    ) + 160;
    fallbackRef.current = window.setTimeout(() => {
      if (transition.phase === 'covering') {
        handleCovered();
      } else if (transition.phase === 'revealing') {
        handleRevealComplete();
      }
    }, fallbackDuration);
    return () => window.clearTimeout(fallbackRef.current);
  }, [handleCovered, handleRevealComplete, transition.mode, transition.phase]);

  // Sem movimento, a cobertura avança sem depender de animationend.
  useEffect(() => {
    if (transition.phase === 'idle') return undefined;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const advance = () => {
      if (!preference.matches && document.documentElement.dataset.motion !== 'reduced') return;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (transition.mode === 'auth' && transition.phase === 'covering') handleCovered();
        if (transition.mode === 'auth' && transition.phase === 'revealing') handleRevealComplete();
        if (transition.mode === 'welcome' && transition.phase === 'exiting') handleWelcomeExit();
        if (transition.mode === 'welcome' && transition.phase === 'revealing') handleRevealComplete();
      });
    };
    const motionObserver = new MutationObserver(advance);
    motionObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    advance();
    preference.addEventListener('change', advance);
    return () => {
      window.cancelAnimationFrame(frame);
      motionObserver.disconnect();
      preference.removeEventListener('change', advance);
    };
  }, [transition.mode, transition.phase, handleCovered, handleRevealComplete, handleWelcomeExit]);

  const active = transition.phase !== 'idle';
  const routeVerification = verificationActive
    && location.pathname === '/auth/callback';
  const welcomeActive = transition.mode === 'welcome' && transition.phase !== 'idle';
  const foregroundActive = welcomeActive || routeVerification;
  const hideAppStage = (welcomeActive && ['verifying', 'welcome', 'exiting'].includes(transition.phase))
    || routeVerification;
  const visibleTransition = active
    && (transition.mode === 'welcome' || (transition.mode === 'auth' && transition.source === '/dashboard'))
    ? transition
    : routeVerification
      ? { ...IDLE, phase: 'verifying', mode: 'welcome' }
      : null;
  const value = useMemo(() => ({
    requestTransition,
    signalDestinationReady,
    cancelTransition,
    setVerificationActive,
    environmentReady,
    environmentAssetsReady,
    motionPaused,
    foregroundActive,
    hideAppStage,
    formPhase: transition.mode === 'auth' ? transition.phase : 'idle',
    direction: transition.direction,
    onFormExit: handleCovered,
    onFormEnter: handleRevealComplete,
  }), [
    requestTransition,
    signalDestinationReady,
    cancelTransition,
    setVerificationActive,
    environmentReady,
    environmentAssetsReady,
    motionPaused,
    foregroundActive,
    hideAppStage,
    transition.mode,
    transition.phase,
    transition.direction,
    handleCovered,
    handleRevealComplete,
  ]);
  return (
    <AuthTransitionContext.Provider value={value}>
      <HoloBackground onReady={setEnvironmentReady} onAssetsReady={setEnvironmentAssetsReady} paused={motionPaused} />
      {children}
      {visibleTransition && <AuthTransition
        active
        phase={visibleTransition.phase}
        direction={visibleTransition.direction}
        mode={visibleTransition.mode}
        userName={visibleTransition.userName}
        isNewUser={visibleTransition.isNewUser}
        onCovered={handleCovered}
        onWelcomeComplete={handleWelcomeComplete}
        onWelcomeExit={handleWelcomeExit}
        onRevealComplete={handleRevealComplete}
      />}
    </AuthTransitionContext.Provider>
  );
}
