import { useEffect } from 'react';
import './AuthTransition.css';

const LEAF_PATH = 'M24 2C10 10 3 23 5 37c2 13 12 22 19 25 7-3 17-12 19-25C45 23 38 10 24 2Z';
const LEAF_VEIN = 'M24 60C24 43 23 26 24 5M24 42 13 29m11 5 11-13m-11 30L15 40m9 6 13-9';
const LEAVES = Array.from({ length: 5 }, (_, index) => index);
const WELCOME_HOLD_MS = 1500;

export default function AuthTransition({
  active,
  phase = 'idle',
  direction = 'forward',
  mode = 'auth',
  userName = '',
  isNewUser = false,
  onCovered,
  onWelcomeComplete,
  onWelcomeExit,
  onRevealComplete,
}) {
  const isWelcome = mode === 'welcome';

  useEffect(() => {
    if (!active || !isWelcome || phase !== 'welcome') return undefined;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer = window.setTimeout(onWelcomeComplete,
      preference.matches || document.documentElement.dataset.motion === 'reduced' ? 0 : WELCOME_HOLD_MS);
    const completeForReducedMotion = () => {
      if (!preference.matches && document.documentElement.dataset.motion !== 'reduced') return;
      window.clearTimeout(timer);
      onWelcomeComplete();
    };
    const observer = new MutationObserver(completeForReducedMotion);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    preference.addEventListener('change', completeForReducedMotion);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      preference.removeEventListener('change', completeForReducedMotion);
    };
  }, [active, isWelcome, phase, onWelcomeComplete]);

  if (!active) return null;

  const handleAnimationEnd = (event) => {
    if (event.target.classList.contains('auth-transition__veil')) {
      if (phase === 'covering' && event.animationName === 'auth-veil-in') onCovered?.();
      if (phase === 'revealing' && ['auth-veil-out', 'auth-veil-finish'].includes(event.animationName)) onRevealComplete?.();
    }
    if (isWelcome && phase === 'exiting' && event.target.classList.contains('auth-welcome')
      && event.animationName === 'auth-welcome-out') onWelcomeExit?.();
  };

  const className = [
    'auth-transition',
    `auth-transition--${mode}`,
    `auth-transition--${direction}`,
    `auth-transition--${phase}`,
  ].join(' ');

  return (
    <div
      className={className}
      data-phase={phase}
      aria-hidden={!isWelcome || phase === 'revealing'}
      aria-live={isWelcome && phase !== 'revealing' ? 'polite' : undefined}
      role={isWelcome && phase !== 'revealing' ? 'status' : undefined}
      onAnimationEnd={handleAnimationEnd}
    >
      <div className="auth-transition__veil" aria-hidden="true" />
      <div className="auth-transition__light" aria-hidden="true" />
      <div className="auth-transition__leaves" aria-hidden="true">
        {LEAVES.map((index) => (
          <span className="auth-transition__leaf" key={index}>
            <svg viewBox="0 0 48 64" focusable="false">
              <path className="auth-transition__leaf-blade" d={LEAF_PATH} />
              <path className="auth-transition__leaf-vein" d={LEAF_VEIN} />
            </svg>
          </span>
        ))}
      </div>

      {isWelcome && phase === 'verifying' && <div className="auth-verifying">
        <img className="auth-verifying__logo" src="/arboris-tree.webp" alt="" />
        <p className="auth-verifying__brand">ARBORIS<span>.X</span></p>
        <div className="auth-verifying__status">
          <span className="auth-verifying__spinner" aria-hidden="true" />
          <p>Confirmando seu acesso…</p>
        </div>
      </div>}
      {isWelcome && (phase === 'welcome' || phase === 'exiting') && (
        <div className="auth-welcome">
          <img className="auth-welcome__logo auth-welcome__step" src="/arboris-tree.webp" alt="" />
          <p className="auth-welcome__brand auth-welcome__step">ARBORIS<span>.X</span></p>
          <h1 className="auth-welcome__step">
            {isNewUser ? 'Seja bem-vindo(a)' : 'Que bom ter você de volta'}
            {userName && <>, <span>{userName}</span></>}!
          </h1>
          <p className="auth-welcome__message auth-welcome__step">
            {isNewUser
              ? 'Seu acesso foi confirmado. Vamos começar.'
              : 'Seu acesso foi confirmado.'}
          </p>
        </div>
      )}
      {!isWelcome && (
        <div className="auth-transition__identity" aria-hidden="true">
          <img src="/arboris-tree.webp" alt="" />
        </div>
      )}
    </div>
  );
}
