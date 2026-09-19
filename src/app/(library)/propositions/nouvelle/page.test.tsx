import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildFeatContent } from "@/lib/proposals/existing";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  fetchExisting: vi.fn(),
  listExisting: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({ createSessionClient: async () => ({}) }));
vi.mock("@/lib/proposals/queries", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/proposals/existing-fetch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/proposals/existing-fetch")>()),
  fetchExisting: mocks.fetchExisting,
  listExisting: mocks.listExisting,
}));
vi.mock("../actions", () => ({ createProposal: vi.fn() }));

import NewProposalPage from "./page";

const FEAT = buildFeatContent(4, { prerequisites: { text: "Force 13" } }, { name: "Costaud", description: "Fort." });

async function renderPage(params: Record<string, string | string[] | undefined>) {
  const ui = await NewProposalPage({ searchParams: Promise.resolve(params) });
  return render(ui);
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) if ("mockReset" in mock && mock !== mocks.redirect) mock.mockReset();
  mocks.redirect.mockClear();
  mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
  mocks.listExisting.mockResolvedValue({ options: [{ id: 4, name: "Costaud" }], total: 1 });
});

describe("/propositions/nouvelle — visiteur", () => {
  it("redirige vers la connexion en conservant la requête complète", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    await expect(renderPage({ type: "class", cible: "12" })).rejects.toThrow(
      `REDIRECT:/connexion?next=${encodeURIComponent("/propositions/nouvelle?type=class&cible=12")}`,
    );
  });

  it("conserve aussi mode, recherche et paramètres inattendus (dont next)", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const path = "/propositions/nouvelle?type=item&mode=modifier&q=%C3%A9p%C3%A9e&next=%2Fsorts";
    await expect(renderPage({ type: "item", mode: "modifier", q: "épée", next: "/sorts" })).rejects.toThrow(
      `REDIRECT:/connexion?next=${encodeURIComponent(path)}`,
    );
  });

  it("sans paramètre : retour sur la page nue", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    await expect(renderPage({})).rejects.toThrow(`REDIRECT:/connexion?next=${encodeURIComponent("/propositions/nouvelle")}`);
  });
});

describe("/propositions/nouvelle — nouveau contenu", () => {
  it("par défaut : formulaire vide, « Nouveau contenu » actif, aucun accès à l'existant", async () => {
    const { container } = await renderPage({ type: "feat" });
    expect(screen.getByRole("link", { name: "Nouveau contenu" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Modifier un existant" })).not.toHaveAttribute("aria-current");
    expect(screen.getByLabelText("Titre (don)")).toHaveValue("");
    expect(container.querySelector("input[name=target_id]")).toBeNull();
    expect(mocks.fetchExisting).not.toHaveBeenCalled();
    expect(mocks.listExisting).not.toHaveBeenCalled();
  });

  it.each(["abc", "0", "-3", "1.5", "1e3", "2147483648"])("cible invalide %j : ignorée sans message", async (cible) => {
    const { container } = await renderPage({ type: "feat", cible });
    expect(mocks.fetchExisting).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(container.querySelector("input[name=target_id]")).toBeNull();
    expect(screen.getByLabelText("Titre (don)")).toHaveValue("");
  });
});

describe("/propositions/nouvelle — modification", () => {
  it("cible valide : formulaire prérempli, bandeau, lien vers la fiche, cible cachée", async () => {
    mocks.fetchExisting.mockResolvedValue(FEAT);
    const { container } = await renderPage({ type: "feat", cible: "4" });
    expect(mocks.fetchExisting).toHaveBeenCalledWith(expect.anything(), "feat", 4);
    expect(screen.getByRole("link", { name: "Modifier un existant" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText(/Tu proposes une modification de/)).toHaveTextContent("« Costaud »");
    expect(screen.getByRole("link", { name: "voir la fiche actuelle" })).toHaveAttribute("href", "/dons?open=4");
    expect(screen.getByLabelText("Titre (don)")).toHaveValue("Costaud");
    expect(screen.getByLabelText("Prérequis (optionnel)")).toHaveValue("Force 13");
    expect(screen.getByLabelText("Description")).toHaveValue("Fort.");
    expect(container.querySelector("input[name=target_id]")).toHaveValue("4");
  });

  it("objet : mentionne que les propriétés d'arme et d'armure ne sont pas modifiables", async () => {
    mocks.fetchExisting.mockResolvedValue({ ...FEAT, type: "item", payload: { category: "arme", description: "x" } });
    await renderPage({ type: "item", cible: "4" });
    expect(screen.getByText("Les propriétés d'arme et d'armure ne sont pas modifiables ici.")).toBeInTheDocument();
  });

  it("classe : mentionne les limites et les conversions approximatives", async () => {
    mocks.fetchExisting.mockResolvedValue({
      ...FEAT,
      type: "class",
      warnings: ["Les maîtrises d'outils « au choix » sont représentées par une ligne de texte libre."],
      payload: { description: "x", hit_die: 8, features: [], subclasses: [], skill_choices: { count: 0, choices: [] } },
    });
    await renderPage({ type: "class", cible: "4" });
    expect(screen.getByText(/Les aptitudes propres aux sous-classes/)).toBeInTheDocument();
    expect(screen.getByText(/représentées par une ligne de texte libre/)).toBeInTheDocument();
  });

  it("cible inexistante : message, sélecteur d'éléments, pas de formulaire", async () => {
    mocks.fetchExisting.mockResolvedValue(null);
    const { container } = await renderPage({ type: "feat", cible: "999999" });
    expect(screen.getByRole("alert")).toHaveTextContent("introuvable");
    expect(screen.getByLabelText("Rechercher par nom")).toBeInTheDocument();
    expect(container.querySelector("input[name=target_id]")).toBeNull();
    expect(screen.getByRole("link", { name: "Nouveau contenu" })).toHaveAttribute(
      "href",
      "/propositions/nouvelle?type=feat",
    );
  });

  it("échec de chargement de la cible : message d'erreur, jamais de formulaire prérempli", async () => {
    mocks.fetchExisting.mockRejectedValue(new Error("réseau"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = await renderPage({ type: "feat", cible: "4" });
    spy.mockRestore();
    expect(screen.getByRole("alert")).toHaveTextContent("Impossible de charger l'élément");
    expect(container.querySelector("input[name=target_id]")).toBeNull();
  });
});

describe("/propositions/nouvelle — sélecteur", () => {
  it("mode=modifier : recherche transmise à la liste, résultats cliquables, pas de formulaire", async () => {
    const { container } = await renderPage({ type: "feat", mode: "modifier", q: "  cost " });
    expect(mocks.listExisting).toHaveBeenCalledWith(expect.anything(), "feat", "cost");
    expect(screen.getByLabelText("Rechercher par nom")).toHaveValue("cost");
    expect(screen.getByRole("link", { name: /Costaud/ })).toHaveAttribute("href", "/propositions/nouvelle?type=feat&cible=4");
    expect(container.querySelector("input[name=content_type]")).toBeNull();
    expect(screen.getByRole("link", { name: "Modifier un existant" })).toHaveAttribute("aria-current", "page");
  });

  it("liste indisponible : message d'erreur", async () => {
    mocks.listExisting.mockRejectedValue(new Error("réseau"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await renderPage({ type: "spell", mode: "modifier" });
    spy.mockRestore();
    expect(screen.getByRole("alert")).toHaveTextContent("Impossible de charger la liste");
  });
});
