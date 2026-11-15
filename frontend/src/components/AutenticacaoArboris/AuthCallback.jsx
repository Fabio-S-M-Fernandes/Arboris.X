import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoaderCircle, Lock } from 'lucide-react';
import { beginSupabaseChallenge, sessionRequest } from '../../lib/api';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import { validarSenha } from '../../lib/validacao';
import { useAuthTransition } from './AuthTransitionController';
import { AcabamentoCard, AuthIdentity } from './AutenticacaoArboris';

const safeErrorCode = (error) => {
  const code = String(error?.code || 'unknown');
  return /^[a-zA-Z0-9_.-]{1,64}$/.test(code) ? code : 'unknown';
};

const AuthSurface = ({ children }) => {
  const { environmentReady } = useAuthTransition();
  return <main className="arboris-auth-wrapper">
    <div className="auth-scene" data-environment-ready={environmentReady}>
      <div className="auth-panel">
        <div className="auth-panel-light" aria-hidden="true" />
        <div className="auth-card-decor" aria-hidden="true"><AcabamentoCard /></div>
        <AuthIdentity />
        <div className="auth-panels-container"><div className="auth-form-content auth-callback-content">{children}</div></div>
      </div>
    </div>
  </main>;
};

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const handled = useRef(false);
  const [status, setStatus] = useState('Confirmando seu acesso…');
  const [recovery, setRecovery] = useState(false);
  const [confirmationComplete, setConfirmationComplete] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const params = new URLSearchParams(location.search);
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const flow = params.get('flow');
    const code = params.get('code');
    let stage = 'parse';

    const fail = (error) => {
      console.error('[auth-callback]', {
        stage,
        code: safeErrorCode(error),
        status: Number.isInteger(error?.status) ? error.status : undefined,
      });
      setStatus(flow === 'google'
        ? stage === 'backend_session' && /^DATABASE_/.test(String(error?.code || ''))
          ? 'Sua conta Google foi autenticada, mas o banco de sessões está indisponível. Tente novamente após a correção da conexão.'
          : 'A autenticação Google foi iniciada, mas não foi possível concluir a validação de segurança.'
        : 'Este link é inválido, expirou ou já foi utilizado. Solicite um novo link.');
    };

    if (params.has('error') || fragment.has('error') || fragment.has('error_code')) {
      const error = new Error('OAuth authorization was denied.');
      error.code = params.get('error_code') || fragment.get('error_code') || 'oauth_denied';
      fail(error);
      window.history.replaceState(window.history.state, '', '/auth/callback');
      return;
    }
    if (!supabaseConfigured || !code || !['google', 'recovery', 'link', 'confirmation'].includes(flow)) {
      fail(Object.assign(new Error('Invalid callback.'), { code: !supabaseConfigured ? 'supabase_not_configured' : 'callback_invalid' }));
      window.history.replaceState(window.history.state, '', '/auth/callback');
      return;
    }

    const complete = async () => {
      try {
        stage = 'exchange_code';
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        window.history.replaceState(window.history.state, '', '/auth/callback');

        if (flow === 'confirmation') {
          if (!data.user?.email_confirmed_at && !data.user?.confirmed_at) {
            throw Object.assign(new Error('Supabase did not confirm the user.'), { code: 'confirmation_not_recorded' });
          }
          const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
          if (signOutError) console.error('[auth-callback]', { stage: 'clear_confirmation_session', code: safeErrorCode(signOutError) });
          setConfirmationComplete(true);
          setStatus('Seu endereço foi confirmado com sucesso. Agora você pode entrar.');
          return;
        }

        if (flow === 'recovery') {
          setRecovery(true);
          setStatus('Defina uma nova senha para sua conta.');
          return;
        }

        if (flow === 'google') {
          stage = 'google_terms';
          const termsPending = sessionStorage.getItem('arboris-google-terms-pending') === '1';
          sessionStorage.removeItem('arboris-google-terms-pending');
          if (data.user?.user_metadata?.terms_accepted !== true) {
            if (!termsPending) {
              await supabase.auth.signOut({ scope: 'local' });
              throw Object.assign(new Error('Google terms were not accepted.'), { code: 'TERMS_REQUIRED' });
            }
            const { error: termsError } = await supabase.auth.updateUser({ data: { terms_accepted: true } });
            if (termsError) throw termsError;
          }
        }

        stage = 'backend_session';
        try {
          await sessionRequest('/me');
          navigate('/dashboard', { replace: true });
          return;
        } catch (error) {
          if (error.status !== 403) throw error;
        }

        stage = 'additional_verification';
        const challenge = await beginSupabaseChallenge();
        navigate('/login', { replace: true, state: { challenge: { ...challenge, method: 'supabase' } } });
      } catch (error) {
        fail(error);
        window.history.replaceState(window.history.state, '', '/auth/callback');
      }
    };
    void complete();
  }, [location.search, navigate]);

  const updatePassword = async (event) => {
    event.preventDefault();
    const validation = validarSenha(password);
    if (validation) { setStatus(validation); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      console.error('[auth-callback]', { stage: 'password_update', code: safeErrorCode(error) });
      setStatus('Não foi possível atualizar a senha. Solicite um novo link de recuperação.');
      setBusy(false);
      return;
    }
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError) console.error('[auth-callback]', { stage: 'password_sign_out', code: safeErrorCode(signOutError) });
    setPassword('');
    setRecovery(false);
    setStatus('Senha atualizada. Entre novamente para confirmar seu acesso.');
    setBusy(false);
  };

  return <AuthSurface>
    <header className="auth-form-heading">
      <h2>{recovery ? 'Redefina sua senha' : confirmationComplete ? 'E-mail confirmado.' : 'Seu acesso Arboris.X'}</h2>
      <p role="status">{status}</p>
    </header>
    {status === 'Confirmando seu acesso…' && <LoaderCircle className="auth-callback-spinner animate-spin" size={22} aria-hidden="true" />}
    {recovery && <form className="auth-form" onSubmit={updatePassword}>
      <div className="input-group">
        <label className="input-label" htmlFor="new-password">Nova senha</label>
        <div className="input-with-icon">
          <Lock className="input-icon" size={18} aria-hidden="true" />
          <input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
        </div>
      </div>
      <button type="submit" className="holo-button" disabled={busy}>Atualizar senha</button>
    </form>}
    {!recovery && (confirmationComplete || status !== 'Confirmando seu acesso…')
      && <button type="button" className="auth-toggle-link" onClick={() => navigate('/login', { replace: true })}>Ir para o Login</button>}
  </AuthSurface>;
}

