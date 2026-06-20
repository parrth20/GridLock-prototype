"use client";

import type { ReactNode } from "react";
import React from "react";
import { Clone, useGLTF } from "@react-three/drei";

interface BengaluruCityModelProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

export function BengaluruCityModel({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: BengaluruCityModelProps) {
  const { scene } = useGLTF("/models/bengaluru-city.glb");

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Clone object={scene} />
    </group>
  );
}

interface ModelErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ModelErrorBoundaryState {
  failed: boolean;
}

export class ModelErrorBoundary extends React.Component<
  ModelErrorBoundaryProps,
  ModelErrorBoundaryState
> {
  state: ModelErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ModelErrorBoundaryState {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

useGLTF.preload("/models/bengaluru-city.glb");
