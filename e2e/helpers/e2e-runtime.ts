import { existsSync, readFileSync } from "fs";
import { join } from "path";

export type E2eRuntimeMode = "web" | "harmony";

export interface E2eRuntime {
  mode: E2eRuntimeMode;
  cdpUrl: string;
  /** Set when mode=harmony — proves traffic goes through hdc, not Vite. */
  hdcTarget?: string;
  devicePid?: string;
  arkWebUserAgent?: string;
}

const RUNTIME_FILE = join(__dirname, "..", ".runtime.json");

export function runtimeFilePath(): string {
  return RUNTIME_FILE;
}

export function loadE2eRuntime(): E2eRuntime {
  if (existsSync(RUNTIME_FILE)) {
    return JSON.parse(readFileSync(RUNTIME_FILE, "utf8")) as E2eRuntime;
  }
  const forced = process.env.E2E_RUNTIME;
  if (forced === "web" || forced === "harmony") {
    return defaultRuntime(forced);
  }
  return defaultRuntime("web");
}

export function isHarmonyRuntime(): boolean {
  return loadE2eRuntime().mode === "harmony";
}

export function isWebRuntime(): boolean {
  return loadE2eRuntime().mode === "web";
}

function defaultRuntime(mode: E2eRuntimeMode): E2eRuntime {
  if (mode === "harmony") {
    const port = process.env.HARMONY_CDP_LOCAL_PORT ?? "9223";
    return { mode, cdpUrl: process.env.HARMONY_CDP_URL ?? `http://127.0.0.1:${port}` };
  }
  const port = process.env.E2E_CDP_PORT ?? "9224";
  return {
    mode,
    cdpUrl: process.env.PW_CDP_URL ?? `http://127.0.0.1:${port}`,
  };
}
