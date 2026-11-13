/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthTransition from './AuthTransition';
import HoloBackground from '../HoloBackground/HoloBackground';

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
  const [transition, setTransition] = useState(IDLE);
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
    if (requestRef.current || transition.phase !== 'idle' || location.pathname === target) return;
    requestRef.current = {
      target,
      source: location.pathname,
      mode: options.mode || 'auth',
      direction: options.direction || 'forward',
      userName: options.userName || '',
      isNewUser: Boolean(options.isNewUser),
    };
    setTransition({ phase: 'covering', ...requestRef.current });
  }, [location.pathname, transition.phase]);

  // Na autenticação, só o conteúdo do card sai; no welcome, a máscara cobre a tela.
  const handleCovered = useCallback(() => {
    if (transition.phase !== 'covering' || !requestRef.current || requestRef.current.covered) return;
    requestRef.current.covered = true;
    setTransition((current) => ({ ...current, phase: 'switching' }));
    navigate(requestRef.current.target);
  }, [navigate, transition.phase]);

  // A tela de destino sinaliza que montou. Só vale na janela da troca.
  const signalDestinationReady = useCallback(() => {
    if (transition.phase !== 'switching' || !requestRef.current) return;
    setTransition((current) => ({ ...current, phase: 'waiting' }));
  }, [transition.phase]);

  useEffect(() => {
    const request = requestRef.current;
    if (!request || transition.phase === 'idle') return;
    const expected = transition.phase === 'covering'
      ? location.pathname === request.source
      : transition.phase === 'switching'
        ? location.pathname === request.source || location.pathname === request.target
        : location.pathname === request.target;
    if (!expected) {
      requestRef.current = null;
      window.clearTimeout(fallbackRef.current);
      setTransition(IDLE);
    }
  }, [location.pathname, transition.phase]);

  // Destino pronto de verdade (painel visível + assets) e já pintado:
  // só então a máscara abre. Timeout é só trava de segurança, nunca sincronização.
  useEffect(() => {
    if (transition.phase !== 'waiting' || !requestRef.current) return undefined;
    if (location.pathname !== requestRef.current.target) return undefined;

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
  }, [location.pathname, transition.mode, transition.phase]);

  const handleRevealComplete = useCallback(() => {
    requestRef.current = null;
    window.clearTimeout(fallbackRef.current);
    setTransition(IDLE);
  }, []);

  useEffect(() => {
    if (transition.phase === 'idle') return undefined;
    window.clearTimeout(fallbackRef.current);
    fallbackRef.current = window.setTimeout(() => {
      if (transition.phase === 'covering') {
        handleCovered();
      } else if (transition.phase === 'revealing' && transition.mode === 'auth') {
        handleRevealComplete();
      } else {
        requestRef.current = null;
        setTransition(IDLE);
      }
    }, transition.phase === 'covering' ? 1200 : transition.phase === 'revealing' && transition.mode === 'welcome' ? 6000 : 3000);
    return () => window.clearTimeout(fallbackRef.current);
  }, [handleCovered, handleRevealComplete, transition.mode, transition.phase]);

  // Sem movimento, a troca segue o mesmo fluxo sem depender de animationend.
  useEffect(() => {
    if (transition.mode !== 'auth' || transition.phase === 'idle') return undefined;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame;
    const advance = () => {
      if (!preference.matches) return;
      frame = window.requestAnimationFrame(() => {
        if (transition.phase === 'covering') handleCovered();
        if (transition.phase === 'revealing') handleRevealComplete();
      });
    };
    advance();
    preference.addEventListener('change', advance);
    return () => {
      window.cancelAnimationFrame(frame);
      preference.removeEventListener('change', advance);
    };
  }, [transition.mode, transition.phase, handleCovered, handleRevealComplete]);

  const value = useMemo(
    () => ({
      requestTransition, signalDestinationReady, environmentReady, environmentAssetsReady,
      motionPaused,
      formPhase: transition.mode === 'auth' ? transition.phase : 'idle',
      direction: transition.direction,
      onFormExit: handleCovered,
      onFormEnter: handleRevealComplete,
    }),
    [requestTransition, signalDestinationReady, environmentReady, environmentAssetsReady, motionPaused, transition.mode,
      transition.phase, transition.direction, handleCovered, handleRevealComplete],
  );
  const active = transition.phase !== 'idle';
  const isAuthRoute = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/cadastro';

  return (
    <AuthTransitionContext.Provider value={value}>
      {isAuthRoute && <HoloBackground onReady={setEnvironmentReady} onAssetsReady={setEnvironmentAssetsReady} paused={motionPaused} />}
      {children}
      <AuthTransition
        active={active && (transition.mode === 'welcome' || (transition.mode === 'auth' && transition.source === '/dashboard'))}
        phase={transition.phase}
        direction={transition.direction}
        mode={transition.mode}
        userName={transition.userName}
        isNewUser={transition.isNewUser}
        onCovered={handleCovered}
        onRevealComplete={handleRevealComplete}
      />
    </AuthTransitionContext.Provider>
  );
}
