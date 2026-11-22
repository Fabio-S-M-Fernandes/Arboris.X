import { lazy, Suspense, useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthTransition } from './AuthTransitionController';
import { useScreenReady } from '../BootGate';
import { Mail, Lock, User, ArrowRight, ArrowLeft, Eye, EyeOff, LoaderCircle, TriangleAlert } from 'lucide-react';
import './AutenticacaoArboris.css';
import {
  beginSupabaseChallenge, cancelChallengeWithApi, CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION,
  GOOGLE_CONSENT_HINT_KEY, loginWithApi, loginWithGoogle, registerWithApi,
  resendCodeWithApi, verifyCodeWithApi, requestPasswordRecovery,
  sessionRequest,
} from '../../lib/api';
import {
  SENHA_MIN,
  validarCadastro,
  validarEmail,
  validarLogin,
  validarNome,
  validarSenha,
} from '../../lib/validacao';
import GoogleSignInButton from './GoogleSignInButton';
import SiteFooterLegal from '../SiteFooterLegal';
import { authErrorMessage } from '../../lib/authMessages';
import { supabase } from '../../lib/supabase';

const TermosModal = lazy(() => import('../ModaisArboris/ModaisArboris').then((module) => ({ default: module.TermosModal })));
const PrivacidadeModal = lazy(() => import('../ModaisArboris/ModaisArboris').then((module) => ({ default: module.PrivacidadeModal })));

const validadoresPorCampo = {
  nome: validarNome,
  email: validarEmail,
  senha: validarSenha,
};

const inputEstadoClasses = (valor, erro, campo) => {
  if (erro) return 'input-state-invalid';
  return valor.trim() && !validadoresPorCampo[campo](valor) ? 'input-state-valid' : '';
};

const iconeEstadoClasses = (valor, erro, campo) => {
  if (erro) return 'input-icon-invalid';
  if (valor.trim() && !validadoresPorCampo[campo](valor)) return 'input-icon-valid';
  return '';
};

const atualizaErroDoCampo = (valor, campo) =>
  valor.trim() ? validadoresPorCampo[campo](valor) : undefined;

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="mt-0.5 flex items-center gap-1.5 text-[0.75rem] text-orange-200/90"
    >
      <TriangleAlert size={12} className="shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

function VerificationPanel({
  verification, code, onCodeChange, error, loading, remainingResend, expired,
  onSubmit, onResend, onBack, backLabel, googleLinkPending, onCancelGoogleLink,
  trustDevice, onTrustDeviceChange,
}) {
  const digits = Array.from({ length: 6 }, (_, index) => code[index] || '');
  return (
    <form className="auth-verify-form" onSubmit={onSubmit} noValidate>
      {googleLinkPending && <div className="auth-google-link-note" role="status">
        <p>Depois de confirmar este código, a conta Google verificada será vinculada a este acesso.</p>
        <button type="button" className="auth-toggle-link" onClick={onCancelGoogleLink} disabled={loading}>Continuar sem vincular</button>
      </div>}
      <p className="auth-verify-copy">Enviamos um código de 6 dígitos para <strong>{verification.maskedEmail}</strong>.</p>
      <label className="input-label" htmlFor="auth-security-code">Código de segurança</label>
      <div className="auth-otp-field">
        <input
          id="auth-security-code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={onCodeChange}
          aria-label="Código de segurança de seis dígitos"
          aria-invalid={!!error}
          aria-describedby={error ? 'auth-code-error' : 'auth-code-hint'}
          disabled={loading || expired}
        />
        <div className="auth-otp-slots" aria-hidden="true">
          {digits.map((digit, index) => <span className={digit ? 'has-digit' : ''} key={index}>{digit}</span>)}
        </div>
      </div>
      <span id="auth-code-hint" className="auth-verify-hint">Digite ou cole os seis números. O código vale por 5 minutos.</span>
      {verification.trustedDeviceAvailable && <label className="auth-trust-device">
        <input type="checkbox" checked={trustDevice} onChange={(event) => onTrustDeviceChange(event.target.checked)} disabled={loading} />
        <span>Confiar neste dispositivo por {verification.trustedDeviceDays} dias. Não marque em computadores compartilhados.</span>
      </label>}
      <FieldError id="auth-code-error" message={error} />
      <button type="submit" className="holo-button auth-verify-submit" disabled={loading || expired || code.length !== 6} aria-busy={loading}>
        <BotaoConteudo isLoading={loading} textoLoading="Confirmando…" texto="Confirmar acesso" />
      </button>
      <div className="auth-verify-actions">
        <button type="button" className="auth-toggle-link" onClick={onResend} disabled={loading || expired || remainingResend > 0}>
          {remainingResend > 0 ? `Reenviar em ${remainingResend}s` : 'Reenviar código'}
        </button>
        <button type="button" className="auth-toggle-link" onClick={onBack} disabled={loading}>
          <ArrowLeft size={14} aria-hidden="true" /> {backLabel}
        </button>
      </div>
      {expired && <p className="auth-verify-expired" role="status">Este código expirou. Volte e entre novamente para receber outro.</p>}
    </form>
  );
}

