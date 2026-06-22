// Builds a printable one-page patrol brief from an enforcement plan and opens
// the browser print dialog (the officer saves it as a PDF). No dependency —
// we write a self-contained, branded HTML document into a new window.

import type { EnforcementPlanResponse } from "@/lib/types";

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function shiftLength(startHour: number, endHour: number): number {
  const d = endHour - startHour;
  return d > 0 ? d : 24 + d;
}

export function downloadPatrolBrief(plan: EnforcementPlanResponse): void {
  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) {
    alert("Please allow pop-ups for this site to download the patrol brief.");
    return;
  }

  const shiftLen = shiftLength(plan.shift.startHour, plan.shift.endHour);
  const officerHours = plan.patrolUnits * shiftLen;
  const stops = plan.units.reduce((n, u) => n + u.zones.length, 0);
  const generated = plan.generatedAtIST.replace("T", " ").slice(0, 16) + " IST";

  const unitBlocks = plan.units
    .map((u) => {
      const rows =
        u.zones.length === 0
          ? `<tr><td colspan="5" class="empty">No zones assigned to this unit.</td></tr>`
          : u.zones
              .map(
                (z) => `
        <tr>
          <td class="mono">${z.order}</td>
          <td><b>${esc(z.name)}</b><br/><span class="muted">${esc(z.policeStation)}</span></td>
          <td class="mono">${esc(z.window.label)}</td>
          <td class="mono">${z.riskIndex} · ${esc(z.riskLevel)}</td>
          <td class="why">${esc(z.rationale)}</td>
        </tr>`,
              )
              .join("");
      return `
      <div class="unit">
        <h3>${esc(u.label)} <span class="muted">· ${u.zones.length} stop${u.zones.length === 1 ? "" : "s"}</span></h3>
        <table>
          <thead>
            <tr><th>#</th><th>Junction</th><th>Window</th><th>Risk</th><th>Why this stop</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    })
    .join("");

  const caveats = plan.caveats.map((c) => `<li>${esc(c)}</li>`).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>ClearLane Patrol Brief — ${esc(plan.shift.label)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0b1220; background: #fff; }
  .page { max-width: 820px; margin: 0 auto; padding: 28px 32px 40px; }
  .toolbar { text-align: right; margin-bottom: 12px; }
  .toolbar button { font: 600 13px sans-serif; padding: 8px 16px; border: 0; border-radius: 8px; background: #0891b2; color: #fff; cursor: pointer; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0891b2; padding-bottom: 12px; }
  .brand { font-weight: 800; font-size: 20px; letter-spacing: -0.02em; }
  .brand span { color: #0891b2; }
  .brand small { display: block; font-weight: 600; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #64748b; margin-top: 2px; }
  .meta { text-align: right; font-size: 11px; color: #64748b; }
  .meta b { color: #0b1220; font-size: 13px; }
  .impact { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0 6px; }
  .impact .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; }
  .impact .v { font-size: 20px; font-weight: 800; color: #0e7490; }
  .impact .l { font-size: 10.5px; color: #64748b; margin-top: 1px; }
  .lede { font-size: 12px; color: #334155; margin: 8px 0 4px; }
  .unit { margin-top: 16px; page-break-inside: avoid; }
  .unit h3 { margin: 0 0 6px; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; border-bottom: 1px solid #cbd5e1; padding: 5px 6px; }
  td { padding: 7px 6px; border-bottom: 1px solid #eef2f6; vertical-align: top; font-size: 12px; }
  td.mono, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  td.why { color: #475569; font-size: 11px; }
  .muted { color: #94a3b8; font-weight: 400; }
  .empty { color: #94a3b8; font-style: italic; }
  .caveats { margin-top: 18px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  .caveats h4 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
  .caveats ul { margin: 0; padding-left: 18px; color: #475569; font-size: 11px; }
  footer { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10.5px; color: #94a3b8; }
  @media print { .toolbar { display: none; } .page { padding: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="page">
    <div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div>
    <header>
      <div class="brand">Clear<span>Lane</span> Bengaluru<small>Shift Patrol Brief</small></div>
      <div class="meta"><b>Shift ${esc(plan.shift.label)}</b><br/>${plan.patrolUnits} units · ${stops} stops<br/>Generated ${esc(generated)}</div>
    </header>

    <div class="impact">
      <div class="card"><div class="v">${plan.estimatedRiskCoverage}%</div><div class="l">modelled pressure covered</div></div>
      <div class="card"><div class="v">${stops}</div><div class="l">of ${plan.candidateZoneCount} candidate junctions</div></div>
      <div class="card"><div class="v">${officerHours}</div><div class="l">officer-hours (${plan.patrolUnits}×${shiftLen}h)</div></div>
      <div class="card"><div class="v">${plan.patrolUnits}</div><div class="l">patrol units</div></div>
    </div>
    <p class="lede">${esc(plan.explanation)}</p>

    ${unitBlocks}

    <div class="caveats">
      <h4>Read this before deploying</h4>
      <ul>${caveats}</ul>
    </div>

    <footer>
      "Estimated parking-induced congestion risk" is calculated from the historical violation dataset — it is not a measured speed or a promised reduction. ClearLane is a decision-support tool and is not an official government service. Built by Gitflix &amp; Code.
    </footer>
  </div>
  <script>window.onload = function(){ setTimeout(function(){ try { window.print(); } catch(e){} }, 400); };</script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
