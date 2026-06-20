"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, PerspectiveCamera, Preload } from "@react-three/drei";
import * as THREE from "three";

interface OrbitControlsLike {
  target: THREE.Vector3;
  update: () => void;
}
import type { Hotspot, RiskLevel } from "@/lib/types";
import { BengaluruCityModel, ModelErrorBoundary } from "@/components/three/BengaluruCityModel";

const RISK_COLOR: Record<RiskLevel, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  moderate: "#22d3ee",
  low: "#10b981",
};

const SPREAD = 280; // world units per degree of lat/lng

interface MapProps {
  hotspots: Hotspot[];
  selectedId: string | null;
  onSelect: (h: Hotspot) => void;
  focusNonce: number;
  reduceMotion?: boolean;
}

function useProjection(hotspots: Hotspot[]) {
  return useMemo(() => {
    if (hotspots.length === 0) {
      return { center: { lat: 12.97, lng: 77.59 }, pos: new Map<string, THREE.Vector3>() };
    }
    const lat = hotspots.reduce((s, h) => s + h.latitude, 0) / hotspots.length;
    const lng = hotspots.reduce((s, h) => s + h.longitude, 0) / hotspots.length;
    const pos = new Map<string, THREE.Vector3>();
    for (const h of hotspots) {
      pos.set(
        h.id,
        new THREE.Vector3(
          (h.longitude - lng) * SPREAD,
          3 + (h.riskIndex / 100) * 10,
          -(h.latitude - lat) * SPREAD,
        ),
      );
    }
    return { center: { lat, lng }, pos };
  }, [hotspots]);
}

function Marker({
  hotspot,
  position,
  selected,
  onSelect,
  onHover,
}: {
  hotspot: Hotspot;
  position: THREE.Vector3;
  selected: boolean;
  onSelect: (h: Hotspot) => void;
  onHover: (id: string | null) => void;
}) {
  const color = RISK_COLOR[hotspot.riskLevel];
  const height = position.y;
  return (
    <group position={[position.x, 0, position.z]}>
      {/* stem */}
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.5, 0.5, height, 10]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} />
      </mesh>
      {/* head */}
      <mesh
        position={[0, height, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(hotspot);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(hotspot.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "auto";
        }}
        scale={selected ? 1.8 : 1.2}
      >
        <sphereGeometry args={[1.4, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? 1.1 : 0.5} />
      </mesh>
      {selected && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3, 3.6, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function CameraRig({ target }: { target: THREE.Vector3 | null }) {
  const controls = useThree((s) => s.controls) as OrbitControlsLike | null;
  const desired = useRef<THREE.Vector3 | null>(null);
  useEffect(() => {
    desired.current = target ? target.clone() : null;
  }, [target]);

  useFrame(({ camera }) => {
    if (!controls || !desired.current) return;
    const tgt = desired.current;
    controls.target.lerp(tgt, 0.08);
    const camWanted = new THREE.Vector3(tgt.x + 40, tgt.y + 55, tgt.z + 75);
    camera.position.lerp(camWanted, 0.06);
    controls.update();
    if (camera.position.distanceTo(camWanted) < 0.5) desired.current = null;
  });
  return null;
}

function Scene({ hotspots, selectedId, onSelect, focusNonce, reduceMotion }: MapProps) {
  const { pos } = useProjection(hotspots);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    const p = pos.get(selectedId);
    if (p) setFocusTarget(p.clone());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce, selectedId]);

  const labelId = hoveredId ?? selectedId;
  const labelHotspot = hotspots.find((h) => h.id === labelId);
  const labelPos = labelId ? pos.get(labelId) : null;

  return (
    <>
      <color attach="background" args={["#06080d"]} />
      <fog attach="fog" args={["#06080d", 220, 520]} />
      <PerspectiveCamera makeDefault position={[0, 150, 210]} fov={48} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[90, 150, 70]} intensity={2} />
      <pointLight position={[-60, 70, -60]} intensity={160} distance={200} color="#16d9e3" />

      <gridHelper args={[420, 30, 0x16d9e3, 0x122236]} position={[0, -0.1, 0]} />

      <ModelErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <BengaluruCityModel scale={5} />
        </Suspense>
      </ModelErrorBoundary>

      {hotspots.map((h) => {
        const p = pos.get(h.id);
        if (!p) return null;
        return (
          <Marker
            key={h.id}
            hotspot={h}
            position={p}
            selected={h.id === selectedId}
            onSelect={onSelect}
            onHover={setHoveredId}
          />
        );
      })}

      {labelHotspot && labelPos && (
        <Html position={[labelPos.x, labelPos.y + 6, labelPos.z]} center distanceFactor={140} zIndexRange={[20, 0]}>
          <div className="pointer-events-none w-44 -translate-y-2 rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-left shadow-xl">
            <p className="text-xs font-bold text-white">{labelHotspot.name}</p>
            <p className="mt-0.5 text-[11px]" style={{ color: RISK_COLOR[labelHotspot.riskLevel] }}>
              Index {labelHotspot.riskIndex} · {labelHotspot.riskLevel}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">Busiest {labelHotspot.recommendedWindow.label}</p>
          </div>
        </Html>
      )}

      <OrbitControls
        makeDefault
        enableDamping
        autoRotate={!reduceMotion && !selectedId}
        autoRotateSpeed={0.2}
        minDistance={70}
        maxDistance={360}
        minPolarAngle={0.4}
        maxPolarAngle={1.32}
        target={[0, 6, 0]}
      />
      <CameraRig target={focusTarget} />
      <Preload all />
    </>
  );
}

export function HotspotMap3D(props: MapProps & { className?: string }) {
  const { className = "", ...mapProps } = props;
  const [webgl, setWebgl] = useState(true);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      if (!(c.getContext("webgl") || c.getContext("webgl2"))) setWebgl(false);
    } catch {
      setWebgl(false);
    }
  }, []);

  if (!webgl) {
    return (
      <div className={`grid place-items-center bg-[#06080d] ${className}`}>
        <p className="text-sm text-slate-400">WebGL unavailable — switch to the 2D map.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 150, 210], fov: 48 }}>
        <Scene {...mapProps} />
      </Canvas>
    </div>
  );
}
