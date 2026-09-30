import type { Ref } from "@/lib/reference/types";

/**
 * Table `class_options` (manœuvres, métamagie, infusions...) — voir la migration
 * `markdown-editor/supabase/migrations/20260930130000_create_class_options.sql`.
 * Nom et description dans `translations` (`entity_type = 'class_option'`).
 * `prerequisites` : `text` (prérequis rédigé) ou `cost` (coût en ki, points de
 * sorcellerie...), clés vérifiées en base le 2026-09-30.
 */
export interface ClassOptionRow {
  id: number;
  class_id: number | null;
  subclass_id: number | null;
  option_type: string;
  min_level: number | null;
  prerequisites: { text?: string; cost?: string } | null;
  source: string | null;
}

export interface ClassOptionListItem extends Ref {
  typeCode: string;
  typeLabel: string;
  class: Ref | null;
  subclass: Ref | null;
  minLevel: number | null;
  prerequisiteText: string | null;
  cost: string | null;
  source: string | null;
}

export interface ClassOptionDetail extends ClassOptionListItem {
  description: string;
  /** Aptitudes de classe qui donnent accès à ce type d'option. */
  grantedBy: Ref[];
}
