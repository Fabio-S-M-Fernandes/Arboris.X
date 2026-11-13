import { useEffect, useState } from 'react';
import './HoloBackground.css';

// Imagens originais geradas para o Arboris.X e otimizadas em WebP local.
const FOREST = '/ambient/forest.webp';
const FOREST_MOBILE = '/ambient/forest-mobile.webp';
const UNDERSTORY = '/ambient/understory.webp';
const LEAF = '/ambient/leaf.webp';

const POLLEN = [
  [8, 24, 2, 19, -4], [18, 56, 1.5, 27, -12],
  [29, 15, 2.5, 23, -8], [39, 73, 1.5, 31, -19],
  [6, 80, 2, 29, -15], [45, 36, 1.5, 37, -24],
  [85, 19, 2, 26, -9], [94, 44, 1.5, 33, -21],
  [88, 75, 2.5, 21, -6], [22, 89, 1.5, 35, -17],
  [57, 8, 1.5, 28, -11], [76, 91, 2, 39, -29],
];

export default function HoloBackground() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    let observer;
    const forest = window.matchMedia('(max-width: 768px)').matches ? FOREST_MOBILE : FOREST;

    // Decodifica antes de revelar. O splash existente controla sua própria saída.
    const assets = [forest, UNDERSTORY, LEAF].map((src) => {
      const image = new Image();
      image.src = src;
      return image.decode();
    });

    Promise.allSettled(assets).then(() => {
      if (!active) return;
      const reveal = () => {
        const splash = document.querySelector('.initial-boot-splash');
        if (splash && !splash.classList.contains('is-exiting')) return;
        setReady(true);
        observer?.disconnect();
      };

      observer = new MutationObserver(reveal);
      observer.observe(document.getElementById('root'), {
        childList: true, subtree: true, attributes: true, attributeFilter: ['class'],
      });
      reveal();
    });

    return () => {
      active = false;
      observer?.disconnect();
    };
  }, []);

  // O provider mantém esta instância entre Login e Cadastro. A entrada fica nos
  // wrappers; os loops nos filhos continuam sem troca de animação ao fim dos 2,5 s.
  return (
    <div className="holo-background" data-ready={ready} aria-hidden="true">
      <div className="holo-layer holo-layer--distance">
        <picture>
          <source media="(max-width: 768px)" srcSet={FOREST_MOBILE} />
          <img className="holo-forest" src={FOREST} alt="" fetchPriority="high" decoding="async" draggable="false" />
        </picture>
      </div>

      <div className="holo-layer holo-layer--light">
        <div className="holo-daylight" />
        <div className="holo-daylight holo-daylight--soft" />
      </div>

      <div className="holo-layer holo-layer--mid">
        <div className="holo-canopy-shadow" />
      </div>

      <div className="holo-layer holo-layer--mist">
        <div className="holo-mist holo-mist--distant" />
        <div className="holo-mist holo-mist--near" />
      </div>

      <div className="holo-layer holo-layer--foreground">
        <div className="holo-foliage holo-foliage--fern" />
        <div className="holo-foliage holo-foliage--understory" />
      </div>

      <div className="holo-layer holo-layer--air">
        {POLLEN.map(([x, y, size, duration, delay], index) => (
          <span
            key={index}
            className="holo-pollen"
            style={{
              '--x': `${x}%`, '--y': `${y}%`, '--size': `${size}px`,
              '--duration': `${duration}s`, '--delay': `${delay}s`,
            }}
          />
        ))}
        <span className="holo-falling-leaf holo-falling-leaf--left"><img src={LEAF} alt="" draggable="false" /></span>
        <span className="holo-falling-leaf holo-falling-leaf--right"><img src={LEAF} alt="" draggable="false" /></span>
      </div>
    </div>
  );
}
