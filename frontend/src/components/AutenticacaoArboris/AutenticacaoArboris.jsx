import { useState, useEffect, useRef } from 'react';
import { useAuthTransition } from './useAuthTransition';
import { useScreenReady } from '../useBootGate';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, LoaderCircle, TriangleAlert } from 'lucide-react';
import gsap from 'gsap';
import './AutenticacaoArboris.css';
import { TermosModal, PrivacidadeModal } from '../ModaisArboris/ModaisArboris';
import HoloBackground from '../HoloBackground/HoloBackground';
import { persistSession } from '../../lib/auth';
import { loginWithApi, registerWithApi } from '../../lib/api';
import {
  validarCadastro,
  validarEmail,
  validarLogin,
  validarNome,
  validarSenha,
} from '../../lib/validacao';

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

const folhas = [
  { x: '-48px', y: '13%', meio: '48vw', fim: 'calc(100vw + 96px)', meioY: '-7vh', fimY: '12vh', largura: '27px', opacidade: 0.56, duracao: '25s', atraso: '0s', escala: 0.92 },
  { x: 'calc(100vw + 48px)', y: '29%', meio: '-48vw', fim: 'calc(-100vw - 96px)', meioY: '5vh', fimY: '-10vh', largura: '22px', opacidade: 0.52, duracao: '28s', atraso: '3s', escala: 0.78 },
  { x: '-48px', y: '48%', meio: '48vw', fim: 'calc(100vw + 96px)', meioY: '4vh', fimY: '-9vh', largura: '32px', opacidade: 0.6, duracao: '30s', atraso: '7s', escala: 1.08 },
  { x: 'calc(100vw + 48px)', y: '68%', meio: '-48vw', fim: 'calc(-100vw - 96px)', meioY: '-6vh', fimY: '11vh', largura: '25px', opacidade: 0.54, duracao: '26s', atraso: '11s', escala: 0.88 },
  { x: '-48px', y: '86%', meio: '48vw', fim: 'calc(100vw + 96px)', meioY: '-5vh', fimY: '8vh', largura: '20px', opacidade: 0.5, duracao: '29s', atraso: '15s', escala: 0.72 },
  { x: 'calc(100vw + 48px)', y: '8%', meio: '-48vw', fim: 'calc(-100vw - 96px)', meioY: '6vh', fimY: '-12vh', largura: '29px', opacidade: 0.58, duracao: '31s', atraso: '19s', escala: 1 },
];

const renderFolha = (folha, index) => (
  <span
    className="auth-leaves__path"
    key={index}
    style={{
      '--leaf-x': folha.x,
      '--leaf-y': folha.y,
      '--leaf-mid': folha.meio,
      '--leaf-end': folha.fim,
      '--leaf-mid-y': folha.meioY,
      '--leaf-end-y': folha.fimY,
      '--leaf-width': folha.largura,
      '--leaf-opacity': folha.opacidade,
      '--leaf-duration': folha.duracao,
      '--leaf-delay': folha.atraso,
      '--leaf-scale': folha.escala,
    }}
  >
    <svg className="auth-leaves__shape" viewBox="0 0 48 64" focusable="false">
      <path className="auth-leaves__blade" d="M24 2C10 10 3 23 5 37c2 13 12 22 19 25 7-3 17-12 19-25C45 23 38 10 24 2Z" />
      <path className="auth-leaves__vein" d="M24 60C24 43 23 26 24 5M24 42 13 29m11 5 11-13m-11 30L15 40m9 6 13-9" />
    </svg>
  </span>
);

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
      <h5><span>{texto}</span></h5>
      <ArrowRight className="button-icon" size={18} />
    </>
  );
}

