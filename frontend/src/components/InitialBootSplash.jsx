import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useBootGate } from './BootGate';
import { useAuthTransition } from './AutenticacaoArboris/AuthTransitionController';
import { AmbientLeaf } from './HoloBackground/HoloBackground';
import './InitialBootSplash.css';

const MIN_BOOT_MS = 1800;
const EXIT_MS = 720;
const BOOT_POLLEN = [[12, 19], [24, 72], [79, 23], [88, 62], [36, 88], [63, 35]];
const BOOT_LEAVES = [[8, 5, 31, 29, -7], [78, 17, 22, 34, -22], [31, 75, 20, 37, -12], [88, 71, 34, 32, -27], [58, 8, 25, 40, -18]];

// O destino já está montado; o splash só conduz a apresentação e sua saída.
export default function InitialBootSplash() {
  const { ready } = useBootGate();
  const { environmentAssetsReady } = useAuthTransition();
  const { pathname } = useLocation();
  const startedAt = useRef(0);
  const authRoute = pathname === '/' || pathname === '/login' || pathname === '/cadastro';
  const [exiting, setExiting] = useState(false);
  const [mounted, setMounted] = useState(true);

  useEffect(() => { startedAt.current = performance.now(); }, []);

  useEffect(() => {
    if (!ready || (authRoute && !environmentAssetsReady) || exiting) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const remaining = Math.max(0, (reduced ? 180 : MIN_BOOT_MS) - (performance.now() - startedAt.current));
    const timer = window.setTimeout(() => setExiting(true), remaining);
    return () => window.clearTimeout(timer);
  }, [ready, environmentAssetsReady, authRoute, exiting]);

  useEffect(() => {
    if (!exiting) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setMounted(false), (reduced ? 160 : EXIT_MS) + 40);
    return () => window.clearTimeout(timer);
  }, [exiting]);

  if (!mounted) return null;

  return (
    <div
      className={exiting ? 'initial-boot-splash is-exiting' : 'initial-boot-splash'}
      style={{ '--boot-exit': EXIT_MS + 'ms' }}
      role="status"
      aria-label="Abrindo Arboris.X"
      aria-live="polite"
      aria-hidden={exiting}
    >
      <div className="initial-boot-splash__mist" aria-hidden="true"><i /><i /></div>
      <div className="initial-boot-splash__leaves" aria-hidden="true">
        {BOOT_LEAVES.map(([x, y, size, duration, delay], index) => <span key={index} style={{ '--x': `${x}%`, '--y': `${y}%`, '--size': `${size}px`, '--duration': `${duration}s`, '--delay': `${delay}s` }}><AmbientLeaf broad={index % 2 === 0} /></span>)}
      </div>
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
