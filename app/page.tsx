import type { Metadata } from "next";
import { Hero } from "@/components/landing/Hero";
import { HotspotPreview } from "@/components/landing/HotspotPreview";
import { PatrolPlanningDemo } from "@/components/landing/PatrolPlanningDemo";
import {
  CredibilityStrip,
  FinalCTA,
  HowClearLaneThinks,
  OperatorJourney,
  ProblemStory,
  ResponsibleAI,
  RiskMethodology,
  RoadmapSection,
  SiteFooter,
} from "@/components/landing/StorySections";

export const metadata: Metadata = {
  title: "ClearLane Bengaluru — Parking-Congestion Command Prototype",
  description:
    "Bengaluru traffic command. Explainable parking-congestion risk, fitted next-shift forecasts and patrol planning, computed only from the supplied violation dataset. Not an official government service.",
};

export default function Home() {
  return (
    <main className="cl-bg min-h-screen overflow-x-hidden">
      <Hero />
      <CredibilityStrip />
      <ProblemStory />
      <HowClearLaneThinks />
      <HotspotPreview />
      <OperatorJourney />
      <RiskMethodology />
      <PatrolPlanningDemo />
      <ResponsibleAI />
      <RoadmapSection />
      <FinalCTA />
      <SiteFooter />
    </main>
  );
}
