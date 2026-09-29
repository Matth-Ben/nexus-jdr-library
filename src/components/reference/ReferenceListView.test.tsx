import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReferenceListView, type ReferenceListViewProps } from "./ReferenceListView";

const BASE_PROPS: ReferenceListViewProps = {
  title: "Sous-classes",
  basePath: "/sous-classes",
  entries: [
    { id: 1, name: "Voie du Berserker", meta: ["Dès le niveau 3"], group: "Barbare" },
    { id: 2, name: "Voie du Totem", meta: ["Dès le niveau 3"], group: "Barbare" },
    { id: 9, name: "Collège du savoir", meta: [], group: "Barde" },
  ],
  totalCount: 103,
  query: "",
  searchPlaceholder: "Nom",
  selects: [
    {
      name: "classe",
      label: "Classe",
      value: "",
      allLabel: "Toutes les classes",
      options: [
        { value: "1", label: "Barbare" },
        { value: "2", label: "Barde" },
      ],
    },
  ],
  labels: {
    plural: "sous-classes",
    emptyAll: "Aucune sous-classe disponible pour le moment.",
    emptyFiltered: "Aucune sous-classe ne correspond à ces critères.",
    loadError: "Impossible de charger les sous-classes pour le moment.",
  },
  loadError: false,
};

describe("ReferenceListView", () => {
  it("liste les éléments avec un lien vers leur fiche et le compteur", () => {
    render(<ReferenceListView {...BASE_PROPS} />);

    expect(screen.getByRole("link", { name: /Voie du Berserker/ })).toHaveAttribute(
      "href",
      "/sous-classes?open=1",
    );
    expect(screen.getByText("3 / 103 sous-classes")).toBeInTheDocument();
  });

  it("regroupe les éléments consécutifs sous un intitulé", () => {
    render(<ReferenceListView {...BASE_PROPS} />);

    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Barbare",
      "Barde",
    ]);
  });

  it("conserve la recherche et les filtres dans le lien vers une fiche", () => {
    render(
      <ReferenceListView
        {...BASE_PROPS}
        query="voie"
        selects={[{ ...BASE_PROPS.selects![0], value: "1" }]}
      />,
    );

    expect(screen.getByRole("link", { name: /Voie du Totem/ })).toHaveAttribute(
      "href",
      "/sous-classes?q=voie&classe=1&open=2",
    );
    expect(screen.getByLabelText("Recherche")).toHaveValue("voie");
    expect(screen.getByLabelText("Classe")).toHaveValue("1");
  });

  it("marque l'élément ouvert dans le panneau", () => {
    render(<ReferenceListView {...BASE_PROPS} openId={2} />);

    expect(screen.getByRole("link", { name: /Voie du Totem/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("distingue référentiel vide, recherche sans résultat et erreur", () => {
    const { rerender } = render(<ReferenceListView {...BASE_PROPS} entries={[]} totalCount={0} />);
    expect(screen.getByText("Aucune sous-classe disponible pour le moment.")).toBeInTheDocument();

    rerender(<ReferenceListView {...BASE_PROPS} entries={[]} />);
    expect(screen.getByText("Aucune sous-classe ne correspond à ces critères.")).toBeInTheDocument();

    rerender(<ReferenceListView {...BASE_PROPS} entries={[]} totalCount={0} loadError />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Impossible de charger les sous-classes pour le moment.",
    );
  });
});
