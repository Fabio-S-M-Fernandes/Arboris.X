import { act, StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthTransition from './AuthTransition';
import { AuthTransitionProvider, useAuthTransition } from './AuthTransitionController';

vi.mock('../HoloBackground/HoloBackground', () => ({ default: () => <div data-testid="forest" /> }));

const finishAnimation = (element, animationName) => {
  // React selects the WebKit event name in jsdom when AnimationEvent is absent.
  for (const type of ['animationend', 'webkitAnimationEnd']) {
    const event = new Event(type, { bubbles: true });
    Object.defineProperty(event, 'animationName', { value: animationName });
    element.dispatchEvent(event);
  }
};

describe('Welcome transition', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => { root.unmount(); });
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows verification, welcome, exit, then dashboard without overlapping foreground text', async () => {
    const onWelcomeComplete = vi.fn();
    const onWelcomeExit = vi.fn();
    const onRevealComplete = vi.fn();
    const renderPhase = async (phase) => {
      await act(async () => {
        root.render(<AuthTransition active phase={phase} mode="welcome"
          onWelcomeComplete={onWelcomeComplete} onWelcomeExit={onWelcomeExit}
          onRevealComplete={onRevealComplete} />);
      });
    };

    await renderPhase('verifying');
    expect(container.textContent).toContain('Confirmando seu acesso');
    expect(container.textContent).not.toContain('Que bom ter você de volta');
    await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    expect(onWelcomeComplete).not.toHaveBeenCalled();

    await renderPhase('welcome');
    const welcome = container.querySelector('.auth-welcome');
    expect(container.textContent).not.toContain('Confirmando seu acesso');
    expect(container.textContent).toContain('Que bom ter você de volta');

    await act(async () => { await vi.advanceTimersByTimeAsync(2200); });
    expect(onWelcomeComplete).toHaveBeenCalledTimes(1);
    await renderPhase('exiting');
    expect(container.querySelector('.auth-welcome')).toBe(welcome);
    await act(async () => { finishAnimation(welcome, 'auth-welcome-out'); });
    expect(onWelcomeExit).toHaveBeenCalledTimes(1);

    await renderPhase('revealing');
    expect(container.querySelector('.auth-welcome')).toBeNull();
    expect(container.textContent).not.toContain('Confirmando seu acesso');
    expect(onRevealComplete).not.toHaveBeenCalled();
    await act(async () => { finishAnimation(container.querySelector('.auth-transition__veil'), 'auth-veil-finish'); });
    expect(onRevealComplete).toHaveBeenCalledTimes(1);
  });

  it('waits for the guarded destination and hides it until the welcome has exited', async () => {
    let authorize;
    let staleRequest;
    function Flow() {
      const { pathname, search } = useLocation();
      const {
        requestTransition, signalDestinationReady, setVerificationActive,
        hideAppStage, foregroundActive,
      } = useAuthTransition();
      const [approved, setApproved] = useState(false);
      authorize = () => {
        setApproved(true);
        setVerificationActive(false);
      };
      if (pathname === '/login') staleRequest = requestTransition;
      useEffect(() => {
        if (pathname === '/dashboard' && search === '?section=history' && approved) signalDestinationReady();
      }, [pathname, search, approved, signalDestinationReady]);
      return <div className="app-stage" data-foreground-hidden={hideAppStage} inert={foregroundActive}>
        {pathname === '/login'
          ? <button onClick={() => requestTransition('/dashboard?section=history', { mode: 'welcome', userName: 'Teste' })}>Entrar</button>
          : <p>Dashboard autorizado</p>}
        <output data-testid="destination">{`${pathname}${search}`}</output>
      </div>;
    }

    await act(async () => {
      root.render(<StrictMode><MemoryRouter initialEntries={['/login']}>
        <AuthTransitionProvider><Flow /></AuthTransitionProvider>
      </MemoryRouter></StrictMode>);
    });
    await act(async () => { container.querySelector('button').click(); });
    expect(container.querySelector('.auth-transition').dataset.phase).toBe('verifying');
    expect(container.querySelector('.app-stage').hasAttribute('inert')).toBe(true);
    expect(container.textContent).not.toContain('Que bom ter você de volta');

    await act(async () => { authorize(); });
    expect(container.querySelector('.auth-transition').dataset.phase).toBe('welcome');
    expect(container.querySelector('.app-stage').hasAttribute('inert')).toBe(true);
    expect(container.textContent).not.toContain('Confirmando seu acesso');
    await act(async () => { await vi.advanceTimersByTimeAsync(2200); });
    expect(container.querySelector('.auth-transition').dataset.phase).toBe('exiting');
    expect(container.querySelector('.app-stage').hasAttribute('inert')).toBe(true);

    await act(async () => { finishAnimation(container.querySelector('.auth-welcome'), 'auth-welcome-out'); });
    expect(container.querySelector('.auth-transition').dataset.phase).toBe('revealing');
    expect(container.querySelector('.app-stage').hasAttribute('inert')).toBe(true);
    expect(container.querySelector('.app-stage').dataset.foregroundHidden).toBe('false');
    expect(container.textContent).not.toContain('Que bom ter você de volta');

    await act(async () => { finishAnimation(container.querySelector('.auth-transition__veil'), 'auth-veil-finish'); });
    expect(container.querySelector('.auth-transition')).toBeNull();
    expect(container.querySelector('.app-stage').hasAttribute('inert')).toBe(false);
    expect(container.textContent).toContain('Dashboard autorizado');
    expect(container.querySelector('[data-testid="destination"]')).toHaveTextContent('/dashboard?section=history');
    expect(container.querySelectorAll('[data-testid="forest"]')).toHaveLength(1);
    await act(async () => { staleRequest('/dashboard?section=history', { mode: 'welcome' }); });
    expect(container.querySelector('.auth-transition')).toBeNull();
  });

  it.each(['/dashboard', '/auth/callback'])('uses one centered verification overlay for direct entry to %s', async (path) => {
    let finishVerification;
    function DirectDashboard() {
      const { foregroundActive, hideAppStage, setVerificationActive } = useAuthTransition();
      finishVerification = () => setVerificationActive(false);
      return <div className="app-stage" data-foreground-hidden={hideAppStage} inert={foregroundActive}>
        <p>Dashboard autorizado</p>
      </div>;
    }

    await act(async () => {
      root.render(<MemoryRouter initialEntries={[path]}>
        <AuthTransitionProvider><DirectDashboard /></AuthTransitionProvider>
      </MemoryRouter>);
    });

    const transition = container.querySelector('.auth-transition');
    expect(transition?.dataset.phase).toBe('verifying');
    expect(container.querySelectorAll('.auth-verifying')).toHaveLength(1);
    expect(container.querySelector('.auth-verifying__logo')).not.toBeNull();
    expect(container.textContent.match(/Confirmando seu acesso/g)).toHaveLength(1);
    expect(container.querySelector('.app-stage').dataset.foregroundHidden).toBe('true');

    await act(async () => { finishVerification(); });
    expect(container.querySelector('.auth-transition')).toBeNull();
    expect(container.querySelector('.app-stage').hasAttribute('inert')).toBe(false);
    expect(container.textContent).toContain('Dashboard autorizado');
  });
});
