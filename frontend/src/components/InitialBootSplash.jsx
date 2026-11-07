import { useEffect, useState } from 'react';
import { useBootGate } from './useBootGate';
import './InitialBootSplash.css';

const MIN_BOOT_MS = 1350;
const EXIT_MS = 380;

/**
 * Cobre toda a viewport e e a UNICA autoridade sobre o momento da saida.
 * Fica montado por cima da rota de destino, que ja renderiza atras.
 */
export default function InitialBootSplash() {
  const { ready } = useBootGate();
  const [exiting, setExiting] = useState(false);
  const [mounted, setMounted] = useState(true);

  // So comeca a saida quando o destino ja renderizou de verdade por tras.
  useEffect(() => {
    if (!ready || exiting) return undefined;
    const timer = window.setTimeout(() => setExiting(true), MIN_BOOT_MS);
    return () => window.clearTimeout(timer);
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
        <i /><i /><i /><i /><i />
      </div>
      <div className="initial-boot-splash__content">
        <div className="initial-boot-splash__formation" aria-hidden="true">
          <svg viewBox="0 0 520 320" focusable="false">
            <path d="M260 160 C220 118 170 98 104 82 C164 130 190 152 218 160" />
            <path d="M260 160 C300 118 350 98 416 82 C356 130 330 152 302 160" />
            <path d="M260 160 C220 202 170 222 104 238 C164 190 190 168 218 160" />
            <path d="M260 160 C300 202 350 222 416 238 C356 190 330 168 302 160" />
            <path className="initial-boot-splash__formation-core" d="M260 34 C246 92 246 128 260 160 C274 128 274 92 260 34 M260 160 C246 198 246 232 260 286" />
          </svg>
        </div>
        <div className="initial-boot-splash__halo" aria-hidden="true" />
        <div className="initial-boot-splash__core" aria-hidden="true" />
        <img className="initial-boot-splash__logo" src="/arboris-tree.png" alt="" aria-hidden="true" />
        <div className="initial-boot-splash__brand">ARBORIS<span>.X</span></div>
        <div className="initial-boot-splash__eyebrow">INTELIGÊNCIA AMBIENTAL</div>
        <p><span className="initial-boot-splash__status-dot" aria-hidden="true" />Inicializando sistema</p>
        <div className="initial-boot-splash__progress" aria-hidden="true"><span /></div>
      </div>
    </div>
  );
}
