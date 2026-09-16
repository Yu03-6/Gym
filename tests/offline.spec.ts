import { test, expect } from "@playwright/test";
test("production PWA reopens offline and retains locally saved measurements", async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.TEST_PRODUCTION,
    "Requires a production static server with a service worker.",
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "设置个人目标", exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await page
    .getByRole("navigation", { name: "手机主导航" })
    .getByRole("link", { name: "趋势" })
    .click();
  await page.getByRole("button", { name: "记录体重", exact: true }).click();
  await page.locator('input[name="weight"]').fill("80");
  await page.getByRole("button", { name: "保存身体数据" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".stat").first()).toContainText("80");
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("当前离线，记录继续保存在本机。")).toBeVisible();
  await expect(page.locator(".stat").first()).toContainText("80");
  await page.getByRole("button", { name: "记录体重", exact: true }).click();
  await page.locator('input[name="weight"]').fill("79.5");
  await page.getByRole("button", { name: "保存身体数据" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".stat").first()).toContainText("79.5");
  expect(errors).toEqual([]);
});
