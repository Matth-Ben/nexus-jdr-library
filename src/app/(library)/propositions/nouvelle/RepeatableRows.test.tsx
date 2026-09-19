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

const four = {
  "traits.0.name": "Vision",
  "traits.1.name": "Chance",
  "traits.2.name": "Ruse",
  "traits.3.name": "Agilité",
};
const summaryName = (read: (sub: string) => string) => read("name");

describe("RepeatableRows : volets repliables", () => {
  it("jusqu'à 3 lignes, elles démarrent dépliées", () => {
    render(<Rows values={{ "traits.0.name": "A", "traits.1.name": "B", "traits.2.name": "C" }} summary={summaryName} />);
    const toggles = screen.getAllByRole("button", { name: /^Trait \d/ });
    expect(toggles).toHaveLength(3);
    for (const toggle of toggles) expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("au-delà de 3 lignes, elles démarrent repliées et affichent leur résumé", () => {
    render(<Rows max={6} values={four} summary={summaryName} />);
    const toggles = screen.getAllByRole("button", { name: /^Trait \d/ });
    expect(toggles).toHaveLength(4);
    for (const toggle of toggles) expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: /Trait 2\s*Chance/ })).toBeInTheDocument();
  });

  it("une ligne repliée reste dans le formulaire : sa saisie est bien soumise", () => {
    const { container } = render(<Rows max={6} values={four} summary={summaryName} />);
    const form = container.querySelector("form") as HTMLFormElement;
    expect(new FormData(form).getAll("traits.1.name")).toEqual(["Chance"]);
    expect(container.querySelector("#traits-row-1-body")).toHaveAttribute("hidden");
  });

  it("déplie et replie une ligne au clic, en synchronisant aria-expanded et le contenu", async () => {
    const user = userEvent.setup();
    const { container } = render(<Rows max={6} values={four} summary={summaryName} />);
    const toggle = screen.getByRole("button", { name: /Trait 2/ });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(container.querySelector("#traits-row-1-body")).not.toHaveAttribute("hidden");
    expect(toggle).toHaveAttribute("aria-controls", "traits-row-1-body");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(container.querySelector("#traits-row-1-body")).toHaveAttribute("hidden");
  });

  it("une ligne en erreur démarre dépliée, les autres restent repliées", () => {
    render(
      <Rows max={6} values={four} errors={{ "traits.2.name": "Le nom est obligatoire." }} summary={summaryName} />,
    );
    const expanded = screen.getAllByRole("button", { name: /^Trait \d/ }).map((toggle) => toggle.getAttribute("aria-expanded"));
    expect(expanded).toEqual(["false", "false", "true", "false"]);
    expect(screen.getByRole("alert")).toHaveTextContent("Le nom est obligatoire.");
  });

  it("met à jour le résumé pendant la saisie", async () => {
    const user = userEvent.setup();
    render(<Rows max={6} values={four} summary={summaryName} />);
    await user.click(screen.getByRole("button", { name: /Trait 1/ }));
    const input = screen.getByLabelText("Nom 1");
    await user.clear(input);
    await user.type(input, "Vue perçante");
    expect(screen.getByRole("button", { name: /Trait 1\s*Vue perçante/ })).toBeInTheDocument();
  });

  it("une ligne ajoutée s'ouvre et prend le focus, même quand les autres sont repliées", async () => {
    const user = userEvent.setup();
    render(<Rows max={6} values={four} summary={summaryName} />);
    await user.click(screen.getByRole("button", { name: "Ajouter un trait" }));
    expect(screen.getByRole("button", { name: /Trait 5/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Nom 5")).toHaveFocus();
  });

  it("supprimer une ligne dont la voisine est repliée place le focus sur le bouton de cette voisine", async () => {
    const user = userEvent.setup();
    render(<Rows max={6} values={four} summary={summaryName} />);
    await user.click(screen.getByRole("button", { name: "Supprimer trait 1" }));
    expect(screen.getAllByRole("button", { name: /^Trait \d/ })).toHaveLength(3);
    expect(screen.getByRole("button", { name: /Trait 1\s*Chance/ })).toHaveFocus();
  });

  it("« Tout déplier » / « Tout replier » agissent sur toute la liste", async () => {
    const user = userEvent.setup();
    render(<Rows max={6} values={four} summary={summaryName} />);
    await user.click(screen.getByRole("button", { name: "Tout déplier : Traits" }));
    for (const toggle of screen.getAllByRole("button", { name: /^Trait \d/ })) {
      expect(toggle).toHaveAttribute("aria-expanded", "true");
    }
    await user.click(screen.getByRole("button", { name: "Tout replier : Traits" }));
    for (const toggle of screen.getAllByRole("button", { name: /^Trait \d/ })) {
      expect(toggle).toHaveAttribute("aria-expanded", "false");
    }
  });

  it("pas de bouton « Tout déplier » avec une seule ligne", () => {
    render(<Rows />);
    expect(screen.queryByRole("button", { name: /Tout (déplier|replier)/ })).not.toBeInTheDocument();
  });

  it("sans JavaScript (rendu serveur) : toutes les lignes sont dépliées, sans bouton de volet", () => {
    const html = renderToString(<Rows max={6} values={four} summary={summaryName} />);
    expect(html).not.toContain("data-row-toggle");
    expect(html).not.toMatch(/data-row-body[^>]*hidden/);
    expect(html).toContain('name="traits.3.name"');
  });

  it("listes imbriquées : le résumé de la ligne parente ignore les saisies de la liste enfant", async () => {
    const user = userEvent.setup();
    render(
      <form>
        <RepeatableRows
          name="subraces"
          valueName={null}
          errorName={null}
          values={{}}
          errors={{}}
          legend="Sous-races"
          itemLabel="Sous-race"
          addLabel="Ajouter une sous-race"
          max={3}
          summary={summaryName}
        >
          {(outer) => (
            <>
              <input aria-label="Nom de la sous-race" name={outer.field("name").name} />
              <RepeatableRows
                name={`${outer.name}.traits`}
                valueName={null}
                errorName={null}
                values={{}}
                errors={{}}
                legend="Traits"
                itemLabel="Trait"
                addLabel="Ajouter un trait"
                max={3}
                summary={summaryName}
              >
                {(inner) => <input aria-label="Nom du trait" name={inner.field("name").name} />}
              </RepeatableRows>
            </>
          )}
        </RepeatableRows>
      </form>,
    );
    await user.type(screen.getByLabelText("Nom de la sous-race"), "Elfe des bois");
    await user.type(screen.getByLabelText("Nom du trait"), "Pas léger");
    expect(screen.getByRole("button", { name: /Sous-race 1\s*Elfe des bois/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Trait 1\s*Pas léger/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sous-race 1.*Pas léger/ })).not.toBeInTheDocument();
  });
});
