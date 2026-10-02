import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, LoaderCircle, TriangleAlert } from 'lucide-react';
import gsap from 'gsap';
import './AutenticacaoArboris.css';
import { TermosModal, PrivacidadeModal } from '../ModaisArboris/ModaisArboris';
import HoloBackground from '../HoloBackground/HoloBackground';
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

const carregarFolhaTransicao = () => import('./FolhaTransicao3D');
const FolhaTransicao3D = lazy(carregarFolhaTransicao);

const inputEstadoClasses = (valor, erro, campo) => {
  if (erro) {
    return 'border-orange-400/80! bg-orange-500/5! shadow-[0_0_14px_rgba(251,146,60,0.25)]! focus:border-orange-400! focus:shadow-[0_0_16px_rgba(251,146,60,0.4)]!';
  }
  if (valor.trim() && !validadoresPorCampo[campo](valor)) {
    return 'border-emerald-300/80! bg-emerald-400/5! shadow-[0_0_14px_rgba(52,211,153,0.2)]! focus:border-emerald-300! focus:shadow-[0_0_16px_rgba(52,211,153,0.4)]!';
  }
  return '';
};

const iconeEstadoClasses = (valor, erro, campo) => {
  if (erro) return 'text-orange-400!';
  if (valor.trim() && !validadoresPorCampo[campo](valor)) return 'text-emerald-300!';
  return '';
};

const atualizaErroDoCampo = (valor, campo) =>
  valor.trim() ? validadoresPorCampo[campo](valor) : undefined;

const PAUSA_TRANSICAO_SEGUNDOS = 0.74;

// O CSS legado dos inputs não usa @layer e venceria as utilities do Tailwind;
// por isso o sufixo `!` (important) nas classes de estado.

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="mt-0.5 flex items-center gap-1.5 font-mono text-[0.7rem] uppercase tracking-wider text-orange-400 [text-shadow:0_0_8px_rgba(251,146,60,0.55)]"
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

