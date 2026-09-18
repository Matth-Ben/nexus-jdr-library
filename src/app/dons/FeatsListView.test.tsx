import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FeatListItem } from "@/lib/feats/types";
import { FeatsListView } from "./FeatsListView";

const FEATS: FeatListItem[] = [
  { id: 1, name: "Athlète", prerequisiteText: null },
  { id: 3, name: "Attaque à outrance", prerequisiteText: "Force 13 ou plus" },
];

describe("FeatsListView", () => {
  it("affiche les dons filtrés avec un lien vers leur fiche", () => {
    render(<FeatsListView feats={FEATS} totalCount={3} query="" loadError={false} />);

    const athleteLink = screen.getByRole("link", { name: /Athlète/ });
    expect(athleteLink).toHaveAttribute("href", "/dons/1");
    expect(screen.getByRole("link", { name: /Attaque à outrance/ })).toHaveAttribute(
      "href",
      "/dons/3",
    );
    expect(screen.getByText(/Force 13 ou plus/)).toBeInTheDocument();
    expect(screen.getByText("2 / 3 dons")).toBeInTheDocument();
  });

  it("affiche un état vide distinct quand la recherche ne trouve rien", () => {
    render(<FeatsListView feats={[]} totalCount={3} query="don inexistant" loadError={false} />);

    expect(screen.getByText("Aucun don ne correspond à ces critères.")).toBeInTheDocument();
  });

  it("affiche un état vide distinct quand le référentiel est vide", () => {
    render(<FeatsListView feats={[]} totalCount={0} query="" loadError={false} />);

    expect(screen.getByText("Aucun don disponible pour le moment.")).toBeInTheDocument();
  });

  it("affiche un message d'erreur explicite quand le chargement a échoué", () => {
    render(<FeatsListView feats={[]} totalCount={0} query="" loadError={true} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Impossible de charger les dons pour le moment.",
    );
  });

  it("préremplit le formulaire avec la recherche active", () => {
    render(<FeatsListView feats={FEATS} totalCount={3} query="athlète" loadError={false} />);

    expect(screen.getByLabelText("Recherche")).toHaveValue("athlète");
  });
});
