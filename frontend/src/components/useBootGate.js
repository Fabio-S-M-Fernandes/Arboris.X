import { useContext, useEffect } from 'react';
import { BootGateContext, SCREEN_SELECTOR } from './bootGateContext';

export function useBootGate() {
  const context = useContext(BootGateContext);
  if (!context) throw new Error('useBootGate precisa estar dentro de BootGateProvider');
  return context;
}

/**
 * Usado pela tela de destino (Login/Cadastro/Dashboard).
 * Registra o container na montagem; o boot so sai depois que ele
 * confirmar layout real. Apos o boot, o efeito vira um no-op.
 */
export function useScreenReady(ref) {
  const { registerScreen } = useBootGate();

  useEffect(() => {
    registerScreen(ref?.current ?? document.querySelector(SCREEN_SELECTOR));
  }, [registerScreen, ref]);
}