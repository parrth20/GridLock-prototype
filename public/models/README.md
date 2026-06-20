# ClearLane GLB asset pack

These are original, procedurally generated low-poly assets. One world unit is approximately one metre. They contain no external textures, so they load quickly and work offline.

| File | Primary use | Recommended scale |
| --- | --- | ---: |
| `bengaluru-city.glb` | Landing hero and command centre | `0.8` hero, `5` dashboard |
| `illegal-parking-scene.glb` | Problem explanation | `1.1` |
| `traffic-police.glb` | Enforcement cards | `4.5` in the asset viewer |
| `patrol-bike.glb` | Patrol deployment | `3.4` in the asset viewer |
| `tow-truck.glb` | Enforcement action | `2.2` in the asset viewer |
| `traffic-signal.glb` | Junction decoration | `2.6` in the asset viewer |
| `parked-car.glb` | Hotspot marker/detail | `2.8` in the asset viewer |
| `road-junction.glb` | Standalone map scene | `1` |

Regenerate the complete pack from the project root:

```bash
pnpm models:generate
```

Load an asset with React Three Fiber:

```tsx
import { Clone, useGLTF } from "@react-three/drei";

function PatrolBike() {
  const { scene } = useGLTF("/models/patrol-bike.glb");
  return <Clone object={scene} />;
}
```

Open `/models` in the running app to inspect all assets.
