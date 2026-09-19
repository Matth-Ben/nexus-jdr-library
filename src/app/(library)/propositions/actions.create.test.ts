import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildFeatContent, buildSpellContent } from "@/lib/proposals/existing";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  getUser: vi.fn(),
  fetchExisting: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSessionClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({
      insert: (row: unknown) => {
        mocks.insert(row);
        return { select: () => ({ single: async () => ({ data: { id: "new-id" }, error: null }) }) };
      },
    }),
  }),
}));
vi.mock("@/lib/proposals/existing-fetch", () => ({ fetchExisting: mocks.fetchExisting }));

import { createProposal } from "./actions";

const FEAT = buildFeatContent(4, { prerequisites: { text: "Force 13" } }, { name: "Costaud", description: "Fort." });

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const FEAT_FIELDS = {
  content_type: "feat",
  title: "Costaud",
  description: "Fort.",
  prerequisite: "Force 13",
};

beforeEach(() => {
  mocks.insert.mockReset();
  mocks.fetchExisting.mockReset();
  mocks.redirect.mockClear();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

/** Renvoie l'état du formulaire, ou le message `REDIRECT:…` quand l'action redirige. */
async function submit(fields: Record<string, string>) {
  try {
    return await createProposal({}, form(fields));
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

describe("createProposal — nouveau contenu", () => {
  it("fonctionne comme avant : pas de target_id, aucune lecture de l'existant", async () => {
    const outcome = await submit({ ...FEAT_FIELDS, title: "Nouveau don" });
    expect(outcome).toBe("REDIRECT:/propositions?open=new-id");
    expect(mocks.fetchExisting).not.toHaveBeenCalled();
    const row = mocks.insert.mock.calls[0][0];
    expect(row).toEqual({
      author_id: "user-1",
      content_type: "feat",
      title: "Nouveau don",
      payload: { description: "Fort.", prerequisite: "Force 13" },
    });
    expect(row).not.toHaveProperty("target_id");
  });

  it("un target_id vide est du nouveau contenu", async () => {
    expect(await submit({ ...FEAT_FIELDS, target_id: "  " })).toBe("REDIRECT:/propositions?open=new-id");
    expect(mocks.insert.mock.calls[0][0]).not.toHaveProperty("target_id");
  });

  it("garde la saisie et les erreurs de champ", async () => {
    const state = await submit({ ...FEAT_FIELDS, title: "", description: "" });
    expect(state).toMatchObject({
      errors: { title: expect.any(String), description: expect.any(String) },
      values: { prerequisite: "Force 13" },
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});

describe("createProposal — modification", () => {
  it("insère target_id (entier validé) avec la version complète proposée", async () => {
    mocks.fetchExisting.mockResolvedValue(FEAT);
    const outcome = await submit({ ...FEAT_FIELDS, target_id: "4", description: "Très fort." });
    expect(outcome).toBe("REDIRECT:/propositions?open=new-id");
    expect(mocks.fetchExisting).toHaveBeenCalledWith(expect.anything(), "feat", 4);
    expect(mocks.insert.mock.calls[0][0]).toEqual({
      author_id: "user-1",
      content_type: "feat",
      title: "Costaud",
      payload: { description: "Très fort.", prerequisite: "Force 13" },
      target_id: 4,
    });
  });

  it("accepte un renommage seul", async () => {
    mocks.fetchExisting.mockResolvedValue(FEAT);
    expect(await submit({ ...FEAT_FIELDS, target_id: "4", title: "Très costaud" })).toBe(
      "REDIRECT:/propositions?open=new-id",
    );
  });

  it("refuse une proposition identique à l'existant, en gardant la saisie", async () => {
    mocks.fetchExisting.mockResolvedValue(FEAT);
    const state = await submit({ ...FEAT_FIELDS, target_id: "4", description: "  Fort.  " });
    expect(state).toMatchObject({
      errors: { _form: expect.stringContaining("Aucune modification détectée") },
      values: { target_id: "4", prerequisite: "Force 13" },
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("refuse un target_id invalide sans interroger la base", async () => {
    for (const bad of ["0", "-1", "abc", "1.5", "1e3", "99999999999", "4 OR 1=1"]) {
      const state = await submit({ ...FEAT_FIELDS, target_id: bad, description: "Changé." });
      expect(state).toMatchObject({
        errors: { _form: expect.stringContaining("invalide") },
        values: { description: "Changé." },
      });
    }
    expect(mocks.fetchExisting).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("refuse une cible inexistante (« élément introuvable »)", async () => {
    mocks.fetchExisting.mockResolvedValue(null);
    const state = await submit({ ...FEAT_FIELDS, target_id: "999999", description: "Changé." });
    expect(state).toMatchObject({ errors: { _form: expect.stringContaining("Élément introuvable") } });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("échec de lecture de la cible : message générique, pas d'insertion", async () => {
    mocks.fetchExisting.mockRejectedValue(new Error("réseau"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const state = await submit({ ...FEAT_FIELDS, target_id: "4", description: "Changé." });
    spy.mockRestore();
    expect(state).toMatchObject({ errors: { _form: expect.stringContaining("Réessaie plus tard") } });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("revalide le payload : erreurs de champ conservées avec la saisie", async () => {
    mocks.fetchExisting.mockResolvedValue(FEAT);
    const state = await submit({ ...FEAT_FIELDS, target_id: "4", description: "" });
    expect(state).toMatchObject({ errors: { description: expect.any(String) }, values: { target_id: "4" } });
  });

  it("une école héritée (Invocation) est acceptée pour ce sort, et pour lui seul", async () => {
    const spell = buildSpellContent(
      9,
      {
        level: 3,
        school: "Invocation",
        casting_time: "1 action",
        range: "9 m",
        duration: "Instantanée",
        components: { verbal: true, somatic: false, material: false },
        concentration: false,
        ritual: false,
      },
      { name: "Convocation", description: "Un appel." },
    );
    mocks.fetchExisting.mockResolvedValue(spell);
    const fields = {
      content_type: "spell",
      target_id: "9",
      title: "Convocation",
      description: "Un grand appel.",
      level: "3",
      school: "Invocation",
      casting_time: "1 action",
      range: "9 m",
      duration: "Instantanée",
      component_verbal: "on",
    };
    expect(await submit(fields)).toBe("REDIRECT:/propositions?open=new-id");
    mocks.insert.mockReset();
    // Un sort dont l'école actuelle est Abjuration ne peut pas passer à « Invocation ».
    mocks.fetchExisting.mockResolvedValue({ ...spell, payload: { ...spell.payload, school: "Abjuration" } });
    const state = await submit(fields);
    expect(state).toMatchObject({ errors: { school: expect.any(String) } });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});

describe("createProposal — visiteur", () => {
  it("redirige vers la connexion en conservant type et cible", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const outcome = await submit({ ...FEAT_FIELDS, target_id: "4" });
    expect(outcome).toBe(`REDIRECT:/connexion?next=${encodeURIComponent("/propositions/nouvelle?type=feat&cible=4")}`);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
