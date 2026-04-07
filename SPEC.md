# IndiForge - Product Specification

## Executive Summary

IndiForge is a web SaaS enabling traders to create custom trading indicators visually without manual coding. Users can design logic visually, configure parameters, preview on charts, and generate clean source code for multiple platforms.

**Core Value Proposition**: The reliability between abstract logic and platform-specific languages—not just the visual editor itself.

---

## 1. Product Name & Value Proposition

### 1.1 Recommended Name
**IndiForge**

### 1.2 Value Statement
IndiForge allows traders to visually design reliable indicators, quickly test them, and export clean code to multiple platforms—without rewriting the same logic in each language.

### 1.3 Positioning
IndiForge targets autonomous traders, technical analysts, and indicator creators who know what they want to calculate but don't want to manage Pine Script, MQL4/5, or NinjaScript complexity.

---

## 2. Target Users (Personas)

| Persona | Objective | Technical Level | Primary Need | Main Barrier | Expected Value |
|---------|-----------|-----------------|--------------|--------------|----------------|
| 1. Beginner Trader | Create simple indicator from idea/template | Low | Guided experience without jargon | Doesn't understand parameter logic or platform limits | Save time, learn by manipulating understandable blocks |
| 2. Intermediate Trader | Quickly prototype own indicator variants | Medium | From idea to visible/exportable result | Loses time coding/retesting same logic | Accelerate creation, export to main platform |
| 3. Advanced Creator | Produce clean, maintainable, monetizable code | Medium-High | Control, code readability, versioning, portability | Distrust of auto-generated code, need for precision | Reduce dev time without sacrificing technical quality |

**Primary Target**: Intermediate autonomous traders with good coverage of advanced creator needs.

---

## 3. Core Features

### 3.1 Visual Indicator Builder
- Node-based editor with domain-specific constraints
- Typed connections (series<float>, scalar<float>, bool)
- Categories: Data, Inputs, Indicators, Math, Logic, Conditions, Outputs, Alerts
- Swimlanes/columns: Sources → Transformations → Conditions → Outputs → Alerts
- Properties panel for node configuration

### 3.2 Parameter Configuration
- Two levels: User-exposed inputs vs. internal constants
- Parameters: numeric, display, outputs/buffers, labels, alerts
- Validation: type, business rules, platform compatibility

### 3.3 Real-time Preview
- Web Worker-based calculation
- OHLCV chart display with overlays
- Bar inspector for debugging
- Error reporting at node/diagnostic/chart levels

### 3.4 Multi-platform Code Generator
- 5-layer pipeline: Visual Graph → Semantic Resolution → Canonical IR → Platform Lowering → AST/Printer → Export
- MVP Platforms: TradingView Pine Script v5, MetaTrader 5 (MQL5)
- Architecture-ready: MQL4, NinjaTrader 8

### 3.5 Indicator Library
- Personal: projects, versions, duplication, tags, search, favorites
- Official Templates: trend, momentum, volatility, breakout, mean reversion
- Community (Phase 3): public, clone, search, moderation

### 3.6 User Account Management
- Authentication: email + magic link, Google sign-in
- Roles: user, admin (future: team_owner, editor, viewer)
- Project versioning, export history, subscriptions

---

## 4. Non-Functional Requirements

| Domain | MVP Requirement | Comment |
|--------|-----------------|---------|
| Performance | Canvas interaction fluid, preview recalc < 500ms P95 (5k bars, ~30 nodes) | Web Worker |
| API Response | Standard CRUD < 300ms P95 | Excludes long exports |
| Exports | Job accepted instantly, completed < 10s P95 | Queue + worker |
| Security | TLS everywhere, encryption at rest, strict input validation, object-level access control | Critical |
| Extensibility | Add new platform without rewriting editor | IR canonical |
| Maintainability | Monorepo, shared packages, versioned IR, generation tests | Reduces debt |
| Observability | Structured logs, job tracking, error alerts, export traces | Core compiler |
| Availability | 99.5% at MVP | Startup acceptable |
| Backup/Recovery | Daily backups + PITR | Versioned projects critical |
| Compliance | Basic GDPR: consent, account deletion, data export, DPA | EU target |
| Auditability | Export linked to immutable version + generator version + semantic hash | Differentiator |
| Multi-tenant Isolation | Each project accessible only by owner or explicit share | Non-negotiable |

