import { test, expect } from "../fixtures/app";

test.describe("app boot", () => {
  test("shows note list and format playground seed", async ({ page }) => {
    await expect(page.getByTestId("note-list")).toBeVisible();
    await expect(
      page
        .getByTestId("note-list-item")
        .filter({
          has: page
            .getByTestId("note-list-item-title")
            .filter({ hasText: "格式试炼场", exact: true }),
        }),
    ).toBeVisible();
    await expect(
      page.getByTestId("note-list-item").filter({ hasText: "欢迎使用 Hunos" }).first(),
    ).toBeVisible();
  });
});
