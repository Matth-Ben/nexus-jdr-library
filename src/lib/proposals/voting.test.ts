import { describe, expect, it } from "vitest";
import { nextVote, voteAvailability } from "./voting";

describe("voteAvailability", () => {
  it("autorise un membre connecté, non auteur, sur une proposition en attente", () => {
    expect(voteAvailability({ userId: "u", authorId: "a", status: "pending" })).toEqual({ canVote: true });
  });

  it("bloque un visiteur non connecté", () => {
    expect(voteAvailability({ userId: null, authorId: "a", status: "pending" })).toEqual({
      canVote: false,
      reason: "anonymous",
    });
  });

  it("bloque l'auteur", () => {
    expect(voteAvailability({ userId: "a", authorId: "a", status: "pending" })).toEqual({
      canVote: false,
      reason: "author",
    });
  });

  it.each(["approved", "rejected"] as const)("bloque une proposition %s", (status) => {
    expect(voteAvailability({ userId: "u", authorId: "a", status })).toEqual({ canVote: false, reason: "closed" });
  });

  it("explique d'abord la connexion, puis l'auteur, puis le statut", () => {
    expect(voteAvailability({ userId: null, authorId: "a", status: "approved" }).reason).toBe("anonymous");
    expect(voteAvailability({ userId: "a", authorId: "a", status: "approved" }).reason).toBe("author");
  });
});

describe("nextVote", () => {
  it("pose un vote quand il n'y en a pas", () => {
    expect(nextVote(null, "up")).toBe("up");
    expect(nextVote(null, "down")).toBe("down");
  });
  it("retire le vote quand on reclique dessus", () => {
    expect(nextVote("up", "up")).toBeNull();
    expect(nextVote("down", "down")).toBeNull();
  });
  it("change de vote quand on clique sur l'autre", () => {
    expect(nextVote("up", "down")).toBe("down");
    expect(nextVote("down", "up")).toBe("up");
  });
});
