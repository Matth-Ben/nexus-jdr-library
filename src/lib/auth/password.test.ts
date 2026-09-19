import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, validateNewPassword } from "./password";

describe("validateNewPassword", () => {
  it("accepte un mot de passe assez long et confirmé", () => {
    expect(validateNewPassword("abcdef", "abcdef")).toBeNull();
    expect(validateNewPassword("un mot de passe plus long", "un mot de passe plus long")).toBeNull();
  });

  it("refuse un mot de passe trop court, même s'il est confirmé", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(6);
    expect(validateNewPassword("abcde", "abcde")).toContain("au moins 6 caractères");
    expect(validateNewPassword("", "")).toContain("au moins 6 caractères");
  });

  it("refuse une confirmation différente", () => {
    expect(validateNewPassword("abcdef", "abcdeg")).toBe("Les deux mots de passe ne correspondent pas.");
  });

  it("ne supprime pas les espaces : ils font partie du mot de passe", () => {
    expect(validateNewPassword("abc def", "abc def")).toBeNull();
    expect(validateNewPassword("abcdef ", "abcdef")).not.toBeNull();
  });
});
