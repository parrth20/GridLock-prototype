"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { BengaluruCityModel, ModelErrorBoundary } from "@/components/three/BengaluruCityModel";

function LoadingCity() {
  return (
    <mesh position={[0, 0.5, 0]}>
      <boxGeometry args={[18, 1, 18]} />
      <meshStandardMaterial color="#0d263a" wireframe />
    </mesh>
  );
}

/** Cyan vehicle light-streaks gliding along the street grid. */
function VehicleStreaks({ paused }: { paused: boolean }) {
  const group = useRef<THREE.Group>(null);
  const lanes = useMemo(
    () => [
      { z: -8, speed: 6, offset: 0, color: "#22d3ee" },
      { z: -3, speed: 4.5, offset: 5, color: "#16d9e3" },
      { z: 4, speed: 5.5, offset: 10, color: "#38bdf8" },
      { z: 9, speed: 3.8, offset: 3, color: "#22d3ee" },
    ],
    [],
  );

  useFrame((state) => {
    if (paused || !group.current) return;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const lane = lanes[i % lanes.length];
      const span = 36;
      const x = (((t * lane.speed + lane.offset) % span) - span / 2);
      child.position.x = x;
    });
  });

  return (
    <group ref={group}>
      {lanes.map((lane, i) => (
        <mesh key={i} position={[0, 0.6, lane.z]}>
          <boxGeometry args={[2.4, 0.12, 0.12]} />
          <meshBasicMaterial color={lane.color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Amber / red hotspot pulses rising from the city. */
function HotspotPulse({
  position,
  color,
  paused,
  phase,
}: {
  position: [number, number, number];
  color: string;
  paused: boolean;
  phase: number;
}) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ring.current) return;
    const t = paused ? phase : (state.clock.elapsedTime + phase) % 2.4;
    const k = t / 2.4;
    const scale = 0.4 + k * 2.6;
    ring.current.scale.set(scale, scale, scale);
    const mat = ring.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, 0.7 - k * 0.7);
  });
  return (
    <group position={position}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 1, 36]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function HeroScene3D({
  paused = false,
  reduceMotion = false,
}: {
  paused?: boolean;
  reduceMotion?: boolean;
}) {
  const frozen = paused || reduceMotion;
  return (
    <div className="h-full w-full" aria-hidden="true">
      <Canvas camera={{ position: [30, 26, 34], fov: 40 }} dpr={[1, 1.5]}>
        <color attach="background" args={["#06080d"]} />
        <fog attach="fog" args={["#06080d", 42, 86]} />
        <ambientLight intensity={1.15} />
        <directionalLight position={[16, 28, 12]} intensity={2.3} color="#d9fbff" />
        <pointLight position={[-10, 8, -8]} intensity={42} distance={30} color="#16d9e3" />
        <ModelErrorBoundary fallback={<LoadingCity />}>
          <Suspense fallback={<LoadingCity />}>
            <BengaluruCityModel scale={0.82} position={[0, -0.15, 0]} />
          </Suspense>
        </ModelErrorBoundary>
        <VehicleStreaks paused={frozen} />
        <HotspotPulse position={[6, 0.2, -6]} color="#ef4444" paused={frozen} phase={0} />
        <HotspotPulse position={[-7, 0.2, 3]} color="#f59e0b" paused={frozen} phase={0.9} />
        <HotspotPulse position={[2, 0.2, 8]} color="#f59e0b" paused={frozen} phase={1.7} />
        <ContactShadows position={[0, -0.25, 0]} opacity={0.5} scale={44} blur={2.5} far={18} />
        <OrbitControls
          makeDefault
          autoRotate={!frozen}
          autoRotateSpeed={0.32}
          enablePan={false}
          enableZoom={false}
          minDistance={30}
          maxDistance={58}
          minPolarAngle={0.6}
          maxPolarAngle={1.2}
          target={[0, 2.5, 0]}
        />
      </Canvas>
    </div>
  );
}
