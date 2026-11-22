import { memo, useEffect, useState, useRef } from 'react';
import './HoloBackground.css';

// Imagens originais geradas para o Arboris.X e otimizadas em WebP local.
const FOREST = '/ambient/forest.webp';
const FOREST_MOBILE = '/ambient/forest-mobile.webp';

function HoloBackground({ onReady, onAssetsReady, paused = false }) {
  const [ready, setReady] = useState(false);
  const forestRef = useRef(null);

  useEffect(() => {
    let active = true;
    let observer;
    let assetTimeout;
    // Decodifica o próprio <img> visível: o splash reutiliza esta floresta.
    const forest = forestRef.current;
    const decoding = forest?.decode ? forest.decode().catch(() => undefined) : Promise.resolve();
    Promise.race([decoding, new Promise((resolve) => { assetTimeout = window.setTimeout(resolve, 2500); })]).then(() => {
      window.clearTimeout(assetTimeout);
      if (!active) return;
      setReady(true);
      onAssetsReady?.(true);
      const reveal = () => {
        const splash = document.querySelector('.initial-boot-splash');
        if (splash && !splash.classList.contains('is-exiting')) return;
        onReady?.(true);
        observer?.disconnect();
      };

      const splash = document.querySelector('.initial-boot-splash');
      if (splash && !splash.classList.contains('is-exiting')) {
        observer = new MutationObserver(reveal);
        observer.observe(splash, { attributes: true, attributeFilter: ['class'] });
      }
      reveal();
    });

    return () => {
      active = false;
      window.clearTimeout(assetTimeout);
      observer?.disconnect();
    };
  }, [onReady, onAssetsReady]);

  // O provider mantém esta instância entre Login e Cadastro. A entrada fica nos
  // wrappers; os loops nos filhos continuam sem troca de animação ao fim dos 2,5 s.
  return (
    <div className="holo-background" data-ready={ready} data-paused={paused} aria-hidden="true">
      <div className="holo-layer holo-layer--distance">
        <picture>
          <source media="(max-width: 768px)" srcSet={FOREST_MOBILE} />
          <img ref={forestRef} className="holo-forest" src={FOREST} alt="" fetchPriority="high" decoding="async" draggable="false" />
        </picture>
      </div>

      <div className="holo-layer holo-layer--light">
        <div className="holo-sun-glow" />
      </div>

      <div className="holo-layer holo-layer--mid">
        <div className="holo-canopy-shadow" />
        <div className="holo-foliage holo-foliage--canopy-left" />
        <div className="holo-foliage holo-foliage--canopy-right" />
      </div>

      <div className="holo-layer holo-layer--mist">
        <div className="holo-mist holo-mist--distant" />
        <div className="holo-mist holo-mist--middle" />
      </div>

      <div className="holo-layer holo-layer--foreground">
        <div className="holo-foliage holo-foliage--fern" />
        <div className="holo-foliage holo-foliage--understory" />
      </div>

      <div className="holo-layer holo-layer--leaves">
        <img className="holo-floating-leaf holo-floating-leaf--heart" src="/ambient/leaf-heart.webp" alt="" decoding="async" draggable="false" />
        <img className="holo-floating-leaf holo-floating-leaf--lanceolate" src="/ambient/leaf-lanceolate.webp" alt="" decoding="async" draggable="false" />
        <img className="holo-floating-leaf holo-floating-leaf--fern" src="/ambient/leaf-fern.webp" alt="" decoding="async" draggable="false" />
      </div>
    </div>
  );
}

export default memo(HoloBackground);
