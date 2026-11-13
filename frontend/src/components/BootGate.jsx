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
  return rect.width >= 1 && rect.height >= 1;
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

    const finish = () => {
      if (cancelled || doneRef.current) return;
      doneRef.current = true;
      setScreenReady(true);
    };

    const verify = () => {
      if (cancelled || doneRef.current) return;
      const root = rootRef.current?.isConnected ? rootRef.current : document.querySelector(SCREEN_SELECTOR);
      if (confirmLayout(root)) {
        rootRef.current = root;
        const images = [...root.querySelectorAll('img')];
        Promise.allSettled(images.map((image) => image.decode?.() ?? Promise.resolve())).then(finish);
        return;
      }
      frame = window.requestAnimationFrame(verify);
    };

    frame = window.requestAnimationFrame(verify);

    // Trava de seguranca: asset quebrado nao pode prender o boot na tela.
    const safety = window.setTimeout(finish, 2500);

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
    let fontTimer;
    const fontsReady = document.fonts?.ready?.catch(() => undefined) ?? Promise.resolve();

    Promise.race([fontsReady, new Promise((resolve) => { fontTimer = window.setTimeout(resolve, 900); })]).then(nextPaint).then(() => {
      if (!cancelled) setFirstPaintDone(true);
    });

    return () => { cancelled = true; window.clearTimeout(fontTimer); };
  }, [screenReady, firstPaintDone]);

  const value = useMemo(
    () => ({ ready: firstPaintDone, registerScreen }),
    [firstPaintDone, registerScreen],
  );

  return <BootGateContext.Provider value={value}>{children}</BootGateContext.Provider>;
}
