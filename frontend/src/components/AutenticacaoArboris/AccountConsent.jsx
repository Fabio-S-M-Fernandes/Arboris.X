import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { acceptConsent, declineConsent, getConsentStatus } from '../../lib/api';
import { getDashboardReturnTo } from '../../lib/authReturnTo';
import { supabase } from '../../lib/supabase';
import { authErrorMessage } from '../../lib/authMessages';
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
  const [checkAttempt, setCheckAttempt] = useState(0);
  const [retryUntil, setRetryUntil] = useState(0);
  const [retrySeconds, setRetrySeconds] = useState(0);

  useEffect(() => {
    if (!retryUntil) return undefined;
    const update = () => setRetrySeconds(Math.max(0, Math.ceil((retryUntil - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [retryUntil]);

  const recordRetry = (requestError) => {
    if (requestError.status === 429 && Number.isFinite(requestError.retryAfterSeconds)) {
      setRetryUntil(Date.now() + requestError.retryAfterSeconds * 1000);
    }
  };

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const check = async () => {
      setStatus('checking');
      setError('');
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        if (!data.session) { navigate('/cadastro', { replace: true }); return; }
        const result = await getConsentStatus(controller.signal);
        if (!active) return;
        if (!result.required) { navigate(returnTo, { replace: true }); return; }
        setStatus('ready');
      } catch (checkError) {
        if (active && checkError.name !== 'AbortError') {
          recordRetry(checkError);
          setError(authErrorMessage(checkError));
          setStatus('error');
        }
      }
    };
    void check();
    return () => { active = false; controller.abort(); };
  }, [navigate, returnTo, checkAttempt]);

  const accept = async (event) => {
    event.preventDefault();
    if (!terms || !privacy || status !== 'ready' || Date.now() < retryUntil) return;
    setStatus('saving');
    setError('');
    try {
      await acceptConsent(cookies);
      navigate(returnTo, { replace: true });
    } catch (saveError) {
      recordRetry(saveError);
      setError(authErrorMessage(saveError));
      setStatus('ready');
    }
  };

  const decline = async () => {
    if (status !== 'ready' || Date.now() < retryUntil) return;
    setStatus('deleting');
    setError('');
    try {
      await declineConsent();
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      navigate('/cadastro', { replace: true, state: { accountDeleted: true } });
    } catch (deleteError) {
      recordRetry(deleteError);
      setError(authErrorMessage(deleteError));
      setStatus('ready');
    }
  };

  return <main className="arboris-auth-wrapper account-consent-page">
    <section className="account-consent-card" aria-busy={status !== 'ready'}>
      <div className="account-consent-intro">
        <div className="account-consent-brand"><img src="/arboris-tree.webp" alt="" className="account-consent-logo" /><span>ARBORIS<span>.X</span></span></div>
        <span className="account-consent-eyebrow">PRIMEIRO ACESSO</span>
        <h1>Suas escolhas antes de entrar.</h1>
        <p>Leia os documentos e escolha como deseja continuar. Seus dados e seu acesso são protegidos desde o primeiro uso.</p>
        <div className="account-consent-intro-note"><span aria-hidden="true">✦</span><span>Os cookies opcionais não impedem o acesso ao Dashboard.</span></div>
      </div>
      <div className="account-consent-content">
        {status === 'checking' ? <p className="account-consent-state" role="status">Verificando sua conta…</p> : status === 'error' ? <div className="account-consent-state">
          <p className="account-consent-error" role="alert">{error}</p>
          <button type="button" className="holo-button" disabled={retrySeconds > 0} onClick={() => setCheckAttempt((attempt) => attempt + 1)}>{retrySeconds > 0 ? `Tentar em ${retrySeconds}s` : 'Tentar novamente'}</button>
        </div> : <form onSubmit={accept}>
          <div className="account-consent-group-heading"><span>01 / ACESSO</span><strong>Obrigatórios</strong></div>
          <label className="account-consent-choice">
            <input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} disabled={status !== 'ready'} />
            <span>Li e concordo com os <Link to="/termos" target="_blank" rel="noopener noreferrer">Termos de Uso</Link>.</span>
          </label>
          <label className="account-consent-choice">
            <input type="checkbox" checked={privacy} onChange={(event) => setPrivacy(event.target.checked)} disabled={status !== 'ready'} />
            <span>Li e concordo com a <Link to="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</Link>.</span>
          </label>
          <div className="account-consent-group-heading account-consent-group-heading--optional"><span>02 / PREFERÊNCIAS</span><strong>Opcional</strong></div>
          <label className="account-consent-choice account-consent-choice--optional">
            <input type="checkbox" checked={cookies} onChange={(event) => setCookies(event.target.checked)} disabled={status !== 'ready'} />
            <span>Aceito o uso opcional descrito na <Link to="/cookies" target="_blank" rel="noopener noreferrer">Política de Cookies</Link>.</span>
          </label>
          {error && <p className="account-consent-error" role="alert">{error}</p>}
          <div className="account-consent-actions">
            <button className="holo-button" type="submit" disabled={!terms || !privacy || status !== 'ready' || retrySeconds > 0}>{status === 'saving' ? 'Salvando…' : retrySeconds > 0 ? `Tentar em ${retrySeconds}s` : 'Concordar e continuar'}</button>
            <button className="account-consent-decline" type="button" onClick={decline} disabled={status !== 'ready' || retrySeconds > 0}>{status === 'deleting' ? 'Excluindo conta…' : 'Não concordo · excluir minha conta'}</button>
          </div>
        </form>}
      </div>
    </section>
  </main>;
}
