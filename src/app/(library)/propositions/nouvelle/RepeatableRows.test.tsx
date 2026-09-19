import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RepeatableRows, type RepeatableRowsProps } from "./RepeatableRows";

type Props = Partial<Omit<RepeatableRowsProps, "children">>;

function Rows(props: Props) {
  return (
    <form>
      <RepeatableRows
        name="traits"
        valueName="traits"
        errorName="traits"
        values={{}}
        errors={{}}
        legend="Traits"
        itemLabel="Trait"
        addLabel="Ajouter un trait"
        max={3}
        {...props}
      >
        {(row) => {
          const field = row.field("name");
          return (
            <>
              <label htmlFor={`id-${field.name}`}>Nom {row.position + 1}</label>
              <input id={`id-${field.name}`} name={field.name} defaultValue={field.defaultValue} />
              {field.error ? <span role="alert">{field.error}</span> : null}
            </>
          );
        }}
      </RepeatableRows>
    </form>
  );
}

const names = (container: HTMLElement) =>
  [...container.querySelectorAll("input")].map((input) => [input.getAttribute("name"), input.value]);

describe("RepeatableRows", () => {
  it("affiche une première ligne vide par défaut", () => {
    const { container } = render(<Rows />);
    expect(names(container)).toEqual([["traits.0.name", ""]]);
    expect(screen.getByText("Trait 1")).toBeInTheDocument();
  });

  it("sans JavaScript (rendu serveur) : la première ligne est là, les boutons inertes sont cachés", () => {
    const html = renderToString(<Rows />);
    expect(html).toContain('name="traits.0.name"');
    expect(html).toMatch(/<button[^>]*hidden[^>]*>Supprimer/);
    expect(html).toMatch(/<button[^>]*hidden[^>]*>Ajouter un trait/);
  });

  it("ajoute une ligne, place le focus dessus, et numérote par position", async () => {
    const user = userEvent.setup();
    const { container } = render(<Rows />);
    await user.click(screen.getByRole("button", { name: "Ajouter un trait" }));
    expect(names(container).map(([name]) => name)).toEqual(["traits.0.name", "traits.1.name"]);
    expect(screen.getByLabelText("Nom 2")).toHaveFocus();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("respecte le maximum : le bouton Ajouter se désactive", async () => {
    const user = userEvent.setup();
    render(<Rows max={2} />);
    const add = screen.getByRole("button", { name: "Ajouter un trait" });
    await user.click(add);
    expect(add).toBeDisabled();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("respecte le minimum : Supprimer désactivé à la borne", async () => {
    const user = userEvent.setup();
    render(<Rows min={1} />);
    expect(screen.getByRole("button", { name: "Supprimer trait 1" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Ajouter un trait" }));
    expect(screen.getByRole("button", { name: "Supprimer trait 1" })).toBeEnabled();
  });

  it("supprime une ligne en gardant la saisie des autres, renumérote, replace le focus", async () => {
    const user = userEvent.setup();
    const { container } = render(<Rows />);
    await user.type(screen.getByLabelText("Nom 1"), "A");
    await user.click(screen.getByRole("button", { name: "Ajouter un trait" }));
    await user.keyboard("B");
    await user.click(screen.getByRole("button", { name: "Ajouter un trait" }));
    await user.keyboard("C");
    expect(names(container)).toEqual([
      ["traits.0.name", "A"],
      ["traits.1.name", "B"],
      ["traits.2.name", "C"],
    ]);

    await user.click(screen.getByRole("button", { name: "Supprimer trait 2" }));
    expect(names(container)).toEqual([
      ["traits.0.name", "A"],
      ["traits.1.name", "C"],
    ]);
    // Le focus va sur la ligne qui a pris la place de celle supprimée.
    expect(screen.getByLabelText("Nom 2")).toHaveFocus();
  });

  it("après suppression de la dernière ligne, le focus retourne sur la précédente ; sans ligne, sur Ajouter", async () => {
    const user = userEvent.setup();
    render(<Rows />);
    await user.click(screen.getByRole("button", { name: "Ajouter un trait" }));
    await user.click(screen.getByRole("button", { name: "Supprimer trait 2" }));
    expect(screen.getByLabelText("Nom 1")).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Supprimer trait 1" }));
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Ajouter un trait" })).toHaveFocus();
  });

  it("est utilisable au clavier (Entrée sur les boutons)", async () => {
    const user = userEvent.setup();
    render(<Rows />);
    screen.getByRole("button", { name: "Ajouter un trait" }).focus();
    await user.keyboard("{Enter}");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByLabelText("Nom 2")).toHaveFocus();
    // Tab suivant : « Supprimer » de la ligne 2, puis « Ajouter » — tout reste atteignable au clavier.
    await user.tab();
    expect(screen.getByRole("button", { name: "Ajouter un trait" })).toHaveFocus();
    await user.tab({ shift: true });
    await user.tab({ shift: true });
    await user.keyboard("{Enter}");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("reconstruit toutes les lignes soumises, avec valeurs et erreurs par ligne (rang), trous d'index compris", () => {
    const { container } = render(
      <Rows
        values={{ "traits.0.name": "A", "traits.4.name": "B", "traits.9.name": "" }}
        errors={{ "traits.1.name": "Trop court", traits: "Liste invalide" }}
      />,
    );
    // Les noms sont recontigus ; l'erreur du rang 1 est à côté de la 2e ligne.
    expect(names(container)).toEqual([
      ["traits.0.name", "A"],
      ["traits.1.name", "B"],
      ["traits.2.name", ""],
    ]);
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).queryByRole("alert")).toBeNull();
    expect(within(items[1]).getByRole("alert")).toHaveTextContent("Trop court");
    expect(screen.getByText("Liste invalide")).toBeInTheDocument();
  });

  it("l'erreur reste sur sa ligne d'origine après suppression d'une ligne précédente", async () => {
    const user = userEvent.setup();
    render(<Rows values={{ "traits.0.name": "A", "traits.1.name": "B" }} errors={{ "traits.1.name": "Erreur B" }} />);
    await user.click(screen.getByRole("button", { name: "Supprimer trait 1" }));
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(within(items[0]).getByRole("alert")).toHaveTextContent("Erreur B");
    expect(within(items[0]).getByLabelText("Nom 1")).toHaveValue("B");
  });

  it("une ligne ajoutée n'hérite d'aucune valeur ni erreur", async () => {
    const user = userEvent.setup();
    render(<Rows values={{ "traits.0.name": "A" }} errors={{ "traits.0.name": "Erreur A" }} />);
    await user.click(screen.getByRole("button", { name: "Ajouter un trait" }));
    const items = screen.getAllByRole("listitem");
    expect(within(items[1]).queryByRole("alert")).toBeNull();
    expect(within(items[1]).getByLabelText("Nom 2")).toHaveValue("");
  });

  it("listes imbriquées : préfixes de noms et de valeurs propres à chaque ligne parente", () => {
    const values = {
      "subraces.0.name": "S0",
      "subraces.0.traits.0.name": "T00",
      "subraces.3.name": "S3",
      "subraces.3.traits.0.name": "T30",
      "subraces.3.traits.1.name": "T31",
    };
    const { container } = render(
      <form>
        <RepeatableRows
          name="subraces"
          valueName="subraces"
          errorName="subraces"
          values={values}
          errors={{ "subraces.1.traits.1.name": "Erreur T31" }}
          legend="Sous-races"
          itemLabel="Sous-race"
          addLabel="Ajouter une sous-race"
          max={6}
        >
          {(row) => (
            <>
              <input name={row.field("name").name} defaultValue={row.field("name").defaultValue} aria-label="sr" />
              <RepeatableRows
                name={`${row.name}.traits`}
                valueName={row.valueName ? `${row.valueName}.traits` : null}
                errorName={row.errorName ? `${row.errorName}.traits` : null}
                values={values}
                errors={{ "subraces.1.traits.1.name": "Erreur T31" }}
                legend="Traits"
                itemLabel="Trait"
                addLabel="Ajouter un trait"
                max={8}
              >
                {(trait) => (
                  <>
                    <input name={trait.field("name").name} defaultValue={trait.field("name").defaultValue} aria-label="t" />
                    {trait.field("name").error ? <span role="alert">{trait.field("name").error}</span> : null}
                  </>
                )}
              </RepeatableRows>
            </>
          )}
        </RepeatableRows>
      </form>,
    );
    expect(names(container)).toEqual([
      ["subraces.0.name", "S0"],
      ["subraces.0.traits.0.name", "T00"],
      ["subraces.1.name", "S3"],
      ["subraces.1.traits.0.name", "T30"],
      ["subraces.1.traits.1.name", "T31"],
    ]);
    expect(screen.getByRole("alert")).toHaveTextContent("Erreur T31");
  });
});
