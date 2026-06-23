// Well-known Bengaluru landmarks used as presets for the Green Corridor
// planner. These are APPROXIMATE public coordinates of landmarks — not part of
// the violation dataset — and are labelled as such in the UI.

export interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const HOSPITALS: Place[] = [
  { id: "jayadeva", name: "Sri Jayadeva Inst. of Cardiology", lat: 12.9177, lng: 77.5996 },
  { id: "victoria", name: "Victoria Hospital", lat: 12.9622, lng: 77.5739 },
  { id: "manipal", name: "Manipal Hospital (Old Airport Rd)", lat: 12.9588, lng: 77.6493 },
  { id: "narayana", name: "Narayana Health City", lat: 12.8007, lng: 77.69 },
  { id: "nimhans", name: "NIMHANS", lat: 12.9438, lng: 77.5965 },
  { id: "stjohns", name: "St. John's Medical College", lat: 12.9293, lng: 77.6206 },
];

export const ORIGINS: Place[] = [
  { id: "majestic", name: "Majestic (Kempegowda Bus Stn)", lat: 12.9767, lng: 77.5713 },
  { id: "silkboard", name: "Silk Board", lat: 12.917, lng: 77.6228 },
  { id: "whitefield", name: "Whitefield", lat: 12.9698, lng: 77.75 },
  { id: "ecity", name: "Electronic City", lat: 12.8452, lng: 77.66 },
  { id: "hebbal", name: "Hebbal", lat: 13.0358, lng: 77.597 },
  { id: "indiranagar", name: "Indiranagar", lat: 12.9719, lng: 77.6412 },
  { id: "koramangala", name: "Koramangala", lat: 12.9352, lng: 77.6245 },
  { id: "krpuram", name: "KR Puram", lat: 13.0076, lng: 77.6962 },
];
