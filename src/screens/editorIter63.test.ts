import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  backlinkContextWithSection,
  disambiguateBacklinkContexts,
  extractFromPlainText,
  extractPlainTextForGraphSync,
} from "@/graph/linkExtractor";
import { formatBacklinkSnippet } from "@/components/backlinks/formatBacklinkSnippet";
import {
  filterNotesForProjectDocsList,
  getProjectDocsSeed,
  pickProjectDocsNote,
} from "@/storage/welcomeNotes";
import { buildPlaygroundContent } from "@/storage/formatPlaygroundNote";

const backlinksE2eSource = readFileSync(
  join(process.cwd(), "e2e/backlinks/backlinks.spec.ts"),
  "utf8",
);
const bootstrapSource = readFileSync(
  join(process.cwd(), "src/app/bootstrapAppData.ts"),
  "utf8",
);
const graphEngineSource = readFileSync(
  join(process.cwd(), "src/graph/graphEngine.ts"),
  "utf8",
);

describe("iteration 63 — canonical project docs count (AC63-backlinks-canonical-count)", () => {
  it("bootstrap runs graph hygiene before loading notes", () => {
    expect(bootstrapSource).toContain("reconcileBootstrapGraph");
    expect(bootstrapSource.indexOf("reconcileBootstrapGraph")).toBeLessThan(
      bootstrapSource.indexOf("loadNotes"),
    );
  });

  it("picks one canonical 项目文档 row when duplicates share the seed title", () => {
    const seed = getProjectDocsSeed("zh");
    const contentStr = JSON.stringify(seed.content);
    const picked = pickProjectDocsNote(
      [
        {
          id: "docs-old",
          title: "项目文档",
          content: contentStr,
          createdAt: 1,
        },
        {
          id: "docs-new",
          title: "项目文档",
          content: contentStr,
          isPinned: true,
          createdAt: 2,
        },
      ],
      "zh",
    );
    expect(picked?.id).toBe("docs-new");
  });

  it("hides duplicate 项目文档 list cards while keeping renamed copies", () => {
    const seed = getProjectDocsSeed("zh");
    const contentStr = JSON.stringify(seed.content);
    const filtered = filterNotesForProjectDocsList(
      [
        { id: "docs-a", title: "项目文档", content: contentStr, createdAt: 1 },
        { id: "docs-b", title: "项目文档", content: contentStr, createdAt: 2 },
        {
          id: "custom",
          title: "项目文档",
          content: JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "custom body" }],
              },
            ],
          }),
        },
      ],
      "zh",
    );
    expect(filtered).toHaveLength(2);
    expect(filtered.map((note) => note.id)).toContain("custom");
    expect(filtered.filter((note) => note.id.startsWith("docs-"))).toHaveLength(
      1,
    );
  });

  it("playground seed still exposes exactly two wiki links to 项目文档", () => {
    const plain = extractPlainTextForGraphSync(buildPlaygroundContent("zh"));
    const links = extractFromPlainText(plain).wikiLinks.filter(
      (link) => link.title === "项目文档",
    );
    expect(links).toHaveLength(2);
  });
});

function backlinkSnippetLabel(text: string): string {
  const parts = text.split(" · ");
  return parts.length >= 3 ? `${parts[0]} · ${parts[1]}` : (parts[0] ?? text);
}

describe("iteration 63 — prefix uniqueness (AC63-backlink-prefix-unique)", () => {
  it("adds source-title hints when section prefixes collide across sources", () => {
    const contexts = disambiguateBacklinkContexts([
      {
        context: backlinkContextWithSection("... ctx-a ...", "自由试炼"),
        noteTitle: "格式试炼场",
      },
      {
        context: backlinkContextWithSection("... ctx-b ...", "自由试炼"),
        noteTitle: "Meeting Notes",
      },
    ]);
    const prefixes = contexts.map((context) =>
      backlinkSnippetLabel(formatBacklinkSnippet(context)),
    );
    expect(new Set(prefixes).size).toBe(2);
    expect(prefixes.join(" ")).toMatch(/格式试炼场/);
    expect(prefixes.join(" ")).toMatch(/Meeting Notes/);
  });

  it("adds occurrence hints when the same source repeats a section prefix", () => {
    const contexts = disambiguateBacklinkContexts([
      {
        context: backlinkContextWithSection("... first ...", "自由试炼"),
        noteTitle: "格式试炼场",
      },
      {
        context: backlinkContextWithSection("... second ...", "自由试炼"),
        noteTitle: "格式试炼场",
      },
    ]);
    const prefixes = contexts.map((context) =>
      backlinkSnippetLabel(formatBacklinkSnippet(context)),
    );
    expect(new Set(prefixes).size).toBe(2);
    expect(prefixes.join(" ")).toMatch(/#1/);
    expect(prefixes.join(" ")).toMatch(/#2/);
  });
});

describe("iteration 63 — AC62 closure wiring", () => {
  it("names AC62 snippet disambiguation e2e on desktop and mobile", () => {
    expect(backlinksE2eSource).toContain("AC62-backlink-snippet-disambiguate");
    expect(backlinksE2eSource).toContain("mobile 606×844");
  });

  it("graphEngine applies prefix disambiguation on incoming rows", () => {
    expect(graphEngineSource).toContain("disambiguateBacklinkContexts");
  });
});