---

## 5. Technical Architecture

### 5.1 Stack

| Layer | Recommended | Alternative |
|-------|-------------|--------------|
| Monorepo | pnpm + Turborepo | Nx |
| Frontend | Next.js + React + TypeScript | SvelteKit |
| Visual Editor | React Flow | Rete.js |
| UI System | Tailwind CSS + shadcn/ui | Chakra UI / MUI |
| Local State | Zustand | Redux Toolkit |
| Data Fetching | TanStack Query | SWR |
| Forms/Validation | React Hook Form + Zod | Formik + Yup |
| Chart Preview | TradingView Lightweight Charts | TradingView Charting Library |
| Backend API | NestJS + Fastify | Express/Fastify custom |
| ORM | Prisma | Drizzle |
| Database | PostgreSQL | MySQL |
| Queue/Jobs | BullMQ + Redis | Temporal |
| File Storage | S3-compatible | Cloudflare R2 |
| Auth | Clerk (MVP) | Auth.js |
| Payments | Stripe | Paddle |
| Web Hosting | Vercel | Netlify |
| API Hosting | Render or Railway | AWS ECS/Fargate |
| Error Monitoring | Sentry | Bugsnag |
| Logs/Metrics | Grafana Cloud or Better Stack | Datadog |
| Product Analytics | PostHog | Amplitude |
| CI/CD | GitHub Actions | GitLab CI |
| E2E Tests | Playwright | Cypress |
| Unit Tests | Vitest | Jest |

### 5.2 Architecture Pattern
**Modular Monolith + Async Worker**

- Shared core package (IR, compiler, validator)
- Frontend: Next.js app
- Backend: NestJS API module
- Worker: Export processing
- Database: PostgreSQL with JSONB
- Storage: S3 for exports/assets

---

## 6. Data Model

### Entities

| Entity | Role | Key Fields | Relationships |
|--------|------|------------|---------------|
| User | User account | id, email, displayName, authProvider, role, status, createdAt, lastLoginAt | 1-N Project, 1-N Subscription, 1-N Template, 1-N AuditLog |
| Subscription | Subscription state & quotas | id, userId, provider, planCode, status, period dates, quotaJson | N-1 User |
| Project | User-visible functional container | id, ownerId, name, slug, visibility, status, currentVersionId, timestamps | N-1 User, 1-1 IndicatorDefinition, 1-N SharedAsset |
| IndicatorDefinition | Current indicator definition | id, projectId, title, description, category, displayType, platforms, draftGraphJson, semanticHash | 1-1 Project, 1-N IndicatorVersion |
| IndicatorVersion | Immutable exportable snapshot | id, indicatorDefinitionId, versionNumber, graphJson, irJson, validationJson, generatorVersion, createdBy, changeNote | N-1 IndicatorDefinition, N-1 User, 1-N ExportJob |
| ExportJob | Export history & tracking | id, versionId, platform, version, status, warnings, artifactKey, checksum, timestamps | N-1 IndicatorVersion |
| Template | Official/personal/community template | id, createdBy, sourceVersionId, scope, title, description, tags, featured, createdAt | N-1 User, N-1 IndicatorVersion |
| SharedAsset | Share/publication link | id, assetType, assetId, ownerId, shareMode, shareToken, allowClone, expiresAt | N-1 User |
| AuditLog | Business & security audit | id, actorUserId, action, entityType, entityId, metadataJson, ipHash, createdAt | N-1 User |

