import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LoaderCircle, Lock } from 'lucide-react';
import {
  beginSupabaseChallenge, CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION, GOOGLE_CONSENT_HINT_KEY, sessionRequest,
} from '../../lib/api';
import { getEmailConfirmationUrl, supabase, supabaseConfigured } from '../../lib/supabase';
import { validarEmail, validarSenha } from '../../lib/validacao';
import { authErrorMessage } from '../../lib/authMessages';
import { useAuthTransition } from './AuthTransitionController';
import { AcabamentoCard, AuthIdentity } from './AutenticacaoArboris';

const safeErrorCode = (error) => {
  const code = String(error?.code || 'unknown');
  return /^[a-zA-Z0-9_.-]{1,64}$/.test(code) ? code : 'unknown';
};

const AuthSurface = ({ children }) => {
  const { environmentReady, motionPaused } = useAuthTransition();
  return <main className="arboris-auth-wrapper">
    <div className="auth-scene" data-environment-ready={environmentReady} data-paused={motionPaused}>
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
  const { requestTransition, setVerificationActive } = useAuthTransition();
  const handled = useRef(false);
  const [status, setStatus] = useState('Validando o link…');
  const [recovery, setRecovery] = useState(false);
  const [confirmationComplete, setConfirmationComplete] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmationError, setConfirmationError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      if (flow === 'google') sessionStorage.removeItem('arboris-google-terms-pending');
      console.error('[auth-callback]', {
        stage,
        code: safeErrorCode(error),
        status: Number.isInteger(error?.status) ? error.status : undefined,
      });
      setVerificationActive(false);
      setStatus(flow === 'google'
        ? authErrorMessage(error, 'google')
        : ['recovery', 'confirmation', 'link'].includes(flow)
          ? ['otp_expired', 'token_already_used', 'invalid_token', 'callback_invalid'].includes(error?.code)
            ? authErrorMessage(error, 'link')
            : 'Este link é inválido, expirou ou já foi usado. Solicite outro.'
          : 'Não foi possível abrir este link. Solicite outro.');
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
          setVerificationActive(false);
          return;
        }

        if (flow === 'recovery') {
          setRecovery(true);
          setStatus('Defina uma nova senha para sua conta.');
          setVerificationActive(false);
          return;
        }

        if (flow === 'google') {
          stage = 'google_terms';
          const termsPending = sessionStorage.getItem('arboris-google-terms-pending') === '1';
          sessionStorage.removeItem('arboris-google-terms-pending');
          const currentTermsAccepted = data.user?.user_metadata?.terms_accepted === true
            && data.user?.user_metadata?.terms_version === CURRENT_TERMS_VERSION
            && data.user?.user_metadata?.privacy_version === CURRENT_PRIVACY_VERSION;
          if (!currentTermsAccepted) {
            if (!termsPending) {
              setVerificationActive(false);
              navigate('/login', { replace: true, state: { googleConsentRequired: true } });
              return;
            }
            const { error: termsError } = await supabase.auth.updateUser({ data: {
              terms_accepted: true,
              terms_version: CURRENT_TERMS_VERSION,
              privacy_version: CURRENT_PRIVACY_VERSION,
            } });
            if (termsError) throw termsError;
          }
          try { localStorage.setItem(GOOGLE_CONSENT_HINT_KEY, '1'); } catch { /* Preferência local opcional. */ }
        }

        stage = 'backend_session';
        try {
          const session = await sessionRequest('/me');
          setVerificationActive(false);
          requestTransition('/dashboard', {
            mode: 'welcome', direction: 'forward',
            userName: String(session.user?.userMetadata?.full_name || session.user?.userMetadata?.name || '').trim(),
          });
          return;
        } catch (error) {
          if (error.status !== 403) throw error;
        }

        stage = 'additional_verification';
        const challenge = await beginSupabaseChallenge();
        if (challenge.authorized === true) {
          const session = await sessionRequest('/me');
          setVerificationActive(false);
          requestTransition('/dashboard', {
            mode: 'welcome', direction: 'forward',
            userName: String(session.user?.userMetadata?.full_name || session.user?.userMetadata?.name || '').trim(),
          });
          return;
        }
        setVerificationActive(false);
        navigate('/login', { replace: true, state: { challenge: { ...challenge, method: 'supabase' } } });
      } catch (error) {
        fail(error);
        window.history.replaceState(window.history.state, '', '/auth/callback');
      }
    };
    void complete();
  }, [location.search, navigate, requestTransition, setVerificationActive]);

  const updatePassword = async (event) => {
    event.preventDefault();
    if (busy) return;
    const validation = validarSenha(password);
    setPasswordError(validation || '');
    setConfirmationError('');
    if (validation) return;
    if (password !== passwordConfirmation) {
      setConfirmationError('As senhas não coincidem. Confira os dois campos.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        console.error('[auth-callback]', {
          stage: 'password_update',
          code: safeErrorCode(error),
          status: Number.isInteger(error.status) ? error.status : undefined,
        });
        setStatus(authErrorMessage(error, 'password'));
        return;
      }
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) console.error('[auth-callback]', { stage: 'password_sign_out', code: safeErrorCode(signOutError) });
      setPassword('');
      setPasswordConfirmation('');
      setRecovery(false);
      setPasswordUpdated(true);
      setStatus(signOutError
        ? 'Senha atualizada. Saia desta sessão e entre novamente.'
        : 'Senha atualizada. Entre novamente para confirmar seu acesso.');
    } catch (error) {
      console.error('[auth-callback]', {
        stage: 'password_update',
        code: safeErrorCode(error),
        status: Number.isInteger(error?.status) ? error.status : undefined,
      });
      setStatus(authErrorMessage(error, 'password'));
    } finally {
      setBusy(false);
    }
  };

  return <AuthSurface>
    <header className="auth-form-heading">
      <span className="auth-form-eyebrow">{recovery ? 'RECUPERAÇÃO DE ACESSO' : 'SEGURANÇA DA CONTA'}</span>
      <h2>{recovery ? 'Crie uma nova senha' : confirmationComplete ? 'E-mail confirmado' : passwordUpdated ? 'Senha atualizada' : status === 'Validando o link…' ? 'Validando acesso' : 'Não foi possível continuar'}</h2>
      <p role="status">{status}</p>
    </header>
    {recovery && <form className="auth-form" onSubmit={updatePassword} noValidate>
      <div className="input-group">
        <label className="input-label" htmlFor="new-password">Nova senha</label>
        <div className="input-with-icon">
          <Lock className="input-icon" size={18} aria-hidden="true" />
          <input id="new-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => { setPassword(event.target.value); setPasswordError(''); }} autoComplete="new-password" aria-invalid={!!passwordError} aria-describedby={passwordError ? 'new-password-error' : undefined} disabled={busy} />
          <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} disabled={busy}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button>
        </div>
        {passwordError && <p id="new-password-error" role="alert" className="auth-field-error">{passwordError}</p>}
      </div>
      <div className="input-group">
        <label className="input-label" htmlFor="confirm-new-password">Confirme a nova senha</label>
        <div className="input-with-icon">
          <Lock className="input-icon" size={18} aria-hidden="true" />
          <input id="confirm-new-password" type={showPassword ? 'text' : 'password'} value={passwordConfirmation} onChange={(event) => { setPasswordConfirmation(event.target.value); setConfirmationError(''); }} autoComplete="new-password" aria-invalid={!!confirmationError} aria-describedby={confirmationError ? 'confirm-password-error' : undefined} disabled={busy} />
        </div>
        {confirmationError && <p id="confirm-password-error" role="alert" className="auth-field-error">{confirmationError}</p>}
      </div>
      <button type="submit" className="holo-button" disabled={busy} aria-busy={busy}>{busy ? 'Atualizando…' : 'Salvar nova senha'}</button>
    </form>}
    {!recovery && (confirmationComplete || status !== 'Validando o link…')
      && <button type="button" className="auth-toggle-link" onClick={() => navigate('/login', { replace: true })}>Ir para o Login</button>}
  </AuthSurface>;
}

