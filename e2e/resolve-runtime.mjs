#!/usr/bin/env node
/**
 * Pick E2E runtime before Playwright (writes e2e/.runtime.json).
 * Harmony: build+install HAP on emulator, hdc fport, ArkWeb CDP.
 * Web: Chrome :9224 + Vite :5176.
 */
import { spawnSync } from "node:child_process";
// spawnSync also used for sleep retries in forwardHarmonyCdp
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RUNTIME_FILE = join(ROOT, "e2e", ".runtime.json");
const WEB_CDP_PORT = process.env.E2E_CDP_PORT ?? "9224";
const HARMONY_CDP_PORT = process.env.HARMONY_CDP_LOCAL_PORT ?? "9223";

function hdcBin() {
  const deveco =
    "/Applications/DevEco-Studio.app/Contents/sdk/default/openharmony/toolchains/hdc";
  if (existsSync(deveco)) return deveco;
  return "hdc";
}

function hdcPathEnv() {
  const hdc = hdcBin();
  return { ...process.env, PATH: `${dirname(hdc)}:${process.env.PATH ?? ""}` };
}

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    encoding: "utf8",
    cwd: ROOT,
    stdio: opts.inherit ? "inherit" : "pipe",
    env: hdcPathEnv(),
    ...opts,
  });
}

function hasHdcDevice() {
  const r = run(hdcBin(), ["list", "targets"]);
  if (r.status !== 0) return false;
  return r.stdout.trim().split("\n").some((l) => l.trim().length > 0);
}

async function probeCdp(url, attempts = 15) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${url}/json/version`);
      if (res.ok) return await res.json();
    } catch {
      // ArkWeb CDP can take a few seconds after hdc fport + app start
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}

async function probeArkWebPage(cdpUrl) {
  try {
    const res = await fetch(`${cdpUrl}/json/list`);
    if (!res.ok) return null;
    const pages = await res.json();
    const page = pages.find((p) => p.type === "page" && p.url !== "about:blank");
    if (!page?.webSocketDebuggerUrl) return null;
    return page;
  } catch {
    return null;
  }
}

function installHarmonyHap() {
  if (process.env.E2E_HARMONY_SKIP_INSTALL === "1") {
    console.log("[e2e] skip HAP install (E2E_HARMONY_SKIP_INSTALL=1)");
    return true;
  }
  console.log("[e2e] building and installing Hunos HAP on emulator...");
  const r = run("bash", ["harmony/scripts/e2e-install.sh"], { inherit: true });
  return r.status === 0;
}

function forwardHarmonyCdp() {
  let forward = null;
  for (let attempt = 1; attempt <= 8; attempt++) {
    forward = run("bash", ["harmony/scripts/e2e-cdp-forward.sh"]);
    if (forward.status === 0) break;
    if (attempt < 8) {
      console.log(`[e2e] CDP forward retry ${attempt}/8…`);
      spawnSync("sleep", ["2"], { cwd: ROOT });
    }
  }
  if (!forward || forward.status !== 0) {
    const out = `${forward.stderr}\n${forward.stdout}`;
    if (/webview_devtools_remote/.test(out)) {
      console.warn(
        "[e2e] ArkWeb CDP socket missing after install — check setWebDebuggingAccess in Index.ets",
      );
    }
    return null;
  }
  const targets = run(hdcBin(), ["list", "targets"]);
  const target = targets.stdout?.trim().split("\n").find((l) => l.trim())?.trim();
  const pidMatch = forward.stdout.match(/pid=(\d+)/);
  return { hdcTarget: target, devicePid: pidMatch?.[1] };
}

async function tryHarmony({ install }) {
  if (!hasHdcDevice()) return null;
  if (install && !installHarmonyHap()) return null;

  let setup = null;
  if (!install) {
    setup = forwardHarmonyCdp();
    if (!setup) return null;
  } else {
    const targets = run(hdcBin(), ["list", "targets"]);
    const target = targets.stdout?.trim().split("\n").find((l) => l.trim())?.trim();
    const pid = run(hdcBin(), ["shell", "pidof", "com.hunos.notes"]);
    const devicePid = pid.stdout?.trim().split(/\s+/)[0];
    setup = { hdcTarget: target, devicePid };
  }

  const cdpUrl = `http://127.0.0.1:${HARMONY_CDP_PORT}`;
  const version = await probeCdp(cdpUrl, install ? 3 : 15);
  if (!version) return null;

  const pageEntry = await probeArkWebPage(cdpUrl);
  if (!pageEntry) return null;

  return {
    mode: "harmony",
    cdpUrl,
    hdcTarget: setup?.hdcTarget,
    devicePid: setup?.devicePid,
    browser: version.Browser,
    pageTitle: pageEntry.title,
    pageUrl: pageEntry.url,
  };
}

async function tryWeb() {
  const cdpUrl = `http://127.0.0.1:${WEB_CDP_PORT}`;
  const version = await probeCdp(cdpUrl);
  if (!version) return null;
  return { mode: "web", cdpUrl, browser: version.Browser };
}

async function main() {
  const forced = process.env.E2E_RUNTIME;
  let runtime = null;

  if (forced === "harmony") {
    runtime = await tryHarmony({ install: true });
    if (!runtime) {
      console.error(
        "[e2e] E2E_RUNTIME=harmony failed.\n" +
          "  - DevEco emulator running\n" +
          "  - harmony/scripts/e2e-install.sh succeeds\n" +
          "  - harmony/scripts/e2e-cdp-forward.sh exposes :9223",
      );
      process.exit(1);
    }
  } else if (forced === "web") {
    runtime = await tryWeb();
    if (!runtime) {
      console.error(
        `[e2e] E2E_RUNTIME=web but Chrome CDP :${WEB_CDP_PORT} unreachable. Run: npm run chrome:e2e`,
      );
      process.exit(1);
    }
  } else {
    runtime =
      (await tryHarmony({ install: true })) ?? (await tryWeb());
    if (!runtime) {
      console.error(
        "[e2e] No E2E runtime available.\n" +
          "  Harmony: start emulator, then npm run test:e2e:harmony\n" +
          `  Web: npm run chrome:e2e (CDP :${WEB_CDP_PORT})`,
      );
      process.exit(1);
    }
  }

  writeFileSync(RUNTIME_FILE, `${JSON.stringify(runtime, null, 2)}\n`);

  if (runtime.mode === "harmony") {
    console.log(
      `[e2e] runtime=harmony (emulator ArkWeb via hdc → ${runtime.cdpUrl})`,
    );
    console.log(
      `[e2e]   hdc target=${runtime.hdcTarget} pid=${runtime.devicePid ?? "?"}`,
    );
    console.log(`[e2e]   page: ${runtime.pageTitle ?? "?"} ${runtime.pageUrl ?? ""}`);
    console.log("[e2e]   Vite webServer: OFF — tests run on device WebView");
  } else {
    console.log(`[e2e] runtime=web (Chrome CDP ${runtime.cdpUrl} + Vite :5176)`);
    console.log(`[e2e]   browser: ${runtime.browser ?? "?"}`);
  }
}

main();
