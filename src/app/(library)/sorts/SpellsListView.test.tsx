import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SpellListItem } from "@/lib/spells/types";
import { SpellsListView } from "./SpellsListView";

const SPELLS: SpellListItem[] = [
  {
    id: 1,
    name: "Projectile magique",
    level: 1,
    school: "Évocation",
    castingTime: "1 action",
    concentration: false,
  },
  {
    id: 4,
    name: "Bouclier de la foi",
    level: 1,
    school: "Abjuration",
    castingTime: "1 action bonus",
    concentration: true,
  },
];

describe("SpellsListView (panneau)", () => {
  it("conserve les filtres en cours dans le lien qui ouvre le panneau", () => {
    render(
      <SpellsListView
        spells={SPELLS}
        totalCount={4}
        schools={["Abjuration", "Évocation"]}
        query="proj"
        level={0}
        school="Évocation"
        loadError={false}
      />,
    );

    const href = screen.getByRole("link", { name: /Projectile magique/ }).getAttribute("href");
    const params = new URL(href ?? "", "http://x").searchParams;
    expect(params.get("q")).toBe("proj");
    expect(params.get("level")).toBe("0");
    expect(params.get("school")).toBe("Évocation");
    expect(params.get("open")).toBe("1");
  });

  it("met en surbrillance l'élément ouvert (aria-current)", () => {
    render(
      <SpellsListView
        spells={SPELLS}
        totalCount={4}
        schools={[]}
        query=""
        loadError={false}
        openId={4}
      />,
    );

    expect(screen.getByRole("link", { name: /Bouclier de la foi/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: /Projectile magique/ })).not.toHaveAttribute("aria-current");
  });
});

describe("SpellsListView", () => {
  it("affiche les sorts filtrés avec un lien vers leur fiche", () => {
    render(
      <SpellsListView
        spells={SPELLS}
        totalCount={4}
        schools={["Abjuration", "Évocation"]}
        query=""
        loadError={false}
      />,
    );

    const projectileLink = screen.getByRole("link", { name: /Projectile magique/ });
    expect(projectileLink).toHaveAttribute("href", "/sorts?open=1");
    expect(screen.getByRole("link", { name: /Bouclier de la foi/ })).toHaveAttribute(
      "href",
      "/sorts?open=4",
    );
    expect(screen.getByText("Concentration")).toBeInTheDocument();
    expect(screen.getByText("2 / 4 sorts")).toBeInTheDocument();
  });

  it("affiche un état vide distinct quand la recherche ne trouve rien", () => {
    render(
      <SpellsListView
        spells={[]}
        totalCount={4}
        schools={["Abjuration", "Évocation"]}
        query="sort inexistant"
        loadError={false}
      />,
    );

    expect(screen.getByText("Aucun sort ne correspond à ces critères.")).toBeInTheDocument();
  });

  it("affiche un état vide distinct quand le référentiel est vide", () => {
    render(<SpellsListView spells={[]} totalCount={0} schools={[]} query="" loadError={false} />);

    expect(screen.getByText("Aucun sort disponible pour le moment.")).toBeInTheDocument();
  });

  it("affiche un message d'erreur explicite quand le chargement a échoué", () => {
    render(<SpellsListView spells={[]} totalCount={0} schools={[]} query="" loadError={true} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Impossible de charger les sorts pour le moment.",
    );
  });

  it("préremplit le formulaire avec les filtres actifs", () => {
    render(
      <SpellsListView
        spells={SPELLS}
        totalCount={4}
        schools={["Abjuration", "Évocation"]}
        query="bouclier"
        level={1}
        school="Abjuration"
        loadError={false}
      />,
    );

    expect(screen.getByLabelText("Recherche")).toHaveValue("bouclier");
    expect(screen.getByLabelText("Niveau")).toHaveValue("1");
    expect(screen.getByLabelText("École")).toHaveValue("Abjuration");
  });
});
