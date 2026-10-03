import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const contornoFolha = new THREE.Shape();
contornoFolha.moveTo(0, -0.9);
contornoFolha.bezierCurveTo(0.18, -0.58, 0.78, -0.2, 0.72, 0.34);
contornoFolha.bezierCurveTo(0.66, 0.72, 0.28, 0.96, 0, 1);
contornoFolha.bezierCurveTo(-0.28, 0.96, -0.66, 0.72, -0.72, 0.34);
contornoFolha.bezierCurveTo(-0.78, -0.2, -0.18, -0.58, 0, -0.9);

const geometriaFolha = new THREE.ExtrudeGeometry(contornoFolha, {
  bevelEnabled: true,
  bevelSegments: 3,
  bevelSize: 0.025,
  bevelThickness: 0.025,
  curveSegments: 16,
  depth: 0.08,
  steps: 1,
});

const nervuraCurva = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, -0.82, 0.12),
  new THREE.Vector3(0, -0.4, 0.12),
  new THREE.Vector3(0, 0.05, 0.12),
  new THREE.Vector3(0, 0.48, 0.12),
  new THREE.Vector3(0, 0.88, 0.12),
]);
const geometriaNervura = new THREE.TubeGeometry(nervuraCurva, 24, 0.012, 5, false);

function Folha() {
  const folhaRef = useRef();
  const tempoRef = useRef(0);
  const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useFrame((_, delta) => {
    if (movimentoReduzido || !folhaRef.current) return;

    tempoRef.current += delta;
    const tempo = tempoRef.current;
    folhaRef.current.rotation.y = 0.3 + Math.sin(tempo * 0.65) * 0.4;
    folhaRef.current.rotation.z = Math.sin(tempo * 0.8) * 0.065;
    folhaRef.current.position.y = Math.sin(tempo * 1.1) * 0.05;
  });

  return (
    <group ref={folhaRef} rotation={[0.26, 0.3, -0.08]}>
      <mesh geometry={geometriaFolha}>
        <meshStandardMaterial
          color="#36c879"
          emissive="#0b6b3a"
          emissiveIntensity={0.55}
          roughness={0.36}
          metalness={0.05}
        />
      </mesh>
      <mesh geometry={geometriaNervura}>
        <meshStandardMaterial color="#d9edc9" roughness={0.55} />
      </mesh>
    </group>
  );
}

export default function FolhaTransicao3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 38 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
    >
      <ambientLight intensity={1.4} />
      <directionalLight position={[3, 4, 5]} intensity={2} />
      <pointLight position={[-3, -1, 4]} intensity={0.7} color="#c7edb5" />
      <Folha />
    </Canvas>
  );
}