export default function AutenticacaoArboris() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [transitionStarted, setTransitionStarted] = useState(false);

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

  useEffect(() => {
    carregarFolhaTransicao();
  }, []);

  const wrapperRef = useRef();
  const panelsContainerRef = useRef();
  const sceneRef = useRef();
  const loginPanelRef = useRef();
  const signupPanelRef = useRef();
  const loaderRef = useRef();
  const transitionRef = useRef();

  const brandRef1 = useRef();
  const brandRef2 = useRef();

  // Efeito de scramble corrigido para rodar na entrada e se estabilizar limpo
  useEffect(() => {
    const runScramble = (el) => {
      if (!el) return;
      const targetText = "Arboris.X";
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-";
      let obj = { p: 0 };

      gsap.set(el, { opacity: 0, y: 14, filter: 'blur(8px)' });

      const anim = gsap.to(obj, {
        p: 1,
        duration: 1.2,
        ease: "power2.out",
        onUpdate: () => {
          const length = Math.floor(obj.p * targetText.length);
          let scrambled = "";
          for (let i = 0; i < targetText.length; i++) {
            if (i <= length) {
              scrambled += targetText[i];
            } else {
              scrambled += chars[Math.floor(Math.random() * chars.length)];
            }
          }
          el.innerText = scrambled;
        },
        onComplete: () => {
          el.innerText = targetText;
          gsap.to(el, {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.65,
            ease: 'power3.out',
            onComplete: () => {
              gsap.to(el, {
                y: -3,
                textShadow: '0 0 34px rgba(52, 211, 153, 0.95)',
                duration: 1.8,
                ease: 'sine.inOut',
                repeat: -1,
                yoyo: true
              });
            }
          });
        }
      });

      return () => {
        anim.kill();
        gsap.killTweensOf(el);
      };
    };

    const cleanup1 = runScramble(brandRef1.current);
    const cleanup2 = runScramble(brandRef2.current);

    return () => {
      if (cleanup1) cleanup1();
      if (cleanup2) cleanup2();
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return;

    const erros = isLogin
      ? validarLogin(loginData)
      : validarCadastro(signupData, termosAceitos);

    if (isLogin) setLoginErrors(erros);
    else setSignupErrors(erros);

    if (Object.keys(erros).length > 0) return;

    setIsLoading(true);
    runEntryTransition();
  };

  const runEntryTransition = () => {
    const activePanel = isLogin ? loginPanelRef.current : signupPanelRef.current;
    setTransitionStarted(true);

    requestAnimationFrame(() => {
      const transition = transitionRef.current;
      const transitionVisual = transition.querySelector('.transition-visual');
      const transitionText = transition.querySelectorAll('.transition-brand, .transition-title, .transition-subtitle');
      const tl = gsap.timeline({
        onComplete: () => {
          navigate('/dashboard');
        }
      });

      tl.set(transition, { autoAlpha: 1, opacity: 0 })
        .to(transition, {
          opacity: 1,
          duration: 0.25,
          ease: 'power2.out'
        })
        .to(activePanel, {
          opacity: 0,
          y: -8,
          duration: 0.25,
          ease: 'power2.out'
        }, 0)
        .fromTo(transitionVisual, { opacity: 0, y: 10, scale: 0.92 }, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.35,
          ease: 'power2.out'
        }, 0.08)
        .fromTo(transitionText, { opacity: 0, y: 14 }, {
          opacity: 1,
          y: 0,
          duration: 0.3,
          stagger: 0.08,
          ease: 'power2.out'
        }, 0.3)
        .to({}, { duration: PAUSA_TRANSICAO_SEGUNDOS });
    });
  };

  const handleToggle = (toLogin) => {
    if (isLogin !== toLogin) {
      setIsLogin(toLogin);
      setLoginErrors({});
      setSignupErrors({});
      if (toLogin) setTermosAceitos(false);
    }
  };

  useEffect(() => {
    const wrapperEl = wrapperRef.current;
    if (!wrapperEl) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // 0.75s de boot + 1.25s de portal = 2s até a interface abrir.
      tl.to({}, { duration: 0.75 })
      .to(loaderRef.current, {
        clipPath: 'circle(0% at 50% 50%)',
        duration: 2.25,
        ease: 'power4.inOut',
        onComplete: () => setInitialLoading(false)
      })
      .fromTo(panelsContainerRef.current,
        { opacity: 0, scale: 0.4, y: 150, filter: "blur(12px)" },
        {
          opacity: 1, scale: 1, y: 0, filter: "blur(0px)",
          duration: 1.25, ease: 'back.out(1.4)'
        },
        "<"
      );

    }, wrapperEl);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const animateLayout = () => {
      const isMobile = window.innerWidth <= 768;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const direction = isLogin ? -1 : 1;

      const activePanel = isLogin ? loginPanelRef.current : signupPanelRef.current;
      const inactivePanel = isLogin ? signupPanelRef.current : loginPanelRef.current;

      gsap.killTweensOf([
        activePanel,
        inactivePanel,
        activePanel.querySelector('.auth-panel'),
        inactivePanel.querySelector('.auth-panel'),
        activePanel.querySelector('.panel-sweep'),
        inactivePanel.querySelector('.panel-sweep')
      ]);

      const activeCard = activePanel.querySelector('.auth-panel');
      const activeSweep = activePanel.querySelector('.panel-sweep');
      const activeContent = activePanel.querySelectorAll('.auth-sidebar-holo, .auth-form-content');

      if (prefersReducedMotion) {
        gsap.set(activePanel, { x: 0, y: 0, z: 0, scale: 1, rotationY: 0, rotationX: 0, opacity: 1, filter: 'none', zIndex: 10 });
        gsap.set(inactivePanel, { x: 0, y: 0, z: 0, scale: 1, rotationY: 0, rotationX: 0, opacity: 0, filter: 'none', zIndex: 1 });
        gsap.set(activeContent, { opacity: 1, y: 0 });
        gsap.set(activeSweep, { opacity: 0, xPercent: 0, scaleX: 1 });
        return;
      }

      gsap.set(activePanel, {
        x: isMobile ? 0 : direction * 24,
        y: 12,
        z: 0,
        scale: 0.985,
        rotationY: isMobile ? 0 : direction * -2,
        rotationX: 1,
        opacity: 0,
        filter: 'blur(4px)',
        zIndex: 10
      });

      gsap.set(inactivePanel, { zIndex: 1 });
      gsap.set(activeContent, { opacity: 0, y: 14 });
      gsap.set(activeSweep, { opacity: 0, xPercent: -110, scaleX: 0.25 });

      const tl = gsap.timeline({ defaults: { overwrite: 'auto' } });

      tl.to(activePanel, {
        x: 0,
        y: 0,
        z: 0,
        scale: 1,
        rotationY: 0,
        rotationX: 0,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 0.68,
        ease: 'power3.out',
        zIndex: 10
      }, 0);

      tl.to(inactivePanel, {
        x: isMobile ? 0 : direction * -18,
        y: -6,
        z: -20,
        scale: 0.99,
        rotationY: isMobile ? 0 : direction * 1.5,
        rotationX: 0,
        opacity: 0,
        filter: 'blur(2px)',
        duration: 0.48,
        ease: 'power2.inOut',
        zIndex: 1
      }, 0);

      tl.to(activeCard, {
        boxShadow: '0 28px 80px rgba(0, 0, 0, 0.72), 0 0 62px rgba(52, 211, 153, 0.24), inset 0 1px rgba(255, 255, 255, 0.12)',
        duration: 0.42,
        ease: 'power2.out'
      }, 0.12)
      .to(activeContent, {
        opacity: 1,
        y: 0,
        duration: 0.44,
        stagger: 0.075,
        ease: 'power3.out'
      }, 0.12)
      .to(activeSweep, {
        opacity: 0.9,
        xPercent: 125,
        scaleX: 1,
        duration: 0.62,
        ease: 'power2.inOut'
      }, 0.08)
      .to(activeSweep, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.out'
      }, 0.58);
    };

    animateLayout();

    window.addEventListener('resize', animateLayout);
    return () => window.removeEventListener('resize', animateLayout);

  }, [isLogin]);

  return (
    <div className="arboris-auth-wrapper" ref={wrapperRef}>

      {initialLoading && (
        <div className="initial-loader-wrapper" ref={loaderRef}>
          <div className="loader-shell" role="status" aria-live="polite">
            <div className="loader-topline">
              <h2><span>ARBORIS.X</span></h2>
            </div>
            <div className="loader-visual">
              <div className="loader-signal-line"></div>
              <div className="cyber-spinner-3d">
                <div className="ring"></div>
                <div className="ring"></div>
                <div className="ring"></div>
                <div className="core"></div>
              </div>
              </div>

            <div className="loader-copy">
              <p className="loader-text">INICIALIZANDO SISTEMA<span className="loader-dots">...</span></p>
              <div className="loader-progress" aria-hidden="true">
                <span className="loader-progress-fill"></span>
              </div>
            </div>
          </div>
        </div>
      )}

      <HoloBackground />

      <div className="system-transition" ref={transitionRef} role="status" aria-live="polite">
        <div className="transition-content">
          <div className="transition-visual" aria-hidden="true">
            {transitionStarted && (
              <Suspense fallback={null}>
                <FolhaTransicao3D />
              </Suspense>
            )}
          </div>
          <p className="transition-brand">Arboris.X</p>
          <h2 className="transition-title">Seja bem-vindo!</h2>
          <p className="transition-subtitle">Preparando o ambiente sustentável...</p>
        </div>
      </div>

      <div className={`auth-scene ${isLogin ? 'login-mode' : 'signup-mode'}`} ref={sceneRef}>
        <div className="auth-panels-container" ref={panelsContainerRef}>

          {/* CARTÃO DE LOGIN */}
          <div
            ref={loginPanelRef}
            className={`auth-panel-wrapper login-panel ${isLogin ? 'active' : 'inactive'}`}
            onClick={() => !isLogin && handleToggle(true)}
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
                  <button type="submit" className="holo-button disabled:cursor-wait" disabled={isLoading} aria-busy={isLoading}>
                    <BotaoConteudo isLoading={isLoading} texto="Acessar Sistema" textoLoading="Conectando..." />
                  </button>
                </form>

                <div className="auth-footer">
                  <h5><p>Não tem uma conta? <button type="button" className="auth-toggle-link" onClick={() => handleToggle(false)}>Solicitar Acesso</button></p></h5>
                </div>
              </div>

            </div>
          </div>

          {/* CARTÃO DE CADASTRO */}
          <div
            ref={signupPanelRef}
            className={`auth-panel-wrapper signup-panel ${!isLogin ? 'active' : 'inactive'}`}
            onClick={() => isLogin && handleToggle(false)}
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
                      <span className={`checkbox-custom ${signupErrors.termos ? 'border-orange-400! shadow-[0_0_10px_rgba(251,146,60,0.5)]!' : ''}`}></span>
                      <span className="termos-texto">
                        Eu li e aceito os <a href="#termos" onClick={(e) => { e.preventDefault(); setModalTermosOpen(true); }}>Termos de Uso</a> e a <a href="#privacidade" onClick={(e) => { e.preventDefault(); setModalPrivacidadeOpen(true); }}>Política de Privacidade</a>.
                      </span>
                    </label>
                    <FieldError id="signup-termos-erro" message={signupErrors.termos} />
                  </div>

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
