import { redirect } from "next/navigation";

interface LegacyDetailPageProps {
  params: Promise<{ id: string }>;
}

/** Ancienne URL de fiche : ouvre désormais le panneau sur la liste. */
export default async function LegacyDetailPage({ params }: LegacyDetailPageProps) {
  const { id } = await params;
  redirect(`/objets?open=${encodeURIComponent(id)}`);
}
