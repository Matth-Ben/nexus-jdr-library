# Nexus JDR — Bibliothèque (contenu communautaire D&D)

Ce fichier oriente Claude Code quand il travaille dans **ce dépôt**, le 3ᵉ outil de
l'écosystème Nexus JDR (aux côtés du dépôt web "Histoires" et du dépôt mobile
`nexus-jdr-app-mobile` — voir `docs/cahier-des-charges/00-vision-et-perimetre.md`).

## Où est la spec

Le cahier des charges de ce projet vit dans un projet claude.ai dédié (à créer,
même méthode que pour l'app mobile — voir `nexus-jdr-app-mobile/CLAUDE.md`), qui
reste la source de vérité. Une copie locale de lecture est disponible dans
`docs/cahier-des-charges/` à la racine de ce dépôt (ignorée par Git — voir
`.gitignore`, resynchronisée manuellement depuis claude.ai en cas de mise à jour
d'un document), pour que Claude Code local puisse la consulter directement sans
accès au projet claude.ai.

Avant toute tâche un peu structurante, relire le document pertinent plutôt que de
deviner :
- Vision/périmètre → `docs/cahier-des-charges/00-vision-et-perimetre.md`
- Architecture technique → `docs/cahier-des-charges/01-architecture-technique.md`
- Modèle de données (propositions/commentaires/votes) → `docs/cahier-des-charges/02-modele-donnees.md`
- Fonctionnalités V1 → `docs/cahier-des-charges/03-fonctionnalites.md`
- Modération et validation → `docs/cahier-des-charges/04-moderation-et-validation.md`
- Roadmap → `docs/cahier-des-charges/05-roadmap.md`

**Ce cahier des charges est un premier jet.** Plusieurs points y sont marqués
« à valider » (stack définitive, option de fusion du contenu approuvé, visibilité
des propositions en attente...) — les relire avec Matthias avant de trancher une
implémentation qui en dépend.

## Relation avec les autres dépôts

- **Auth partagée** : même projet Supabase que `Histoires` et `nexus-jdr-app-mobile`
  (même table `auth.users`). Pas de système de comptes séparé.
- **Contenu de référence** (sorts, classes, races, dons, objets...) : déjà peuplé
  côté mobile, réutilisé ici en lecture — ne pas le redéfinir dans ce dépôt.
- **Migrations SQL** : comme pour le dépôt mobile, elles restent dans le dépôt
  **web** (`supabase/migrations/`) — ce dépôt ne contient aucun fichier de migration.
- **Super-utilisateur** : Matthias, identifié par un flag admin sur son compte
  partagé, seul rôle habilité à approuver/rejeter une proposition.

## Conventions (à confirmer/affiner une fois le dépôt amorcé)

- Conventional Commits (`feat:`, `fix:`, `chore:`...), PR obligatoire sur la
  branche principale, CI verte requise avant merge — même discipline que les 2
  autres dépôts de l'écosystème.
- Aucune clé/URL en dur — configuration par environnement (dev/staging/prod).
- Stack proposée dans `01-architecture-technique.md` : Next.js + Vercel, à
  valider avant le premier commit de code.
