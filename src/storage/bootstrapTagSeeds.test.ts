import { describe, expect, it } from "vitest";
import {
  getBootstrapPlaygroundSeedContent,
  getBootstrapSeedTagNames,
  getBootstrapWelcomeSeedContent,
} from "./bootstrapTagSeeds";

describe("bootstrapTagSeeds", () => {
  it("lists en bootstrap tag names from locale seeds", () => {
    expect(getBootstrapSeedTagNames("en")).toEqual([
      "format-test",
      "format-test/welcome",
      "hunos",
      "hunos/getting-started",
    ]);
  });

  it("lists zh bootstrap tag names from locale seeds", () => {
    expect(getBootstrapSeedTagNames("zh")).toEqual([
      "hunos",
      "hunos/入门指南",
      "格式测试",
      "格式测试/欢迎",
    ]);
  });

  it("returns stable welcome and playground seed JSON per locale", () => {
    const enWelcome = getBootstrapWelcomeSeedContent("en");
    const enPlayground = getBootstrapPlaygroundSeedContent("en");
    expect(enWelcome).toContain("#format-test/welcome");
    expect(enPlayground).toContain("#format-test");

    const zhWelcome = getBootstrapWelcomeSeedContent("zh");
    const zhPlayground = getBootstrapPlaygroundSeedContent("zh");
    expect(zhWelcome).toContain("#格式测试/欢迎");
    expect(zhPlayground).toContain("#格式测试");
  });
});
