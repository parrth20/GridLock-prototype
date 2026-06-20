"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Brain,
  Database,
  Eye,
  Globe,
  Hand,
  ListOrdered,
  RefreshCw,
  ShieldCheck,
  Siren,
} from "lucide-react";
import {
  BILINGUAL_LABEL,
  CREDIBILITY_STRIP,
  DATA_FACTS,
  DATA_STATEMENT,
  METRIC_EXPLANATION,
  METRIC_NAME,
  PROTOTYPE_DISCLAIMER,
} from "@/lib/site-facts";
import {
  CctvIcon,
  JunctionIcon,
  NoParkingIcon,
  PatrolUnitIcon,
  TrafficPoliceIcon,
  TrafficSignalIcon,
} from "@/components/icons/CivicIcons";
import { Logo } from "@/components/Logo";

const AssetScene = dynamic(() => import("@/components/landing/AssetScene"), {
  ssr: false,
  loading: () => <div className="cl-card h-full min-h-[320px] w-full rounded-2xl" />,
});

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion() ?? false;
  if (reduce) return <div>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return <p className="cl-kicker mb-3 text-cyan-300">{children}</p>;
}

/* ---------------------------------------------------------------- strip --- */

export function CredibilityStrip() {
  return (
    <section className="relative border-y border-slate-800 bg-[#0a0e16]">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <p className="mb-6 text-center text-xs uppercase tracking-[0.24em] text-slate-500">
          {DATA_STATEMENT}
        </p>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-800 bg-slate-800 lg:grid-cols-4">
          {CREDIBILITY_STRIP.map((stat) => (
            <div key={stat.label} className="bg-[#0b1426] p-6 text-center sm:p-8">
              <p className="cl-display text-3xl text-white sm:text-4xl">{stat.value}</p>
              <p className="mt-2 text-sm font-semibold text-cyan-300">{stat.label}</p>
              <p className="mt-1 text-xs text-slate-500">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- problem --- */

export function ProblemStory() {
  return (
    <section className="relative overflow-hidden cl-bg py-24">
      <div className="cl-grid-bg pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
        <Reveal>
          <div>
            <Kicker>The problem on the ground</Kicker>
            <h2 className="cl-display max-w-xl text-4xl text-white sm:text-5xl">
              One parked car in the wrong place stalls a whole corridor.
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-300">
              A scooter on a footpath. A cab stopped on a main road. Near a
              junction, a single obstruction ripples outward — buses can&apos;t pull
              in, autos spill into the lane, and the green light clears nothing.
            </p>
            <p className="mt-4 max-w-lg leading-relaxed text-slate-400">
              The supplied data captured <strong className="text-white">{DATA_FACTS.recordCountLabel}</strong>{" "}
              of these moments across {DATA_FACTS.windowMonths}. ClearLane reads
              that record to find where the pressure concentrates — and when.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              {[
                { icon: NoParkingIcon, label: "Wrong / no parking" },
                { icon: JunctionIcon, label: "Junction obstruction" },
                { icon: TrafficSignalIcon, label: "Signal spillback" },
              ].map((chip) => (
                <span
                  key={chip.label}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-3.5 py-1.5 text-slate-300"
                >
                  <chip.icon size={16} className="text-cyan-300" /> {chip.label}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <AssetScene file="illegal-parking-scene.glb" scale={1.1} distance={20} className="h-[360px] w-full" />
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------- how it thinks --- */

export function HowClearLaneThinks() {
  const steps = [
    {
      icon: Database,
      title: "Find the hotspots",
      body: "We read every parking violation in the data and pin the worst junctions on one simple map.",
    },
    {
      icon: Brain,
      title: "Measure the impact",
      body: "Each spot gets a 0–100 score, so you can see which ones choke traffic the most — and why.",
    },
    {
      icon: ListOrdered,
      title: "Target enforcement",
      body: "Get a ready patrol plan: which spots to cover, in what order, at the times they're busiest.",
    },
    {
      icon: Siren,
      title: "Plan for events",
      body: "Rallies, matches or festivals? Get quick staffing, barricade and diversion suggestions.",
    },
  ];
  return (
    <section id="how-it-works" className="relative cl-bg py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <Kicker>What it does</Kicker>
          <h2 className="cl-display max-w-2xl text-4xl text-white sm:text-5xl">
            From messy parking data to a clear plan.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.08}>
              <div className="cl-card h-full rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="cl-display text-3xl text-slate-700">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------- operator journey --- */

export function OperatorJourney() {
  const stages = [
    { icon: Eye, title: "Observe", body: "See the city's violation pressure on one map." },
    { icon: Brain, title: "Understand", body: "See exactly why a zone scores high — no jargon." },
    { icon: ListOrdered, title: "Prioritise", body: "Focus on the few zones that matter this shift." },
    { icon: Hand, title: "Deploy", body: "Generate a patrol brief with zones and windows." },
    { icon: RefreshCw, title: "Learn", body: "Compare against the record and refine next time." },
  ];
  return (
    <section className="relative overflow-hidden border-y border-slate-800 bg-[#0a0e16] py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <Kicker>The operator journey</Kicker>
          <h2 className="cl-display max-w-2xl text-4xl text-white sm:text-5xl">
            Built around how a control room actually works.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {stages.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.06}>
              <div className="relative h-full rounded-2xl border border-slate-800 bg-[#0b1426] p-5">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300">
                  <s.icon className="h-5 w-5" />
                </span>
                <p className="mt-4 text-xs font-mono text-slate-600">STEP {i + 1}</p>
                <h3 className="text-base font-bold text-white">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-10 grid gap-6 rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-transparent p-7 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="text-sm font-semibold text-cyan-300">A shift in one scenario</p>
              <p className="mt-3 text-lg leading-relaxed text-slate-200">
                Ahead of a shift, ClearLane scans the supplied records. For a
                junction like <strong className="text-white">KR Market</strong>, it
                surfaces the busiest historical window, explains what&apos;s driving
                the risk, and drafts a patrol brief — so officers arrive before the
                build-up, not after it.
              </p>
            </div>
            <div className="space-y-3">
              {[
                "“Good evening, Control Room.”",
                "“These zones need attention this shift.”",
                "“Why is this zone critical?”",
                "“Draft a patrol brief for two units.”",
              ].map((line) => (
                <p
                  key={line}
                  className="rounded-lg border border-slate-700/70 bg-slate-950/50 px-4 py-2.5 text-sm text-slate-300"
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- methodology --- */

export function RiskMethodology() {
  const factors = [
    { label: "Violation frequency", weight: 30 },
    { label: "Obstruction severity", weight: 25 },
    { label: "Recurrence", weight: 15 },
    { label: "Junction proximity", weight: 15 },
    { label: "Time-of-day concentration", weight: 15 },
  ];
  const legend = [
    { tag: "Observed", color: "text-cyan-300", body: "Read directly from the dataset." },
    { tag: "Calculated", color: "text-amber-300", body: "Computed by the risk engine." },
    { tag: "Forecast", color: "text-violet-300", body: "Projected from history, not live." },
  ];
  return (
    <section id="methodology" className="relative cl-bg py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
        <Reveal>
          <div>
            <Kicker>Easy to trust</Kicker>
            <h2 className="cl-display max-w-xl text-4xl text-white sm:text-5xl">
              One simple score: 0 to 100.
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/90">
              Every junction gets a clear risk score for how badly parking jams it.
              No black box — you can see exactly what goes into it.
            </p>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-500">
              {METRIC_NAME}: {METRIC_EXPLANATION}
            </p>

            <div className="mt-8 space-y-3">
              {factors.map((f, i) => (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">{f.label}</span>
                    <span className="font-mono text-slate-500">{f.weight}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-800">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-500"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${f.weight * 2.6}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, delay: i * 0.08 }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {legend.map((l) => (
                <div key={l.tag} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                  <p className={`text-xs font-bold uppercase tracking-wide ${l.color}`}>{l.tag}</p>
                  <p className="mt-1 text-xs text-slate-400">{l.body}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <AssetScene file="road-junction.glb" scale={1} distance={20} className="h-[380px] w-full" />
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------- responsible AI --- */

export function ResponsibleAI() {
  const limits = [
    "Measures recorded violations — not vehicle speed, occupancy or travel time.",
    "Recording reflects past enforcement, so well-patrolled areas can look busier.",
    "≈5 months of data (Nov 2023–Apr 2024); not real-time, no CCTV or live feeds.",
    "About half of all records have no named junction and are excluded from the map.",
    "Forecasts project historical hourly patterns; they are estimates, not guarantees.",
  ];
  const honest = [
    "No claim of years of data — the window is ≈5 months.",
    "No claimed congestion-reduction percentage.",
    "No real-time CCTV or live traffic feeds.",
    "No number-plate recognition or personal data.",
  ];
  return (
    <section className="relative overflow-hidden border-y border-slate-800 bg-[#0a0e16] py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-2">
        <Reveal>
          <div>
            <Kicker>Responsible by default</Kicker>
            <h2 className="cl-display text-4xl text-white sm:text-5xl">
              Honest about what it is — and isn&apos;t.
            </h2>
            <p className="mt-5 max-w-lg leading-relaxed text-slate-300">
              ClearLane is a decision aid, not an authority. It never issues
              challans, never touches personal or vehicle data, and never claims
              to be an official government system.
            </p>
            <div className="mt-7 inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-200">
              <ShieldCheck className="h-4 w-4" /> {PROTOTYPE_DISCLAIMER}
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="cl-card rounded-2xl p-5">
              <p className="text-sm font-bold text-white">Known limitations</p>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-400">
                {limits.map((l) => (
                  <li key={l} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" /> {l}
                  </li>
                ))}
              </ul>
            </div>
            <div className="cl-card rounded-2xl p-5">
              <p className="text-sm font-bold text-white">What we don&apos;t claim</p>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-400">
                {honest.map((l) => (
                  <li key={l} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" /> {l}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- final CTA -- */

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden cl-bg py-28">
      <div className="cl-grid-bg pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
        <Reveal>
          <div className="mb-6 flex justify-center gap-3 text-cyan-300/80">
            <TrafficPoliceIcon size={26} />
            <PatrolUnitIcon size={26} />
            <JunctionIcon size={26} />
          </div>
          <h2 className="cl-hero-title text-4xl text-white sm:text-6xl">
            Clear the lane.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-slate-300">
            Step into the command centre and explore the supplied Bengaluru
            parking data the way an officer would.
          </p>
          <div className="mt-9 flex justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-8 py-4 text-base font-bold text-slate-950 transition hover:bg-cyan-300 cl-glow"
            >
              Enter Command Centre <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- roadmap --- */

export function RoadmapSection() {
  const items = [
    { icon: <Globe className="h-5 w-5" />, title: "Pan-India coverage", body: "Today it's Bengaluru — next, every major Indian city." },
    { icon: <Bot className="h-5 w-5" />, title: "Smarter AI assistant", body: "A full chat assistant that plans, explains and answers." },
    { icon: <CctvIcon size={22} />, title: "Live camera detection", body: "Spot illegal parking from CCTV in real time." },
    { icon: <RefreshCw className="h-5 w-5" />, title: "Real-time congestion feed", body: "Blend live traffic with parking pressure." },
  ];
  return (
    <section className="relative cl-bg py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <Kicker>What&apos;s next</Kicker>
          <h2 className="cl-display max-w-2xl text-4xl text-white sm:text-5xl">
            This is just the start.
          </h2>
          <p className="mt-4 max-w-xl text-slate-400">
            Today it runs on Bengaluru&apos;s violation data. The plan: every major
            Indian city, live feeds, and a smarter chat assistant.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.07}>
              <div className="cl-card cl-card-hover relative h-full rounded-2xl p-6">
                <span className="absolute right-4 top-4 rounded-full border border-slate-700 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                  Soon
                </span>
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
                  {item.icon}
                </span>
                <h3 className="mt-5 text-base font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- footer --- */

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 bg-[#040507] px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Logo size={32} />
            <p className="mt-3 text-sm text-slate-500">{BILINGUAL_LABEL}</p>
            <p className="mt-3 text-xs text-slate-600">
              Built on the official supplied Bengaluru parking-violation dataset.
            </p>
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Team Gitflix &amp; Code</p>
              <p className="mt-1 text-xs text-slate-600">
                Parth · <a href="mailto:parthbandwal3@gmail.com" className="hover:text-cyan-300">parthbandwal3@gmail.com</a>
              </p>
              <p className="text-xs text-slate-600">
                Dinar · <a href="mailto:dinarofficals@gmail.com" className="hover:text-cyan-300">dinarofficals@gmail.com</a>
              </p>
            </div>
          </div>
          <div className="flex gap-12 text-sm">
            <div>
              <p className="mb-3 font-semibold text-slate-300">Explore</p>
              <ul className="space-y-2 text-slate-500">
                <li><Link href="/dashboard" className="hover:text-cyan-300">Command Centre</Link></li>
                <li><a href="#methodology" className="hover:text-cyan-300">Risk methodology</a></li>
                <li><a href="#how-it-works" className="hover:text-cyan-300">How it works</a></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 font-semibold text-slate-300">Data</p>
              <ul className="space-y-2 text-slate-500">
                <li><a href="/api/health" className="hover:text-cyan-300">API health</a></li>
                <li><span className="text-slate-600">{DATA_FACTS.windowLabel}</span></li>
                <li><span className="text-slate-600">{DATA_FACTS.recordCountLabel} records</span></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-slate-800 pt-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>{PROTOTYPE_DISCLAIMER}</p>
          <p>Not affiliated with, or endorsed by, any government body.</p>
        </div>
      </div>
    </footer>
  );
}
