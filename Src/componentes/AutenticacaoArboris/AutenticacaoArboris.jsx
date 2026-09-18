import { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import * as THREE from 'three';
import gsap from 'gsap';
import './AutenticacaoArboris.css';
import { TermosModal, PrivacidadeModal } from '../ModaisArboris/ModaisArboris';

const seededRandom = (seed) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

function CameraParallax() {
  useFrame((state) => {
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, state.pointer.x * 1.8, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 0.3 + state.pointer.y * 1.8, 0.05);
    state.camera.lookAt(0, -0.5, -2);
  });
  return null;
}

function ArborisCore({ bootRef, quality = 'high', ...props }) {
  const treeRef = useRef();
  const coreRef = useRef();
  const ringOneRef = useRef();
  const ringTwoRef = useRef();
  const ringThreeRef = useRef();

  const particleCount = quality === 'low' ? 240 : 700;

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    
    const unifiedColor = new THREE.Color('#34d399');

    for (let i = 0; i < particleCount; i++) {
      const theta = seededRandom(i + 30) * Math.PI * 2;
      const phi = Math.acos((seededRandom(i + 40) * 2) - 1);
      const radius = 0.94 + seededRandom(i + 50) * 0.18;
      const wobble = Math.sin(theta * 5) * 0.025;
      const r = radius + wobble;
      const y = r * Math.cos(phi);

      pos[i * 3] = r * Math.cos(theta);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = r * Math.sin(theta);

      col[i * 3] = unifiedColor.r;
      col[i * 3 + 1] = unifiedColor.g;
      col[i * 3 + 2] = unifiedColor.b;
    }
    return [pos, col];
  }, [particleCount]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const boot = bootRef?.current?.value ?? 1; 

    if (treeRef.current) {
      treeRef.current.rotation.y = time * 0.15;
      treeRef.current.position.y = -0.3 + Math.sin(time * 1.0) * 0.05;
      
      const currentScaleY = Math.max(0.001, boot);
      const breathing = 1 + Math.sin(time * 2.0) * 0.02;
      treeRef.current.scale.set(breathing, currentScaleY * breathing, breathing);
    }
    if (coreRef.current) {
      coreRef.current.rotation.y = -time * 0.9;
      coreRef.current.rotation.x = time * 0.6;
      const corePulse = boot * (1 + Math.sin(time * 4.5) * 0.2);
      coreRef.current.scale.set(corePulse, corePulse, corePulse);
    }
    if (ringOneRef.current) {
      ringOneRef.current.rotation.z = time * 0.5;
      ringOneRef.current.rotation.y = time * 0.4;
    }
    if (ringTwoRef.current) {
      ringTwoRef.current.rotation.x = time * 0.32;
      ringTwoRef.current.rotation.z = -time * 0.24;
    }
    if (ringThreeRef.current) {
      ringThreeRef.current.rotation.y = -time * 0.42;
      ringThreeRef.current.rotation.x = Math.sin(time * 0.5) * 0.2;
    }
  });

  return (
    <group ref={treeRef} position={[0, 0.25, -6.5]} scale={1.8} {...props}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial 
          size={0.012} 
          vertexColors 
          transparent 
          opacity={0.22} 
          blending={THREE.AdditiveBlending} 
          sizeAttenuation 
          depthWrite={false} 
        />
      </points>
      <mesh ref={coreRef} position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.34, 16, 16]} />
        <meshBasicMaterial color="#00FFA3" transparent opacity={0.88} />
      </mesh>
      <mesh ref={ringOneRef} position={[0, 0.8, 0]} rotation={[Math.PI / 2.5, 0, 0]}>
        <torusGeometry args={[0.62, 0.012, 12, 48]} />
        <meshBasicMaterial color="#00D0FF" transparent opacity={0.72} />
      </mesh>
      <mesh ref={ringTwoRef} position={[0, 0.8, 0]} rotation={[0.4, 0.8, 0]}>
        <torusGeometry args={[0.82, 0.009, 12, 48]} />
        <meshBasicMaterial color="#00FFA3" transparent opacity={0.48} />
      </mesh>
      <mesh ref={ringThreeRef} position={[0, 0.8, 0]} rotation={[1.2, 0.2, 0.4]}>
        <torusGeometry args={[1.04, 0.006, 10, 48]} />
        <meshBasicMaterial color="#00D0FF" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function TelemetryDust({ quality = 'high' }) {
  const pointsRef = useRef();
  const particleCount = quality === 'low' ? 300 : 900; 
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (seededRandom(i + 50) - 0.5) * 22;
      pos[i * 3 + 1] = (seededRandom(i + 60) - 0.5) * 14;
      pos[i * 3 + 2] = -12 - seededRandom(i + 70) * 12;
    }
    return pos;
  }, [particleCount]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const time = clock.getElapsedTime();
    pointsRef.current.rotation.y = time * 0.04;
    pointsRef.current.rotation.x = Math.sin(time * 0.25) * 0.05;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#01ffa2" size={0.03} transparent opacity={0.6} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  );
}

