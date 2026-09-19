import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProposeModificationLink } from "@/components/ProposeModificationLink";
import { ClassDetailView } from "./classes/ClassDetailView";
import { FeatDetailView } from "./dons/FeatDetailView";
import { ItemDetailView } from "./objets/ItemDetailView";
import { RaceDetailView } from "./races/RaceDetailView";
import { SpellDetailView } from "./sorts/SpellDetailView";

const LINK = "Proposer une modification";

describe("lien « Proposer une modification »", () => {
  it("mène au formulaire de modification du bon type et de la bonne cible", () => {
    render(<ProposeModificationLink type="spell" id={12} />);
    expect(screen.getByRole("link", { name: LINK })).toHaveAttribute("href", "/propositions/nouvelle?type=spell&cible=12");
  });

  it("sort", () => {
    render(
      <SpellDetailView
        spell={{
          id: 7,
          name: "Boule de feu",
          level: 3,
          school: "Évocation",
          castingTime: "1 action",
          concentration: false,
          range: "45 m",
          components: "V, S",
          duration: "Instantanée",
          description: "Boum.",
        }}
      />,
    );
    expect(screen.getByRole("link", { name: LINK })).toHaveAttribute("href", "/propositions/nouvelle?type=spell&cible=7");
  });

  it("don", () => {
    render(<FeatDetailView feat={{ id: 8, name: "Chanceux", prerequisiteText: null, description: "Relance." }} />);
    expect(screen.getByRole("link", { name: LINK })).toHaveAttribute("href", "/propositions/nouvelle?type=feat&cible=8");
  });

  it("objet", () => {
    render(
      <ItemDetailView
        item={{
          id: 9,
          name: "Dague",
          category: "arme",
          cost: { amount: 2, currency: "gp" },
          weight: 0.5,
          description: "Courte.",
          source: null,
          rarity: null,
          requiresAttunement: false,
          consumable: false,
          weaponProperties: null,
          armorProperties: null,
        }}
      />,
    );
    expect(screen.getByRole("link", { name: LINK })).toHaveAttribute("href", "/propositions/nouvelle?type=item&cible=9");
  });

  it("race", () => {
    render(
      <RaceDetailView
        race={{
          id: 10,
          name: "Elfe",
          size: "Moyenne",
          speed: 9,
          source: null,
          abilityBonuses: "DEX +2",
          languages: [],
          traits: [],
          subraces: [],
        }}
      />,
    );
    expect(screen.getByRole("link", { name: LINK })).toHaveAttribute("href", "/propositions/nouvelle?type=race&cible=10");
  });

  it("classe", () => {
    render(
      <ClassDetailView
        klass={{
          id: 11,
          name: "Barde",
          hitDie: 8,
          source: null,
          description: "Un artiste.",
          primaryAbilities: [],
          savingThrowProficiencies: [],
          armorProficiencies: [],
          weaponProficiencies: [],
          toolProficiencies: [],
          skillChoicesLabel: "",
          features: [],
          subclasses: [],
        }}
      />,
    );
    expect(screen.getByRole("link", { name: LINK })).toHaveAttribute("href", "/propositions/nouvelle?type=class&cible=11");
  });
});