export function AuthConfirm() {
  const location = useLocation();
  const navigate = useNavigate();
  const { environmentReady, motionPaused } = useAuthTransition();
  const submitted = useRef(false);
  const params = new URLSearchParams(location.search);
  const tokenHash = params.get('token_hash');
  const [state, setState] = useState(tokenHash && params.get('type') === 'email' ? 'ready' : 'invalid');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState('');
  const [resendError, setResendError] = useState('');

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

  const resendConfirmation = async (event) => {
    event.preventDefault();
    const validation = validarEmail(resendEmail);
    if (validation) { setResendError(validation); setResendNotice(''); return; }
    if (!supabaseConfigured || resending) return;
    setResending(true);
    setResendError('');
    setResendNotice('');
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: resendEmail.trim(),
        options: { emailRedirectTo: getEmailConfirmationUrl() },
      });
      if (error) throw error;
      setResendNotice('Se a conta precisar de confirmação, um novo e-mail foi solicitado. Confira a caixa de entrada e o spam.');
    } catch (error) {
      console.error('[auth-confirm]', { stage: 'resend_confirmation', code: safeErrorCode(error) });
      setResendError(authErrorMessage(error, 'email'));
    } finally {
      setResending(false);
    }
  };

  return <main className="arboris-auth-wrapper">
    <div className="auth-scene" data-environment-ready={environmentReady} data-paused={motionPaused}>
      <div className="auth-panel">
        <div className="auth-panel-light" aria-hidden="true" />
        <div className="auth-card-decor" aria-hidden="true"><AcabamentoCard /></div>
        <AuthIdentity />
        <div className="auth-panels-container"><div className="auth-form-content auth-callback-content">
          <header className="auth-form-heading">
            <span className="auth-form-eyebrow">CONFIRMAÇÃO DE CONTA</span>
            <h2>{state === 'success' ? 'E-mail confirmado' : ['expired', 'invalid', 'error'].includes(state) ? 'Não foi possível confirmar' : 'Confirme seu e-mail'}</h2>
            <p role="status">{{
              ready: 'Clique abaixo para confirmar seu endereço e continuar.',
              verifying: 'Validando o link de confirmação…',
              success: 'Seu endereço foi confirmado com sucesso. Agora você pode entrar.',
              expired: 'Este link expirou ou já foi usado. Peça outro abaixo.',
              invalid: 'Este link está incompleto. Abra o link recebido por e-mail.',
              error: 'Tente solicitar um novo e-mail de confirmação.',
            }[state]}</p>
          </header>
          {state === 'ready' && <button type="button" className="holo-button" onClick={confirm}>Confirmar e-mail</button>}
          {state === 'verifying' && <LoaderCircle className="auth-callback-spinner animate-spin" size={22} aria-hidden="true" />}
          {(state === 'expired' || state === 'error' || state === 'invalid') && <form className="auth-form" onSubmit={resendConfirmation}>
            <div className="input-group">
              <label className="input-label" htmlFor="confirmation-email">E-mail do cadastro</label>
              <input id="confirmation-email" type="email" value={resendEmail} onChange={(event) => setResendEmail(event.target.value)} autoComplete="email" required />
            </div>
            {resendError && <p role="alert" className="auth-verify-hint">{resendError}</p>}
            {resendNotice && <p role="status" className="auth-verify-hint">{resendNotice}</p>}
            <button type="submit" className="holo-button" disabled={resending} aria-busy={resending}>
              {resending ? 'Solicitando…' : 'Enviar novo e-mail'}
            </button>
          </form>}
          {(state === 'success' || state === 'expired' || state === 'error' || state === 'invalid') && <button type="button" className="auth-toggle-link" onClick={() => navigate('/login', { replace: true })}>{state === 'success' ? 'Ir para o Login' : 'Voltar ao Login'}</button>}
        </div></div>
      </div>
    </div>
  </main>;
}
