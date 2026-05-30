import { describe, expect, it } from "vitest";
import {
  getBootstrapPlaygroundSeedContent,
  getBootstrapSeedTagNames,
  getBootstrapWelcomeSeedContent,
} from "./bootstrapTagSeeds";

describe("bootstrapTagSeeds", () => {
  it("lists en bootstrap tag names from locale seeds", () => {
    expect(getBootstrapSeedTagNames("en")).toEqual([
      "hunos",
      "hunos/format-test",
      "hunos/format-test/welcome",
      "hunos/getting-started",
    ]);
  });

  it("lists zh bootstrap tag names from locale seeds", () => {
    expect(getBootstrapSeedTagNames("zh")).toEqual([
      "hunos",
      "hunos/入门指南",
      "hunos/格式测试",
      "hunos/格式测试/欢迎",
    ]);
  });

  it("returns stable welcome and playground seed JSON per locale", () => {
    const enWelcome = getBootstrapWelcomeSeedContent("en");
    const enPlayground = getBootstrapPlaygroundSeedContent("en");
    expect(enWelcome).toContain("#hunos/format-test/welcome");
    expect(enPlayground).toContain("#hunos/format-test");

    const zhWelcome = getBootstrapWelcomeSeedContent("zh");
    const zhPlayground = getBootstrapPlaygroundSeedContent("zh");
    expect(zhWelcome).toContain("#hunos/格式测试/欢迎");
    expect(zhPlayground).toContain("#hunos/格式测试");
  });
});
