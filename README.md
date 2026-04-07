# IndiForge

Visual trading indicator builder with multi-platform code generation.

## Overview

IndiForge is a SaaS platform that allows traders to create custom trading indicators visually without writing code. Build your indicator logic using an intuitive node-based editor, preview it in real-time, and export clean code to TradingView (Pine Script), MetaTrader (MQL5/MQL4), and NinjaTrader.

## Features

- **Visual Node Editor**: Drag and drop nodes to build indicator logic
- **Real-time Preview**: See your indicator on the chart as you build
- **Multi-platform Export**: Generate clean code for Pine Script v5, MQL5, MQL4, and NinjaTrader 8
- **Template Library**: Start with pre-built indicator templates
- **Version Control**: Track changes and manage versions

## Tech Stack

- **Frontend**: Next.js 14, React, React Flow, Tailwind CSS
- **Backend**: NestJS, Prisma, PostgreSQL
- **Core**: TypeScript IR-based code generation
- **Monorepo**: Turborepo + pnpm

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (for local development)

### Installation

```bash
# Clone the repository
cd indiforge

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and other secrets

# Generate Prisma client
cd packages/backend
pnpm prisma generate

# Run database migrations
pnpm prisma migrate dev

# Build all packages
pnpm build

# Run development servers
pnpm dev
```

### Development

```bash
# Run all packages in development mode
pnpm dev

# Run tests
pnpm test

# Lint
pnpm lint
```

## Project Structure

```
indiforge/
├── apps/
│   ├── api/          # API server (NestJS)
│   └── worker/       # Background job worker
├── packages/
│   ├── core/         # IR, validation, code generation
│   ├── frontend/     # Next.js web application
│   ├── backend/      # NestJS API server
│   └── shared/       # Shared types and utilities
└── .github/
    └── workflows/   # CI/CD pipelines
```

## Architecture

### Canonical IR

The core of IndiForge is a canonical Intermediate Representation (IR) that serves as the source of truth between:
- The visual editor (preview)
- Code generation (export)

This ensures that what you see in the preview matches what gets exported.

### Pipeline

1. **Visual Graph**: User builds indicator in node editor
2. **Validation**: Semantic validation of graph structure
3. **IR Generation**: Convert visual graph to canonical IR
4. **Platform Lowering**: Transform IR for target platform
5. **Code Generation**: Generate platform-specific code

## Supported Platforms

| Platform | Status | Language |
|----------|--------|----------|
| TradingView Pine Script v5 | MVP | Pine Script |
| MetaTrader 5 | MVP | MQL5 |
| MetaTrader 4 | Phase 2 | MQL4 |
| NinjaTrader 8 | Phase 2 | C# |

## License

MIT