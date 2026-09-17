import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSpellById } from "@/lib/spells/queries";
import { SpellDetailView } from "./SpellDetailView";

interface SpellDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: SpellDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const spellId = Number(id);
  if (!Number.isInteger(spellId)) {
    return { title: "Sort introuvable — Nexus JDR Bibliothèque" };
  }

  const spell = await getSpellById(spellId);
  return {
    title: spell ? `${spell.name} — Nexus JDR Bibliothèque` : "Sort introuvable — Nexus JDR Bibliothèque",
  };
}

export default async function SpellDetailPage({ params }: SpellDetailPageProps) {
  const { id } = await params;
  const spellId = Number(id);

  if (!Number.isInteger(spellId)) {
    notFound();
  }

  const spell = await getSpellById(spellId);

  if (!spell) {
    notFound();
  }

  return <SpellDetailView spell={spell} />;
}
