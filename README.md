# Hunos (amiote)

Local-first, graph-aware note-taking app with wiki links, tags, and backlinks. One React codebase ships to browser PWA, Capacitor (iOS/Android), and OpenHarmony (ArkWeb).

## Prerequisites

- Node.js 20 (see `.nvmrc`)

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

Opens the Vite dev server (default port 5173).

Other useful scripts:

```bash
npm run typecheck   # TypeScript without emit
npm run lint        # ESLint
npm run build       # Production web build
```

## Tests

**Unit tests** (Vitest):

```bash
npm test            # run once
npm run test:watch  # watch mode
```

**End-to-end tests** (Playwright) attach to real Chrome or Harmony ArkWeb — see [docs/E2E.md](docs/E2E.md) for setup, runtime selection, and port layout.

```bash
npm run test:e2e    # auto-pick harmony or web runtime
```

## Documentation

| Topic                         | Doc                                          |
| ----------------------------- | -------------------------------------------- |
| System architecture & layers  | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Notes, links, tags data model | [docs/DATA_MODEL.md](docs/DATA_MODEL.md)     |
| Playwright E2E setup & suite  | [docs/E2E.md](docs/E2E.md)                   |

Additional specs: `docs/PRD.md`, `docs/UI_SPEC.md`, `docs/API_CONTRACTS.md`.