export function AuthConfirm() {
  const location = useLocation();
  const navigate = useNavigate();
  const { environmentReady } = useAuthTransition();
  const submitted = useRef(false);
  const params = new URLSearchParams(location.search);
  const tokenHash = params.get('token_hash');
  const [state, setState] = useState(tokenHash && params.get('type') === 'email' ? 'ready' : 'invalid');

  const confirm = async () => {
    if (submitted.current || state !== 'ready') return;
    submitted.current = true;
    setState('verifying');
    if (!supabaseConfigured) {
      console.error('[auth-confirm]', { stage: 'configuration', code: 'supabase_not_configured' });
      setState('error');
      return;
    }
    try {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
      if (error) throw error;
      if (!data.user?.email_confirmed_at && !data.user?.confirmed_at) {
        throw Object.assign(new Error('Supabase did not confirm the user.'), { code: 'confirmation_not_recorded' });
      }
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) console.error('[auth-confirm]', { stage: 'clear_local_session', code: safeErrorCode(signOutError) });
      setState('success');
    } catch (error) {
      console.error('[auth-confirm]', { stage: 'verify_otp', code: safeErrorCode(error) });
      setState(['otp_expired', 'token_already_used', 'bad_code', 'invalid_token', 'validation_failed'].includes(error.code) ? 'expired' : 'error');
    }
  };

  return <main className="arboris-auth-wrapper">
    <div className="auth-scene" data-environment-ready={environmentReady}>
      <div className="auth-panel">
        <div className="auth-panel-light" aria-hidden="true" />
        <div className="auth-card-decor" aria-hidden="true"><AcabamentoCard /></div>
        <AuthIdentity />
        <div className="auth-panels-container"><div className="auth-form-content auth-callback-content">
          <header className="auth-form-heading">
            <h2>{state === 'success' ? 'E-mail confirmado.' : 'Confirme seu e-mail'}</h2>
            <p role="status">{{
              ready: 'Confirme abaixo para ativar seu acesso ao Arboris.X.',
              verifying: 'Validando o link de confirmação…',
              success: 'Seu endereço foi confirmado com sucesso. Agora você pode entrar.',
              expired: 'Este link expirou ou já foi utilizado. Solicite um novo e-mail de confirmação.',
              invalid: 'O link está incompleto ou inválido. Abra o link recebido por e-mail.',
              error: 'Não foi possível confirmar este endereço. Solicite um novo e-mail e tente novamente.',
            }[state]}</p>
          </header>
          {state === 'ready' && <button type="button" className="holo-button" onClick={confirm}>Confirmar e-mail</button>}
          {state === 'verifying' && <LoaderCircle className="auth-callback-spinner animate-spin" size={22} aria-hidden="true" />}
          {(state === 'success' || state === 'expired' || state === 'error' || state === 'invalid') && <button type="button" className="auth-toggle-link" onClick={() => navigate('/login', { replace: true })}>{state === 'success' ? 'Ir para o Login' : 'Voltar ao Login'}</button>}
        </div></div>
      </div>
    </div>
  </main>;
}
