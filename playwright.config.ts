import { defineConfig } from "@playwright/test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

/**
 * Port layout (do not collide with agent-browser / DevLoop black-box):
 * - :5173 — agent-browser + orchestrator app_base_url (long-lived)
 * - :5176 — Playwright E2E Vite only (web runtime)
 * - :9224 — Chrome CDP for Playwright web runtime (:9222 = agent-browser)
 * - :9223 — Harmony ArkWeb via hdc fport (harmony runtime — no Vite)
 */
export const E2E_DEV_PORT = 5176;
export const AGENT_DEV_PORT = 5173;

const PORT = Number(process.env.E2E_PORT ?? E2E_DEV_PORT);
const BASE_URL =
  process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}/?lang=zh-CN`;

function loadRuntimeMode(): "web" | "harmony" {
  const forced = process.env.E2E_RUNTIME;
  if (forced === "web" || forced === "harmony") return forced;
  const file = join(__dirname, "e2e", ".runtime.json");
  if (existsSync(file)) {
    return (JSON.parse(readFileSync(file, "utf8")) as { mode: string }).mode ===
      "harmony"
      ? "harmony"
      : "web";
  }
  return "web";
}

const runtimeMode = loadRuntimeMode();

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["**/examples/**"],
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects:
    runtimeMode === "harmony"
      ? [
          {
            name: "harmony",
            use: {
              viewport: { width: 390, height: 844 },
              isMobile: true,
              hasTouch: true,
            },
          },
        ]
      : [
          {
            name: "desktop",
            use: {
              viewport: { width: 1280, height: 800 },
            },
          },
          {
            name: "mobile",
            testIgnore: ["**/examples/**"],
            use: {
              viewport: { width: 390, height: 844 },
              isMobile: true,
              hasTouch: true,
            },
          },
        ],
  ...(runtimeMode === "web"
    ? {
        webServer: {
          command: `npm run dev -- --port ${PORT} --strictPort`,
          url: BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }
    : {}),
});
