// Real-road routing via the public OSRM demo server, with a straight-line
// fallback. No API key required.
//
// IMPORTANT: this returns a *suggested driving path* derived from road
// geometry — it is NOT live traffic and not an official emergency route.

export interface LatLng {
  lat: number;
  lng: number;
}

/** Returns the road path between points as [lat, lng] pairs (Leaflet order). */
export async function routeRoad(points: LatLng[]): Promise<[number, number][]> {
  const straight = points.map((p) => [p.lat, p.lng] as [number, number]);
  if (points.length < 2) return straight;
  try {
    const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("osrm");
    const data = await res.json();
    const g = data?.routes?.[0]?.geometry?.coordinates;
    if (Array.isArray(g) && g.length) {
      return g.map((c: number[]) => [c[1], c[0]] as [number, number]);
    }
    return straight;
  } catch {
    return straight; // demo server down / offline → straight line
  }
}

/** Approximate length of a polyline in km (haversine). */
export function lineDistanceKm(line: [number, number][]): number {
  let km = 0;
  for (let i = 1; i < line.length; i++) km += haversine(line[i - 1], line[i]);
  return km;
}

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
