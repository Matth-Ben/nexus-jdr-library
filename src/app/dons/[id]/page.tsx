import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFeatById } from "@/lib/feats/queries";
import { FeatDetailView } from "./FeatDetailView";

interface FeatDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: FeatDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const featId = Number(id);
  if (!Number.isInteger(featId)) {
    return { title: "Don introuvable — Nexus JDR Bibliothèque" };
  }

  const feat = await getFeatById(featId);
  return {
    title: feat ? `${feat.name} — Nexus JDR Bibliothèque` : "Don introuvable — Nexus JDR Bibliothèque",
  };
}

export default async function FeatDetailPage({ params }: FeatDetailPageProps) {
  const { id } = await params;
  const featId = Number(id);

  if (!Number.isInteger(featId)) {
    notFound();
  }

  const feat = await getFeatById(featId);

  if (!feat) {
    notFound();
  }

  return <FeatDetailView feat={feat} />;
}
