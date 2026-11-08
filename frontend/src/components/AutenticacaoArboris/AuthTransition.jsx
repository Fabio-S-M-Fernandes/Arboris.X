import { useEffect, useState } from 'react';
import './AuthTransition.css';

const LEAF_PATH = 'M24 2C10 10 3 23 5 37c2 13 12 22 19 25 7-3 17-12 19-25C45 23 38 10 24 2Z';
const LEAF_VEIN = 'M24 60C24 43 23 26 24 5M24 42 13 29m11 5 11-13m-11 30L15 40m9 6 13-9';
const LEAVES = Array.from({ length: 5 }, (_, index) => index);
const WELCOME_HOLD_MS = 4000;

export default function AuthTransition({
  active,
  phase = 'idle',
  direction = 'forward',
  mode = 'auth',
  userName = '',
  isNewUser = false,
  onCovered,
  onRevealComplete,
}) {
  const isWelcome = mode === 'welcome';
  const [welcomeEnding, setWelcomeEnding] = useState(false);

  useEffect(() => {
    if (!active || !isWelcome || phase !== 'revealing') return undefined;

    const timer = window.setTimeout(() => setWelcomeEnding(true), WELCOME_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [active, isWelcome, phase]);

  if (!active) return null;

  const handleAnimationEnd = (event) => {
    if (event.target !== event.currentTarget) return;
    if (phase === 'covering' && event.animationName === 'auth-veil-in') onCovered?.();
    if (phase !== 'revealing') return;
    if (!isWelcome && event.animationName === 'auth-veil-out') onRevealComplete?.();
    if (isWelcome && welcomeEnding && event.animationName === 'auth-welcome-step-out') {
      setWelcomeEnding(false);
      onRevealComplete?.();
    }
  };

  const className = [
    'auth-transition',
    `auth-transition--${mode}`,
    `auth-transition--${direction}`,
    `auth-transition--${phase}`,
    ...(welcomeEnding ? ['auth-transition--welcome-ending'] : []),
  ].join(' ');

  return (
    <div
      className={className}
      data-phase={phase}
      aria-hidden={!isWelcome}
      aria-live={isWelcome ? 'polite' : undefined}
      role={isWelcome ? 'status' : undefined}
    >
      <div className="auth-transition__veil" aria-hidden="true" onAnimationEnd={handleAnimationEnd} />
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

      {isWelcome ? (
        <div className="auth-welcome">
          <img className="auth-welcome__logo auth-welcome__step" src="/arboris-tree.png" alt="" />
          <p className="auth-welcome__brand auth-welcome__step">ARBORIS<span>.X</span></p>
          <h1 className="auth-welcome__step">
            {isNewUser ? 'Seja bem-vindo(a)' : 'Que bom ter você de volta'}
            {userName && <>, <span>{userName}</span></>}!
          </h1>
          <p className="auth-welcome__message auth-welcome__step" onAnimationEnd={handleAnimationEnd}>
            {isNewUser
              ? 'Sua jornada no Arboris.X começa agora.'
              : 'É sempre um prazer te ver por aqui.'}
          </p>
        </div>
      ) : (
        <div className="auth-transition__identity" aria-hidden="true">
          <img src="/arboris-tree.png" alt="" />
        </div>
      )}
    </div>
  );
}
