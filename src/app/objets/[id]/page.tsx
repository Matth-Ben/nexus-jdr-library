import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getItemById } from "@/lib/items/queries";
import { ItemDetailView } from "./ItemDetailView";

interface ItemDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ItemDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) {
    return { title: "Objet introuvable — Nexus JDR Bibliothèque" };
  }

  const item = await getItemById(itemId);
  return {
    title: item ? `${item.name} — Nexus JDR Bibliothèque` : "Objet introuvable — Nexus JDR Bibliothèque",
  };
}

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { id } = await params;
  const itemId = Number(id);

  if (!Number.isInteger(itemId)) {
    notFound();
  }

  const item = await getItemById(itemId);

  if (!item) {
    notFound();
  }

  return <ItemDetailView item={item} />;
}
