import { memo, useEffect, useState, useRef } from 'react';
import './HoloBackground.css';

// Imagens originais geradas para o Arboris.X e otimizadas em WebP local.
const FOREST = '/ambient/forest.webp';
const FOREST_MOBILE = '/ambient/forest-mobile.webp';

function HoloBackground({ onReady, onAssetsReady, paused = false }) {
  const [ready, setReady] = useState(false);
  const [efficientEffects, setEfficientEffects] = useState(
    () => document.documentElement.dataset.performance === 'efficient',
  );
  const forestRef = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setEfficientEffects(root.dataset.performance === 'efficient');
    });
    observer.observe(root, { attributes: true, attributeFilter: ['data-performance'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const background = forestRef.current?.closest('.holo-background');
    if (!background || paused || efficientEffects || !window.matchMedia?.('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    const update = () => {
      frame = 0;
      if (document.hidden || document.documentElement.dataset.motion === 'reduced'
        || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        reset();
        return;
      }

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const scrollY = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) * -12 : 0;
      background.style.setProperty('--holo-x', `${pointerX}px`);
      background.style.setProperty('--holo-y', `${pointerY}px`);
      background.style.setProperty('--holo-scroll', `${scrollY}px`);
    };
    const scheduleUpdate = () => {
      if (frame || document.hidden) return;
      frame = window.requestAnimationFrame(update);
    };
    const move = (event) => {
      pointerX = (event.clientX / window.innerWidth - .5) * 28;
      pointerY = (event.clientY / window.innerHeight - .5) * 20;
      scheduleUpdate();
    };
    const reset = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      pointerX = 0;
      pointerY = 0;
      background.style.setProperty('--holo-x', '0px');
      background.style.setProperty('--holo-y', '0px');
      background.style.setProperty('--holo-scroll', '0px');
    };
    const onVisibilityChange = () => {
      if (document.hidden) reset();
      else scheduleUpdate();
    };

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      reset();
    };
  }, [efficientEffects, paused]);

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
        {!efficientEffects && <div className="holo-light-beams" />}
      </div>

      <div className="holo-layer holo-layer--mid">
        <div className="holo-canopy-shadow" />
        {!efficientEffects && <>
          <div className="holo-foliage holo-foliage--canopy-left" />
          <div className="holo-foliage holo-foliage--canopy-right" />
        </>}
      </div>

      {!efficientEffects && <>
        <div className="holo-layer holo-layer--mist">
          <div className="holo-mist holo-mist--distant" />
          <div className="holo-mist holo-mist--middle" />
          <div className="holo-fireflies" />
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
      </>}
    </div>
  );
}

export default memo(HoloBackground);
