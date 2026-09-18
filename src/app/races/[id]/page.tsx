import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRaceById } from "@/lib/races/queries";
import { RaceDetailView } from "./RaceDetailView";

interface RaceDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: RaceDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const raceId = Number(id);
  if (!Number.isInteger(raceId)) {
    return { title: "Race introuvable — Nexus JDR Bibliothèque" };
  }

  const race = await getRaceById(raceId);
  return {
    title: race ? `${race.name} — Nexus JDR Bibliothèque` : "Race introuvable — Nexus JDR Bibliothèque",
  };
}

export default async function RaceDetailPage({ params }: RaceDetailPageProps) {
  const { id } = await params;
  const raceId = Number(id);

  if (!Number.isInteger(raceId)) {
    notFound();
  }

  const race = await getRaceById(raceId);

  if (!race) {
    notFound();
  }

  return <RaceDetailView race={race} />;
}
