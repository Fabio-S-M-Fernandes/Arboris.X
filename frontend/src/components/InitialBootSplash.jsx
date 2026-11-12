import { useEffect, useState } from 'react';
import { useBootGate } from './BootGate';
import './InitialBootSplash.css';

const MIN_BOOT_MS = 1400;
const EXIT_MS = 380;
const BOOT_MESSAGES = [
  'Preparando seu ambiente...',
  'Inicializando sistemas...',
  'Arboris.X pronto para você.',
];

/**
 * Cobre toda a viewport e e a UNICA autoridade sobre o momento da saida.
 * Fica montado por cima da rota de destino, que ja renderiza atras.
 */
export default function InitialBootSplash() {
  const { ready } = useBootGate();
  const [exiting, setExiting] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);

  // A apresentação começa depois que a rota e seus assets já estão prontos.
  useEffect(() => {
    if (!ready || exiting) return undefined;
    const messageTimers = [
      window.setTimeout(() => setMessageIndex(1), 420),
      window.setTimeout(() => setMessageIndex(2), 880),
    ];
    const exitTimer = window.setTimeout(() => setExiting(true), MIN_BOOT_MS);
    return () => {
      messageTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(exitTimer);
    };
  }, [ready, exiting]);

  // Desmonta somente depois que a animacao de saida terminou.
  useEffect(() => {
    if (!exiting) return undefined;
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS + 40);
    return () => window.clearTimeout(timer);
  }, [exiting]);

  if (!mounted) return null;

  return (
    <div
      className={`initial-boot-splash${exiting ? ' is-exiting' : ''}`}
      role="status"
      aria-live="polite"
      aria-hidden={exiting}
    >
      <div className="initial-boot-splash__field" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => <i key={index} />)}
      </div>
      <div className="initial-boot-splash__leaves" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <i key={index}>
            <svg viewBox="0 0 48 64" focusable="false">
              <path d="M24 2C10 10 3 23 5 37c2 13 12 22 19 25 7-3 17-12 19-25C45 23 38 10 24 2Z" />
              <path d="M24 60C24 43 23 26 24 5M24 42 13 29m11 5 11-13" />
            </svg>
          </i>
        ))}
      </div>
      <div className="initial-boot-splash__content">
        <img className="initial-boot-splash__logo" src="/arboris-tree.png" alt="" aria-hidden="true" />
        <div className="initial-boot-splash__brand">ARBORIS<span>.X</span></div>
        <div className="initial-boot-splash__eyebrow">INTELIGÊNCIA AMBIENTAL</div>
        <p key={messageIndex} aria-live="polite">
          <span className="initial-boot-splash__status-dot" aria-hidden="true" />
          {BOOT_MESSAGES[messageIndex]}
        </p>
        <div className="initial-boot-splash__activity" aria-hidden="true"><span /></div>
      </div>
    </div>
  );
}