export function AcabamentoCard() {
  return (
    <>
      <svg className="auth-edge" aria-hidden="true" focusable="false"><rect x="1" y="1" rx="23" pathLength="100" /></svg>
    </>
  );
}

export function AuthIdentity() {
  return <aside className="auth-editorial" aria-label="Identidade Arboris.X">
    <div className="auth-editorial__body">
      <div className="auth-editorial__identity">
        <div className="auth-editorial__symbol auth-entry">
          <img src="/arboris-tree.webp" alt="" aria-hidden="true" />
        </div>
        <div className="auth-editorial__wordmark">
          <p className="auth-entry">ARBORIS<span className="auth-editorial__x">.X</span></p>
          <span className="auth-editorial__subtitle auth-entry">INTELIGÊNCIA AMBIENTAL</span>
        </div>
      </div>
      <p className="auth-editorial__statement auth-entry">Monitoramento de temperatura com foco nas ilhas de calor urbanas.</p>
    </div>
    <span className="auth-editorial__detail" aria-hidden="true">FUNEC RIACHO · MOSTRA DE TECNOLOGIA · 2026</span>
  </aside>;
}

function BotaoConteudo({ isLoading, textoLoading, texto }) {
  if (isLoading) {
    return (
      <span className="flex items-center gap-2" aria-live="polite">
        <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
        {textoLoading}
      </span>
    );
  }
  return (
    <>
      <span>{texto}</span>
      <ArrowRight className="button-icon" size={18} aria-hidden="true" />
    </>
  );
}

