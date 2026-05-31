import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BACKLINK_SNIPPET_RAW_MARKDOWN_RE,
  backlinkSnippetHasRawMarkdown,
} from "@/components/backlinks/formatBacklinkSnippet";
import zh from "@/i18n/zh.json";
import en from "@/i18n/en.json";

const backlinksE2eSource = readFileSync(
  join(process.cwd(), "e2e/backlinks/backlinks.spec.ts"),
  "utf-8",
);
const backlinksHelperSource = readFileSync(
  join(process.cwd(), "e2e/helpers/backlinks.ts"),
  "utf-8",
);
const formatSnippetSource = readFileSync(
  join(process.cwd(), "src/components/backlinks/formatBacklinkSnippet.ts"),
  "utf-8",
);

describe("iteration 61 — snippet regex single source (AC61-snippet-regex-single-source)", () => {
  it("defines BACKLINK_SNIPPET_RAW_MARKDOWN_RE only in formatBacklinkSnippet", () => {
    expect(formatSnippetSource).toContain(
      "export const BACKLINK_SNIPPET_RAW_MARKDOWN_RE",
    );
    expect(backlinksHelperSource).not.toMatch(
      /export const BACKLINK_SNIPPET_RAW_MARKDOWN_RE\s*=/,
    );
    expect(backlinksHelperSource).toContain("backlinkSnippetHasRawMarkdown");
    expect(backlinkSnippetHasRawMarkdown("**bold**")).toBe(true);
    expect(BACKLINK_SNIPPET_RAW_MARKDOWN_RE).toBeInstanceOf(RegExp);
  });
});

describe("iteration 61 — footer label consistency (AC61-footer-i18n)", () => {
  it("uses a panel title distinct from the outgoing section label in zh and en", () => {
    expect(zh.editor.backlinks.title).toBe("链接");
    expect(zh.editor.backlinks.outgoing).toBe("链接到");
    expect(zh.editor.backlinks.title).not.toBe(zh.editor.backlinks.outgoing);
    expect(en.editor.backlinks.title).toBe("Backlinks");
    expect(en.editor.backlinks.outgoing).toBe("Links to");
    expect(en.editor.backlinks.title).not.toBe(en.editor.backlinks.outgoing);
  });
});

describe("iteration 61 — backlinks e2e AC60/AC61 gates (AC61-backlinks-ac60-e2e)", () => {
  it("names AC60 primary scenarios explicitly on desktop and 606×844", () => {
    for (const ac of [
      "AC60-backlinks-stable-testid",
      "AC60-backlinks-e2e-navigation",
      "AC60-backlink-snippet-delimiters",
      "AC61-backlinks-nav-hash",
    ]) {
      expect(backlinksE2eSource).toContain(ac);
    }
    expect(backlinksE2eSource).toContain("mobile 606×844");
    expect(backlinksE2eSource).toContain("desktop");
    expect(backlinksE2eSource).toContain("expectBacklinkNavigationHash");
    expect(backlinksE2eSource).toContain("window.location.hash");
  });
});