export default function AutenticacaoArboris({ mode = 'login' }) {
  const { requestTransition, signalDestinationReady } = useAuthTransition();
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
  const panelsContainerRef = useRef();
  const sceneRef = useRef();
  const loginPanelRef = useRef();
  const signupPanelRef = useRef();
  const brandRef1 = useRef();
  const brandRef2 = useRef();

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

  useEffect(() => {
    const brands = [brandRef1.current, brandRef2.current].filter(Boolean);
    gsap.set(brands, { opacity: 0, y: 5 });
    const animation = gsap.to(brands, {
      opacity: 1,
      y: 0,
      duration: 0.24,
      stagger: 0.012,
      ease: 'power2.out',
    });
    return () => animation.kill();
  }, []);

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

      persistSession({ access_token: result.token });
      if (!isLogin) localStorage.setItem('termsAccepted', 'true');
      requestTransition('/dashboard', {
        direction: 'forward',
        mode: 'welcome',
        userName: typeof result.user?.nome === 'string' ? result.user.nome.trim() : '',
        isNewUser: !isLogin,
      });
    } catch (error) {
      const serverErrors = error.details || {};
      const formError = error.message || 'Não foi possível concluir a solicitação.';
      if (isLogin) setLoginErrors({ ...serverErrors, form: formError });
      else setSignupErrors({ ...serverErrors, form: formError });
      setIsLoading(false);
    }
  };

  const handleToggle = (toLogin) => {
    if (isLogin === toLogin || isLoading) return;

    setLoginErrors({});
    setSignupErrors({});
    if (toLogin) setTermosAceitos(false);
    requestTransition(toLogin ? '/login' : '/cadastro', { direction: toLogin ? 'reverse' : 'forward', mode: 'auth' });
  };

  return (
    <div className="arboris-auth-wrapper" ref={wrapperRef}>

      <HoloBackground />

      <div className="auth-leaves" aria-hidden="true">
        {folhas.map(renderFolha)}
      </div>

      <div className={`auth-scene ${isLogin ? 'login-mode' : 'signup-mode'}`} ref={sceneRef}>
        <div className="auth-panels-container" ref={panelsContainerRef}>

          {/* CARTÃO DE LOGIN */}
          <div
            ref={loginPanelRef}
            className={`auth-panel-wrapper login-panel ${isLogin ? 'active' : 'inactive'}`}
          >
            <div className="auth-panel">
              <div className="scanline"></div>
              <div className="panel-sweep"></div>

              <div className="auth-sidebar-holo">
                <img className="auth-brand-logo" src="/arboris-tree.png" alt="" aria-hidden="true" />
                <h1 className="auth-brand" ref={brandRef1}>Arboris.X</h1>
              </div>

              <div className="auth-form-content">
                <form onSubmit={handleSubmit} className="auth-form auth-form-entrance" noValidate>
                  <div className="input-group">
                    <label className="input-label" htmlFor="login-email">E-mail de Acesso</label>
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
                      <button type="button" className="password-toggle" onClick={() => setShowLoginPassword(!showLoginPassword)}>
                        {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <FieldError id="login-senha-erro" message={loginErrors.senha} />
                  </div>
                  <FieldError id="login-form-erro" message={loginErrors.form} />
                  <button type="submit" className="holo-button disabled:cursor-wait" disabled={isLoading} aria-busy={isLoading}>
                    <BotaoConteudo isLoading={isLoading} texto="Acessar Sistema" textoLoading="Conectando..." />
                  </button>
                </form>

                <div className="auth-footer">
                  <h5><p>Não tem uma conta? <button type="button" className="auth-toggle-link" onClick={() => handleToggle(false)}>Criar cadastro</button></p></h5>
                </div>
              </div>

            </div>
          </div>

          {/* CARTÃO DE CADASTRO */}
          <div
            ref={signupPanelRef}
            className={`auth-panel-wrapper signup-panel ${!isLogin ? 'active' : 'inactive'}`}
          >
            <div className="auth-panel">
              <div className="scanline"></div>
              <div className="panel-sweep"></div>

              <div className="auth-sidebar-holo">
                <img className="auth-brand-logo" src="/arboris-tree.png" alt="" aria-hidden="true" />
                <h1 className="auth-brand" ref={brandRef2}>Arboris.X</h1>              </div>

              <div className="auth-form-content">
                <form onSubmit={handleSubmit} className="auth-form auth-form-entrance" noValidate>
                  <div className="input-group">
                    <label className="input-label" htmlFor="signup-nome">Nome Completo</label>
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
                    <label className="input-label" htmlFor="signup-email">E-mail de Acesso</label>
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
                      <button type="button" className="password-toggle" onClick={() => setShowSignupPassword(!showSignupPassword)}>
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
                    <BotaoConteudo isLoading={isLoading} texto="Registrar Identidade" textoLoading="Registrando..." />
                  </button>
                </form>

                <div className="auth-footer">
                  <p>Já possui acesso? <button type="button" className="auth-toggle-link" onClick={() => handleToggle(true)}>Voltar ao Login</button></p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <TermosModal isOpen={modalTermosOpen} onClose={() => setModalTermosOpen(false)} />
      <PrivacidadeModal isOpen={modalPrivacidadeOpen} onClose={() => setModalPrivacidadeOpen(false)} />

    </div>
  );
}
