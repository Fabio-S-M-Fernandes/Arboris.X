import { memo, useEffect, useState, useId, useRef } from 'react';
import './HoloBackground.css';

// Imagens originais geradas para o Arboris.X e otimizadas em WebP local.
const FOREST = '/ambient/forest.webp';
const FOREST_MOBILE = '/ambient/forest-mobile.webp';
const LEAF = '/ambient/leaf.webp';

const POLLEN = [
  [8, 24, 2.8, 17, -4], [18, 56, 2, 23, -12],
  [29, 15, 3, 21, -8], [39, 73, 1.8, 27, -19],
  [6, 80, 2, 29, -15], [45, 36, 1.5, 37, -24],
  [85, 19, 2.5, 24, -9], [94, 44, 2, 29, -21],
  [88, 75, 2.5, 21, -6], [22, 89, 1.5, 35, -17],
  [57, 8, 1.5, 28, -11], [76, 91, 2, 39, -29],
];
const FIREFLIES = [
  [12, 78, 11, 22, -4], [24, 65, 9, 29, -13], [36, 88, 13, 25, -8],
  [52, 73, 10, 34, -22], [66, 84, 12, 27, -16], [77, 67, 9, 32, -7],
  [88, 80, 11, 24, -19], [45, 57, 8, 36, -27], [31, 48, 9, 31, -10], [71, 45, 10, 28, -25],
];

// Percursos independentes persistem entre Login e Cadastro; sem atualiza??o por frame.
const WIND_LEAVES = [
  [4, 7, 24, 24, -8, 'diagonal'], [18, 3, 35, 29, -19, 'cross'],
  [48, 9, 20, 33, -5, 'diagonal'], [79, 15, 28, 26, -17, 'cross'],
  [93, 5, 42, 31, -24, 'diagonal'], [2, 41, 27, 37, -12, 'cross'],
  [38, 6, 18, 28, -22, 'diagonal'], [69, 62, 32, 34, -10, 'cross'],
  [86, 10, 22, 39, -30, 'diagonal'], [12, 80, 26, 32, -25, 'cross'],
  [56, 4, 48, 36, -14, 'diagonal'], [91, 35, 21, 30, -4, 'cross'],
  [28, 8, 30, 42, -32, 'diagonal'], [73, 86, 38, 38, -21, 'cross'],
  [7, 2, 19, 27, -16, 'diagonal'],
];

export function AmbientLeaf({ broad = false }) {
  const id = useId();
  return (
    <svg viewBox="0 0 80 120" fill="none" aria-hidden="true" focusable="false">
      <defs><linearGradient id={id} x1="10" y1="10" x2="67" y2="105" gradientUnits="userSpaceOnUse">
        <stop stopColor="#8ba84c" /><stop offset=".45" stopColor="#397641" /><stop offset="1" stopColor="#0c3b29" />
      </linearGradient></defs>
      <path d={broad ? 'M38 112C4 95 2 65 12 42C20 27 35 18 45 3C46 25 71 31 73 57C76 84 60 103 38 112Z' : 'M38 112C17 85 19 53 29 32C35 20 42 12 45 3C51 26 62 47 58 71C56 89 47 104 38 112Z'} fill={`url(#${id})`} stroke="#9abf72" strokeOpacity=".5" />
      <path d="M38 116Q41 65 45 6M40 97L20 77M41 81L15 57M42 64L24 43M43 47L32 29M39 100L62 81M40 86L68 63M42 69L67 48M43 50L57 33" stroke="#b4cf87" strokeWidth=".9" strokeOpacity=".55" />
    </svg>
  );
}

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
        <div className="holo-daylight" />
        <div className="holo-daylight holo-daylight--soft" />
        <div className="holo-light-beam holo-light-beam--wide" />
        <div className="holo-light-beam holo-light-beam--fine" />
      </div>

      <div className="holo-layer holo-layer--mid">
        <div className="holo-canopy-shadow" />
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
        {WIND_LEAVES.map(([x, y, size, duration, delay, path], index) => (
          <span className={`holo-wind-leaf holo-wind-leaf--${path}`} key={index} style={{
            '--leaf-x': `${x}%`, '--leaf-y': `${y}%`, '--leaf-size': `${size}px`,
            '--leaf-duration': `${duration}s`, '--leaf-delay': `${delay}s`, '--leaf-turn-delay': `${-delay}s`, '--leaf-turn': `${index % 2 ? -1 : 1}`,
          }}>
            {index % 3 === 0 ? <img src={LEAF} alt="" draggable="false" /> : <AmbientLeaf broad={index % 2 === 0} />}
          </span>
        ))}
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
        {FIREFLIES.map(([x, y, size, duration, delay], index) => (
          <span key={index} className={`holo-firefly holo-firefly--${index + 1}`} style={{
            '--x': `${x}%`, '--y': `${y}%`, '--size': `${size}px`,
            '--duration': `${duration}s`, '--delay': `${delay}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

export default memo(HoloBackground);
