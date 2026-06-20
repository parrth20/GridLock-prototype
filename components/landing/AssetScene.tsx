"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Clone, ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import type * as THREE from "three";
import { ModelErrorBoundary } from "@/components/three/BengaluruCityModel";

function Asset({ file, scale, spin }: { file: string; scale: number; spin: boolean }) {
  const { scene } = useGLTF(`/models/${file}`);
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (spin && ref.current) ref.current.rotation.y += delta * 0.3;
  });
  return (
    <group ref={ref} scale={scale}>
      <Clone object={scene} />
    </group>
  );
}

function Loader() {
  return (
    <mesh>
      <icosahedronGeometry args={[1.4, 1]} />
      <meshStandardMaterial color="#16d9e3" wireframe />
    </mesh>
  );
}

export interface AssetSceneProps {
  file: string;
  scale?: number;
  /** rough camera distance */
  distance?: number;
  className?: string;
}

export default function AssetScene({
  file,
  scale = 1,
  distance = 22,
  className = "",
}: AssetSceneProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [ready, setReady] = useState(false);
  const [webgl, setWebgl] = useState(true);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      if (!(c.getContext("webgl") || c.getContext("webgl2"))) setWebgl(false);
    } catch {
      setWebgl(false);
    }
    setReady(true);
  }, []);

  if (!ready) {
    return <div className={`cl-card rounded-2xl ${className}`} />;
  }

  if (!webgl) {
    return (
      <div className={`cl-card grid place-items-center rounded-2xl text-center ${className}`}>
        <p className="px-6 text-sm text-slate-400">
          3D preview unavailable on this device. The model file is
          <span className="font-mono text-cyan-300"> /models/{file}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#06080d] ${className}`}>
      <Canvas camera={{ position: [distance * 0.9, distance * 0.7, distance], fov: 42 }} dpr={[1, 1.5]}>
        <color attach="background" args={["#06080d"]} />
        <ambientLight intensity={1.4} />
        <directionalLight position={[12, 24, 14]} intensity={2.4} />
        <pointLight position={[-8, 8, -8]} intensity={30} distance={36} color="#16d9e3" />
        <ModelErrorBoundary fallback={<Loader />}>
          <Suspense fallback={<Loader />}>
            <Asset file={file} scale={scale} spin={!reduceMotion} />
          </Suspense>
        </ModelErrorBoundary>
        <gridHelper args={[40, 20, "#16d9e3", "#143049"]} position={[0, -0.15, 0]} />
        <ContactShadows position={[0, -0.1, 0]} scale={40} blur={2.4} opacity={0.45} far={20} />
        <OrbitControls makeDefault enablePan={false} enableZoom={false} autoRotate={false} minPolarAngle={0.6} maxPolarAngle={1.3} target={[0, 1.5, 0]} />
      </Canvas>
    </div>
  );
}
