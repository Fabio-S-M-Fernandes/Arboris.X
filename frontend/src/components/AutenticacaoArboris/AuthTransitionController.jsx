import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthTransitionContext } from './authTransitionContext';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthTransition from './AuthTransition';

const IDLE = { phase: 'idle', target: null, mode: 'auth', direction: 'forward' };

const nextPaint = () => new Promise((resolve) => {
  window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
});

const ACTIVE_PANEL = '.auth-panel-wrapper.active';

/**
 * Confirma que o painel de destino está de fato na tela:
 * existe, está conectado, tem dimensões reais e não está escondido.
 * Não checa opacity: a animação de entrada vive num filho e faria o
 * controller esperar um tempo que não é sincronização, é latência.
 */
const confirmDestination = () => {
  const panel = document.querySelector(ACTIVE_PANEL);
  if (!panel || !panel.isConnected) return false;

  const rect = panel.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;

  return getComputedStyle(panel).visibility !== 'hidden';
};

export function AuthTransitionProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [transition, setTransition] = useState(IDLE);
  const requestRef = useRef(null);
  const fallbackRef = useRef(null);

  const requestTransition = useCallback((target, options = {}) => {
    if (transition.phase !== 'idle' || location.pathname === target) return;
    requestRef.current = {
      target,
      mode: options.mode || 'auth',
      direction: options.direction || 'forward',
    };
    setTransition({ phase: 'covering', ...requestRef.current });
  }, [location.pathname, transition.phase]);

  // Máscara 100% opaca: só agora a rota pode mudar, invisível para o usuário.
  const handleCovered = useCallback(() => {
    if (transition.phase !== 'covering' || !requestRef.current) return;
    setTransition((current) => ({ ...current, phase: 'switching' }));
    navigate(requestRef.current.target);
  }, [navigate, transition.phase]);

  // A tela de destino sinaliza que montou. Só vale na janela da troca.
  const signalDestinationReady = useCallback(() => {
    if (transition.phase !== 'switching' || !requestRef.current) return;
    setTransition((current) => ({ ...current, phase: 'waiting' }));
  }, [transition.phase]);

  // Destino pronto de verdade (painel visível + assets) e já pintado:
  // só então a máscara abre. Timeout é só trava de segurança, nunca sincronização.
  useEffect(() => {
    if (transition.phase !== 'waiting' || !requestRef.current) return undefined;
    if (location.pathname !== requestRef.current.target) return undefined;

    let cancelled = false;
    let frame = 0;

    const confirm = () => {
      if (cancelled) return;
      if (confirmDestination()) {
        nextPaint().then(() => {
          if (!cancelled) setTransition((current) => ({ ...current, phase: 'revealing' }));
        });
        return;
      }
      frame = window.requestAnimationFrame(confirm);
    };

    frame = window.requestAnimationFrame(confirm);

    const safety = window.setTimeout(() => {
      if (!cancelled) setTransition((current) => ({ ...current, phase: 'revealing' }));
    }, 1200);

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      window.cancelAnimationFrame(frame);
    };
  }, [location.pathname, transition.phase]);

  useEffect(() => {
    if (transition.phase === 'idle') return undefined;
    window.clearTimeout(fallbackRef.current);
    fallbackRef.current = window.setTimeout(() => {
      requestRef.current = null;
      setTransition(IDLE);
    }, 3000);
    return () => window.clearTimeout(fallbackRef.current);
  }, [transition.phase]);

  const handleRevealComplete = useCallback(() => {
    requestRef.current = null;
    window.clearTimeout(fallbackRef.current);
    setTransition(IDLE);
  }, []);

  const value = useMemo(
    () => ({ requestTransition, signalDestinationReady }),
    [requestTransition, signalDestinationReady],
  );
  const active = transition.phase !== 'idle';

  return (
    <AuthTransitionContext.Provider value={value}>
      {children}
      <AuthTransition
        active={active}
        phase={transition.phase}
        direction={transition.direction}
        mode={transition.mode}
        onCovered={handleCovered}
        onRevealComplete={handleRevealComplete}
      />
    </AuthTransitionContext.Provider>
  );
}