export default function AutenticacaoArboris() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    requestTransition, signalDestinationReady, environmentReady, motionPaused,
    formPhase, direction, onFormExit, onFormEnter,
  } = useAuthTransition();
  const isLogin = location.pathname !== '/cadastro';
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [modalTermosOpen, setModalTermosOpen] = useState(false);
  const [modalPrivacidadeOpen, setModalPrivacidadeOpen] = useState(false);
  const [termosAceitos, setTermosAceitos] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', senha: '' });
  const [signupData, setSignupData] = useState({ nome: '', email: '', senha: '' });
  const [loginErrors, setLoginErrors] = useState({});
  const [signupErrors, setSignupErrors] = useState({});
  const [verification, setVerification] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [resendNow, setResendNow] = useState(0);
  const [pendingGoogle, setPendingGoogle] = useState(() => location.pathname !== '/cadastro' && location.state?.googleConsentRequired ? { postOAuth: true } : null);
  const [pendingGoogleLink, setPendingGoogleLink] = useState(null);
  const [googleTermsAccepted, setGoogleTermsAccepted] = useState(false);
  const [googleTermsError, setGoogleTermsError] = useState('');
  const googleActionInFlight = useRef(false);
  const panelRef = useRef(null);
  const [loginCardHeight, setLoginCardHeight] = useState(0);
  const [signupNotice, setSignupNotice] = useState('');
  const [recoveryNotice, setRecoveryNotice] = useState('');

  // Atualiza o campo e limpa o erro dele assim que o usuário volta a digitar.
  const handleLoginChange = (campo) => (e) => {
    const valor = e.target.value;
    setLoginData((prev) => ({ ...prev, [campo]: valor }));
    setLoginErrors((prev) => ({ ...prev, [campo]: atualizaErroDoCampo(valor, campo) }));
    setRecoveryNotice('');
  };

  const handleSignupChange = (campo) => (e) => {
    const valor = e.target.value;
    setSignupData((prev) => ({ ...prev, [campo]: valor }));
    setSignupErrors((prev) => ({ ...prev, [campo]: atualizaErroDoCampo(valor, campo) }));
  };

  const wrapperRef = useRef();
  const startVerification = useCallback((result) => {
    setVerification({
      challengeId: result.challengeId,
      maskedEmail: result.maskedEmail,
      expiresAt: result.expiresAt,
      resendAvailableAt: result.resendAvailableAt,
      method: result.method,
      isNewUser: result.isNewUser ?? !isLogin,
      trustedDeviceAvailable: result.trustedDeviceAvailable === true,
      trustedDeviceDays: result.trustedDeviceDays || 30,
    });
    setVerificationCode('');
    setTrustDevice(false);
    setVerificationError('');
    setResendNow(Date.now());
  }, [isLogin]);

  const callbackChallenge = location.state?.challenge;
  const callbackChallengeSeen = useRef(null);
  useEffect(() => {
    if (!callbackChallenge?.challengeId || callbackChallengeSeen.current === callbackChallenge.challengeId) return;
    callbackChallengeSeen.current = callbackChallenge.challengeId;
    startVerification(callbackChallenge);
  }, [callbackChallenge, startVerification]);

  const googleConsentSeen = useRef(Boolean(pendingGoogle?.postOAuth));
  useEffect(() => {
    if (!isLogin || !location.state?.googleConsentRequired || googleConsentSeen.current) return;
    googleConsentSeen.current = true;
    setPendingGoogle({ postOAuth: true });
    setGoogleTermsAccepted(false);
    setGoogleTermsError('');
    setLoginErrors({});
  }, [isLogin, location.state]);

  useLayoutEffect(() => {
    if (!isLogin || pendingGoogle || verification) return;
    const height = Math.ceil(panelRef.current?.getBoundingClientRect().height || 0);
    if (height) setLoginCardHeight(height);
  }, [isLogin, pendingGoogle, verification]);

  useEffect(() => {
    if (!isLogin || verification) return;
    const target = pendingGoogle ? 'google-terms-checkbox' : 'login-email';
    document.getElementById(target)?.focus({ preventScroll: true });
  }, [isLogin, pendingGoogle, verification]);

  const verificationChallengeId = verification?.challengeId;
  useEffect(() => {
    if (!verificationChallengeId) return undefined;
    const timer = window.setInterval(() => setResendNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [verificationChallengeId]);

  useEffect(() => {
    if (!verificationChallengeId) return;
    document.getElementById('auth-security-code')?.focus({ preventScroll: true });
  }, [verificationChallengeId]);

  // A tela de destino sinaliza que montou; a mascara so abre depois disso.
  useEffect(() => {
    signalDestinationReady();
  }, [isLogin, signalDestinationReady]);

  // A tela de destino sinaliza quando montou; o boot so sai depois disso.
  useScreenReady(wrapperRef);

  useEffect(() => {
    const firstField = document.getElementById(isLogin ? 'login-email' : 'signup-nome');
    if (firstField) firstField.focus({ preventScroll: true });
  }, [isLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    const erros = isLogin
      ? validarLogin(loginData)
      : validarCadastro(signupData, termosAceitos);

    if (isLogin) setLoginErrors(erros);
    else setSignupErrors(erros);

    if (Object.keys(erros).length > 0) return;

    setIsLoading(true);
    try {
      const result = isLogin
        ? await loginWithApi(loginData)
        : await registerWithApi({ ...signupData, termosAceitos });
      if (result.requiresEmailConfirmation) {
        setSignupNotice('Confira seu e-mail e abra o link de confirmação para concluir o cadastro.');
      } else if (result.authorized === true) {
        const session = await sessionRequest('/me');
        requestTransition('/dashboard', {
          direction: 'forward', mode: 'welcome',
          userName: String(session.user?.userMetadata?.full_name || session.user?.userMetadata?.name || '').trim(),
          isNewUser: false,
        });
      } else startVerification({ ...result, isNewUser: result.isNewUser ?? !isLogin });
      if (isLogin) setLoginData((previous) => ({ ...previous, senha: '' }));
      else setSignupData((previous) => ({ ...previous, senha: '' }));
    } catch (error) {
      const formError = authErrorMessage(error, isLogin ? 'login' : 'signup');
      if (isLogin) setLoginErrors({ form: formError });
      else setSignupErrors({ form: formError });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    if (!verification || verificationLoading || verificationCode.length !== 6) return;
    setVerificationLoading(true);
    setVerificationError('');
    try {
      const result = await verifyCodeWithApi({
        challengeId: verification.challengeId,
        code: verificationCode,
        trustDevice,
        method: verification.method,
        ...(pendingGoogleLink ? { googleCredential: pendingGoogleLink } : {}),
      });
      if (trustDevice && !result.trustedDeviceRegistered) {
        sessionStorage.setItem('arboris-trust-notice', 'O acesso foi confirmado, mas este navegador não pôde ser marcado como confiável.');
      }
      setPendingGoogleLink(null);
      requestTransition('/dashboard', {
        direction: 'forward',
        mode: 'welcome',
        userName: typeof result.user?.nome === 'string' ? result.user.nome.trim() : '',
        isNewUser: verification.isNewUser,
      });
    } catch (error) {
      setVerificationError(authErrorMessage(error, 'otp'));
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!verification || verificationLoading || Date.now() < verification.resendAvailableAt) return;
    setVerificationLoading(true);
    setVerificationError('');
    try {
      const result = await resendCodeWithApi(verification.challengeId);
      setVerification((previous) => ({ ...previous, expiresAt: result.expiresAt, resendAvailableAt: result.resendAvailableAt }));
      setVerificationCode('');
      setResendNow(Date.now());
    } catch (error) {
      setVerificationError(authErrorMessage(error, 'resend'));
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleCancelVerification = () => {
    if (!verification) return;
    cancelChallengeWithApi().catch(() => {});
    setVerification(null);
    setVerificationCode('');
    setTrustDevice(false);
    setVerificationError('');
    setLoginErrors({});
    setSignupErrors({});
  };

  const handleGoogleCredential = useCallback(async (credential) => {
    setLoginErrors({});
    try {
      if (localStorage.getItem(GOOGLE_CONSENT_HINT_KEY) !== '1') {
        setLoginCardHeight(Math.ceil(panelRef.current?.getBoundingClientRect().height || 0));
        setPendingGoogle({ postOAuth: false });
        setGoogleTermsError('');
        return { requiresTerms: true };
      }
      const result = await loginWithGoogle(credential);
      if (result.redirecting) return { complete: true };
      startVerification(result);
      setLoginData((previous) => ({ ...previous, senha: '' }));
      return { complete: true };
    } catch (error) {
      if (error.code === 'GOOGLE_TERMS_REQUIRED') {
        setLoginCardHeight(Math.ceil(panelRef.current?.getBoundingClientRect().height || 0));
        setPendingGoogle({ postOAuth: false });
        setGoogleTermsAccepted(false);
        setGoogleTermsError('');
        setLoginErrors({});
        return { requiresTerms: true };
      }
      if (error.code === 'GOOGLE_LINK_REQUIRED') {
        setPendingGoogleLink(credential);
        setLoginErrors({ form: authErrorMessage(error, 'google') });
        return { complete: true };
      }
      throw error;
    }
  }, [startVerification]);

  const handleAcceptGoogleTerms = async () => {
    if (!pendingGoogle || isLoading || googleActionInFlight.current) return;
    if (!googleTermsAccepted) {
      setGoogleTermsError('Aceite os Termos de Uso e a Política de Privacidade para continuar.');
      return;
    }
    googleActionInFlight.current = true;
    setIsLoading(true);
    setGoogleTermsError('');
    try {
      if (pendingGoogle.postOAuth) {
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError || !data.user?.identities?.some((identity) => identity.provider === 'google')) {
          throw Object.assign(new Error('Sessão Google indisponível.'), { status: 401 });
        }
        const { error: updateError } = await supabase.auth.updateUser({ data: {
          terms_accepted: true,
          terms_version: CURRENT_TERMS_VERSION,
          privacy_version: CURRENT_PRIVACY_VERSION,
        } });
        if (updateError) throw updateError;
        try { localStorage.setItem(GOOGLE_CONSENT_HINT_KEY, '1'); } catch { /* Preferência local opcional. */ }
        const result = await beginSupabaseChallenge();
        if (result.authorized === true) {
          const session = await sessionRequest('/me');
          requestTransition('/dashboard', {
            direction: 'forward', mode: 'welcome',
            userName: String(session.user?.userMetadata?.full_name || session.user?.userMetadata?.name || '').trim(),
          });
        } else startVerification({ ...result, method: 'supabase' });
      } else {
        await loginWithGoogle({ termsAccepted: true });
      }
      setPendingGoogle(null);
      setGoogleTermsAccepted(false);
      return { complete: true };
    } catch (error) {
      setGoogleTermsError(authErrorMessage(error, 'google'));
      return { complete: false };
    } finally {
      googleActionInFlight.current = false;
      setIsLoading(false);
    }
  };

  const handleBackFromGoogleTerms = async () => {
    if (isLoading) return;
    if (pendingGoogle?.postOAuth) {
      setIsLoading(true);
      try { await supabase.auth.signOut({ scope: 'local' }); }
      catch { /* A sessão ainda não recebeu autorização adicional. */ }
      finally { setIsLoading(false); }
    }
    setPendingGoogle(null);
    setGoogleTermsAccepted(false);
    setGoogleTermsError('');
    navigate('/login', { replace: true, state: null });
  };

  const handleRecovery = async () => {
    const emailError = validarEmail(loginData.email);
    if (emailError) { setLoginErrors({ email: emailError }); return; }
    setIsLoading(true);
    setLoginErrors({});
    setRecoveryNotice('');
    try {
      await requestPasswordRecovery(loginData.email);
      setRecoveryNotice('Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha. Confira também o spam.');
    } catch (error) {
      setLoginErrors({ form: authErrorMessage(error, 'recovery') });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (toLogin) => {
    if (isLogin === toLogin || isLoading || verification) return;

    setLoginErrors({});
    setSignupErrors({});
    if (toLogin) setTermosAceitos(false);
    setPendingGoogle(null);
    setPendingGoogleLink(null);
    setGoogleTermsAccepted(false);
    requestTransition(toLogin ? '/login' : '/cadastro', { direction: toLogin ? 'reverse' : 'forward', mode: 'auth' });
  };

  const remainingResend = verification ? Math.max(0, Math.ceil((verification.resendAvailableAt - resendNow) / 1000)) : 0;
  const verificationExpired = verification ? verification.expiresAt <= resendNow : false;

  return (
    <div className="arboris-auth-wrapper" ref={wrapperRef}>
      <div
        className={`auth-scene ${isLogin ? 'login-mode' : 'signup-mode'}`}
        data-environment-ready={environmentReady}
        data-paused={motionPaused}
        data-transition={formPhase}
        data-direction={direction}
        onAnimationEnd={(event) => {
          if (!event.target.classList.contains('auth-form-content')) return;
          if (event.animationName === 'auth-form-out') onFormExit();
          if (event.animationName === 'auth-form-in') onFormEnter();
        }}
      >
        <div className="auth-panel" ref={panelRef} style={pendingGoogle && loginCardHeight ? { minHeight: loginCardHeight } : undefined}>
          <div className="auth-panel-light" aria-hidden="true" />
          <div className="auth-card-decor" aria-hidden="true"><AcabamentoCard /></div>
          <AuthIdentity />
          <div className="auth-panels-container">

          {/* CARTÃO DE LOGIN */}
          <div
            className={`auth-panel-wrapper login-panel ${isLogin ? 'active' : 'inactive'}`}
            inert={!isLogin}
          >
              {isLogin && <div className="auth-form-content">
                <header className="auth-form-heading">
                  <span className="auth-form-eyebrow">{verification ? 'SEGURANÇA DA CONTA' : pendingGoogle ? 'ACESSO COM GOOGLE' : 'SUA CONTA'}</span>
                  <h2>{verification ? 'Confirme seu acesso' : pendingGoogle ? 'Antes de continuar' : 'Bem-vindo de volta'}</h2>
                  <p>{verification ? 'Falta apenas confirmar o código enviado ao seu e-mail.' : pendingGoogle ? 'Leia e aceite os documentos atuais para continuar com Google.' : 'Entre para continuar de onde parou.'}</p>
                </header>
                {verification ? <VerificationPanel
                  verification={verification}
                  code={verificationCode}
                  onCodeChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  error={verificationError}
                  loading={verificationLoading}
                  remainingResend={remainingResend}
                  expired={verificationExpired}
                  onSubmit={handleVerifyCode}
                  onResend={handleResendCode}
                  onBack={handleCancelVerification}
                  backLabel="Voltar ao Login"
                  googleLinkPending={!!pendingGoogleLink}
                  onCancelGoogleLink={() => setPendingGoogleLink(null)}
                  trustDevice={trustDevice}
                  onTrustDeviceChange={setTrustDevice}
                /> : pendingGoogle ? <div className="auth-google-terms auth-consent-stage">
                  <div className="termos-container">
                    <label className="checkbox-label">
                      <input
                        id="google-terms-checkbox"
                        type="checkbox"
                        checked={googleTermsAccepted}
                        onChange={(event) => { setGoogleTermsAccepted(event.target.checked); setGoogleTermsError(''); }}
                        disabled={isLoading}
                        aria-label="Aceito os Termos de Uso e a Política de Privacidade"
                        aria-invalid={!!googleTermsError}
                        aria-describedby={googleTermsError ? 'google-terms-error' : undefined}
                      />
                      <span className="checkbox-custom" />
                      <span className="termos-texto">Eu li e aceito os <a href="#termos" onClick={(event) => { event.preventDefault(); setModalTermosOpen(true); }}>Termos de Uso</a> e a <a href="#privacidade" onClick={(event) => { event.preventDefault(); setModalPrivacidadeOpen(true); }}>Política de Privacidade</a>.</span>
                    </label>
                  </div>
                  <FieldError id="google-terms-error" message={googleTermsError} />
                  <button type="button" className="holo-button" onClick={handleAcceptGoogleTerms} disabled={isLoading} aria-busy={isLoading}>
                    <BotaoConteudo isLoading={isLoading} texto="Aceitar e continuar" textoLoading="Preparando acesso…" />
                  </button>
                  <button type="button" className="auth-toggle-link auth-google-cancel" onClick={handleBackFromGoogleTerms} disabled={isLoading}>
                    <ArrowLeft size={14} aria-hidden="true" /> Voltar
                  </button>
                </div> : <>
                <form onSubmit={handleSubmit} className="auth-form auth-form-entrance" noValidate>
                  <div className="input-group">
                    <label className="input-label" htmlFor="login-email">E-mail de acesso</label>
                    <div className="input-with-icon">
                      <Mail className={`input-icon ${iconeEstadoClasses(loginData.email, loginErrors.email, 'email')}`} size={18} />
                      <input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        placeholder="seu@email.com"
                        value={loginData.email}
                        onChange={handleLoginChange('email')}
                        disabled={isLoading}
                        aria-invalid={!!loginErrors.email}
                        aria-describedby={loginErrors.email ? 'login-email-erro' : undefined}
                        className={inputEstadoClasses(loginData.email, loginErrors.email, 'email')}
                      />
                    </div>
                    <FieldError id="login-email-erro" message={loginErrors.email} />
                  </div>
                  <div className="input-group">
                    <label className="input-label" htmlFor="login-senha">Senha</label>
                    <div className="input-with-icon">
                      <Lock className={`input-icon ${iconeEstadoClasses(loginData.senha, loginErrors.senha, 'senha')}`} size={18} />
                      <input
                        id="login-senha"
                        type={showLoginPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={loginData.senha}
                        onChange={handleLoginChange('senha')}
                        disabled={isLoading}
                        aria-invalid={!!loginErrors.senha}
                        aria-describedby={loginErrors.senha ? 'login-senha-erro' : undefined}
                        className={inputEstadoClasses(loginData.senha, loginErrors.senha, 'senha')}
                      />
                      <button type="button" className="password-toggle" aria-label={showLoginPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowLoginPassword(!showLoginPassword)} disabled={isLoading}>
                        {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <FieldError id="login-senha-erro" message={loginErrors.senha} />
                  </div>
                  <div className="auth-recovery-link"><button type="button" className="auth-toggle-link" onClick={handleRecovery} disabled={isLoading}>Esqueceu sua senha?</button></div>
                  {recoveryNotice && <p role="status" className="auth-verify-hint">{recoveryNotice}</p>}
                  <FieldError id="login-form-erro" message={loginErrors.form} />
                  <button type="submit" className="holo-button disabled:cursor-wait" disabled={isLoading} aria-busy={isLoading}>
                    <BotaoConteudo isLoading={isLoading} texto="Entrar" textoLoading="Entrando…" />
                  </button>
                </form>

                <div className="auth-divider" aria-hidden="true"><span>ou</span></div>
                <GoogleSignInButton onCredential={handleGoogleCredential} disabled={isLoading} />

                <div className="auth-footer">
                  <p>Ainda não tem conta? <button type="button" className="auth-toggle-link" onClick={() => handleToggle(false)}>Criar conta</button></p>
                </div>
                </>}
              </div>}

          </div>

          {/* CARTÃO DE CADASTRO */}
          <div
            className={`auth-panel-wrapper signup-panel ${!isLogin ? 'active' : 'inactive'}`}
            inert={isLogin}
          >
              {!isLogin && <div className="auth-form-content">
                <header className="auth-form-heading">
                  <span className="auth-form-eyebrow">{verification ? 'SEGURANÇA DA CONTA' : 'PRIMEIRO ACESSO'}</span>
                  <h2>{verification ? 'Confirme seu acesso' : 'Crie sua conta'}</h2>
                  <p>{verification ? 'Falta apenas confirmar o código enviado ao seu e-mail.' : 'Preencha seus dados para começar.'}</p>
                </header>
                {verification ? <VerificationPanel
                  verification={verification}
                  code={verificationCode}
                  onCodeChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  error={verificationError}
                  loading={verificationLoading}
                  remainingResend={remainingResend}
                  expired={verificationExpired}
                  onSubmit={handleVerifyCode}
                  onResend={handleResendCode}
                  onBack={handleCancelVerification}
                  backLabel="Voltar ao Cadastro"
                  trustDevice={trustDevice}
                  onTrustDeviceChange={setTrustDevice}
                /> : <>
                <form onSubmit={handleSubmit} className="auth-form auth-form-entrance" noValidate>
                  <div className="auth-signup-row">
                  <div className="input-group">
                    <label className="input-label" htmlFor="signup-nome">Nome completo</label>
                    <div className="input-with-icon">
                      <User className={`input-icon ${iconeEstadoClasses(signupData.nome, signupErrors.nome, 'nome')}`} size={18} />
                      <input
                        id="signup-nome"
                        type="text"
                        autoComplete="name"
                        placeholder="Seu nome"
                        value={signupData.nome}
                        onChange={handleSignupChange('nome')}
                        disabled={isLoading}
                        aria-invalid={!!signupErrors.nome}
                        aria-describedby={signupErrors.nome ? 'signup-nome-erro' : undefined}
                        className={inputEstadoClasses(signupData.nome, signupErrors.nome, 'nome')}
                      />
                    </div>
                    <FieldError id="signup-nome-erro" message={signupErrors.nome} />
                  </div>
                  <div className="input-group">
                    <label className="input-label" htmlFor="signup-email">E-mail de acesso</label>
                    <div className="input-with-icon">
                      <Mail className={`input-icon ${iconeEstadoClasses(signupData.email, signupErrors.email, 'email')}`} size={18} />
                      <input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        placeholder="seu@email.com"
                        value={signupData.email}
                        onChange={handleSignupChange('email')}
                        disabled={isLoading}
                        aria-invalid={!!signupErrors.email}
                        aria-describedby={signupErrors.email ? 'signup-email-erro' : undefined}
                        className={inputEstadoClasses(signupData.email, signupErrors.email, 'email')}
                      />
                    </div>
                    <FieldError id="signup-email-erro" message={signupErrors.email} />
                  </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label" htmlFor="signup-senha">Senha</label>
                    <div className="input-with-icon">
                      <Lock className={`input-icon ${iconeEstadoClasses(signupData.senha, signupErrors.senha, 'senha')}`} size={18} />
                      <input
                        id="signup-senha"
                        type={showSignupPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={signupData.senha}
                        onChange={handleSignupChange('senha')}
                        disabled={isLoading}
                        aria-invalid={!!signupErrors.senha}
                        aria-describedby={signupErrors.senha ? 'signup-senha-erro' : undefined}
                        className={inputEstadoClasses(signupData.senha, signupErrors.senha, 'senha')}
                      />
                      <button type="button" className="password-toggle" aria-label={showSignupPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowSignupPassword(!showSignupPassword)} disabled={isLoading}>
                        {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <FieldError id="signup-senha-erro" message={signupErrors.senha} />
                    <span className="auth-field-hint">Use pelo menos {SENHA_MIN} caracteres.</span>
                  </div>

                  <div className="termos-container">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={termosAceitos}
                        onChange={(e) => {
                          setTermosAceitos(e.target.checked);
                          setSignupErrors((prev) => ({ ...prev, termos: undefined }));
                        }}
                        disabled={isLoading}
                        aria-invalid={!!signupErrors.termos}
                        aria-describedby={signupErrors.termos ? 'signup-termos-erro' : undefined}
                      />
                      <span className={`checkbox-custom ${signupErrors.termos ? 'checkbox-custom-invalid' : ''}`}></span>
                      <span className="termos-texto">
                        Eu li e aceito os <a href="#termos" onClick={(e) => { e.preventDefault(); setModalTermosOpen(true); }}>Termos de Uso</a> e a <a href="#privacidade" onClick={(e) => { e.preventDefault(); setModalPrivacidadeOpen(true); }}>Política de Privacidade</a>.
                      </span>
                    </label>
                    <FieldError id="signup-termos-erro" message={signupErrors.termos} />
                  </div>

                  <FieldError id="signup-form-erro" message={signupErrors.form} />
                  {signupNotice && <p role="status" className="auth-verify-hint">{signupNotice}</p>}
                  <button type="submit" className="holo-button disabled:cursor-wait" disabled={isLoading} aria-busy={isLoading}>
                    <BotaoConteudo isLoading={isLoading} texto="Criar conta" textoLoading="Criando conta…" />
                  </button>
                </form>

                <div className="auth-footer">
                  <p>Já tem uma conta? <button type="button" className="auth-toggle-link" onClick={() => handleToggle(true)}>Entrar</button></p>
                </div>
                </>}
              </div>}

          </div>
          </div>
        </div>
        <footer className="auth-site-footer">
          <span>© {new Date().getFullYear()} Arboris.X</span>
          <SiteFooterLegal compact />
          <a href="mailto:arborisx@gmail.com" aria-label="Enviar e-mail para arborisx@gmail.com">Contato</a>
        </footer>
      </div>

      {modalTermosOpen && <Suspense fallback={null}><TermosModal isOpen onClose={() => setModalTermosOpen(false)} /></Suspense>}
      {modalPrivacidadeOpen && <Suspense fallback={null}><PrivacidadeModal isOpen onClose={() => setModalPrivacidadeOpen(false)} /></Suspense>}

    </div>
  );
}
