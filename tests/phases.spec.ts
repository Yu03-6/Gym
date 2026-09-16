import { test, expect } from "@playwright/test";
import {
  calculateProfile,
  initialState,
  serializeBackup,
  today,
} from "../src/lib/model";
test("phase activation is explicit and editing a template preserves active targets", async ({
  page,
}) => {
  const state = initialState();
  state.profiles.push(
    calculateProfile({
      effectiveDate: today(),
      age: 30,
      height: 180,
      weight: 80,
      sex: "male",
      activity: "1.55",
      energyMode: "inclusive",
      goal: "lose",
      adjustment: -414,
      proteinPerKg: 1.6,
      fatPerKg: 0.8,
    }),
  );
  await page.goto("./");
  await page.getByRole("button", { name: "设置与备份" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(serializeBackup(state)),
  });
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "手机主导航" })
    .getByRole("link", { name: "饮食" })
    .click();
  await page.getByRole("link", { name: "阶段计划" }).click();
  await page
    .getByRole("button", { name: "创建阶段", exact: true })
    .first()
    .click();
  await page.locator('input[name="name"]').fill("阶段 A");
  await page.locator('input[name="trainingcarbs"]').fill("280");
  await page.locator('input[name="restcarbs"]').fill("200");
  await page.getByRole("button", { name: "保存阶段模板" }).click();
  await page.getByRole("button", { name: "启用", exact: true }).click();
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.locator(".phase-active")).toContainText("阶段 A");
  await page.getByRole("link", { name: "返回饮食" }).click();
  await expect(page.locator(".nutrition-top h2")).toContainText("1,888");
  await page.getByLabel("当天饮食日类型").selectOption("training");
  await expect(page.locator(".nutrition-top h2")).toContainText("2,208");
  await page.getByRole("link", { name: "阶段计划" }).click();
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page.locator('input[name="trainingcarbs"]').fill("150");
  await page.getByRole("button", { name: "保存阶段模板" }).click();
  await page.getByRole("link", { name: "返回饮食" }).click();
  await expect(page.locator(".nutrition-top h2")).toContainText("2,208");
  await page.getByRole("link", { name: "阶段计划" }).click();
  await page.getByRole("button", { name: "暂停阶段" }).click();
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await page.getByRole("link", { name: "返回饮食" }).click();
  await expect(page.locator(".nutrition-top h2")).toContainText("2,345");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});
