import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import * as THREE from 'three';
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing';
import gsap from 'gsap';
import './ArborisAuth.css';

const seededRandom = (seed) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

function CameraParallax() {
  useFrame((state) => {
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, state.pointer.x * 1.5, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 0.5 + state.pointer.y * 1.5, 0.05);
    state.camera.lookAt(0, 0, -2);
  });
  return null;
}

function DataStreams() {
  const groupRef = useRef();
  const streamCount = 10;

  const initialPositions = useMemo(() => {
    return Array.from({ length: streamCount }).map(() => ({
      x: (Math.random() - 0.5) * 14,
      y: (Math.random() - 0.5) * 8,
      z: -16 + Math.random() * 16,
      speed: 0.06 + Math.random() * 0.15
    }));
  }, []);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.children.forEach((mesh, i) => {
        mesh.position.z += initialPositions[i].speed;
        if (mesh.position.z > 0) {
          mesh.position.z = -16;
          mesh.position.x = (Math.random() - 0.5) * 14;
          mesh.position.y = (Math.random() - 0.5) * 8;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {initialPositions.map((pos, i) => (
        <mesh key={i} position={[pos.x, pos.y, pos.z]}>
          <boxGeometry args={[0.02, 0.02, 1.0]} />
          <meshBasicMaterial color="#34d399" transparent opacity={0.25} />
        </mesh>
      ))}
    </group>
  );
}

function HolographicTree(props) {
  const treeRef = useRef();
  const coreRef = useRef();
  const particleCount = 750;

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    
    const colorDark = new THREE.Color('#059669');
    const colorMid = new THREE.Color('#10b981');
    const colorLight = new THREE.Color('#6ee7b7');

    for (let i = 0; i < particleCount; i++) {
      let y, radius;
      if (i < 90) {
        y = (i / 90) * 1.2 - 1.3;
        radius = 0.05 + Math.random() * 0.04;
      } else {
        const progress = (i - 90) / (particleCount - 90);
        y = progress * 2.2 - 0.6;
        const layerFactor = 1 - ((y + 0.6) / 2.2);
        radius = Math.max(0.04, layerFactor * 1.2 * (0.4 + Math.random() * 0.6));
      }

      const theta = seededRandom(i + 30) * Math.PI * 2;
      const r = radius * Math.sqrt(seededRandom(i + 40));
      pos[i * 3] = r * Math.cos(theta);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = r * Math.sin(theta);

      const chosenColor = y < -0.2 ? colorDark : (y < 0.8 ? colorMid : colorLight);
      col[i * 3] = chosenColor.r;
      col[i * 3 + 1] = chosenColor.g;
      col[i * 3 + 2] = chosenColor.b;
    }
    return [pos, col];
  }, [particleCount]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (treeRef.current) {
      treeRef.current.rotation.y = time * 0.15;
      treeRef.current.position.y = Math.sin(time * 0.4) * 0.06 - 0.2;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y = -time * 0.4;
      coreRef.current.rotation.x = time * 0.2;
    }
  });

  return (
    <group ref={treeRef} position={[0, -0.4, -2.2]} {...props}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.038} vertexColors transparent opacity={0.85} blending={THREE.AdditiveBlending} sizeAttenuation />
      </points>
      <mesh ref={coreRef} position={[0, 0.3, 0]}>
        <octahedronGeometry args={[0.2, 0]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

function TopographicWave() {
  const meshRef = useRef();
  const geometry = useMemo(() => new THREE.PlaneGeometry(28, 28, 64, 64), []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const time = clock.getElapsedTime() * 0.3;
      const positionAttribute = meshRef.current.geometry.attributes.position;
      for (let i = 0; i < positionAttribute.count; i++) {
        const x = positionAttribute.getX(i);
        const y = positionAttribute.getY(i);
        const z = Math.sin(x * 0.4 + time) * Math.cos(y * 0.4 + time) * 0.4;
        positionAttribute.setZ(i, z);
      }
      positionAttribute.needsUpdate = true;
    }
  });
  
  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2.5, 0, 0]} position={[0, -1.8, -2]}>
      <meshBasicMaterial color="#10b981" wireframe transparent opacity={0.12} />
    </mesh>
  );
}

