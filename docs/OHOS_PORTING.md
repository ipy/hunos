# Hunos - OpenHarmony (HarmonyOS) Guide

## Overview

Hunos runs on OpenHarmony via a **WebView shell**, not React Native. The same React web app built with Vite is bundled as a single IIFE, inlined into an HTML file, and loaded by an ArkWeb component from `rawfile` resources.

There is no RNOH, Metro, Hermes, or React Native dependency.

## Architecture

```
hunos/
├── src/                          # Shared React/TS source (same as web & Capacitor)
├── web/
│   ├── index.html                # Vite HTML entry
│   └── main.tsx                  # React DOM entry point
├── vite.config.harmony.ts        # IIFE build config for HarmonyOS
├── dist-harmony/
│   └── app.js                    # Single IIFE bundle (generated)
├── harmony/                      # OpenHarmony native shell
│   ├── AppScope/                 # App-level resources
│   ├── entry/
│   │   └── src/main/
│   │       ├── ets/
│   │       │   ├── entryability/EntryAbility.ets   # App lifecycle
│   │       │   └── pages/Index.ets                   # ArkWeb host page
│   │       └── resources/
│   │           └── rawfile/
│   │               └── index.html                    # Inlined IIFE bundle
│   ├── build-profile.json5
│   ├── oh-package.json5
│   └── build.sh                  # Automated build script
└── package.json
```

### Runtime Flow

```
EntryAbility.ets
  └── loads pages/Index.ets
        └── Web({ src: $rawfile('index.html') })
              └── Full React app (TipTap editor, Dexie/IndexedDB, Zustand)
```

The ArkWeb component enables JavaScript, DOM storage, and database access so Dexie.js (IndexedDB) works identically to browser and Capacitor WebViews.

## Prerequisites

- **DevEco Studio** (NEXT or later), typically at `/Applications/DevEco-Studio.app`
- **HarmonyOS SDK** (API 12+, target SDK 6.1.0 / API 23)
- **Node.js** 18+ (bundled with DevEco Studio or system-installed)
- **Java** (JBR bundled with DevEco Studio)

## Key Dependencies

The HarmonyOS shell has **no npm React Native dependencies**. The web app dependencies (from project root `package.json`) are bundled into the IIFE:

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tiptap/react": "^2.8.0",
    "dexie": "^4.0.8",
    "zustand": "^4.5.5",
    "i18next": "^23.15.1",
    "react-i18next": "^15.0.2"
  }
}
```

## Vite Harmony Build Config

`vite.config.harmony.ts` produces a single IIFE file suitable for inlining:

```typescript
// Key settings:
build: {
  outDir: 'dist-harmony',
  cssCodeSplit: false,
  rollupOptions: {
    output: {
      inlineDynamicImports: true,
      format: 'iife',
      entryFileNames: 'app.js',
    },
  },
}
```

## ArkWeb Host Page

`harmony/entry/src/main/ets/pages/Index.ets`:

```typescript
import { webview } from '@kit.ArkWeb';

@Entry
@Component
struct Index {
  controller: webview.WebviewController = new webview.WebviewController();

  build() {
    Column() {
      Web({ src: $rawfile('index.html'), controller: this.controller })
        .width('100%')
        .height('100%')
        .javaScriptAccess(true)
        .domStorageAccess(true)
        .databaseAccess(true)
        .mixedMode(MixedMode.All)
    }
    .width('100%')
    .height('100%')
  }
}
```

Required WebView flags:
- `javaScriptAccess(true)` — run the React app
- `domStorageAccess(true)` — localStorage/sessionStorage
- `databaseAccess(true)` — **IndexedDB** (required for Dexie.js)

## Build & Run

### Automated (recommended)

```bash
cd harmony
chmod +x build.sh
./build.sh
```

The script:
1. Runs `npx vite build --config vite.config.harmony.ts` → `dist-harmony/app.js`
2. Packages into `entry/src/main/resources/rawfile/` via `scripts/package-rawfile.sh` (gitignored)
3. Runs `hvigorw assembleHap --no-daemon` to produce the HAP

Output: `harmony/entry/build/default/outputs/default/entry-default-unsigned.hap`

### Manual steps

```bash
# 1. Build IIFE bundle
npm run build:harmony

# 2. Package into rawfile (gitignored)
npm run harmony:package

# 3. Open harmony/ in DevEco Studio and Build > Build Hap(s)
```

### DevEco Studio

1. Open the `harmony/` directory as a project
2. Ensure rawfile assets are current (`./build.sh` or `npm run build:harmony && npm run harmony:package`)
3. Configure signing if deploying to device (File > Project Structure > Signing Configs)
4. Run on emulator or device (not Previewer — see Known Issues)

## Storage

Dexie.js uses IndexedDB inside the ArkWeb context. No native SQLite bridge is needed for v1. The same storage modules (`noteStorage`, `linkStorage`, `tagStorage`) used on web and Capacitor work unchanged.

A placeholder SQLite adapter exists at `src/storage/sqlite.ts` for a potential future native bridge if IndexedDB limits are hit on very large datasets.

## Capacitor vs HarmonyOS Comparison

| Aspect | iOS / Android (Capacitor) | OpenHarmony (ArkWeb) |
|--------|---------------------------|----------------------|
| Shell | Capacitor native project | ArkTS + ArkWeb |
| Web assets | `dist/` copied via `cap sync` | IIFE inlined into `rawfile/index.html` |
| Build tool | Vite (standard SPA) | Vite (IIFE via `vite.config.harmony.ts`) |
| Storage | IndexedDB in WebView | IndexedDB in ArkWeb |
| Editor | TipTap in DOM | TipTap in DOM (same bundle) |

## Known Issues

- **Previewer + hot reload**: Error `00401037` — use Run on Emulator/Device instead of Previewer
- **Single-file bundle size**: The inlined HTML includes the full app; monitor size as features grow
- **No external script imports**: ArkWeb `$rawfile` requires all JS inlined in one HTML file (handled by `build.sh`)

## Testing Strategy

1. Verify ArkWeb loads `index.html` and React mounts to `#root`
2. Test TipTap editor input, formatting toolbar, and auto-save
3. Validate Dexie.js CRUD (create note, persist across app restart)
4. Test custom navigation stack (note list → editor → back)
5. Test tags slide-over sidebar (burger menu)
6. Verify i18n locale switching
7. Performance profiling on target HarmonyOS device

## Future Enhancements

- Native ArkTS bridge for file import/export beyond browser sandbox
- Optional SQLite adapter via native module for very large note collections
- Push notifications for sync events
- Biometric lock via HarmonyOS authentication APIs
