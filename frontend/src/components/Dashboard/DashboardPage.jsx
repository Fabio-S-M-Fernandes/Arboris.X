import { useCallback, useEffect, useRef } from 'react';
import { useAuthTransition } from '../AutenticacaoArboris/AuthTransitionController';
import { useScreenReady } from '../BootGate';
import { clearLocalAuthState } from '../../lib/auth';
import { logoutSupabaseWithApi } from '../../lib/api';
import { getAuthCallbackUrl, supabase } from '../../lib/supabase';
import GoogleSignInButton from '../AutenticacaoArboris/GoogleSignInButton';
import './Dashboard.css';

export default function DashboardPage({ sessionUser }) {
  const { requestTransition, signalDestinationReady } = useAuthTransition();
  const shellRef = useRef(null);
  const googleLinked = Boolean(sessionUser?.googleLinked);
  useScreenReady(shellRef);

  useEffect(() => {
    signalDestinationReady();
  }, [signalDestinationReady]);

  const handleLogout = async () => {
    try {
      await logoutSupabaseWithApi();
    } catch {
      // Supabase signOut still clears its local session if API revocation fails.
    } finally {
      try { await supabase.auth.signOut(); } catch { /* Clear local state below even if Auth is offline. */ }
      clearLocalAuthState({ notify: false });
      requestTransition('/login', { direction: 'reverse', mode: 'auth' });
    }
  };

  const handleGoogleLink = useCallback(async () => {
    const { error } = await supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo: getAuthCallbackUrl('link') } });
    if (error) throw error;
    return { redirecting: true };
  }, []);

  return (
    <main className="dashboard-shell" ref={shellRef}>
      <section className="dashboard-preparation" aria-labelledby="dashboard-preparation-title">
        <img src="/arboris-tree.webp" alt="" className="dashboard-preparation__logo" />
        <p className="dashboard-preparation__brand">ARBORIS<span>.X</span></p>
        <h1 id="dashboard-preparation-title">Um novo ambiente está em preparação.</h1>
        <p className="dashboard-preparation__message">
          Em breve, uma nova experiência Arboris.X estará disponível por aqui.
        </p>
        <section className="dashboard-google-link" aria-labelledby="dashboard-google-title">
          <h2 id="dashboard-google-title">Acesso com Google</h2>
          {googleLinked ? <p className="dashboard-google-link__status" role="status">Sua conta Google está vinculada.</p> : <>
            <p className="dashboard-google-link__copy">Vincule uma conta Google com o mesmo e-mail para facilitar seu próximo acesso.</p>
            <GoogleSignInButton onCredential={handleGoogleLink} />
          </>}
        </section>
        <button className="dashboard-preparation__logout" onClick={handleLogout} type="button">
          Sair
        </button>
      </section>
    </main>
  );
}