function DataFragments({ quality = 'high' }) {
  const leavesRef = useRef();
  const leafCount = quality === 'low' ? 120 : 420;
  const positions = useMemo(() => {
    const values = new Float32Array(leafCount * 3);
    for (let i = 0; i < leafCount; i++) {
      values[i * 3] = -6 + seededRandom(i + 90) * 12;
      values[i * 3 + 1] = -3.5 + seededRandom(i + 120) * 7;
      values[i * 3 + 2] = -7 - seededRandom(i + 150) * 6;
    }
    return values;
  }, [leafCount]);

  useFrame(() => {
    if (!leavesRef.current) return;
    const positionAttribute = leavesRef.current.geometry.attributes.position;

    for (let i = 0; i < leafCount; i++) {
      let x = positionAttribute.getX(i) - 0.012;

      if (x < -6) {
        x = 6 + seededRandom(i + 220) * 2;
        positionAttribute.setY(i, -3.5 + seededRandom(i + 220) * 7);
      }

      positionAttribute.setX(i, x);
    }

    positionAttribute.needsUpdate = true;
  });

  return (
    <points ref={leavesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#6ee7b7" size={quality === 'low' ? 0.035 : 0.045} transparent opacity={0.72} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  );
}

function TopographicWave({ quality = 'high' }) {
  const segments = quality === 'low' ? 28 : 44;
  const geometry = useMemo(() => new THREE.PlaneGeometry(180, 180, segments, segments), [segments]);
  
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2.2, 0, 0]} position={[0, -3.4, -10]}>
      <meshBasicMaterial color="#00D0FF" wireframe transparent opacity={0.075} />
    </mesh>
  );
}

