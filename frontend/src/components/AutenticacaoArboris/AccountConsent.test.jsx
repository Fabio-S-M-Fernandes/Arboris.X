import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), getConsentStatus: vi.fn(), acceptConsent: vi.fn(), declineConsent: vi.fn(), signOut: vi.fn(),
}));
vi.mock('../../lib/api', () => ({
  getConsentStatus: mocks.getConsentStatus, acceptConsent: mocks.acceptConsent, declineConsent: mocks.declineConsent,
}));
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { getSession: mocks.getSession, signOut: mocks.signOut } } }));

import AccountConsent from './AccountConsent';

const Destination = () => {
  const location = useLocation();
  return <output>{`${location.pathname}${location.search}`}</output>;
};

describe('first account consent', () => {
  let container;
  let root;
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'token' } } });
    mocks.getConsentStatus.mockResolvedValue({ required: true });
    mocks.acceptConsent.mockResolvedValue({ accepted: true });
    mocks.declineConsent.mockResolvedValue({ deleted: true });
    mocks.signOut.mockResolvedValue({ error: null });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => { root.unmount(); });
    container.remove();
    vi.unstubAllGlobals();
  });

  const render = async () => {
    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/consentimento?next=%2Fdashboard%3Fsection%3Dhistory']}><Routes>
        <Route path="/consentimento" element={<AccountConsent />} />
        <Route path="/dashboard" element={<Destination />} />
        <Route path="/cadastro" element={<Destination />} />
      </Routes></MemoryRouter>);
    });
  };

  it('requires terms and privacy while keeping optional cookies unchecked', async () => {
    await render();
    const choices = container.querySelectorAll('input[type="checkbox"]');
    const continueButton = [...container.querySelectorAll('button')].find((button) => button.textContent.includes('Concordar'));
    expect(choices).toHaveLength(3);
    expect(continueButton.disabled).toBe(true);
    await act(async () => { choices[0].click(); choices[1].click(); });
    expect(continueButton.disabled).toBe(false);
    await act(async () => { continueButton.click(); await Promise.resolve(); });
    expect(mocks.acceptConsent).toHaveBeenCalledWith(false);
    expect(container.textContent).toContain('/dashboard?section=history');
  });

  it('deletes a pending account before returning to signup', async () => {
    await render();
    const declineButton = [...container.querySelectorAll('button')].find((button) => button.textContent.includes('Não concordo'));
    await act(async () => { declineButton.click(); await Promise.resolve(); });
    expect(mocks.declineConsent).toHaveBeenCalledOnce();
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(container.textContent).toContain('/cadastro');
  });

  it('keeps consent choices after a temporary failure and respects a 429 wait', async () => {
    await render();
    const choices = container.querySelectorAll('input[type="checkbox"]');
    await act(async () => { choices[0].click(); choices[1].click(); });
    mocks.acceptConsent.mockRejectedValueOnce({ status: 503 });
    await act(async () => {
      container.querySelector('button[type="submit"]').click();
      await Promise.resolve();
    });
    expect(choices[0].checked).toBe(true);
    expect(choices[1].checked).toBe(true);
    expect(container.querySelector('[role="alert"]').textContent).toContain('temporariamente indisponível');

    mocks.acceptConsent.mockRejectedValueOnce({ status: 429, retryAfterSeconds: 5 });
    await act(async () => {
      container.querySelector('button[type="submit"]').click();
      await Promise.resolve();
    });
    expect(container.querySelector('button[type="submit"]')).toBeDisabled();
    expect(container.querySelector('button[type="submit"]').textContent).toContain('Tentar em');
    expect(mocks.acceptConsent).toHaveBeenCalledTimes(2);
  });
});
