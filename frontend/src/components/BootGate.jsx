/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export const BootGateContext = createContext(null);
export const SCREEN_SELECTOR = '.arboris-auth-wrapper, .dashboard-shell';

export function useBootGate() {
  const context = useContext(BootGateContext);
  if (!context) throw new Error('useBootGate precisa estar dentro de BootGateProvider');
  return context;
}

export function useScreenReady(ref) {
  const { registerScreen } = useBootGate();

  useEffect(() => {
    registerScreen(ref?.current ?? document.querySelector(SCREEN_SELECTOR));
  }, [registerScreen, ref]);
}

const nextPaint = () => new Promise((resolve) => {
  window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
});

const confirmLayout = (root) => {
  if (!root || !root.isConnected) return false;
  const rect = root.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;
  return [...root.querySelectorAll('img')].every((image) => image.complete);
};

/**
 * Autoridade unica do boot inicial.
 * A tela de destino registra seu container via `useScreenReady`;
 * o gate so libera a saida quando esse container realmente renderizou
 * (dimensoes reais + imagens carregadas + primeiro paint).
 * O timeout de seguranca existe apenas para nunca travar a aplicacao.
 */
export function BootGateProvider({ children }) {
  const [screenReady, setScreenReady] = useState(false);
  const [firstPaintDone, setFirstPaintDone] = useState(false);
  const rootRef = useRef(null);
  const doneRef = useRef(false);

  const registerScreen = useCallback((element) => {
    if (element) rootRef.current = element;
  }, []);

  // Espera a tela montar e confirmar layout + assets essenciais.
  useEffect(() => {
    if (screenReady) return undefined;

    let cancelled = false;
    let frame = 0;

    const verify = () => {
      if (cancelled || doneRef.current) return;
      const root = rootRef.current || document.querySelector(SCREEN_SELECTOR);
      if (confirmLayout(root)) {
        rootRef.current = root;
        doneRef.current = true;
        setScreenReady(true);
        return;
      }
      frame = window.requestAnimationFrame(verify);
    };

    frame = window.requestAnimationFrame(verify);

    // Trava de seguranca: asset quebrado nao pode prender o boot na tela.
    const safety = window.setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        setScreenReady(true);
      }
    }, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      window.cancelAnimationFrame(frame);
    };
  }, [screenReady]);

  // Primeiro paint da composicao de destino antes de qualquer animacao de saida.
  useEffect(() => {
    if (!screenReady || firstPaintDone) return undefined;

    let cancelled = false;
    const fontsReady = document.fonts?.ready?.catch(() => undefined) ?? Promise.resolve();

    fontsReady.then(nextPaint).then(() => {
      if (!cancelled) setFirstPaintDone(true);
    });

    return () => { cancelled = true; };
  }, [screenReady, firstPaintDone]);

  const value = useMemo(
    () => ({ ready: firstPaintDone, registerScreen }),
    [firstPaintDone, registerScreen],
  );

  return <BootGateContext.Provider value={value}>{children}</BootGateContext.Provider>;
}