---

## 7. Roadmap

### Phase 1 - MVP
**Goal**: Prove user can build medium indicator without coding, preview correctly, export usable code.

- Authentication & user account
- Project dashboard
- Typed node visual editor
- Node subset: OHLCV, SMA, EMA, RSI, ATR, MACD, Bollinger, math ops, comparisons, if/then, simple plots, simple alerts
- Semantic validation
- Preview on historical data/CSV
- Basic versioning
- Export: Pine Script v5, MQL5
- Official starter templates
- Export history

### Phase 2 - Enrichment
**Goal**: Improve retention, technical credibility, monetization.

- MQL4 support
- NinjaTrader 8 support
- Detailed platform compatibility
- Public/unlisted library
- Improved search
- Premium templates
- Guided onboarding
- Cleaner dataset import
- Validation report export
- MFA
- Finer paid plans
- Advanced analytics
- Improved bar-level trace/debug

### Phase 3 - Long-term Vision
- Complete strategy generation
- Advanced alerting
- Backtesting
- Parameter optimization
- AI assistant for structure suggestions
- Marketplace
- Team collaboration
- Public API / white-label
- Strict parity reporting

---

## 8. Monetization

### Model 1 - Freemium
- Free with strong limits: 2 projects, 1 platform, 10 exports/month, standard templates
- Low acquisition friction, organic growth lever
- Risk: support cost, abuse, low immediate revenue

### Model 2 - Subscription Tiers
| Plan | Position | Price |
|------|----------|-------|
| Starter | Regular individual use | €19-29/mo |
| Pro | Multi-platform, versioning, premium templates | €49-79/mo |
| Team | Small team, shared library, roles | €149-299/mo |

### Model 3 - Marketplace (Phase 3)
- 15-20% commission on template sales
- Network effects, ecosystem creation, creator retention

---

## 9. Key Decisions

### 5 Most Important Early Decisions
1. **Target ICP**: Intermediate trader + indicator creator
2. **Semantic Scope**: Small, well-tested primitives with clear contracts
3. **MVP Platforms**: Pine Script v5 + MQL5 (architecture for MQL4/NinjaTrader)
4. **Truth Source**: Shared canonical IR between preview and export
5. **Product Promise**: "Create and export custom indicators on portable subset" vs "everything, everywhere"

### 3 Biggest Execution Risks
1. **Preview vs Export Mismatch**: User doesn't see what they'll get
2. **Scope Explosion**: Trying to be universal too early
3. **UX Complexity**: Too hard for beginners, too limiting for experts

---

## 10. Security & Compliance

### Application Security
- TLS everywhere
- Resource-based access control
- Strict payload validation
- Rate limiting on auth, exports, shares
- Label/input sanitization in generated code
- Secret storage in vault/secret manager
- Audit logs on sensitive actions

### Project Protection
- Private by default
- No sharing without explicit action
- Unsigned/unlisted links with tokens
- Strict logical separation by owner
- User data export/deletion
- Clear policy: no AI training without opt-in

### Legal/Trading Compliance
- Tool provides no investment advice
- User defines logic, remains responsible for validation
- Clear legal notices, adapted ToS
- Data license compliance
- Trademark usage: MetaTrader, TradingView, NinjaTrader

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Incorrect code generation | Trust loss, support cost, reputation | Canonical IR, reduced subset, parity tests, immutable versioning, clear communication |
| Rapid node expansion | Uncontrolled IR complexity | Strict IR schema governance |
| Multi-platform too early | Massive technical debt | 2 platforms MVP, 4-ready architecture |
| Preview/export misalignment | Trust bugs | Shared engine |
| Too much frontend logic | Server validation difficulty | Shared core, server-side final validation |
| Third-party API dependency | Cost, quotas, lock-in, downtime | Provider abstraction, avoid expensive widgets, auth interface separation, degradation mode |