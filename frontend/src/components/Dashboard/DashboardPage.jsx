import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthTransition } from '../AutenticacaoArboris/AuthTransitionController';
import { useScreenReady } from '../BootGate';
import { clearLocalAuthState } from '../../lib/auth';
import { linkGoogleAccount, logoutSupabaseWithApi, logoutWithApi } from '../../lib/api';
import { getAuthCallbackUrl, supabase } from '../../lib/supabase';
import GoogleSignInButton from '../AutenticacaoArboris/GoogleSignInButton';
import './Dashboard.css';

export default function DashboardPage({ sessionUser }) {
  const { requestTransition, signalDestinationReady } = useAuthTransition();
  const shellRef = useRef(null);
  const [googleLinked, setGoogleLinked] = useState(Boolean(sessionUser?.googleLinked));
  const [googleMessage, setGoogleMessage] = useState('');
  const legacySession = Boolean(localStorage.getItem('token'));
  useScreenReady(shellRef);

  useEffect(() => {
    signalDestinationReady();
  }, [signalDestinationReady]);

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    try {
      if (token) await logoutWithApi(token);
      else await logoutSupabaseWithApi();
    } catch {
      // Supabase signOut still clears its local session if API revocation fails.
    } finally {
      clearLocalAuthState({ notify: false });
      requestTransition('/login', { direction: 'reverse', mode: 'auth' });
    }
  };

  const handleGoogleLink = useCallback(async (credential) => {
    if (legacySession) {
      const result = await linkGoogleAccount(credential);
      setGoogleLinked(true);
      setGoogleMessage(result.message);
      return { complete: true };
    }
    const { error } = await supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo: getAuthCallbackUrl('link') } });
    if (error) throw error;
    return { redirecting: true };
  }, [legacySession]);

  return (
    <main className="dashboard-shell" ref={shellRef}>
      <section className="dashboard-preparation" aria-labelledby="dashboard-preparation-title">
        <img src="/arboris-tree.png" alt="" className="dashboard-preparation__logo" />
        <p className="dashboard-preparation__brand">ARBORIS<span>.X</span></p>
        <h1 id="dashboard-preparation-title">Um novo ambiente está em preparação.</h1>
        <p className="dashboard-preparation__message">
          Em breve, uma nova experiência Arboris.X estará disponível por aqui.
        </p>
        <section className="dashboard-google-link" aria-labelledby="dashboard-google-title">
          <h2 id="dashboard-google-title">Acesso com Google</h2>
          {googleLinked ? <p className="dashboard-google-link__status" role="status">{googleMessage || 'Sua conta Google está vinculada.'}</p> : <>
            <p className="dashboard-google-link__copy">Vincule uma conta Google com o mesmo e-mail para facilitar seu próximo acesso.</p>
            <GoogleSignInButton onCredential={handleGoogleLink} legacy={legacySession} />
          </>}
        </section>
        <button className="dashboard-preparation__logout" onClick={handleLogout} type="button">
          Sair
        </button>
      </section>
    </main>
  );
}
