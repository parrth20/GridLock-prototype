# Data provenance

ClearLane is built **only** on the official challenge dataset. Nothing in the UI
is invented: no synthetic locations, capacities, occupancy, travel times, or
fabricated forecasts. The UI and every `/api/*` route read aggregates produced
from the anonymized parking-violation CSV supplied for HackerEarth Gridlock
Hackathon 2.0 Round 2.

## What ships in the repo

`processed/parking-summary.json` — auditable aggregates: 298,450 records,
10 Nov 2023 → 08 Apr 2024, 54 police stations, 168 named junctions. It contains
observed counts, median coordinates, date coverage, validation status and
historical time-of-day distributions. It contains **no** predictions, occupancy,
road capacity, staffing, travel-time or congestion-reduction claims.
`lib/server/data-source.ts` reads this file as the single source of truth.

## Where the official CSV goes

The raw CSV is intentionally **not** committed (~110 MB). Download it from the
challenge dataset link, then point the build script at it:

```bash
GRIDLOCK_PARKING_CSV=/absolute/path/to/file.csv pnpm run data:build
# equivalently:
GRIDLOCK_PARKING_CSV=/absolute/path/to/file.csv python3 scripts/build_factual_dataset.py
```

If `GRIDLOCK_PARKING_CSV` is unset the script looks at `/tmp/gridlock_parking.csv`.
It only computes counts, shares and time distributions and converts timestamps
UTC→IST; it never creates rows, predictions, capacities or staffing numbers.

## Uploading your own CSV in the app

You don't have to use the bundled sample. In the dashboard, click **Upload data**
(top bar) and pick a violations CSV in the same format (it needs at least
`created_datetime, police_station, junction_name, violation_type, latitude,
longitude`). The app rebuilds the aggregates in TypeScript
(`lib/server/csv-ingest.ts` — a port of the Python script), refits the risk and
prediction models, and saves the result to `processed/active-summary.json`.
Everything (map, scores, forecasts, planner, assistant) then runs on your data.
Use **Use sample data** to revert (deletes `active-summary.json`).

## Dataset mode

`GET /api/health` reports `datasetMode`:

- `official-aggregates` — `processed/parking-summary.json` is present with real
  counts (the shipped state).
- `prototype` — the file is missing; the app falls back to a clearly-labelled
  empty fixture instead of inventing data.

Either way the running product is labelled **"Prototype mode"** in the UI; it is
a hackathon prototype, not an official government service.
