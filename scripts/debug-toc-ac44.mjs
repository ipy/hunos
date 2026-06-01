import { chromium } from "playwright";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9224");
  const page = browser.contexts()[0].pages()[0];
  await page.setViewportSize({ width: 606, height: 844 });
  await page.goto("http://127.0.0.1:5176/?lang=zh-CN");
  await page.getByText("格式试炼场").first().click();
  await page.getByTestId("info-panel-toggle").click();
  await page.getByTestId("info-panel-tab-toc").click();
  await page.evaluate(() => {
    document.querySelector('[data-testid="editor-scroll-pane"]').scrollTop = 0;
    document.querySelector('[data-testid="info-panel-toc-list"]').scrollTop = 0;
  });
  const list = await page.getByTestId("info-panel-toc-list").boundingBox();
  const box = await page.getByTestId("info-panel-toc-entry-11").boundingBox();
  const clickY =
    box.y + box.height > list.y + list.height
      ? list.y + list.height - 1
      : box.y + 4;
  await page.mouse.click(box.x + 16, clickY);
  console.log(
    await page.evaluate(() => ({
      editorScroll: document.querySelector('[data-testid="editor-scroll-pane"]')
        ?.scrollTop,
      tocScroll: document.querySelector('[data-testid="info-panel-toc-list"]')
        ?.scrollTop,
    })),
  );
  await browser.close();
}

main();
