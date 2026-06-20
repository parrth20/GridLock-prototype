import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ClearLane Bengaluru — Clear the lane. Move the city.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded social-preview card (Slack / WhatsApp / LinkedIn / X / iMessage).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#06080d",
          backgroundImage:
            "linear-gradient(135deg, rgba(34,211,238,0.10), rgba(6,8,13,0) 45%)",
          padding: "60px 72px",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top: wordmark + kicker */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 34, fontWeight: 800 }}>
            <div>Clear</div>
            <div style={{ color: "#34e3f2" }}>Lane</div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 20,
              letterSpacing: 5,
              color: "#67e8f9",
            }}
          >
            BENGALURU TRAFFIC INTELLIGENCE
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 94, fontWeight: 800, letterSpacing: -3 }}>
            <div>CLEAR THE</div>
            <div style={{ color: "#22d3ee", marginLeft: 26 }}>LANE.</div>
          </div>
          <div style={{ display: "flex", fontSize: 94, fontWeight: 800, letterSpacing: -3, marginTop: 4 }}>
            MOVE THE CITY.
          </div>
        </div>

        {/* Bottom: stats + url */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 14 }}>
            <div
              style={{
                display: "flex",
                padding: "10px 18px",
                borderRadius: 999,
                background: "rgba(34,211,238,0.12)",
                color: "#67e8f9",
                fontSize: 22,
              }}
            >
              298,450 violation records
            </div>
            <div
              style={{
                display: "flex",
                padding: "10px 18px",
                borderRadius: 999,
                border: "1px solid #1f2a3a",
                color: "#94a3b8",
                fontSize: 22,
              }}
            >
              168 junctions · 54 stations
            </div>
          </div>
          <div style={{ display: "flex", color: "#64748b", fontSize: 22 }}>
            tinyurl.com/ClearLane
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
