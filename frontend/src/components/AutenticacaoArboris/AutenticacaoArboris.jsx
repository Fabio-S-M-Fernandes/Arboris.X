import { useState, useEffect, useLayoutEffect, useRef, useId, useCallback } from 'react';
import { useAuthTransition } from './AuthTransitionController';
import { useScreenReady } from '../BootGate';
import { Mail, Lock, User, ArrowRight, ArrowLeft, Eye, EyeOff, LoaderCircle, TriangleAlert, Leaf, TrendingUp, Globe } from 'lucide-react';
import './AutenticacaoArboris.css';
import { TermosModal, PrivacidadeModal } from '../ModaisArboris/ModaisArboris';
import { persistSession } from '../../lib/auth';
import {
  cancelChallengeWithApi, loginWithApi, loginWithGoogle, registerWithApi,
  resendCodeWithApi, verifyCodeWithApi,
} from '../../lib/api';
import {
  validarCadastro,
  validarEmail,
  validarLogin,
  validarNome,
  validarSenha,
} from '../../lib/validacao';
import GoogleSignInButton from './GoogleSignInButton';

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
      <span id="auth-code-hint" className="auth-verify-hint">O código expira em 5 minutos. Você pode colar os seis dígitos.</span>
      <FieldError id="auth-code-error" message={error} />
      <button type="submit" className="holo-button auth-verify-submit" disabled={loading || expired || code.length !== 6} aria-busy={loading}>
        <BotaoConteudo isLoading={loading} textoLoading="Confirmando…" texto="Confirmar acesso" />
      </button>
      <div className="auth-verify-actions">
        <button type="button" className="auth-toggle-link" onClick={onResend} disabled={loading || expired || remainingResend > 0}>
          Reenviar código{remainingResend > 0 ? ` (${remainingResend}s)` : ''}
        </button>
        <button type="button" className="auth-toggle-link" onClick={onBack} disabled={loading}>
          <ArrowLeft size={14} aria-hidden="true" /> {backLabel}
        </button>
      </div>
      {expired && <p className="auth-verify-expired" role="status">Código expirado. Volte para iniciar uma nova tentativa.</p>}
    </form>
  );
}

