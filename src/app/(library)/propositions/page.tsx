import type { User } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailPanel } from "@/components/DetailPanel";
import { closeHref, panelHref } from "@/lib/panel";
import { fetchExisting } from "@/lib/proposals/existing-fetch";
import { createSessionClient } from "@/lib/supabase/server";
import { filterParams, parseOpenUuid, parseProposalFilters } from "@/lib/proposals/filters";
import { getCurrentUser, getProposal, getUserVote, isAdmin, listComments, listProposals } from "@/lib/proposals/queries";
import type {
  ProposalComment,
  ProposalDetail,
  ProposalFilters,
  ProposalListItem,
  VoteValue,
} from "@/lib/proposals/types";
import type { RawSearchParams } from "@/lib/spells/filters";
import { ProposalDetailView, type ProposalTarget } from "./ProposalDetailView";
import { ProposalsListView } from "./ProposalsListView";

export const metadata: Metadata = {
  title: "Propositions — Nexus JDR Bibliothèque",
  description: "Propositions de contenu de la communauté : sorts, dons, objets, races et classes à discuter et à voter.",
};

interface ProposalsPageProps {
  searchParams: Promise<RawSearchParams>;
}

interface PanelData {
  user: User | null;
  proposal: ProposalDetail | null;
  comments: ProposalComment[];
  admin: boolean;
  userVote: VoteValue | null;
  target: ProposalTarget | undefined;
}

/** Recharge l'élément visé par une modification (pour le diff). Jamais bloquant pour le reste du panneau. */
async function loadTarget(proposal: ProposalDetail | null): Promise<ProposalTarget | undefined> {
  if (!proposal || proposal.target_id === null || proposal.target_id === undefined) return undefined;
  try {
    const existing = await fetchExisting(await createSessionClient(), proposal.content_type, proposal.target_id);
    return existing ? { status: "found", existing } : { status: "missing" };
  } catch (error) {
    console.error("[propositions] échec du chargement de l'élément visé", error);
    return { status: "error" };
  }
}

async function PanelContent({ id, filters }: { id: string; filters: ProposalFilters }) {
  const params = filterParams(filters);

  let data: PanelData | null = null;
  try {
    const user = await getCurrentUser();
    const [proposal, comments, admin, userVote] = await Promise.all([
      getProposal(id),
      listComments(id),
      user ? isAdmin() : Promise.resolve(false),
      user ? getUserVote(id, user.id) : Promise.resolve(null),
    ]);
    const target = await loadTarget(proposal);
    data = { user, proposal, comments, admin, userVote, target };
  } catch (error) {
    console.error("[propositions] échec du chargement d'une proposition", error);
  }

  if (!data) {
    return <p role="alert">Impossible de charger cette proposition pour le moment.</p>;
  }
  if (!data.proposal) {
    return <p>Fiche introuvable.</p>;
  }
  return (
    <ProposalDetailView
      proposal={data.proposal}
      target={data.target}
      comments={data.comments}
      userId={data.user?.id ?? null}
      userVote={data.userVote}
      isAdmin={data.admin}
      returnTo={panelHref("/propositions", params, id)}
      closeHref={closeHref("/propositions", params)}
    />
  );
}

export default async function ProposalsPage({ searchParams }: ProposalsPageProps) {
  const resolvedSearchParams = await searchParams;
  const openId = parseOpenUuid(resolvedSearchParams.open);
  const filters = parseProposalFilters(resolvedSearchParams);

  let proposals: ProposalListItem[] = [];
  let loadError = false;
  try {
    proposals = await listProposals(filters);
  } catch (error) {
    console.error("[propositions] échec du chargement de la liste", error);
    loadError = true;
  }

  return (
    <>
      <ProposalsListView proposals={proposals} filters={filters} loadError={loadError} openId={openId} />
      {openId !== undefined ? (
        <DetailPanel closeHref={closeHref("/propositions", filterParams(filters))} resetKey={openId}>
          <Suspense key={openId} fallback={<p>Chargement…</p>}>
            <PanelContent id={openId} filters={filters} />
          </Suspense>
        </DetailPanel>
      ) : null}
    </>
  );
}
