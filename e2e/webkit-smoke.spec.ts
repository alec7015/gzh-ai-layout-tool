import { expect, test } from "@playwright/test";

test.describe("WKWebView smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("opens the in-app confirmation dialog instead of a native dialog", async ({ page }) => {
    page.on("dialog", (dialog) => {
      throw new Error(`Native dialog should not open: ${dialog.message()}`);
    });

    await page.getByRole("button", { name: "模型设置" }).click();
    await expect(page.getByRole("dialog", { name: "模型设置" })).toBeVisible();
    const deleteDrafts = page.getByRole("button", { name: "删除全部草稿" });
    await deleteDrafts.scrollIntoViewIfNeeded();
    await deleteDrafts.click({ force: true });

    await expect(page.getByRole("dialog", { name: "确认操作" })).toContainText("确认删除全部草稿");
    await page.getByRole("button", { name: "取消" }).click();
    await expect(page.getByRole("dialog", { name: "确认操作" })).toHaveCount(0);
  });

  test("sets a summary role card in the layout editor", async ({ page }) => {
    await page.getByRole("button", { name: "写作台", exact: true }).click();
    await expect(page.getByLabel("写作工具栏")).toBeVisible({ timeout: 25_000 });
    await page.getByRole("button", { name: "复制到排版台" }).first().click();

    await expect(page.getByLabel("排版工具栏")).toBeVisible();
    await page.locator(".layout-editor .tiptap p").first().click();
    await page.getByLabel("块角色").selectOption("summary");

    await expect(page.locator('.layout-editor .tiptap [data-block-role="summary"]').first()).toBeVisible();
  });

  test("switches the preview into dark mode", async ({ page }) => {
    await page.getByRole("button", { name: "写作台", exact: true }).click();
    await expect(page.getByLabel("写作工具栏")).toBeVisible({ timeout: 25_000 });
    await page.getByRole("button", { name: "复制到排版台" }).first().click();

    await expect(page.locator(".device-frame")).toBeVisible();
    await page.getByRole("button", { name: "明色" }).click();

    await expect(page.locator(".device-frame.dark")).toBeVisible();
    await expect(page.locator(".dark-preview-note")).toContainText("暗色为近似模拟");
  });
});
