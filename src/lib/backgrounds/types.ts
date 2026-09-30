/**
 * Table `backgrounds` (historiques) — colonnes vérifiées en base le 2026-09-30 :
 * `skill_proficiencies` (tableau de compétences), `tool_or_language_choices`
 * (`tools`, `vehicles` : tableaux de libellés ; `languages` : nombre de langues
 * au choix ; `language_choices` : précisions), `equipment` (tableau de libellés),
 * `is_incomplete`. Textes dans `translations` (`entity_type = 'background'`,
 * champs `name`, `description`, `feature_name`, `feature_description`).
 */
export interface BackgroundChoices {
  tools?: string[];
  vehicles?: string[];
  languages?: number;
  language_choices?: string[];
}

export interface BackgroundRow {
  id: number;
  skill_proficiencies: string[] | null;
  tool_or_language_choices: BackgroundChoices | null;
  equipment: string[] | null;
  is_incomplete: boolean | null;
}

export interface BackgroundListItem {
  id: number;
  name: string;
  skills: string[];
}

export interface BackgroundDetail extends BackgroundListItem {
  description: string | null;
  tools: string[];
  vehicles: string[];
  languages: string | null;
  equipment: string[];
  featureName: string | null;
  featureDescription: string | null;
  incomplete: boolean;
}
