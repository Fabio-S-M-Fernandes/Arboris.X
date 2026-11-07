import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import './AuthTransition.css';

/**
 * Forma orgânica abstrata inspirada na folha do logo.
 * Nasce pequena no centro e cresce até cobrir 100% da viewport.
 * viewBox 0 0 400 400, centro em 200/200.
 */
const BLADE =
  'M200 8 C258 38 300 88 330 148 C350 192 370 200 392 200 C370 200 350 208 330 252 C300 312 258 362 200 392 C142 362 100 312 70 252 C50 208 30 200 8 200 C30 200 50 192 70 148 C100 88 142 38 200 8 Z';

// Nervuras: nascem do centro e acompanham as curvas da forma. Poucas, discretas.
const VEINS = [
  'M200 200 C168 164 148 116 136 62',
  'M200 200 C232 164 252 116 264 62',
  'M200 200 C170 178 118 168 64 150',
  'M200 200 C230 178 282 168 336 150',
  'M200 200 C170 222 118 232 64 250',
  'M200 200 C230 222 282 232 336 250',
];

const COVER_SCALE = 6;

export default function AuthTransition({
  active,
  phase = 'idle',
  direction = 'forward',
  mode = 'auth',
  onCovered,
  onRevealComplete,
}) {
  const overlayRef = useRef(null);
  const bladeRef = useRef(null);
  const veinsRef = useRef(null);
  const logoRef = useRef(null);
  const haloRef = useRef(null);
  const contentRef = useRef(null);

  // O morph é exclusivo da troca Login <-> Cadastro.
  // A transição de sucesso do login (mode: 'dashboard') permanece intocada.
  const isMorph = mode === 'auth';

  useEffect(() => {
    if (!active || !overlayRef.current) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isReverse = direction === 'reverse';

    if (!isMorph) {
      const legacy = gsap.context(() => {
        if (phase === 'covering') {
          gsap.set(overlayRef.current, { autoAlpha: 1 });
          gsap.set(contentRef.current, { opacity: .8, scale: isReverse ? .985 : 1.015, y: isReverse ? -5 : 5 });
          gsap.set(haloRef.current, { opacity: 0, scale: .72 });
          gsap.set(logoRef.current, { opacity: 0, scale: .84, filter: 'blur(2px)' });
          gsap.timeline()
            .to(contentRef.current, { opacity: 1, scale: 1, y: 0, duration: reducedMotion ? .08 : .2, ease: 'power2.out' })
            .to(haloRef.current, { opacity: reducedMotion ? .2 : .36, scale: 1, duration: reducedMotion ? .08 : .18, ease: 'power2.out' }, .12)
            .to(logoRef.current, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: reducedMotion ? .1 : .2, ease: 'power2.out' }, .2)
            .call(() => onCovered?.(), [], .5);
        }
        if (phase === 'revealing') {
          gsap.set(overlayRef.current, { autoAlpha: 1 });
          gsap.set(contentRef.current, { opacity: 1, scale: 1 });
          gsap.to(haloRef.current, { opacity: .1, scale: 1.7, duration: reducedMotion ? .12 : .42, ease: 'power2.out' });
          gsap.to(logoRef.current, { opacity: 0, scale: 1.2, duration: reducedMotion ? .12 : .28, ease: 'power2.in' });
          gsap.to(overlayRef.current, {
            autoAlpha: 0,
            duration: reducedMotion ? .1 : .3,
            delay: reducedMotion ? .02 : .18,
            ease: 'power2.inOut',
            onComplete: onRevealComplete,
          });
        }
      }, overlayRef);
      return () => legacy.revert();
    }

    const morph = gsap.context(() => {
      const blade = bladeRef.current;
      const veins = veinsRef.current;

      if (phase === 'covering') {
        gsap.set(overlayRef.current, { autoAlpha: 1 });
        gsap.set(blade, {
          scale: reducedMotion ? 3 : 0.06,
          rotate: isReverse ? 8 : -8,
          opacity: 1,
          transformOrigin: '50% 50%',
        });
        gsap.set(veins, { opacity: reducedMotion ? 0 : 0.85, scale: 0.9 });
        gsap.set(logoRef.current, { opacity: 0, scale: .7 });
        gsap.set(haloRef.current, { opacity: 0, scale: .6 });

        if (reducedMotion) {
          gsap.to(blade, { scale: 3, duration: .12, ease: 'none' });
          gsap.delayedCall(.12, () => onCovered?.());
          return;
        }

        gsap
          .timeline()
          .to(blade, { scale: COVER_SCALE, rotate: 0, duration: .26, ease: 'power3.out' }, 0)
          // Nervuras acendem e se dissolvem junto com a forma.
          .to(veins, { opacity: 0, scale: 1.25, duration: .22, ease: 'power2.out' }, 0)
          // Símbolo entra apenas quando a forma já domina a tela.
          .to(haloRef.current, { opacity: .5, scale: 1, duration: .1, ease: 'power2.out' }, .26)
          .to(logoRef.current, { opacity: 1, scale: 1, duration: .12, ease: 'power2.out' }, .26)
          .call(() => onCovered?.(), [], .33);
      }

      if (phase === 'revealing') {
        gsap.set(overlayRef.current, { autoAlpha: 1 });

        if (reducedMotion) {
          gsap.fromTo(
            blade,
            { opacity: 1 },
            { opacity: 0, duration: .2, ease: 'linear', onComplete: onRevealComplete },
          );
          return;
        }

        // A forma se recolhe: o destino, já montado, surge do centro para fora.
        gsap
          .timeline()
          .to(logoRef.current, { opacity: 0, scale: 1.1, duration: .09, ease: 'power2.in' })
          .to(haloRef.current, { opacity: 0, scale: 1.4, duration: .18, ease: 'power2.in' }, 0)
          .to(
            blade,
            {
              scale: 0,
              rotate: isReverse ? -10 : 10,
              opacity: 0,
              duration: .3,
              ease: 'power2.inOut',
              onComplete: onRevealComplete,
            },
            .02,
          );
      }
    }, overlayRef);

    return () => morph.revert();
  }, [active, direction, isMorph, onCovered, onRevealComplete, phase]);

  if (!active) return null;

  return (
    <div
      className={`auth-transition auth-transition--${mode} auth-transition--${direction}`}
      ref={overlayRef}
      data-phase={phase}
      aria-hidden="true"
    >
      {isMorph ? (
        <div className="auth-morph">
          <svg className="auth-morph__leaf" viewBox="0 0 400 400" focusable="false">
            <g ref={bladeRef}>
              <path className="auth-morph__blade" d={BLADE} />
              <g ref={veinsRef} className="auth-morph__veins">
                {VEINS.map((d) => (
                  <path key={d} d={d} />
                ))}
              </g>
            </g>
          </svg>

          <span className="auth-morph__halo" ref={haloRef} />
          <img className="auth-morph__logo" ref={logoRef} src="/arboris-tree.png" alt="" />
        </div>
      ) : (
        <div className="auth-transition__content" ref={contentRef}>
          <div className="auth-transition__wash" />
          <div className="auth-transition__logo-wrap">
            <span className="auth-transition__halo" ref={haloRef} />
            <img className="auth-transition__logo" ref={logoRef} src="/arboris-tree.png" alt="" />
          </div>
        </div>
      )}
    </div>
  );
}