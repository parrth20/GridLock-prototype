"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Clone, ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";

const ASSETS = [
  { name: "Bengaluru Mini City", file: "bengaluru-city.glb", scale: 0.8, description: "Hero and command-centre city twin" },
  { name: "Illegal Parking Scene", file: "illegal-parking-scene.glb", scale: 1.1, description: "Problem-story scene with congestion queue" },
  { name: "Traffic Police", file: "traffic-police.glb", scale: 4.5, description: "Low-poly enforcement officer" },
  { name: "Patrol Bike", file: "patrol-bike.glb", scale: 3.4, description: "Traffic-police patrol motorcycle" },
  { name: "Tow Truck", file: "tow-truck.glb", scale: 2.2, description: "Enforcement towing vehicle" },
  { name: "Traffic Signal", file: "traffic-signal.glb", scale: 2.6, description: "Three-lamp urban traffic signal" },
  { name: "Parked Car", file: "parked-car.glb", scale: 2.8, description: "Illegal-parking hotspot vehicle" },
  { name: "Road Junction", file: "road-junction.glb", scale: 1, description: "Four-way junction with zebra crossings" },
] as const;

function Asset({ file, scale }: { file: string; scale: number }) {
  const { scene } = useGLTF(`/models/${file}`);
  return (
    <group scale={scale}>
      <Clone object={scene} />
    </group>
  );
}

function LoadingAsset() {
  return (
    <mesh position={[0, 1, 0]}>
      <icosahedronGeometry args={[1.5, 1]} />
      <meshStandardMaterial color="#16d9e3" wireframe />
    </mesh>
  );
}

export function ModelGallery3D() {
  const [selected, setSelected] = useState<(typeof ASSETS)[number]>(ASSETS[0]);

  return (
    <div className="grid min-h-[720px] gap-5 lg:grid-cols-[320px_1fr]">
      <aside className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3">
        <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Original GLB pack</p>
        <div className="space-y-2">
          {ASSETS.map((asset) => (
            <button
              key={asset.file}
              type="button"
              onClick={() => setSelected(asset)}
              className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                selected.file === asset.file
                  ? "border-cyan-400/60 bg-cyan-400/10"
                  : "border-transparent bg-slate-800/60 hover:border-slate-600"
              }`}
            >
              <span className="block text-sm font-semibold text-white">{asset.name}</span>
              <span className="mt-1 block text-xs text-slate-400">{asset.description}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="relative min-h-[620px] overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#06080d]">
        <div className="pointer-events-none absolute left-5 top-5 z-10 rounded-xl border border-white/10 bg-slate-950/75 px-4 py-3 backdrop-blur">
          <p className="font-semibold text-white">{selected.name}</p>
          <p className="mt-1 font-mono text-xs text-cyan-300">/public/models/{selected.file}</p>
        </div>
        <Canvas key={selected.file} camera={{ position: [20, 15, 22], fov: 42 }} dpr={[1, 1.5]}>
          <color attach="background" args={["#06080d"]} />
          <ambientLight intensity={1.5} />
          <directionalLight position={[12, 24, 14]} intensity={2.6} />
          <pointLight position={[-8, 8, -8]} intensity={34} distance={35} color="#16d9e3" />
          <Suspense fallback={<LoadingAsset />}>
            <Asset file={selected.file} scale={selected.scale} />
          </Suspense>
          <gridHelper args={[50, 25, "#16d9e3", "#173147"]} position={[0, -0.18, 0]} />
          <ContactShadows position={[0, -0.12, 0]} scale={45} blur={2.5} opacity={0.5} far={24} />
          <OrbitControls makeDefault enableDamping minDistance={8} maxDistance={55} target={[0, 2, 0]} />
        </Canvas>
      </section>
    </div>
  );
}