function TelemetryDust() {
  const pointsRef = useRef();
  const particleCount = 180;
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (seededRandom(i + 50) - 0.5) * 10;
      pos[i * 3 + 1] = (seededRandom(i + 60) - 0.5) * 6;
      pos[i * 3 + 2] = -7 - seededRandom(i + 70) * 6;
    }
    return pos;
  }, [particleCount]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const time = clock.getElapsedTime();
    pointsRef.current.rotation.y = time * 0.035;
    pointsRef.current.rotation.x = Math.sin(time * 0.2) * 0.05;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#a7f3d0" size={0.025} transparent opacity={0.45} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  );
}

// --- INTERFACE DE USUÁRIO (FRONTEND PURO) ---
export default function ArborisAuth() {
  const wrapperRef = useRef();
  const cardContainerRef = useRef();
  const flipTrackRef = useRef();
  const loaderRef = useRef();
  const [isLogin, setIsLogin] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

      const handleSubmit = (e) => {
        e.preventDefault();
        setIsLoading(true);

      const tl = gsap.timeline({
        onComplete: () => {
          setIsLoading(false);
        }
      });

      // O painel dá um zoom épico na direção da câmera
      tl.to(cardContainerRef.current, {
        scale: 1.8,
        opacity: 0,
        z: 400,
        rotationX: 15,
        filter: "blur(15px)",
        duration: 1.2,
        ease: "power4.in"
      })
      // O fundo inteiro apaga no final do zoom
      .to(wrapperRef.current, {
        opacity: 0,
        duration: 0.5,
        ease: "power2.inOut"
      }, "-=0.5");
    };

  const handleToggle = (toLogin) => {
    const card = cardContainerRef.current;
    const track = flipTrackRef.current;
    if (!card || !track) return;

    const targetRotation = toLogin ? 0 : 180;

    const tl = gsap.timeline();
    
    tl.to(card, {
      scale: 0.65,
      z: -250,
      rotationX: 15,
      filter: "brightness(2.5) blur(6px)",
      duration: 0.35,
      ease: "power3.in"
    })
    
    // 2. O Giro Quântico 3D: A pista gira em Y com efeito elástico de impacto (back.out)
    .to(track, {
      rotationY: targetRotation,
      duration: 0.7,
      ease: "back.out(1.5)",
      onStart: () => {
        // Altera o estado exatamente no meio do flash visual
        setIsLogin(toLogin);
      }
    }, "-=0.15")
    
    // 3. Fase de Reimpacto: O cartão volta para o primeiro plano estalando na tela
    .to(card, {
      scale: 1,
      z: 0,
      rotationX: 0,
      filter: "brightness(1) blur(0px)",
      duration: 0.5,
      ease: "power4.out"
    }, "-=0.2");
  };

// 🟢 SUBSTITUA O useEffect do GSAP POR ESTE:
  useEffect(() => {
    const wrapperEl = wrapperRef.current;
    if (!wrapperEl) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // 1. O tempo de tela do Loader (2.5s girando)
      tl.to({}, { duration: 2.5 })
        
        // 2. O Loader faz um fade-out suave
        .to(loaderRef.current, {
          opacity: 0,
          duration: 0.6,
          ease: 'power2.inOut',
          onComplete: () => setInitialLoading(false) // Remove o loader do DOM ao final
        })
        
        // 3. Fundo 3D acende das sombras
        .from('.arboris-auth-3d', {
          opacity: 0,
          duration: 1.5,
          ease: 'power2.out'
        }, "-=0.3") // Começa um pouco antes do loader terminar de sumir
        
        // 4. Cartão principal surge com impacto e um pequeno efeito elástico
        .from(cardContainerRef.current, {
          opacity: 0,
          scale: 0.8,
          y: 60,
          rotationX: -15,
          duration: 1.2,
          ease: 'back.out(1.2)'
        }, "-=1.2");
        
    }, wrapperEl);

    setTimeout(() => setMounted(true), 100);

    // --- Lógica do Mouse Tilt que você já tinha ---
    const handleMove = (event) => {
      if (!wrapperEl || !cardContainerRef.current) return;
      const rect = wrapperEl.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (event.clientY - rect.top - rect.height / 2) / rect.height;
      
      gsap.to(cardContainerRef.current, { rotationY: x * 15, rotationX: -y * 15, transformPerspective: 1000, duration: 0.8, ease: 'power3.out' });
    };

    const handleLeave = () => {
      if (!cardContainerRef.current) return;
      gsap.to(cardContainerRef.current, { rotationY: 0, rotationX: 0, duration: 1, ease: 'elastic.out(1, 0.5)' });
    };

    wrapperEl.addEventListener('mousemove', handleMove);
    wrapperEl.addEventListener('mouseleave', handleLeave);

    return () => { 
      wrapperEl.removeEventListener('mousemove', handleMove); 
      wrapperEl.removeEventListener('mouseleave', handleLeave); 
      ctx.revert(); 
    };
  }, []);

