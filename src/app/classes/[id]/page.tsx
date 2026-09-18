import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClassById } from "@/lib/classes/queries";
import { ClassDetailView } from "./ClassDetailView";

interface ClassDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ClassDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const classId = Number(id);
  if (!Number.isInteger(classId)) {
    return { title: "Classe introuvable — Nexus JDR Bibliothèque" };
  }

  const klass = await getClassById(classId);
  return {
    title: klass ? `${klass.name} — Nexus JDR Bibliothèque` : "Classe introuvable — Nexus JDR Bibliothèque",
  };
}

export default async function ClassDetailPage({ params }: ClassDetailPageProps) {
  const { id } = await params;
  const classId = Number(id);

  if (!Number.isInteger(classId)) {
    notFound();
  }

  const klass = await getClassById(classId);

  if (!klass) {
    notFound();
  }

  return <ClassDetailView klass={klass} />;
}
