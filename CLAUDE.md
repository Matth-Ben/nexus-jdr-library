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

## Conventions

- Conventional Commits (`feat:`, `fix:`, `chore:`...), PR obligatoire sur la
  branche principale, CI verte requise avant merge — même discipline que les 2
  autres dépôts de l'écosystème.
- Aucune clé/URL en dur — configuration par environnement (dev/staging/prod).
- Stack initialisée (scaffold `create-next-app`) : Next.js 16 (App Router),
  TypeScript, ESLint, sans Tailwind (design system pas encore cadré — voir
  `01-architecture-technique.md`). `npm run lint` et `npm run build` doivent
  passer sans erreur avant tout commit.

## Organisation multi-agent

Ce projet utilise des sous-agents Claude Code dédiés, définis dans
`.claude/agents/` (adaptés de ceux du dépôt mobile `nexus-jdr-app-mobile`
pour cette stack Next.js/web, afin de garder des agents spécialisés et
économes en tokens plutôt qu'une seule conversation généraliste qui accumule
tout le contexte). Le rôle de **chef de projet** n'est pas un sous-agent :
c'est la conversation principale (toi, avec Matthias) — c'est elle qui
découpe une phase de la roadmap en tâches, choisit quel sous-agent invoquer,
relit ce qu'il produit, et arbitre les décisions produit/techniques qui
restent en dehors du cahier des charges (notamment les nombreux points encore
marqués « à valider » dans ce premier jet de spec).

| Sous-agent | Rôle | À invoquer pour |
|---|---|---|
| `direction-artistique` | DA / revue UI | Cadrer ou valider un écran contre le design system **avant** de le considérer fini — voir la particularité de ce projet (DA pas encore établie) dans sa propre définition |
| `dev-nextjs` | Développeur Next.js/TypeScript | Implémenter une fonctionnalité (écran/route, composant, intégration Supabase) |
| `dev-backend-supabase` | Backend/données | Schéma, migrations (dans le dépôt **web**), politiques RLS, edge functions liées aux propositions communautaires |
| `qa-testeur` | Testeur/QA | Écrire les tests, valider une fonctionnalité contre ses critères d'acceptation, chasser les régressions (RLS, double vote, transitions de statut) |
| `code-reviewer` | Revue de code | Relire un diff avant merge (conventions, sécurité, architecture) |

Séquence type pour une fonctionnalité UI : `direction-artistique` cadre/valide
la spec visuelle → `dev-nextjs` implémente → `qa-testeur` écrit/complète les
tests → `code-reviewer` relit le diff avant merge. Pour une fonctionnalité
backend/données, remplacer la première étape par `dev-backend-supabase`, et
rappeler que la migration doit être ouverte en PR sur le dépôt **web**, pas
ici.

Les skills génériques du dépôt mobile (`caveman`, `caveman-review`,
`ponytail*`) sont également disponibles dans `.claude/skills/` — copiés tels
quels, ils ne sont pas spécifiques à un projet.

Aucun sous-agent ne tranche seul une question produit qui n'est pas déjà
décidée dans le cahier des charges (ex. Option A/B du modèle de données,
choix de framework CSS, visibilité des propositions en attente). Ces
questions remontent à la conversation principale.
