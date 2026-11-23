import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useBootGate } from './BootGate';
import { useAuthTransition } from './AutenticacaoArboris/AuthTransitionController';
import './InitialBootSplash.css';

const MIN_BOOT_MS = 1200;
const EXIT_MS = 500;
const BOOT_POLLEN = [[12, 19], [24, 72], [79, 23], [88, 62], [36, 88], [63, 35]];
const isPublicPath = (pathname) => ['/', '/privacidade', '/termos', '/cookies'].includes(pathname);

// O destino já está montado; o splash só conduz a apresentação e sua saída.
export default function InitialBootSplash() {
  const { ready, completeInitialPresentation } = useBootGate();
  const { environmentAssetsReady, foregroundActive } = useAuthTransition();
  const { pathname } = useLocation();
  const startedAt = useRef(0);
  const [initialPublicRoute] = useState(() => isPublicPath(pathname));
  const authRoute = pathname === '/login' || pathname === '/cadastro';
  const publicRoute = isPublicPath(pathname);
  const [exiting, setExiting] = useState(false);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (initialPublicRoute || publicRoute || !mounted) completeInitialPresentation();
  }, [completeInitialPresentation, initialPublicRoute, mounted, publicRoute]);

  useEffect(() => { startedAt.current = performance.now(); }, []);

  useEffect(() => {
    if (!foregroundActive) return undefined;
    const frame = window.requestAnimationFrame(() => setExiting(true));
    return () => window.cancelAnimationFrame(frame);
  }, [foregroundActive]);

  useEffect(() => {
    if (initialPublicRoute || !ready || (authRoute && !environmentAssetsReady) || exiting) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || document.documentElement.dataset.motion === 'reduced';
    const remaining = Math.max(0, (reduced ? 180 : MIN_BOOT_MS) - (performance.now() - startedAt.current));
    const timer = window.setTimeout(() => setExiting(true), remaining);
    return () => window.clearTimeout(timer);
  }, [initialPublicRoute, ready, environmentAssetsReady, authRoute, exiting]);

  useEffect(() => {
    if (initialPublicRoute || !exiting) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || document.documentElement.dataset.motion === 'reduced';
    const timer = window.setTimeout(() => setMounted(false), (reduced ? 160 : EXIT_MS) + 40);
    return () => window.clearTimeout(timer);
  }, [initialPublicRoute, exiting]);

  if (initialPublicRoute || !mounted || publicRoute) return null;

  return (
    <div
      className={exiting ? 'initial-boot-splash is-exiting' : 'initial-boot-splash'}
      data-suppressed={foregroundActive}
      style={{ '--boot-exit': EXIT_MS + 'ms' }}
      role="status"
      aria-label="Abrindo Arboris.X"
      aria-live="polite"
      aria-hidden={exiting || foregroundActive}
    >
      <div className="initial-boot-splash__mist" aria-hidden="true"><i /><i /></div>
      <div className="initial-boot-splash__pollen" aria-hidden="true">
        {BOOT_POLLEN.map(([x, y], index) => <i key={index} style={{ '--x': `${x}%`, '--y': `${y}%`, '--delay': `${index * -3}s` }} />)}
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
