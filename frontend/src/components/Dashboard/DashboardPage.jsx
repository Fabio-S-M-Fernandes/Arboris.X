import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthTransition } from '../AutenticacaoArboris/AuthTransitionController';
import { useScreenReady } from '../BootGate';
import { signOutAndClear } from '../../lib/auth';
import './Dashboard.css';

export default function DashboardPage() {
  const { signalDestinationReady } = useAuthTransition();
  const navigate = useNavigate();
  const shellRef = useRef(null);
  useScreenReady(shellRef);

  useEffect(() => {
    signalDestinationReady();
  }, [signalDestinationReady]);

  const handleLogout = async () => {
    await signOutAndClear();
    navigate('/login', { replace: true });
  };

  return (
    <main className="dashboard-shell" ref={shellRef}>
      <section className="dashboard-preparation" aria-labelledby="dashboard-preparation-title">
        <img src="/arboris-tree.png" alt="" className="dashboard-preparation__logo" />
        <p className="dashboard-preparation__brand">ARBORIS<span>.X</span></p>
        <h1 id="dashboard-preparation-title">Um novo ambiente está em preparação.</h1>
        <p className="dashboard-preparation__message">
          Em breve, uma nova experiência Arboris.X estará disponível por aqui.
        </p>
        <button className="dashboard-preparation__logout" onClick={handleLogout} type="button">
          Sair
        </button>
      </section>
    </main>
  );
}
