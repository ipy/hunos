# Hunos - HarmonyOS (OpenHarmony) Build

This directory contains the HarmonyOS/OpenHarmony native shell that wraps the Hunos web application in a WebView. The React app (built with Vite) is loaded from `rawfile` resources inside an ArkWeb component.

## Architecture

```
harmony/
├── AppScope/              # App-level resources (icon, app.json5)
├── entry/                 # Main entry module
│   └── src/main/
│       ├── ets/
│       │   ├── entryability/EntryAbility.ets   # Application lifecycle
│       │   └── pages/Index.ets                  # WebView host page
│       └── resources/
│           └── rawfile/                         # Web assets (copied during build)
├── build-profile.json5    # SDK & product configuration
├── oh-package.json5       # Package dependencies
└── build.sh               # Automated build script
```

The app uses a single-page WebView (`@kit.ArkWeb`) to render the React application. IndexedDB (via Dexie.js) provides local persistence within the WebView context.

## Prerequisites

- **DevEco Studio** (NEXT or later) installed at `/Applications/DevEco-Studio.app`
- **HarmonyOS SDK** (API 12+, target SDK 6.1.0/API 23)
- **Node.js** (bundled with DevEco Studio, or system-installed for web build)
- **Java** (JBR bundled with DevEco Studio)

## Quick Start

### Build from command line

```bash
cd harmony
chmod +x build.sh
./build.sh
```

This script:
1. Builds the web assets (`npx vite build` in the project root)
2. Copies `dist/index.html` and `dist/assets/*` into `entry/src/main/resources/rawfile/`
3. Fixes asset paths to be relative (WebView `$rawfile` requirement)
4. Runs `hvigorw assembleHap --no-daemon` to produce the HAP

Output: `entry/build/default/outputs/default/entry-default-unsigned.hap`

### Build from DevEco Studio

1. Open this `harmony/` directory as a project in DevEco Studio
2. Ensure rawfile assets are up to date (run steps 1-3 of `build.sh` manually, or build web first)
3. Use **Build > Build Hap(s)/APP(s) > Build Hap(s)**
4. To run on device/emulator, click **Run** (requires signing config)

## SDK & Compatibility

| Field | Value |
|-------|-------|
| Compatible SDK | 5.0.0 (API 12) |
| Target SDK | 6.1.0 (API 23) |
| Runtime OS | HarmonyOS |
| hvigor plugin | 5.0.2 |

## Running on Emulator

1. In DevEco Studio, go to **Tools > Device Manager**
2. Click **Create Emulator** and select a phone profile
3. Choose the system image matching your target SDK
4. Start the emulator and run the project

If you see `ErrorCode: 00401037` ("Cannot run or debug this module in Previewer while it has hot reload configured"), this is a Previewer-specific issue. To resolve:
- Use **Run on Emulator/Device** instead of Previewer
- Or remove the `hotReload` configuration from `build-profile.json5` if present

## Signing

For distribution, configure a signing profile in `build-profile.json5`:

```json5
"signingConfigs": [
  {
    "name": "default",
    "type": "HarmonyOS",
    "material": {
      "certpath": "path/to/certificate.cer",
      "storeFile": "path/to/keystore.p12",
      "storePassword": "***",
      "keyAlias": "key0",
      "keyPassword": "***",
      "signAlg": "SHA256withECDSA"
    }
  }
]
```

## Future Plans

- Native bridge for file system access (import/export beyond browser sandbox)
- SQLite storage adapter via native module for larger note collections
- Push notifications for sync events
- Biometric lock via native authentication APIs