// A mesma folhagem nos dois painéis; IDs únicos preservam os gradientes SVG.
function FolhagemCard({ position }) {
  const id = useId();
  return (
    <svg className={`auth-foliage auth-foliage--${position}`} viewBox="0 0 220 160" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-leaf`} x1="20" y1="10" x2="72" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#36bc79" /><stop offset=".45" stopColor="#0b6945" /><stop offset="1" stopColor="#02271c" />
        </linearGradient>
        <linearGradient id={`${id}-edge`} x1="10" y1="5" x2="70" y2="96" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6bf7ad" stopOpacity=".8" /><stop offset="1" stopColor="#009e62" stopOpacity=".15" />
        </linearGradient>
        <g id={`${id}-blade`}>
          <path d="M48 100C17 92 5 69 12 45C18 25 42 17 54 2C54 24 77 30 79 53C82 76 65 91 48 100Z" fill={`url(#${id}-leaf)`} stroke={`url(#${id}-edge)`} strokeWidth=".8" />
          <path d="M48 100C45 70 48 39 54 2" stroke="#8bd7a0" strokeOpacity=".6" strokeWidth=".9" />
          <path className="auth-foliage__veins" d="M48 90Q31 78 17 65M47 79Q29 65 13 52M48 66Q32 52 19 40M49 53Q35 42 28 30M51 39L39 21M48 88Q65 74 75 63M48 75Q66 60 77 49M48 62Q64 49 73 38M50 48L63 29" stroke="#8cd69c" strokeOpacity=".3" strokeWidth=".7" />
          <path d="M49 98C60 77 62 51 54 8C75 36 86 63 64 85Z" fill="#001d15" opacity=".25" />
        </g>
      </defs>
      <path d="M183 157Q164 128 142 92M174 142L159 112" stroke="#32845b" strokeWidth="1.5" />
      <use href={`#${id}-blade`} transform="translate(142 92) rotate(-55) scale(.9 .85) translate(-48 -100)" />
      <use href={`#${id}-blade`} transform="translate(159 112) rotate(22) scale(.7 .95) translate(-48 -100)" />
      <use href={`#${id}-blade`} transform="translate(173 137) rotate(-65) scale(.65 .65) translate(-48 -100)" />
      <use href={`#${id}-blade`} transform="translate(174 142) rotate(30) scale(.48 .7) translate(-48 -100)" />
    </svg>
  );
}

function AcabamentoCard() {
  return (
    <>
      <svg className="auth-edge" aria-hidden="true" focusable="false"><rect x="1" y="1" rx="23" pathLength="100" /></svg>
      <FolhagemCard position="top" />
      <FolhagemCard position="bottom" />
    </>
  );
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

export default function AutenticacaoArboris({ mode = 'login' }) {
  const {
    requestTransition, signalDestinationReady, environmentReady,
    formPhase, direction, onFormExit, onFormEnter,
  } = useAuthTransition();
  const isLogin = mode !== 'cadastro';
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
  const [verificationError, setVerificationError] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [resendNow, setResendNow] = useState(0);
  const [pendingGoogle, setPendingGoogle] = useState(null);
  const [pendingGoogleLink, setPendingGoogleLink] = useState(null);
  const [googleTermsAccepted, setGoogleTermsAccepted] = useState(false);
  const [googleRefreshKey, setGoogleRefreshKey] = useState(0);
  const [googleTermsEmail, setGoogleTermsEmail] = useState('');

  // Atualiza o campo e limpa o erro dele assim que o usuário volta a digitar.
  const handleLoginChange = (campo) => (e) => {
    const valor = e.target.value;
    setLoginData((prev) => ({ ...prev, [campo]: valor }));
    setLoginErrors((prev) => ({ ...prev, [campo]: atualizaErroDoCampo(valor, campo) }));
  };

  const handleSignupChange = (campo) => (e) => {
    const valor = e.target.value;
    setSignupData((prev) => ({ ...prev, [campo]: valor }));
    setSignupErrors((prev) => ({ ...prev, [campo]: atualizaErroDoCampo(valor, campo) }));
  };

  const wrapperRef = useRef();
  const loginPanelRef = useRef();
  const signupPanelRef = useRef();
  const panelHeightRef = useRef(0);

  const startVerification = useCallback((result) => {
    const panel = (isLogin ? loginPanelRef : signupPanelRef).current?.querySelector('.auth-panel');
    panelHeightRef.current = panel?.offsetHeight || 0;
    setVerification({
      challengeId: result.challengeId,
      maskedEmail: result.maskedEmail,
      expiresAt: result.expiresAt,
      resendAvailableAt: result.resendAvailableAt,
      method: result.method,
      isNewUser: result.isNewUser ?? !isLogin,
    });
    setVerificationCode('');
    setVerificationError('');
    setResendNow(Date.now());
  }, [isLogin]);

  // Mede o destino uma vez; só o conteúdo interno é recortado enquanto a moldura cresce.
  useLayoutEffect(() => {
    const panel = (isLogin ? loginPanelRef : signupPanelRef).current?.querySelector('.auth-panel');
    if (!panel) return undefined;
    const height = panel.offsetHeight;
    const previousHeight = panelHeightRef.current;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animation;

    if (previousHeight && previousHeight !== height && !preference.matches) {
      const motionStyles = getComputedStyle(document.documentElement);
      const duration = Number.parseFloat(motionStyles.getPropertyValue('--motion-height')) || 400;
      const easing = motionStyles.getPropertyValue('--ease-standard').trim() || 'cubic-bezier(.22, 1, .36, 1)';
      animation = panel.animate(
        [{ height: `${previousHeight}px` }, { height: `${height}px` }],
        { duration, easing },
      );
    }
    panelHeightRef.current = height;
    const cancelMotion = () => { if (preference.matches) animation?.cancel(); };
    if (animation) preference.addEventListener('change', cancelMotion);
    return () => {
      preference.removeEventListener('change', cancelMotion);
      animation?.cancel();
    };
  }, [isLogin, verification?.challengeId]);

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
  }, [isLogin, mode, signalDestinationReady]);

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
      startVerification({ ...result, isNewUser: !isLogin });
      if (isLogin) setLoginData((previous) => ({ ...previous, senha: '' }));
      else setSignupData((previous) => ({ ...previous, senha: '' }));
    } catch (error) {
      const serverErrors = error.details || {};
      const formError = error.message || 'Não foi possível concluir a solicitação.';
      if (isLogin) setLoginErrors({ ...serverErrors, form: formError });
      else setSignupErrors({ ...serverErrors, form: formError });
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
        ...(pendingGoogleLink ? { googleCredential: pendingGoogleLink } : {}),
      });
      setPendingGoogleLink(null);
      persistSession({ access_token: result.token });
      if (verification.isNewUser) localStorage.setItem('termsAccepted', 'true');
      requestTransition('/dashboard', {
        direction: 'forward',
        mode: 'welcome',
        userName: typeof result.user?.nome === 'string' ? result.user.nome.trim() : '',
        isNewUser: verification.isNewUser,
      });
    } catch (error) {
      setVerificationError(error.message || 'Não foi possível confirmar o código.');
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
      setVerificationError(error.message || 'Não foi possível reenviar o código.');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleCancelVerification = () => {
    if (!verification) return;
    cancelChallengeWithApi(verification.challengeId).catch(() => {});
    panelHeightRef.current = (isLogin ? loginPanelRef : signupPanelRef).current?.querySelector('.auth-panel')?.offsetHeight || 0;
    setVerification(null);
    setVerificationCode('');
    setVerificationError('');
    setLoginErrors({});
    setSignupErrors({});
    if (isLogin) setGoogleRefreshKey((previous) => previous + 1);
  };

  const handleGoogleCredential = useCallback(async (credential) => {
    setLoginErrors({});
    try {
      const result = await loginWithGoogle(credential);
      startVerification(result);
      setLoginData((previous) => ({ ...previous, senha: '' }));
      return { complete: true };
    } catch (error) {
      if (error.code === 'GOOGLE_TERMS_REQUIRED') {
        setPendingGoogle(credential);
        setGoogleTermsAccepted(false);
        setGoogleTermsEmail(error.details?.maskedEmail || '');
        setLoginErrors({});
        return { requiresTerms: true };
      }
      if (error.code === 'GOOGLE_LINK_REQUIRED') {
        setPendingGoogleLink(credential);
        setLoginErrors({ form: 'Esta conta já existe. Entre com e-mail e senha; o Google será vinculado após a confirmação por e-mail.' });
        return { complete: true };
      }
      throw error;
    }
  }, [startVerification]);

  const handleAcceptGoogleTerms = async () => {
    if (!pendingGoogle || isLoading) return;
    if (!googleTermsAccepted) {
      setLoginErrors({ form: 'Aceite os Termos de Uso e a Política de Privacidade para continuar.' });
      return;
    }
    setIsLoading(true);
    setLoginErrors({});
    try {
      const result = await loginWithGoogle({ ...pendingGoogle, termsAccepted: true });
      startVerification(result);
      setPendingGoogle(null);
      setGoogleTermsAccepted(false);
      setGoogleTermsEmail('');
      return { complete: true };
    } catch (error) {
      setLoginErrors({ form: error.message || 'Não foi possível criar sua conta Google.' });
      setPendingGoogle(null);
      setGoogleTermsAccepted(false);
      setGoogleTermsEmail('');
      setGoogleRefreshKey((previous) => previous + 1);
      return { complete: false };
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (toLogin) => {
    if (isLogin === toLogin || isLoading || verification) return;

    panelHeightRef.current = (isLogin ? loginPanelRef : signupPanelRef).current?.querySelector('.auth-panel')?.offsetHeight || 0;
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
        data-transition={formPhase}
        data-direction={direction}
        onAnimationEnd={(event) => {
          if (!event.target.classList.contains('auth-form-content')) return;
          if (event.animationName === 'auth-form-out') onFormExit();
          if (event.animationName === 'auth-form-in') onFormEnter();
        }}
      >
        <aside className="auth-editorial" aria-label="Sobre o Arboris.X">
          <div className="auth-editorial__particles" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="auth-editorial__identity">
            <div className="auth-editorial__symbol auth-entry">
              <img src="/arboris-tree.webp" alt="" aria-hidden="true" />
            </div>
            <div className="auth-editorial__wordmark">
              <p className="auth-entry">ARBORIS<span className="auth-editorial__x">.X</span></p>
              <span className="auth-editorial__subtitle auth-entry">INTELIGÊNCIA AMBIENTAL</span>
            </div>
          </div>
          <div className="auth-editorial__copy">
            <h1><span className="auth-editorial__line auth-entry">Tecnologia que</span> <span className="auth-editorial__line auth-editorial__line--organic auth-entry"><em>cultiva</em> o futuro.</span></h1>
            <p className="auth-entry">Monitoramento preciso e dados em tempo real para transformar a gestão dos nossos ecossistemas.</p>
            <ul className="auth-editorial__pillars" aria-label="Pilares conceituais">
              <li className="auth-entry"><Leaf size={15} aria-hidden="true" /><span>Monitoramento Contínuo</span></li>
              <li className="auth-entry"><TrendingUp size={15} aria-hidden="true" /><span>Dados Preditivos</span></li>
              <li className="auth-entry"><Globe size={15} aria-hidden="true" /><span>Impacto Sustentável</span></li>
            </ul>
          </div>
        </aside>
        <div className="auth-panels-container">
          <div className="auth-card-decor" aria-hidden="true"><AcabamentoCard /></div>

          {/* CARTÃO DE LOGIN */}
          <div
            ref={loginPanelRef}
            className={`auth-panel-wrapper login-panel ${isLogin ? 'active' : 'inactive'}`}
            inert={!isLogin}
          >
            <div className="auth-panel">
              <div className="auth-panel-light" aria-hidden="true" />

              {isLogin && <div className="auth-form-content">
                <header className="auth-form-heading">
                  <h2>{verification ? 'Confirme seu acesso' : 'Bem-vindo ao Arboris.X'}</h2>
                  <p>{verification ? 'Enviamos um código de 6 dígitos para seu e-mail.' : 'Entre para continuar sua experiência ambiental.'}</p>
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
                /> : <>
                <form onSubmit={handleSubmit} className="auth-form auth-form-entrance" noValidate>
                  <div className="input-group">
                    <label className="input-label" htmlFor="login-email">E-mail de acesso</label>
                    <div className="input-with-icon">
                      <Mail className={`input-icon ${iconeEstadoClasses(loginData.email, loginErrors.email, 'email')}`} size={18} />
                      <input
                        id="login-email"
                        type="email"
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
                        placeholder="••••••••"
                        value={loginData.senha}
                        onChange={handleLoginChange('senha')}
                        disabled={isLoading}
                        aria-invalid={!!loginErrors.senha}
                        aria-describedby={loginErrors.senha ? 'login-senha-erro' : undefined}
                        className={inputEstadoClasses(loginData.senha, loginErrors.senha, 'senha')}
                      />
                      <button type="button" className="password-toggle" aria-label={showLoginPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowLoginPassword(!showLoginPassword)}>
                        {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <FieldError id="login-senha-erro" message={loginErrors.senha} />
                  </div>
                  <FieldError id="login-form-erro" message={loginErrors.form} />
                  <button type="submit" className="holo-button disabled:cursor-wait" disabled={isLoading} aria-busy={isLoading}>
                    <BotaoConteudo isLoading={isLoading} texto="Acessar sistema" textoLoading="Conectando..." />
                  </button>
                </form>

                <div className="auth-divider" aria-hidden="true"><span>ou</span></div>
                {pendingGoogle ? <div className="auth-google-terms">
                  <p className="auth-google-terms__identity">Criar conta para {googleTermsEmail}</p>
                  <div className="termos-container">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={googleTermsAccepted}
                        onChange={(event) => setGoogleTermsAccepted(event.target.checked)}
                        disabled={isLoading}
                        aria-label="Aceito os Termos de Uso e a Política de Privacidade"
                      />
                      <span className="checkbox-custom" />
                      <span className="termos-texto">Eu li e aceito os <a href="#termos" onClick={(event) => { event.preventDefault(); setModalTermosOpen(true); }}>Termos de Uso</a> e a <a href="#privacidade" onClick={(event) => { event.preventDefault(); setModalPrivacidadeOpen(true); }}>Política de Privacidade</a>.</span>
                    </label>
                  </div>
                  <button type="button" className="holo-button" onClick={handleAcceptGoogleTerms} disabled={isLoading} aria-busy={isLoading}>
                    <BotaoConteudo isLoading={isLoading} texto="Aceitar e continuar" textoLoading="Preparando acesso…" />
                  </button>
                  <button type="button" className="auth-toggle-link auth-google-cancel" onClick={() => {
                    setPendingGoogle(null);
                    setGoogleTermsAccepted(false);
                    setGoogleTermsEmail('');
                    setGoogleRefreshKey((previous) => previous + 1);
                  }}>Cancelar</button>
                </div> : <GoogleSignInButton onCredential={handleGoogleCredential} refreshKey={googleRefreshKey} disabled={isLoading} />}

                <div className="auth-footer">
                  <p>Não tem uma conta? <button type="button" className="auth-toggle-link" onClick={() => handleToggle(false)}>Criar cadastro</button></p>
                </div>
                </>}
              </div>}

            </div>
          </div>

          {/* CARTÃO DE CADASTRO */}
          <div
            ref={signupPanelRef}
            className={`auth-panel-wrapper signup-panel ${!isLogin ? 'active' : 'inactive'}`}
            inert={isLogin}
          >
            <div className="auth-panel">
              <div className="auth-panel-light" aria-hidden="true" />

              {!isLogin && <div className="auth-form-content">
                <header className="auth-form-heading">
                  <h2>{verification ? 'Confirme seu acesso' : 'Faça parte do Arboris.X'}</h2>
                  <p>{verification ? 'Enviamos um código de 6 dígitos para seu e-mail.' : 'Comece sua jornada por um futuro mais sustentável.'}</p>
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
                /> : <>
                <form onSubmit={handleSubmit} className="auth-form auth-form-entrance" noValidate>
                  <div className="input-group">
                    <label className="input-label" htmlFor="signup-nome">Nome completo</label>
                    <div className="input-with-icon">
                      <User className={`input-icon ${iconeEstadoClasses(signupData.nome, signupErrors.nome, 'nome')}`} size={18} />
                      <input
                        id="signup-nome"
                        type="text"
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
                  <div className="input-group">
                    <label className="input-label" htmlFor="signup-senha">Senha</label>
                    <div className="input-with-icon">
                      <Lock className={`input-icon ${iconeEstadoClasses(signupData.senha, signupErrors.senha, 'senha')}`} size={18} />
                      <input
                        id="signup-senha"
                        type={showSignupPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={signupData.senha}
                        onChange={handleSignupChange('senha')}
                        disabled={isLoading}
                        aria-invalid={!!signupErrors.senha}
                        aria-describedby={signupErrors.senha ? 'signup-senha-erro' : undefined}
                        className={inputEstadoClasses(signupData.senha, signupErrors.senha, 'senha')}
                      />
                      <button type="button" className="password-toggle" aria-label={showSignupPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowSignupPassword(!showSignupPassword)}>
                        {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <FieldError id="signup-senha-erro" message={signupErrors.senha} />
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
                  <button type="submit" className="holo-button disabled:cursor-wait" disabled={isLoading} aria-busy={isLoading}>
                    <BotaoConteudo isLoading={isLoading} texto="Criar minha conta" textoLoading="Registrando..." />
                  </button>
                </form>

                <div className="auth-footer">
                  <p>Já possui acesso? <button type="button" className="auth-toggle-link" onClick={() => handleToggle(true)}>Voltar ao Login</button></p>
                </div>
                </>}
              </div>}

            </div>
          </div>
        </div>
      </div>

      <TermosModal isOpen={modalTermosOpen} onClose={() => setModalTermosOpen(false)} />
      <PrivacidadeModal isOpen={modalPrivacidadeOpen} onClose={() => setModalPrivacidadeOpen(false)} />

    </div>
  );
}
