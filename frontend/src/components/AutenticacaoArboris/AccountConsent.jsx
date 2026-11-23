import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { acceptConsent, declineConsent, getConsentStatus } from '../../lib/api';
import { getDashboardReturnTo } from '../../lib/authReturnTo';
import { supabase } from '../../lib/supabase';
import './AccountConsent.css';

export default function AccountConsent() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = getDashboardReturnTo(new URLSearchParams(location.search).get('next') || location.state?.from);
  const [status, setStatus] = useState('checking');
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [cookies, setCookies] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        if (!data.session) { navigate('/cadastro', { replace: true }); return; }
        const result = await getConsentStatus();
        if (!active) return;
        if (!result.required) { navigate(returnTo, { replace: true }); return; }
        setStatus('ready');
      } catch (checkError) {
        if (active) { setError(checkError.message || 'Não foi possível consultar sua conta.'); setStatus('error'); }
      }
    };
    void check();
    return () => { active = false; };
  }, [navigate, returnTo]);

  const accept = async (event) => {
    event.preventDefault();
    if (!terms || !privacy || status !== 'ready') return;
    setStatus('saving');
    setError('');
    try {
      await acceptConsent(cookies);
      navigate(returnTo, { replace: true });
    } catch (saveError) {
      setError(saveError.message || 'Não foi possível registrar sua escolha.');
      setStatus('ready');
    }
  };

  const decline = async () => {
    if (status !== 'ready') return;
    setStatus('deleting');
    setError('');
    try {
      await declineConsent();
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      navigate('/cadastro', { replace: true, state: { accountDeleted: true } });
    } catch (deleteError) {
      setError(deleteError.message || 'Não foi possível excluir a conta. Tente novamente.');
      setStatus('ready');
    }
  };

  return <main className="arboris-auth-wrapper account-consent-page">
    <section className="account-consent-card" aria-busy={status !== 'ready'}>
      <img src="/arboris-tree.webp" alt="" className="account-consent-logo" />
      <span className="account-consent-eyebrow">PRIMEIRO ACESSO · ARBORIS.X</span>
      <h1>Antes de entrar</h1>
      <p>Para acessar o Dashboard, leia e aceite os Termos de Uso e a Política de Privacidade. A escolha sobre cookies é opcional e não impede o acesso.</p>
      {status === 'checking' ? <p role="status">Verificando sua conta…</p> : status === 'error' ? <div>
        <p className="account-consent-error" role="alert">{error}</p>
        <button type="button" className="holo-button" onClick={() => window.location.reload()}>Tentar novamente</button>
      </div> : <form onSubmit={accept}>
        <label className="account-consent-choice">
          <input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} disabled={status !== 'ready'} />
          <span>Li e concordo com os <Link to="/termos" target="_blank" rel="noopener noreferrer">Termos de Uso</Link>.</span>
        </label>
        <label className="account-consent-choice">
          <input type="checkbox" checked={privacy} onChange={(event) => setPrivacy(event.target.checked)} disabled={status !== 'ready'} />
          <span>Li e concordo com a <Link to="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</Link>.</span>
        </label>
        <label className="account-consent-choice">
          <input type="checkbox" checked={cookies} onChange={(event) => setCookies(event.target.checked)} disabled={status !== 'ready'} />
          <span>Aceito o uso opcional descrito na <Link to="/cookies" target="_blank" rel="noopener noreferrer">Política de Cookies</Link>. Esta escolha não impede o acesso.</span>
        </label>
        {error && <p className="account-consent-error" role="alert">{error}</p>}
        <div className="account-consent-actions">
          <button className="holo-button" type="submit" disabled={!terms || !privacy || status !== 'ready'}>{status === 'saving' ? 'Salvando…' : 'Concordar e continuar'}</button>
          <button className="account-consent-decline" type="button" onClick={decline} disabled={status !== 'ready'}>{status === 'deleting' ? 'Excluindo conta…' : 'Não concordo · excluir minha conta'}</button>
        </div>
      </form>}
    </section>
  </main>;
}