return (
    <div className="arboris-auth-wrapper" ref={wrapperRef}>
      
      {/* Adicionado ref={loaderRef} na div principal do loader */}
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

      {/* Background 3D */}
      <div className="arboris-auth-3d">
        <Canvas camera={{ position: [0, 0.5, 5.5], fov: 60 }} dpr={[1, 1.5]}>
          {/* FOG: Empurrei um pouco mais para trás (de 4 para 6) */}
          <fog attach="fog" args={['#010503', 6, 15]} />

          <CameraParallax />
          <DataStreams />
          <HolographicTree scale={2} />
          <TopographicWave />
          <TelemetryDust />
          
          <EffectComposer multisampling={0} disableNormalPass>
            <Bloom luminanceThreshold={0.1} luminanceSmoothing={0.8} intensity={10} kernelSize={3} mipmapBlur />
            
            {/* DEPTH OF FIELD: Ajustado para pegar SÓ o fundão */}
            <DepthOfField 
              target={[0, 0, -20]}  // Foco cravado na árvore e no início da malha
              focalLength={0.02}   // Área de nitidez muito maior (era 0.4)
              bokehScale={0}     // Embaçado mais suave lá no fundo (era 5)
              height={700}         
            />
          </EffectComposer>
        </Canvas>
      </div>

      {/* Cartão de Autenticação */}
      <div className="auth-scene">
        <div className={`auth-card-shell ${isLogin ? 'is-login' : 'is-signup'} ${mounted ? 'mounted' : 'not-mounted'}`} ref={cardContainerRef}>
          <div className="auth-flip-track" ref={flipTrackRef}>
            
            {/* FACE: LOGIN */}
            <div className="auth-face auth-face-login">
              <div className="auth-panel auth-card">
                <div className="scanline"></div> 
                <div className="auth-header">
                  <h1 className="auth-brand">Arboris<span className="auth-brand-accent">.X</span></h1>
                  <p className="auth-subtitle">Painel de Controle Ambiental</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                  <div className="input-group">
                    <label className="input-label">E-mail de Acesso</label>
                    <div className="input-with-icon">
                      <Mail className="input-icon" />
                      <input type="email" placeholder="seu@email.com" required disabled={isLoading} />
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Senha</label>
                    <div className="input-with-icon">
                      <Lock className="input-icon" />
                      <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" required disabled={isLoading} />
                      <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="holo-button" disabled={isLoading}>
                    {isLoading ? <span>⟳ Conectando...</span> : <><span>Acessar Sistema</span><ArrowRight className="button-icon" /></>}
                  </button>
                </form>

                <div className="auth-footer">
                  <p>Não tem uma conta? <button type="button" className="auth-toggle-link" onClick={() => setIsLogin(false)}>Solicitar Acesso</button></p>
                </div>
              </div>
            </div>

            {/* FACE: CADASTRO */}
            <div className="auth-face auth-face-signup">
              <div className="auth-panel auth-card">
                <div className="scanline"></div>                 
                <div className="auth-header">
                  <h1 className="auth-brand">Arboris<span className="auth-brand-accent">.X</span></h1>
                  <p className="auth-subtitle">Solicitar Acesso</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                  <div className="input-group">
                    <label className="input-label">Nome Completo</label>
                    <div className="input-with-icon">
                      <User className="input-icon" />
                      <input type="text" placeholder="Seu nome" required disabled={isLoading} />
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">E-mail de Acesso</label>
                    <div className="input-with-icon">
                      <Mail className="input-icon" />
                      <input type="email" placeholder="seu@email.com" required disabled={isLoading} />
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Senha</label>
                    <div className="input-with-icon">
                      <Lock className="input-icon" />
                      <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" required disabled={isLoading} />
                    </div>
                  </div>
                  <button type="submit" className="holo-button" disabled={isLoading}>
                    {isLoading ? <span>⟳ Registrando...</span> : <><span>Registrar Identidade</span><ArrowRight className="button-icon" /></>}
                  </button>
                </form>

                <div className="auth-footer">
                  <p>Já possui acesso? <button type="button" className="auth-toggle-link" onClick={() => setIsLogin(true)}>Voltar ao Login</button></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}