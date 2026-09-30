import { describe, expect, it } from "vitest";
import {
  MISSING_NAME,
  feetToMeters,
  formatAbilities,
  formatBonus,
  formatChallenge,
  formatSkills,
  formatSpeed,
  toCreatureDetail,
} from "./format";
import type { CreatureRow } from "./types";

const ROW: CreatureRow = {
  id: 7,
  size: "Très petite",
  creature_type: "Bête",
  challenge_rating: "0.125",
  alignment: "sans alignement",
  armor_class: 12,
  armor_detail: null,
  hit_points: 1,
  hit_dice: "1d4 - 1",
  speed: { walk: 5, fly: 30 },
  ability_scores: { str: 2, dex: 15, con: 8, int: 2, wis: 12, cha: 4 },
  saving_throws: {},
  skills: { Perception: 3 },
  damage_vulnerabilities: "",
  damage_resistances: null,
  damage_immunities: null,
  condition_immunities: null,
  senses: "vision aveugle 18 m, Perception passive 13",
  languages: null,
  experience_points: 25,
  proficiency_bonus: 2,
  initiative_bonus: 2,
  traits: [],
  actions: [{ name: "Morsure", description: "Jet d'attaque au corps à corps : +4." }],
  bonus_actions: null,
  reactions: null,
  legendary_actions: null,
  source: "SRD 5.2 (Manuel des Monstres 2024)",
};

describe("formatage des créatures", () => {
  it("affiche les FP fractionnaires en fraction", () => {
    expect(formatChallenge(0.125)).toBe("1/8");
    expect(formatChallenge(0.5)).toBe("1/2");
    expect(formatChallenge(17)).toBe("17");
  });

  it("signe les bonus", () => {
    expect(formatBonus(3)).toBe("+3");
    expect(formatBonus(0)).toBe("+0");
    expect(formatBonus(-2)).toBe("−2");
  });

  it("convertit les pieds en mètres (5 pi = 1,50 m)", () => {
    expect(feetToMeters(5)).toBe("1,50 m");
    expect(feetToMeters(30)).toBe("9 m");
    expect(feetToMeters(15)).toBe("4,50 m");
  });

  it("décrit toutes les vitesses, dont le vol stationnaire", () => {
    expect(formatSpeed({ walk: 30, fly: 60, hover: true, swim: 40 })).toBe(
      "9 m, vol 18 m (vol stationnaire), nage 12 m",
    );
    expect(formatSpeed(null)).toBe("—");
  });

  it("calcule modificateurs et jets de sauvegarde", () => {
    const [str, dex] = formatAbilities({ str: 21, dex: 9 }, { dex: 3 });
    expect(str).toMatchObject({ label: "FOR", score: 21, modifier: "+5", save: "+5" });
    expect(dex).toMatchObject({ label: "DEX", score: 9, modifier: "−1", save: "+3" });
  });

  it("liste les compétences triées, null si aucune", () => {
    expect(formatSkills({ Perception: 10, Histoire: 12 })).toBe("Histoire +12, Perception +10");
    expect(formatSkills({})).toBeNull();
  });

  it("assemble la fiche complète", () => {
    const detail = toCreatureDetail(ROW, new Map([["7", "Chauve-souris"]]));
    expect(detail.name).toBe("Chauve-souris");
    expect(detail.challenge).toBe(0.125);
    expect(detail.hitPoints).toBe("1 (1d4 - 1)");
    expect(detail.speed).toBe("1,50 m, vol 9 m");
    expect(detail.vulnerabilities).toBeNull();
    expect(detail.challengeLabel).toBe("1/8 · 25 PX · bonus de maîtrise +2");
    expect(detail.bonusActions).toEqual([]);
  });

  it("signale un nom manquant", () => {
    expect(toCreatureDetail(ROW, new Map()).name).toBe(MISSING_NAME);
  });
});
