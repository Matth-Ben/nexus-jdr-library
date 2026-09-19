import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExistingPicker } from "./ExistingPicker";

describe("ExistingPicker", () => {
  it("propose une recherche GET par nom (q) qui conserve le type et le mode", () => {
    const { container } = render(<ExistingPicker type="spell" search="boule" result={{ options: [], total: 0 }} />);
    const form = container.querySelector("form");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/propositions/nouvelle");
    expect(screen.getByLabelText("Rechercher par nom")).toHaveAttribute("name", "q");
    expect(screen.getByLabelText("Rechercher par nom")).toHaveValue("boule");
    expect(form?.querySelector("input[name=type]")).toHaveValue("spell");
    expect(form?.querySelector("input[name=mode]")).toHaveValue("modifier");
    expect(screen.getByRole("button", { name: "Rechercher" })).toBeInTheDocument();
  });

  it("liste les éléments avec leur aide au repérage, chacun menant à ?type=…&cible=…", () => {
    render(
      <ExistingPicker
        type="spell"
        search=""
        result={{
          options: [
            { id: 3, name: "Lumière", hint: "0" },
            { id: 12, name: "Boule de feu", hint: "3" },
          ],
          total: 2,
        }}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByRole("link")).toHaveAttribute("href", "/propositions/nouvelle?type=spell&cible=3");
    expect(items[0]).toHaveTextContent("Lumière");
    expect(items[0]).toHaveTextContent("Tour de magie");
    expect(items[1]).toHaveTextContent("Niveau 3");
    expect(screen.getByText("2 sorts.")).toBeInTheDocument();
  });

  it("objets : catégorie en français ; races et classes : nom seul", () => {
    const item = render(
      <ExistingPicker type="item" search="" result={{ options: [{ id: 1, name: "Cotte", hint: "armure" }], total: 1 }} />,
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("Armure");
    item.unmount();
    render(<ExistingPicker type="class" search="" result={{ options: [{ id: 1, name: "Barde" }], total: 1 }} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/propositions/nouvelle?type=class&cible=1");
  });

  it("signale qu'il y en a plus que la liste affichée", () => {
    const options = Array.from({ length: 50 }, (_, index) => ({ id: index + 1, name: `Sort ${index + 1}` }));
    render(<ExistingPicker type="spell" search="" result={{ options, total: 477 }} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(50);
    expect(screen.getByText(/50 sorts affichés sur 477 : précise ta recherche/)).toBeInTheDocument();
  });

  it("aucun résultat, erreur de chargement", () => {
    const none = render(<ExistingPicker type="feat" search="zzz" result={{ options: [], total: 0 }} />);
    expect(screen.getByText("Aucun élément ne correspond à « zzz ».")).toBeInTheDocument();
    none.unmount();
    render(<ExistingPicker type="feat" search="" result={null} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Impossible de charger la liste");
  });

  it("échappe le texte recherché (pas de HTML injecté)", () => {
    render(<ExistingPicker type="feat" search="<b>x</b>" result={{ options: [], total: 0 }} />);
    expect(document.querySelector("b")).toBeNull();
  });
});
