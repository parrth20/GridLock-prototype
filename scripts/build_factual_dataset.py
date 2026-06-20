#!/usr/bin/env python3
"""Build auditable UI aggregates from the official Round 2 parking CSV.

No synthetic rows, predictions, capacities, occupancy, travel times, or staffing
recommendations are created here. Timestamps are converted from UTC to IST.
"""

from __future__ import annotations

import csv
import json
import os
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = Path("/tmp/gridlock_parking.csv")
SOURCE = Path(os.environ.get("GRIDLOCK_PARKING_CSV", DEFAULT_SOURCE))
OUTPUT = ROOT / "data" / "processed" / "parking-summary.json"
SOURCE_URL = "https://uc.hackerearth.com/he-public-ap-south-1/jan%20to%20may%20police%20violation_anonymized791b166.csv"
IST = timezone(timedelta(hours=5, minutes=30))
MISSING = {"", "NULL", "null", "None"}


def parse_utc(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(IST)


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def parse_list(value: str) -> list[str]:
    try:
        parsed = json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return []
    return [str(item) for item in parsed] if isinstance(parsed, list) else []


def sorted_counts(counter: Counter, limit: int | None = None):
    rows = [{"label": label, "count": count} for label, count in counter.most_common(limit)]
    return rows


def main():
    if not SOURCE.exists():
        raise SystemExit(
            f"Official CSV not found at {SOURCE}. Set GRIDLOCK_PARKING_CSV to its local path."
        )

    records = 0
    named_junction_records = 0
    first_seen = None
    last_seen = None
    stations = Counter()
    junction_counts = Counter()
    validation = Counter()
    scita = Counter()
    violations = Counter()
    vehicles = Counter()
    hours = Counter()
    weekdays = Counter()
    months = Counter()
    junction_station = defaultdict(Counter)
    junction_violations = defaultdict(Counter)
    junction_vehicles = defaultdict(Counter)
    junction_hours = defaultdict(Counter)
    junction_latitudes = defaultdict(list)
    junction_longitudes = defaultdict(list)
    junction_dates = {}

    with SOURCE.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            records += 1
            created = parse_utc(row["created_datetime"])
            first_seen = created if first_seen is None or created < first_seen else first_seen
            last_seen = created if last_seen is None or created > last_seen else last_seen
            hours[created.hour] += 1
            weekdays[created.strftime("%A")] += 1
            months[created.strftime("%Y-%m")] += 1

            station = row["police_station"].strip()
            junction = row["junction_name"].strip()
            vehicle = row["vehicle_type"].strip()
            status = row["validation_status"].strip()
            if station not in MISSING:
                stations[station] += 1
            if vehicle not in MISSING:
                vehicles[vehicle] += 1
            validation["Not recorded" if status in MISSING else status] += 1
            scita[row["data_sent_to_scita"].strip().upper()] += 1

            row_violations = parse_list(row["violation_type"])
            violations.update(row_violations)

            if junction in MISSING or junction == "No Junction":
                continue

            named_junction_records += 1
            junction_counts[junction] += 1
            junction_station[junction][station] += 1
            junction_violations[junction].update(row_violations)
            junction_vehicles[junction][vehicle] += 1
            junction_hours[junction][created.hour] += 1
            junction_latitudes[junction].append(float(row["latitude"]))
            junction_longitudes[junction].append(float(row["longitude"]))
            if junction not in junction_dates:
                junction_dates[junction] = [created, created]
            else:
                junction_dates[junction][0] = min(junction_dates[junction][0], created)
                junction_dates[junction][1] = max(junction_dates[junction][1], created)

    junctions = []
    for name, count in junction_counts.most_common():
        latitudes = sorted(junction_latitudes[name])
        longitudes = sorted(junction_longitudes[name])
        midpoint = len(latitudes) // 2
        hourly = [junction_hours[name][hour] for hour in range(24)]
        peak_hour = max(range(24), key=lambda hour: hourly[hour])
        junctions.append(
            {
                "id": slugify(name),
                "name": name,
                "policeStation": junction_station[name].most_common(1)[0][0],
                "latitude": round(latitudes[midpoint], 6),
                "longitude": round(longitudes[midpoint], 6),
                "recordCount": count,
                "shareOfAllRecords": round(count / records * 100, 2),
                "firstSeenIST": junction_dates[name][0].isoformat(),
                "lastSeenIST": junction_dates[name][1].isoformat(),
                "peakRecordedHourIST": peak_hour,
                "hourlyRecordCounts": hourly,
                "topViolationTypes": sorted_counts(junction_violations[name], 5),
                "topVehicleTypes": sorted_counts(junction_vehicles[name], 5),
            }
        )

    weekday_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    payload = {
        "source": {
            "title": "HackerEarth Round 2 anonymized parking-violation dataset",
            "url": SOURCE_URL,
            "timezone": "Asia/Kolkata",
            "recordCount": records,
            "firstRecordIST": first_seen.isoformat(),
            "lastRecordIST": last_seen.isoformat(),
            "statement": "All displayed values are aggregates of supplied records; they are not live conditions or forecasts.",
        },
        "coverage": {
            "policeStations": len(stations),
            "namedJunctions": len(junction_counts),
            "namedJunctionRecords": named_junction_records,
            "recordsWithoutNamedJunction": records - named_junction_records,
        },
        "hourlyRecordCountsIST": [
            {"hour": hour, "label": f"{hour:02d}:00", "count": hours[hour]}
            for hour in range(24)
        ],
        "weekdayRecordCounts": [
            {"label": day, "count": weekdays[day]} for day in weekday_order
        ],
        "monthlyRecordCounts": [
            {"label": month, "count": months[month]} for month in sorted(months)
        ],
        "validationStatus": sorted_counts(validation),
        "dataSentToScita": sorted_counts(scita),
        "violationTypes": sorted_counts(violations),
        "vehicleTypes": sorted_counts(vehicles),
        "policeStations": sorted_counts(stations),
        "junctions": junctions,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUTPUT.relative_to(ROOT)} with {records:,} source records and {len(junctions)} named junctions")


if __name__ == "__main__":
    main()
