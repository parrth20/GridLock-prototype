# ClearLane Bengaluru

ClearLane Bengaluru is an evidence-led parking-congestion decision-support prototype built for Flipkart Gridlock Hackathon 2.0. It turns the supplied anonymized violation dataset into explainable hotspot rankings, historical patterns, model estimates, and patrol-planning briefs.

> Hackathon prototype - not an official government service. It does not consume live CCTV, traffic-speed, or travel-time feeds.

## Dataset foundation

- 298,450 supplied violation records
- 54 police stations
- 168 named junctions
- November 2023 to April 2024

Observed values, calculated indices, and forecast estimates are labelled separately throughout the interface.

## Features

- Cinematic 3D Bengaluru-inspired landing experience
- Interactive 2D and 3D junction hotspot maps
- Explainable Parking-Induced Congestion Risk Index
- Harmonic-regression forecast with fit metrics and intervals
- Constraint-based patrol-plan generator
- Deterministic, dataset-backed ClearLane Sahayak assistant
- CSV validation and in-app dataset connection
- Original lightweight GLB model pack

## Tech stack

- Next.js 16 and React 19
- TypeScript and Tailwind CSS
- React Three Fiber, Three.js, and Drei
- Recharts and Zustand
- Next.js Route Handlers for the backend API

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
pnpm exec tsc --noEmit
pnpm build
```

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Service, dataset, metric, and model status |
| GET/POST/PUT/DELETE | `/api/dataset` | Inspect, upload, connect, or disconnect data |
| GET | `/api/hotspots` | Filtered and paginated hotspot rankings |
| GET | `/api/hotspots/[id]` | Junction detail and explanation |
| GET | `/api/forecast` | Shift-based model estimates |
| POST | `/api/enforcement-plan` | Generate a constrained patrol plan |
| POST | `/api/assistant` | Query ClearLane Sahayak |

## Rebuild local assets

```bash
pnpm models:generate
GRIDLOCK_PARKING_CSV=/absolute/path/to/dataset.csv pnpm data:build
```

See [`data/README.md`](data/README.md) for provenance and [`public/models/README.md`](public/models/README.md) for GLB details.
