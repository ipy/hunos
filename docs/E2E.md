# Hunos (amiote) — Playwright E2E

Black-box suite from **DevLoop amiote** tester evidence (iterations 70–109).

**Same spec files** for web and Harmony (`e2e/**/*.spec.ts`) — same React app, different runtime.

**Mobile-first on Harmony:** the emulator WebView width is fixed (~phone). Tests use FAB, list→editor navigation, and `window.__hunosE2e` (HAP built with `HUNOS_E2E=1`) — not fake desktop width or Cmd+N/Cmd+F.

| Runtime | Where tests run | CDP | Dev server |
|---------|-----------------|-----|------------|
| **harmony** | ArkWeb on **emulator/device** | `:9223` via `hdc fport` | **Off** |
| **web** | Chrome tab → Vite | `:9224` (repo `.chrome-e2e-profile/`) | **:5176** |

**No Playwright-bundled browser.** Never run `npx playwright install chromium`.

## Auto pick runtime (default)

```bash
npm run test:e2e
```

Runs `e2e/resolve-runtime.mjs` first:

1. Try **Harmony** — emulator connected, Hunos process, `hdc fport`, CDP `:9223` has a page.
2. Else **web** — Chrome CDP on `:9224` (`npm run chrome:e2e`).

Force one side:

```bash
npm run test:e2e:harmony   # fail if emulator/Hunos unavailable
npm run test:e2e:web       # fail if Chrome CDP unavailable
```

## Port layout

| Port | Owner | Purpose |
|------|--------|---------|
| **5173** | agent-browser / DevLoop | Agent black-box — **not Playwright** |
| **5176** | Playwright (web only) | E2E Vite |
| **9222** | agent-browser | Other Chrome CDP — **not Playwright** |
| **9224** | Playwright web | Chrome `--user-data-dir=.chrome-e2e-profile/` |
| **9223** | Playwright harmony | ArkWeb on device via `hdc fport` |

## Web setup

```bash
npm run chrome:e2e    # .chrome-e2e-profile/ on :9224
npm run test:e2e:web
```

## Harmony setup (tests hit the emulator)

`test:e2e:harmony` and auto `test:e2e` **build + install HAP** before tests (`harmony/scripts/e2e-install.sh`):

```bash
# Emulator running in DevEco Device Manager
npm run test:e2e:harmony
```

Manual steps:

```bash
npm run harmony:e2e:install   # vite harmony build + hvigor HAP + hdc install -r
npm run harmony:e2e:forward    # hdc fport → :9223
npm run test:e2e:harmony       # skip reinstall: E2E_HARMONY_SKIP_INSTALL=1
```

Skip rebuild when HAP is already fresh: `E2E_HARMONY_SKIP_BUILD=1 npm run harmony:e2e:install`

You should see **Hunos open/foreground on the emulator** and logs like:

`[e2e] runtime=harmony … hdc target=… pid=…`

If the emulator stays idle, Playwright is **not** on Harmony — it fell back to web (Chrome + Vite) or CDP forward failed.

## Suite map

| Area | Spec |
|------|------|
| Boot | `e2e/smoke/boot.spec.ts` |
| Playground restore | `e2e/playground/restore.spec.ts` |
| Inline markdown | `e2e/playground/inline-markdown.spec.ts` |
| Find / replace | `e2e/editor/find-replace.spec.ts` |
| Status bar | `e2e/editor/status-bar.spec.ts` |
| TOC | `e2e/info-panel/toc.spec.ts` |
| Wiki-link / backlinks | `e2e/graph/wiki-link.spec.ts` |
| `[[` autocomplete | `e2e/graph/wiki-autocomplete.spec.ts` |
| Tag filter | `e2e/list/tag-filter.spec.ts` |
| Undo isolation | `e2e/notes/create-switch-undo.spec.ts` |
| Title focus | `e2e/notes/title-focus.spec.ts` |
| Pending save flush | `e2e/notes/pending-save-flush.spec.ts` |
| Mobile FAB | `e2e/mobile/fab-focus.spec.ts` |

## Conventions

1. **格式试炼场** + **恢复格式试炼场** before graph/markdown/find tests.
2. **Autosave:** wait **≥800ms** when asserting IndexedDB persistence.
3. **List click:** `note-list-item > div:nth-child(2)` (inner row).
4. **Wiki-link:** native Playwright `click()` on `wiki-link-target`.
5. **zh tag:** `#格式测试`.

## Helpers

- `e2e/resolve-runtime.mjs` — harmony-first, else web; writes `e2e/.runtime.json`
- `e2e/fixtures/app.ts` — CDP + fresh state per runtime
- `e2e/helpers/e2e-runtime.ts`, `e2e/helpers/e2e-cdp.ts`, `e2e/helpers/playground.ts`
