# Analyse Stratégique IndiForge — Rapport CTO v2
## Post-Review: Corrections & Plan d'Exécution Verrouillé

---

## 1. Lecture du projet en une page

**IndiForge** est un SaaS permettant de créer visuellement des indicateurs de trading via un éditeur nodal, puis d'exporter du code propre vers plusieurs plateformes (TradingView Pine Script, MetaTrader MQL5/MQL4, NinjaTrader).

**Cœur de valeur réel** : La traduction déterministe entre une logique abstraite et des langages propriétaires de trading. Le produit ne vend pas l'éditeur visuel — il vend la **fidélité de génération** entre le concept et le code exécutable.

**Pari principal** : сделать dun moteur IR canonique qui garantit que le rendu web (preview) et le code exporté sont sémantiquement identiques, quelle que soit la plateforme cible.

> Ce pari est techniquement exigeant mais différenciant. Les outils actuels soit génèrent du code opaque via LLM, soit proposent des éditeurs visuels génériques qui perdent en précision.

---

## 2. Ce que le repo a déjà bien défini

### 2.1 Vision produit — ✅ Bon
- **Positionnement clair** : "visual → code" sans réécriture manuelle
- **Cible utilisateur** : traders autonomes intermédiaires, créateurs d'indicateurs
- **Différenciation** : pas un "no-code générique", un builder domain-specific avec contraintes métier

### 2.2 Scope MVP — ✅ Cohérent
- Pine Script v5 + MQL5 comme cibles MVP
- MQL4 et NinjaTrader 8 en Phase 2 (architecture-ready)
- Indicateurs de base couverts : SMA, EMA, RSI, MACD, Bollinger, ATR

### 2.3 Architecture pipeline — ✅ Correcte
- 5 couches définies : Visual Graph → Résolution → IR → Lowering → AST → Export
- IR canonique comme source de vérité partagée entre preview et générateur

### 2.4 Stack technique — ✅ Appropriée pour une petite équipe
- Next.js + React + React Flow : standard, écosystème riche
- NestJS : structuré, bon pour monolith modulaire
- Prisma + PostgreSQL : productivité, schéma relationnel sain
- Turborepo : mutualisation du code entre packages

### 2.5 Modèle de données — ✅ Complet
- Entités bien définies : User → Project → IndicatorDefinition → IndicatorVersion → ExportJob
- Versioning, audit, partage, templates — tout y est
- JSONB utilisé à bon escient pour les structures flexibles (graph, IR, validation)

### 2.6 Opération IR — ✅ Solide
- Registry centralisé avec lookback, paramètres, types
- Matrice de compatibilité par plateforme (supports, limitations, approximations)

---

## 3. Les angles morts et fragilités

