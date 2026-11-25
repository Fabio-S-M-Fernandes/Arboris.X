import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useBootGate } from './BootGate';
import { useAuthTransition } from './AutenticacaoArboris/AuthTransitionController';
import { getMotionDuration } from '../lib/motion';
import './InitialBootSplash.css';

const MIN_BOOT_MS = 180;
const MAX_BOOT_WAIT_MS = 300;
const BOOT_POLLEN = [[12, 19], [24, 72], [79, 23], [88, 62], [36, 88], [63, 35]];
const isPublicPath = (pathname) => ['/', '/privacidade', '/termos', '/cookies'].includes(pathname);
// Splash só faz sentido na apresentação inicial das rotas públicas e de acesso;
// Dashboard/consentimento/redefinição validam a sessão com indicador próprio.
const BOOT_SPLASH_PATHS = ['/', '/privacidade', '/termos', '/cookies', '/login', '/cadastro'];
const usesBootSplash = (pathname) => BOOT_SPLASH_PATHS.includes(pathname);

// O destino já está montado; o splash só conduz a apresentação e sua saída.
export default function InitialBootSplash() {
  const { ready, completeInitialPresentation } = useBootGate();
  const { foregroundActive } = useAuthTransition();
  const { pathname } = useLocation();
  const [startedAt] = useState(() => performance.now());
  const [lowCost] = useState(() => window.matchMedia?.('(max-width: 768px)').matches
    || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    || document.documentElement.dataset.performance === 'efficient');
  const [initialPublicRoute] = useState(() => isPublicPath(pathname));
  const dashboardRoute = !usesBootSplash(pathname);
  const publicRoute = isPublicPath(pathname);
  const [exiting, setExiting] = useState(false);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (initialPublicRoute || publicRoute || dashboardRoute || !mounted) completeInitialPresentation();
  }, [completeInitialPresentation, dashboardRoute, initialPublicRoute, mounted, publicRoute]);

  // Renderização já liberada (rede/autenticação prontas) ou teto atingido: sai imediatamente.
  useEffect(() => {
    if (initialPublicRoute || dashboardRoute || !mounted || exiting || !ready) return undefined;
    const frame = window.requestAnimationFrame(() => setExiting(true));
    return () => window.cancelAnimationFrame(frame);
  }, [initialPublicRoute, dashboardRoute, mounted, exiting, ready]);

  useEffect(() => {
    if (initialPublicRoute || dashboardRoute || !mounted || exiting) return undefined;
    const timer = window.setTimeout(() => setExiting(true), MAX_BOOT_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [initialPublicRoute, dashboardRoute, mounted, exiting]);

  useEffect(() => {
    if (!foregroundActive) return undefined;
    const frame = window.requestAnimationFrame(() => setExiting(true));
    return () => window.cancelAnimationFrame(frame);
  }, [foregroundActive]);

  useEffect(() => {
    if (initialPublicRoute || dashboardRoute || !ready || exiting) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || document.documentElement.dataset.motion === 'reduced';
    // Sem tempo mínimo artificial: só o frame já decorrido desde a montagem.
    const remaining = reduced ? 0 : Math.max(0, MIN_BOOT_MS - (performance.now() - startedAt.current));
    const timer = window.setTimeout(() => setExiting(true), remaining);
    return () => window.clearTimeout(timer);
  }, [initialPublicRoute, dashboardRoute, ready, exiting]);

  useEffect(() => {
    if (initialPublicRoute || dashboardRoute || !exiting) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || document.documentElement.dataset.motion === 'reduced';
    const exitDuration = reduced ? 120 : getMotionDuration('--motion-page-exit', 200);
    const timer = window.setTimeout(() => setMounted(false), exitDuration + 20);
    return () => window.clearTimeout(timer);
  }, [initialPublicRoute, dashboardRoute, exiting]);

  if (initialPublicRoute || dashboardRoute || !mounted || publicRoute) return null;

  return (
    <div
      className={exiting ? 'initial-boot-splash is-exiting' : 'initial-boot-splash'}
      data-suppressed={foregroundActive}
      style={{ '--boot-exit': 'var(--motion-page-exit)' }}
      role="status"
      aria-label="Abrindo Arboris.X"
      aria-live="polite"
      aria-hidden={exiting || foregroundActive}
    >
      <div className="initial-boot-splash__mist" aria-hidden="true"><i /><i /></div>
      <div className="initial-boot-splash__pollen" aria-hidden="true">
        {/* No celular nem montamos as partículas: menos trabalho na thread principal. */}
        {!lowCost && BOOT_POLLEN.map(([x, y], index) => <i key={index} style={{ '--x': `${x}%`, '--y': `${y}%`, '--delay': `${index * -3}s` }} />)}
      </div>
      <div className="initial-boot-splash__light" aria-hidden="true" />
      <div className="initial-boot-splash__content">
        <div className="initial-boot-splash__emblem">
          <img className="initial-boot-splash__logo" src="/arboris-tree.webp" alt="" aria-hidden="true" />
        </div>
        <div className="initial-boot-splash__brand">ARBORIS<span>.X</span></div>
        <div className="initial-boot-splash__eyebrow">INTELIGÊNCIA AMBIENTAL</div>
      </div>
    </div>
  );
}
