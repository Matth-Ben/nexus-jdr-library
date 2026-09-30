import { describe, expect, it } from "vitest";
import {
  MISSING_NAME,
  grantKindLabel,
  invocationPrerequisiteText,
  lineageGroupLabel,
  pactLabel,
  sortByName,
  toOptionalRef,
  toRef,
} from "./format";

describe("toRef / toOptionalRef", () => {
  const names = new Map([["3", "Occultiste"]]);

  it("résout le nom depuis les traductions", () => {
    expect(toRef(3, names)).toEqual({ id: 3, name: "Occultiste" });
  });

  it("signale une traduction manquante sans planter", () => {
    expect(toRef(9, names)).toEqual({ id: 9, name: MISSING_NAME });
  });

  it("renvoie null sans identifiant", () => {
    expect(toOptionalRef(null, names)).toBeNull();
    expect(toOptionalRef(undefined, names)).toBeNull();
  });
});

describe("sortByName", () => {
  it("trie à la française sans modifier l'entrée", () => {
    const input = [{ name: "Évocation" }, { name: "Abjuration" }, { name: "Divination" }];
    expect(sortByName(input).map((item) => item.name)).toEqual([
      "Abjuration",
      "Divination",
      "Évocation",
    ]);
    expect(input[0].name).toBe("Évocation");
  });
});

describe("libellés", () => {
  it("traduit les groupes de lignées connus et humanise les autres", () => {
    expect(lineageGroupLabel("phb_ancestry")).toBe("Ascendance draconique");
    expect(lineageGroupLabel("nouveau_groupe")).toBe("nouveau groupe");
    expect(lineageGroupLabel(null)).toBeNull();
  });

  it("traduit les pactes", () => {
    expect(pactLabel("chaine")).toBe("Pacte de la chaîne");
    expect(pactLabel(undefined)).toBeNull();
  });

  it("traduit le mode d'obtention d'un sort de sous-classe", () => {
    expect(grantKindLabel("always_prepared")).toBe("Toujours préparé");
    expect(grantKindLabel("extends_list")).toBe("Ajouté à la liste de sorts");
  });
});

describe("invocationPrerequisiteText", () => {
  it("privilégie le texte rédigé en base", () => {
    expect(
      invocationPrerequisiteText({ text: "Niveau 15, aptitude Pacte de la chaîne", level: 15 }),
    ).toBe("Niveau 15, aptitude Pacte de la chaîne");
  });

  it("reconstruit un libellé à partir du niveau et du pacte", () => {
    expect(invocationPrerequisiteText({ level: 9, pact: "lame" })).toBe(
      "Niveau 9, Pacte de la lame",
    );
  });

  it("renvoie null sans prérequis", () => {
    expect(invocationPrerequisiteText({})).toBeNull();
    expect(invocationPrerequisiteText(null)).toBeNull();
  });
});
