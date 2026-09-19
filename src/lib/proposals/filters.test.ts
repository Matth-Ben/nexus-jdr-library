import { describe, expect, it } from "vitest";
import { filterParams, isUuid, parseFormType, parseOpenUuid, parseProposalFilters } from "./filters";

describe("parseProposalFilters", () => {
  it("prend pending et tous les types par défaut", () => {
    expect(parseProposalFilters({})).toEqual({ status: "pending", type: undefined });
  });

  it("lit statut et type valides", () => {
    expect(parseProposalFilters({ statut: "approved", type: "item" })).toEqual({ status: "approved", type: "item" });
    expect(parseProposalFilters({ statut: "rejected", type: "spell" })).toEqual({
      status: "rejected",
      type: "spell",
    });
  });

  it("retombe sur les défauts pour toute valeur inconnue ou vide", () => {
    expect(parseProposalFilters({ statut: "all", type: "monster" })).toEqual({ status: "pending", type: undefined });
    expect(parseProposalFilters({ statut: "", type: "" })).toEqual({ status: "pending", type: undefined });
    expect(parseProposalFilters({ statut: "APPROVED" }).status).toBe("pending");
  });

  it("prend la première valeur d'un paramètre répété et ignore les espaces", () => {
    expect(parseProposalFilters({ statut: ["rejected", "approved"], type: [" feat "] })).toEqual({
      status: "rejected",
      type: "feat",
    });
  });
});

describe("parseProposalFilters — race et class", () => {
  it("accepte type=race et type=class", () => {
    expect(parseProposalFilters({ type: "race" })).toEqual({ status: "pending", type: "race" });
    expect(parseProposalFilters({ statut: "approved", type: "class" })).toEqual({ status: "approved", type: "class" });
  });
  it("conserve le type dans les liens", () => {
    expect(filterParams({ status: "pending", type: "race" })).toEqual({ statut: undefined, type: "race" });
  });
});

describe("parseFormType", () => {
  it("vaut spell par défaut ou si invalide", () => {
    expect(parseFormType(undefined)).toBe("spell");
    expect(parseFormType("x")).toBe("spell");
    expect(parseFormType("")).toBe("spell");
  });
  it("accepte feat, item, race et class", () => {
    expect(parseFormType("feat")).toBe("feat");
    expect(parseFormType(["item"])).toBe("item");
    expect(parseFormType("race")).toBe("race");
    expect(parseFormType(" class ")).toBe("class");
  });
});

describe("parseOpenUuid / isUuid", () => {
  const ID = "3f2b8c1e-9d4a-4b6f-8a21-0c5d7e9f1a23";

  it("accepte un uuid, le normalise en minuscules", () => {
    expect(parseOpenUuid(ID)).toBe(ID);
    expect(parseOpenUuid(ID.toUpperCase())).toBe(ID);
    expect(parseOpenUuid([ID, "x"])).toBe(ID);
  });

  it.each(["", "12", "abc", `${ID}x`, "' or 1=1 --", "../etc", "3f2b8c1e9d4a4b6f8a210c5d7e9f1a23"])(
    "rejette %j",
    (value) => {
      expect(parseOpenUuid(value)).toBeUndefined();
      expect(isUuid(value)).toBe(false);
    },
  );

  it("rejette l'absence de valeur", () => {
    expect(parseOpenUuid(undefined)).toBeUndefined();
  });
});

describe("filterParams", () => {
  it("omet le statut par défaut", () => {
    expect(filterParams({ status: "pending" })).toEqual({ statut: undefined, type: undefined });
    expect(filterParams({ status: "rejected", type: "feat" })).toEqual({ statut: "rejected", type: "feat" });
  });
});
