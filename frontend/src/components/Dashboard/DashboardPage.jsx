import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthTransition } from '../AutenticacaoArboris/AuthTransitionController';
import { useScreenReady } from '../BootGate';
import { clearLocalAuthState } from '../../lib/auth';
import { linkGoogleAccount, logoutWithApi } from '../../lib/api';
import GoogleSignInButton from '../AutenticacaoArboris/GoogleSignInButton';
import './Dashboard.css';

export default function DashboardPage({ sessionUser }) {
  const { requestTransition, signalDestinationReady } = useAuthTransition();
  const shellRef = useRef(null);
  const [googleLinked, setGoogleLinked] = useState(Boolean(sessionUser?.googleLinked));
  const [googleMessage, setGoogleMessage] = useState('');
  useScreenReady(shellRef);

  useEffect(() => {
    signalDestinationReady();
  }, [signalDestinationReady]);

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    clearLocalAuthState({ notify: false });
    requestTransition('/login', { direction: 'reverse', mode: 'auth' });
    if (token) await logoutWithApi(token).catch(() => {});
  };

  const handleGoogleLink = useCallback(async (credential) => {
    const result = await linkGoogleAccount(credential);
    setGoogleLinked(true);
    setGoogleMessage(result.message);
    return { complete: true };
  }, []);

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