### 3.1 Preview vs Export — 🔴 Critique
**Problème** : Le repo ne contient **aucun moteur de calcul pour le preview**. La page editor.tsx affiche uniquement les nœuds visuels — il n'y a pas de code qui exécute la logique IR sur des données OHLCV pour produire le graphique.
- **Gravité** : Haute
- **Probabilité** : Très probable (c'est le cœur du problème produit)
- **Impact** : Perte de confiance utilisateur si le preview et l'export diffèrent

### 3.2 Générateurs incomplets — 🟠 Moyen
Les générateurs Pine Script et MQL5 sont presentés mais :
- **Pine Script** : génère une structure de base, les calculs sont des placeholders (`resolveValue` retourne des strings génériques)
- **MQL5** : même constat — les fonctions ne sont pas réellement implémentées
- **Gravité** : Moyenne (le squelette est là, le corps manque)
- **Probabilité** : Certaine — il faut finir l'implémentation

### 3.3 Convertisseur Visual Graph → IR absent — 🟠 Moyen
Le code appelle `convertToIr()` dans `core/src/index.ts` mais cette fonction retourne un IR vide. La conversion visuelle→IR est le maillon manquant.
- **Gravité** : Haute pour le MVP
- **Impact** : L'éditeur ne peut pas actuellement produire de code

### 3.4 Pas de stratégie de test identifiée — 🟡
Aucun test dans le repo. Or, la fidélité IR ↔ preview ↔ export **doit être testée** :
- Fixtures OHLCV avec résultats de référence
- Snapshots de code généré
- Tests de non-régression par version de générateur
- **Impact** : Dette technique future massive

### 3.5 Authentification incomplète — 🟡
Le `auth.service.ts` fait un login basique mais :
- Pas de JWT Guard dans NestJS
- Pas de Google Strategy fonctionnelle
- Pas de controller pour les endpoints auth
- **Impact** : bloquant pour la mise en production

### 3.6 Multi-tenant safety — 🟡
Le schéma Prisma a `ownerId` sur Project, mais les queries dans `projects.service.ts` font un check explicite. Pas de middleware de scope automatique.
- **Risque** : Fuite de données si un développeur oublie le check

### 3.7 Observabilité du compilateur — 🟡
Pas de logs structurés, pas de traces sur les exports, pas de métriques sur les erreurs de génération.
- **Impact** : Impossible à debugger en production

---

## 4. Critique d'architecture

### 4.1 Next.js / React — ✅ Bon choix
- Écosystème mature, composants React Flow disponibles
- Partage de types TypeScript avec le backend
- **Coût** : bundle size potentiellement élevée
- **Simplifie** : routing, SSR, deployment Vercel

### 4.2 React Flow — ✅ Bon choix
- Library de référence pour les node editors
- Types définis, customizable
- **Coût** : besoin de wrapper pour le domain trading (handles typés, validation de connexions)
- **Simplifie** :drag & drop, zoom, pan

### 4.3 NestJS — ✅ Bon choix
- Structure modulare, injection de dépendance
- **Coût** : overhead conceptuel pour une petite équipe
- **Simplifie** : organisation du code backend

### 4.4 Prisma + PostgreSQL — ✅ Bon choix
- Productivité DX forte
- JSONB pour les structures flexibles (graph, IR)
- **Coût** : migrations en production需 attention
- **Simplifie** : relations, requêtes

### 4.5 BullMQ + Redis — ⚠️ À simplifier
- Pour un MVP, c'est overkill
- **Alternative** : utiliser une queue simple en mémoire ou un provider géré (Inngest, Trigger.dev)
- **Coût** : Ops Redis, gestion de la connexion, error handling

### 4.6 Monorepo Turborepo — ✅ Bon choix
- Partage de types `@indiforge/shared` et `@indiforge/core`
- Build parallélisé
- **Coût** : complexité setup initiale, нужно gérer les dépendances cyc

### 4.7 IR Canonique — ✅ Excellent choix (à finaliser)
- Découple UI et génération
- Permet preview et export depuis la même source
- **Coût** : gouvernance du schéma IR nécessaire
- **Complique** : conversion Visual → IR à implémenter

### Recommandations alternatives pour petite équipe
1. **Supprimer BullMQ** : traiter les exports de façon synchrone pour le MVP (< 10s), job queue overkill
2. **Remplacer Clerk** par Auth.js ou NextAuth (moins cher, plus de contrôle)
3. **Utiliser un provider de jobs géré** (Inngest) au lieu de worker custom si vraiment besoin de async

---

## 5. Point le plus critique : le moteur de génération

### 5.1 Les invariants à préserver

L'IR doit être :
1. **Typed** : chaque nœud a un type de sortie vérifié à la compilation
2. **Platform-agnostic** : pas de référence à Pine/MQL/Ninja dans l'IR
3. **Ordered** : calcul dépendant doit être exécuté après ses dépendances (DAG)
4. **Versioned** : changement de schéma = bump de version, rétrocompatible si possible

### 5.2 Les pièges de traduction

| Piège | Description | Mitigation |
|-------|-------------|------------|
| **Initialisation des indicateurs** | Pine et MQL ont des comportements différents pour les premières barres (NA vs 0) | Définir explicitement la règle dans l'IR (warmupBars) |
| **Indexation temporelle** | Pine : series[t] = valeur actuelle, Pine Script : `close` = current | Créer une abstraction `current()`, `prior(n)` dans l'IR |
| **Fonctions natives non équivalentes** | `ta.sma()` Pine ≠ `iMA()` MQL | Utiliser des helpers générés, ne pas utiliser les natifs directement |
| **Multi-output** | MACD retourne 3 valeurs (line, signal, hist) | Modéliser explicitement les outputs multiples dans l'IR |
| **Side effects** | Les outputs "plot" sont des effets, pas des valeurs | Modéliser comme type `void` avec effet de bord |

### 5.3 Ce qui doit être dans l'IR

- `inputs` : paramètres exposés à l'utilisateur (period, threshold, couleurs)
- `nodes` : opérations pures avec types vérifiés
- `outputs` : declarations de plots/histograms/lignes
- `alerts` : conditions d'alerte avec messages
- `constraints` : lookback required, warmup bars,平台 limitations

### 5.4 Ce qui ne doit PAS être dans l'IR

- **UI positioning** (x, y, zoom) — garder dans le Visual Graph seulement
- **Styling transient** (couleurs runtime) — garder dans les params d'output
- **Données de marché** — l'IR est stateless, les données viennent du outside

### 5.5 Stratégie de compatibilité entre plateformes

**Niveau 1 : Portable** — opérations garanties identiques
- Math (+, -, *, /)
- Comparisons (>, <, ==)
- Données OHLCV de base

**Niveau 2 : Approximated** — documenté et warné
- EMA (implémentations peuvent différer légèrement sur les premières valeurs)
- RSI (formule normale vs native)

**Niveau 3 : Spécifique plateforme**
- Alertes natives (chaque plateforme a son propre système)
- Plotting avancé (shapes, fills)

**Implémentation recommandée** :
```typescript
// Dans le générateur
function generateForPine(ir: IrGraph): string {
  // Phase 1 : générer les helper functions si needed
  // Phase 2 : générer les inputs
  // Phase 3 : générer les calculs
  // Phase 4 : générer les outputs
}
```

### 5.6 Test de fidélité preview ↔ export

1. **Fixtures de référence** : données OHLCV statiques (1000 barres)
2. **Résultats attendus** : valeurs calculées pour chaque indicator à chaque barre
3. **Test unitaire par primitive** : SMA(20) sur fixture X doit donner résultat Y
4. **Snapshot de code** : générer le même code deux fois → hash identique
5. **Integration test** : IR → generate → compile (si possible) → résultat vs attendu

---

## 6. Scope MVP réaliste

### ✅ À inclure (non négociable)

1. **Authentification** simple (email/magic link + JWT)
2. **Éditeur visuel** avec 3 catégories de nœuds :
   - Données (close, open, high, low, volume)
   - Indicateurs (SMA, EMA, RSI — pas plus pour le MVP)
   - Outputs (plot line uniquement)
3. **Preview engine** basique : exécuter l'IR sur des données CSV importées
4. **Générateur Pine Script** complet pour les primitives MVP
5. **Sauvegarde projet** et versioning simple (pas de branches)
6. **Export** download du fichier .pine

### ❌ À explicitement sortir du MVP

1. **MQL5** — trop complexe pour une première release, garder "architecture-ready"
2. **Templates library** — proposer 3 presets hardcodés suffices
3. **Partage / communauté** — projets privés par défaut
4. **Billing** — lancer en gratuit avec quotas stricts
5. **Alertes natives** — trop de spécificités par plateforme
6. **Multi-timeframe** — complexité non justifiée pour le MVP
7. **Collaboration** — un seul owner par projet

### 🏗️ Architecture-ready (à préparer sans implémenter)

- Schéma Prisma complet (déjà là)
- IR avec support pour MACD, Bollinger (déjà là)
- Points d'extension pour MQL5, NinjaTrader
- Webhooks billing (structure à peine)

---

## 7. Architecture cible recommandée

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Landing Page │  │   Editor    │  │     Preview         │ │
│  │   (Next.js)  │  │ (React Flow)│  │ (Lightweight Charts)│ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│         │                │                     │             │
│         └────────────────┴─────────────────────┘             │
│                          │                                   │
│                    Zustand Store                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTP + WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                 NestJS API (Port 3001)                │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐  │   │
│  │  │   Auth   │ │ Projects │ │ Versions │ │ Exports │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│         ┌────────────────┴────────────────┐                 │
│         ▼                                 ▼                  │
│  ┌─────────────┐                 ┌─────────────────┐         │
│  │  Prisma     │                 │  @indiforge/core│         │
│  │  (Postgres) │                 │  (Compiler IR)  │         │
│  └─────────────┘                 └─────────────────┘         │
│                                       │                       │
│                              ┌────────┴────────┐              │
│                              ▼                  ▼              │
│                       ┌─────────────┐  ┌──────────────┐       │
│                       │ Pine Gen    │  │ Preview Calc│       │
│                       └─────────────┘  │ (Web Worker)│       │
│                                          └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Décisions clés

1. **Preview en Web Worker** : le calcul des indicateurs ne bloque pas l'UI
2. **Core partagé** : `@indiforge/core` utilisé par le frontend (preview) et backend (export)
3. **Pas de worker async** : les exports sont < 10s, traiter en synchrone pour le MVP
4. **Stockage minimal** : PostgreSQL + fichiers exportés en S3
5. **Auth avec NextAuth.js** : moins cher, plus flexible que Clerk

---

## 8. Modèle de données minimum viable

### Entités core (à garder)

| Entité | Rôle | Champs essentiels | Stockage |
|--------|------|-------------------|----------|
| **User** | Compte utilisateur | id, email, displayName, role | Table |
| **Project** | Conteneur projet | id, ownerId, name, slug, status | Table |
| **IndicatorDefinition** | Définition courante | id, projectId, title, graphJson, semanticHash | Table |
| **IndicatorVersion** | Snapshot exportable | id, defId, versionNumber, irJson, generatorVersion | Table |
| **ExportJob** | Historique d'export | id, versionId, platform, status, artifactKey | Table |

### Ce qui peut rester en JSONB

- `graphJson` (VisualGraph) — structure complexe, pas besoin de requêter par champ interne
- `irJson` (IrGraph) — même raisonnement
- `validationReportJson` — rapports ponctuels

### Ce qui mérite des tables dédiées

- **Template** : si on veut des templates officiels curatés (avec description, tags)
- **AuditLog** : critique pour la confiance et le support

### Schéma simplifié pour MVP

```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  displayName String
  role        Role     @default(USER)
  projects    Project[]
}

model Project {
  id        String   @id @default(cuid())
  ownerId   String
  name      String
  slug      String   @unique
  status    ProjectStatus @default(DRAFT)
  definition IndicatorDefinition?
}

model IndicatorDefinition {
  id           String   @id @default(cuid())
  projectId    String   @unique
  title        String
  graphJson    String   // VisualGraph stocké ici
  semanticHash String   @default("")
}

model IndicatorVersion {
  id          String   @id @default(cuid())
  defId       String
  version     Int
  irJson      String
  generatorVersion String
  createdAt   DateTime @default(now())
}

model ExportJob {
  id        String       @id @default(cuid())
  versionId String
  platform  Platform
  status    ExportStatus
  artifact  String?     // Clé S3
  createdAt DateTime    @default(now())
}
```

---

## 9. Plan d'exécution en phases

### Phase 1 : Foundation (Semaine 1-2)

**Objectifs** :
- Faire tourner l'éditeur visuel avec le backend
- Implémenter l'authentification fonctionnelle
- Préparer le pipeline Visual → IR

**Livrables** :
1. Auth complet (signup, login, JWT guard)
2. CRUD Projects opérationnel
3. Visual Graph sauvegardé en base
4. Editor charge un projet existant

**Critères de succès** :
- User peut se connecter
- User peut créer un projet vide
- Editor affiche les nœuds du projet chargé

**Erreurs à éviter** :
- Vouloir tout implémenter d'un coup
- Négliger les types TypeScript partagés

---

### Phase 2 : MVP Delivery (Semaine 3-6)

**Objectifs** :
- Preview fonctionnel sur données CSV
- Générateur Pine Script complet
- Export opérationnel

**Livrables** :
1. Convertisseur Visual → IR (minimal : Data → Indicator → Plot)
2. Moteur de calcul en Web Worker
3. Affichage du résultat sur Lightweight Charts
4. Générateur Pine Script avec SMA, EMA, RSI
5. Export download .pine

**Critères de succès** :
- Créer un indicateur simple (SMA 20 sur close) → voir la courbe
- Exporter → obtenir un fichier .pine qui fonctionne dans TradingView

**Erreurs à éviter** :
- Vouler supporter tous les indicateurs d'un coup
- Sous-estimer la complexité de la conversion Visual → IR

---

### Phase 3 : Hardening + Expansion (Semaine 7-12)

**Objectifs** :
- Stabiliser le générateur
- Préparer le passage à l'échelle
- Ajuster selon feedback utilisateur

**Livrables** :
1. Plus d'indicateurs (MACD, Bollinger, ATR)
2. Templates de départ (5 presets)
3. Tests de fidélité (fixtures + snapshots)
4. Monitoring/observabilité basic
5. MQL5 generator en beta

**Critères de succès** :
- 80% des utilisateurs peuvent faire ce qu'ils veulent (MVP feature parity)
- Aucune régression sur Pine Script après ajout de fonctionnalités
- Temps de generation < 5s au p95

**Erreurs à éviter** :
- Ajouter MQL5 trop tôt sans avoir stabilisé Pine
- Ignorer les tests de fidélité sous prétexte de délai

---

## 10. Backlog des 15 premiers chantiers

| # | Chantier | Pourquoi maintenant | Dépendances | Definition of Done |
|---|----------|-------------------|-------------|---------------------|
| 1 | **Auth complet** (signup, login, JWT) | Bloquant pour tout le reste | - | User peut s'inscrire, se logger, JWT fonctionne |
| 2 | **API Projects CRUD** | Permet de créer et sauvegarder des projets | Auth | POST/GET/PUT /projects fonctionne |
| 3 | **Sauvegarde Visual Graph** | Le projet doit persister | Projects CRUD | Le graph est stocké et rechargé |
| 4 | **Convertisseur Visual → IR minimal** | Cœur du pipeline | - | Data → Indicator → Output = IR valide |
| 5 | **Moteur de calcul Web Worker** | Preview必须有数据 | IR | Calculateur peut exécuter SMA/EMA/RSI |
| 6 | **Affichage Lightweight Charts** | Visualiser le résultat | Worker | La courbe apparaît sur le chart |
| 7 | **Générateur Pine Script complet** | Export必须有code | IR | Génère du code qui compile dans TV |
| 8 | **Export download** | User veut récupérer son code | Generator | Fichier .pine downloadé |
| 9 | **Templates de départ** | Réduire le friction | Editor | 3 templates (SMA cross, RSI, MACD) |
| 10 | **Tests de fidélité** | Garantir la qualité | Generator, Fixtures | Tests unitaires passent |
| 11 | **Import CSV OHLCV** | Preview必须有数据 | - | Upload CSV → données dans le chart |
| 12 | **UI Polish (editor)** | Rendre usable | Editor existant | Drag & drop fluide, validation visuelle |
| 13 | **Monitoring basic** | Debug en prod | Export | Logs, erreurs de génération trackées |
| 14 | **Landing page + pricing** | Acquisition必须有offre | - | Page avec pricing, limits explicites |
| 15 | **Prépa MQL5** | Architecture-ready | Pine Gen | Schéma, types, skeleton generator |

---

## 11. Verdict final

### Ce que je garderais tel quel

1. **L'IR canonique** — excellent choix architectural, à préserver absolument
2. **La structure monorepo** — Turborepo + pnpm是对的
3. **Le schéma Prisma** — bien pensé, extensibilité préservée
4. **React Flow pour l'éditeur** — bon choix, écosystème fourni

### Ce que je changerais immédiatement

1. **Supprimer BullMQ** — overkill pour le MVP, traiter les exports en synchrone
2. **Implementer le convertisseur Visual → IR** — aujourd'hui c'est un placeholder vide
3. **Rajouter le moteur de preview** — absent dans le repo actuel
4. **Finir les générateurs** — les squelettes sont là mais pas le corps
5. **Remplacer Clerk par NextAuth** — moins coûteux, plus de contrôle

### Ce que je repousserais

1. **MQL5** — garder "ready" mais ne pas deliver en premier
2. **NinjaTrader** — Phase 3 minimum
3. **Billing/Stripe** — lancer en gratuit avec quotas stricts
4. **Marketplace** — Phase 3/4
5. **Collaboration multi-user** — après le product-market fit

### Verdict global

**IndiForge est viable techniquement**, sous réserve de :

1. **Finir le pipeline Visual → IR → Code** — c'est le cœur, aujourd'hui incomplet
2. **Implémenter le preview engine** — absent actuellement
3. **Ne pas disperser sur 4 plateformes** — Pine Script uniquement pour le MVP

Le pari technique (IR canonique) est le bon. L'exécution est incomplète mais les fondations sont correctes. Avec une petite équipe (3-4 personnes), un MVP fonctionnel en 8-12 semaines est réaliste si et seulement si :
- On se concentre sur Pine Script uniquement
- On livre le pipeline complet (edit → preview → export)
- On ne tente pas de faire "tout supporter" d'emblée

**Recommandation** : Procéder au développement en prioritant les chantiers 1-8 du backlog. L'architecture globale est bonne — il faut maintenant deliver le fonctionnel.

---

# Annexe : Plan d'Exécution Verrouillé

## Les 5 Décisions à Prendre Maintenant

| # | Décision | Recommandation | Justification |
|---|----------|----------------|---------------|
| 1 | **MVP Pine only + MQL5 labo** | Pine Script uniquement en public, MQL5 en proof-of-concept interne | Réduit le scope commercial tout en validant l'architecture multiplateforme |
| 2 | **Source de vérité : Visual Graph** | Le graphe visuel est la référence utilisateur, l'IR est la référence d'exécution | L'utilisateur voit et modifie le graphe, pas l'IR |
| 3 | **Validation sémantique séparée** | Créer un module `semantic-validator` distinct du convertisseur | Pare-feu entre édition et exécution |
| 4 | **Auth pragmatique rapide** | Clerk (ou NextAuth) avec minimum de providers | Temps équipe sur le core, pas l'auth |
| 5 | **Dataset embarqué d'abord** | 3 datasets OHLCV intégrés, CSV import en V2 | Pas de dépendance externe pour la démo |

## Critère de Succès (2 semaines)

> **Démo prouvable** : Close → SMA(20) → Plot Line avec preview et export Pine cohérents

Cet exemple doit fonctionner sans triche :
- L'utilisateur voit la courbe sur le chart
- L'export produit un fichier .pine qui compile dans TradingView
- Les valeurs numériques sont identiques

## Les 3 Moteurs Isolation

| Moteur | Responsabilité | Dépendances |
|--------|---------------|-------------|
| **Editor Semantics** | Valider le graphe avant conversion (cycles, types, outputs) | Node registry |
| **Compiler Core** | Visual Graph → IR canonique | Editor Semantics |
| **Execution Engine** | Exécuter l'IR pour le preview | Compiler Core |
| **Code Generators** | IR → Pine/MQL/Ninja | Compiler Core |

## MVP Brutal Simplifié

### In (à deliver)
- Auth email + magic link
- Dataset OHLCV demo (EUR/USD 1000 barres)
- Editor: 3 nœuds (close, SMA, plot)
- Preview: courbe visible sur Lightweight Charts
- Export: fichier .pine download
- Save: projet en base

### Out (explicitement)
- MQL5 export
- RSI, MACD, Bollinger (garder dans l'IR, pas dans l'UI)
- CSV import
- Templates library
- Billing
- Versioning avancé

### Architecture-Ready (préparé mais pas deliver)
- Schéma Prisma complet
- IR avec support MACD/Bollinger
- Points d'extension pour MQL5

## Matrice de Compatibilité UX

Chaque primitive doit afficher son statut dans l'UI :

| Statut | Signification | UX |
|--------|---------------|---|
| 🟢 Portable | Identique sur toutes les plateformes | "Supported everywhere" |
| 🟡 Approximé | Comportement potentiellement différent | Warning visible |
| 🔴 Non supporté | Non exportable vers la cible | Bloquant ou warn |

## Prochaine Action Immédiate

Transformer ce rapport en board Linear/Trello avec :

1. **Epic: Core Semantics**
   - Tâche: Convertisseur Visual→IR minimal
   - Tâche: Validation sémantique (cycles, types)
   - Tâche: Editor node registry

2. **Epic: Preview Fidelity**
   - Tâche: Web Worker calculateur
   - Tâche: Intégration Lightweight Charts
   - Tâche: Dataset demo

3. **Epic: Pine Export**
   - Tâche: Générateur SMA complet
   - Tâche: Générateur EMA complet
   - Tâche: Download + manifest

4. **Epic: Foundation**
   - Tâche: Auth complet
   - Tâche: CRUD Projects
   - Tâche: Save/Load Graph

---

*Document vivant - mis à jour après la post-review*