export default function AutenticacaoArboris() {
  const quality = typeof window !== 'undefined' && (window.innerWidth <= 768 || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    ? 'low'
    : 'high';
  const [isLogin, setIsLogin] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const systemBootRef = useRef({ value: 0 });

  const [modalTermosOpen, setModalTermosOpen] = useState(false);
  const [modalPrivacidadeOpen, setModalPrivacidadeOpen] = useState(false);
  const [termosAceitos, setTermosAceitos] = useState(false);

  const wrapperRef = useRef();
  const panelsContainerRef = useRef();
  const loginPanelRef = useRef();
  const signupPanelRef = useRef();
  const loaderRef = useRef();

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

    if (!isLogin && !termosAceitos) {
      alert("⚠️ ALERTA DO SISTEMA: É necessário aceitar os Termos de Uso e a Política de Privacidade para registrar uma nova identidade.");
      return; 
    }

    setIsLoading(true);

    const activePanel = isLogin ? loginPanelRef.current : signupPanelRef.current;

    const tl = gsap.timeline({
      onComplete: () => {
        setIsLoading(false);
      }
    });

    tl.to(activePanel, {
      scale: 1.8,
      opacity: 0,
      z: 400,
      rotationX: 15,
      filter: "blur(15px)",
      duration: 1.2,
      ease: "power4.in"
    })
    .to(wrapperRef.current, {
      opacity: 0,
      duration: 0.5,
      ease: "power2.inOut"
    }, "-=0.5");
  };

  const handleToggle = (toLogin) => {
    if (isLogin !== toLogin) {
      setIsLogin(toLogin);
      if (toLogin) setTermosAceitos(false);
    }
  };

  useEffect(() => {
    const wrapperEl = wrapperRef.current;
    if (!wrapperEl) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      tl.to({}, { duration: 1.5 })
      .to(loaderRef.current, {
        opacity: 0,
        duration: 0.4,
        ease: 'power2.inOut',
        onComplete: () => setInitialLoading(false)
      })
      .to(systemBootRef.current, {
        value: 1,
        duration: 1.0, 
        ease: "power4.out"
      })
      .fromTo('.arboris-auth-3d', 
        { opacity: 0 }, 
        { opacity: 1, duration: 0.8, ease: 'power2.out' }, 
        "<" 
      )
      .fromTo(panelsContainerRef.current, 
        { opacity: 0, scale: 0.4, y: 150, filter: "blur(12px)" },
        { 
          opacity: 1, scale: 1, y: 0, filter: "blur(0px)", 
          duration: 1.0, ease: 'back.out(1.4)'
        },
        "<" 
      );
        
    }, wrapperEl);

    return () => ctx.revert(); 
  }, []);

  useEffect(() => {
    const animateLayout = () => {
      const isMobile = window.innerWidth <= 768;
      
      const activePanel = isLogin ? loginPanelRef.current : signupPanelRef.current;
      const inactivePanel = isLogin ? signupPanelRef.current : loginPanelRef.current;

      const xOffset = isMobile ? 0 : 920;
      const yOffset = isMobile ? 540 : 0; 

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

      gsap.set(activePanel, {
        x: isMobile ? 0 : (isLogin ? -120 : 120),
        y: isMobile ? (isLogin ? -70 : 70) : 40,
        z: 180,
        scale: 0.82,
        rotationY: isMobile ? 0 : (isLogin ? -10 : 10),
        rotationX: isMobile ? (isLogin ? 8 : -8) : 4,
        opacity: 0,
        filter: 'blur(14px)',
        zIndex: 10
      });

      gsap.set(activeContent, { opacity: 0, y: 22 });
      gsap.set(activeSweep, { opacity: 0, xPercent: -120, scaleX: 0.2 });

      const tl = gsap.timeline({ defaults: { overwrite: 'auto' } });

      tl.to(activePanel, {
        x: 0,
        y: 0,
        z: 0,
        scale: 1,
        rotationY: 0,
        rotationX: 0,
        opacity: 1,
        filter: "blur(0px)",
        duration: 1.05,
        ease: "expo.out",
        zIndex: 10
      }, 0);

      tl.to(inactivePanel, {
        x: isLogin ? xOffset : -xOffset,
        y: isLogin ? yOffset : -yOffset,
        z: -300, 
        scale: 0.8,
        rotationY: isMobile ? 0 : (isLogin ? -20 : 20),
        rotationX: isMobile ? (isLogin ? 15 : -15) : 0,
        opacity: 0,
        filter: "blur(10px)",
        duration: 1.05,
        ease: "power3.inOut",
        zIndex: 1
      }, 0.05);

      tl.to(activeCard, {
        boxShadow: '0 30px 90px rgba(0, 0, 0, 0.8), 0 0 85px rgba(52, 211, 153, 0.42), inset 0 1px rgba(255, 255, 255, 0.16)',
        duration: 0.45,
        ease: 'power2.out'
      }, 0.28)
      .to(activeCard, {
        boxShadow: '0 28px 80px rgba(0, 0, 0, 0.72), 0 0 50px rgba(16, 185, 129, 0.1), inset 0 1px rgba(255, 255, 255, 0.08)',
        duration: 0.85,
        ease: 'power2.out'
      }, 0.8)
      .to(activeContent, {
        opacity: 1,
        y: 0,
        duration: 0.65,
        stagger: 0.08,
        ease: 'power3.out'
      }, 0.48)
      .to(activeSweep, {
        opacity: 0.9,
        xPercent: 125,
        scaleX: 1,
        duration: 0.9,
        ease: 'power2.inOut'
      }, 0.34)
      .to(activeSweep, {
        opacity: 0,
        duration: 0.35,
        ease: 'power2.out'
      }, 1.08);
    };

    animateLayout();
    
    window.addEventListener('resize', animateLayout);
    return () => window.removeEventListener('resize', animateLayout);

  }, [isLogin]); 
  
  return (
    <div className="arboris-auth-wrapper" ref={wrapperRef}>
      
      {initialLoading && (
        <div className="initial-loader-wrapper" ref={loaderRef}>
          <div className="cyber-spinner-3d">
            <div className="ring"></div>
            <div className="ring"></div>
            <div className="ring"></div>
            <div className="core"></div>
          </div>
          <p className="loader-text">INICIALIZANDO SISTEMA...</p>
        </div>
      )}

      <div className="arboris-auth-3d">
        <Canvas camera={{ position: [0, 0.5, 5.5], fov: 60 }} dpr={quality === 'low' ? [0.65, 1] : [1, 1.35]} eventSource={document.body}>
          <fog attach="fog" args={['#050F14', 10, 38]} />
          <CameraParallax />
          <ArborisCore bootRef={systemBootRef} quality={quality} />
          <DataFragments quality={quality} />
          <TopographicWave quality={quality} />
          <TelemetryDust quality={quality} />
        </Canvas>
      </div>

      <div className={`auth-scene ${isLogin ? 'login-mode' : 'signup-mode'}`}>
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
                <h1 className="auth-brand" ref={brandRef1}>Arboris.X</h1>
                <div className="header-3d-wrapper">
                  <span className="signal-orbit signal-orbit-one"></span>
                  <span className="signal-orbit signal-orbit-two"></span>
                  <span className="signal-orbit signal-orbit-three"></span>
                  <span className="signal-core"></span>
                </div>
                <div className="auth-status-line"><span className="status-dot"></span> SISTEMA PRONTO</div>
              </div>

              <div className="auth-form-content">
                <form onSubmit={handleSubmit} className="auth-form">
                  <div className="input-group">
                    <label className="input-label">E-mail de Acesso</label>
                    <div className="input-with-icon">
                      <Mail className="input-icon" size={18} />
                      <input type="email" placeholder="seu@email.com" required disabled={isLoading} />
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Senha</label>
                    <div className="input-with-icon">
                      <Lock className="input-icon" size={18} />
                      <input type={showLoginPassword ? 'text' : 'password'} placeholder="••••••••" required disabled={isLoading} />
                      <button type="button" className="password-toggle" onClick={() => setShowLoginPassword(!showLoginPassword)}>
                        {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="holo-button" disabled={isLoading}>
                    {isLoading ? <span>⟳ Conectando...</span> : <><span>Acessar Sistema</span><ArrowRight className="button-icon" size={18} /></>}
                  </button>
                </form>

                <div className="auth-footer">
                  <p>Não tem uma conta? <button type="button" className="auth-toggle-link" onClick={() => handleToggle(false)}>Solicitar Acesso</button></p>
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
                <h1 className="auth-brand" ref={brandRef2}>Arboris.X</h1>
                <div className="header-3d-wrapper">
                  <span className="signal-orbit signal-orbit-one"></span>
                  <span className="signal-orbit signal-orbit-two"></span>
                  <span className="signal-orbit signal-orbit-three"></span>
                  <span className="signal-core"></span>
                </div>
                <div className="auth-status-line"><span className="status-dot"></span> NOVA IDENTIDADE</div>
              </div>

              <div className="auth-form-content">
                <form onSubmit={handleSubmit} className="auth-form">
                  <div className="input-group">
                    <label className="input-label">Nome Completo</label>
                    <div className="input-with-icon">
                      <User className="input-icon" size={18} />
                      <input type="text" placeholder="Seu nome" required disabled={isLoading} />
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">E-mail de Acesso</label>
                    <div className="input-with-icon">
                      <Mail className="input-icon" size={18} />
                      <input type="email" placeholder="seu@email.com" required disabled={isLoading} />
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Senha</label>
                    <div className="input-with-icon">
                      <Lock className="input-icon" size={18} />
                      <input type={showSignupPassword ? 'text' : 'password'} placeholder="••••••••" required disabled={isLoading} />
                      <button type="button" className="password-toggle" onClick={() => setShowSignupPassword(!showSignupPassword)}>
                        {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="termos-container">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={termosAceitos}
                        onChange={(e) => setTermosAceitos(e.target.checked)}
                        disabled={isLoading}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="termos-texto">
                        Eu li e aceito os <a href="#termos" onClick={(e) => { e.preventDefault(); setModalTermosOpen(true); }}>Termos de Uso</a> e a <a href="#privacidade" onClick={(e) => { e.preventDefault(); setModalPrivacidadeOpen(true); }}>Política de Privacidade</a>.
                      </span>
                    </label>
                  </div>

                  <button type="submit" className="holo-button" disabled={isLoading}>
                    {isLoading ? <span>⟳ Registrando...</span> : <><span>Registrar Identidade</span><ArrowRight className="button-icon" size={18} /></>}
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