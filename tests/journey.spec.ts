import { test, expect } from "@playwright/test";
test("mobile journal: real inputs, history, interruption and backup recovery", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await page.getByRole("button", { name: "设置个人目标", exact: true }).click();
  await page.locator('input[name="age"]').fill("30");
  await page.locator('input[name="height"]').fill("180");
  await page.locator('input[name="weight"]').fill("80");
  await page.locator('select[name="activity"]').selectOption("1.55");
  await page.locator('input[name="adjustment"]').fill("-414");
  await page.getByRole("button", { name: "计算并预览" }).click();
  await expect(page.getByText("2,345", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "保存目标", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "手机主导航" })
    .getByRole("link", { name: "饮食" })
    .click();
  await page.getByRole("tab", { name: "我的食物" }).click();
  await page
    .getByRole("button", { name: "新增食物", exact: true })
    .first()
    .click();
  await page.locator('input[name="name"]').fill("测试食物");
  await page.locator('input[name="protein"]').fill("10");
  await page.locator('input[name="carbs"]').fill("20");
  await page.locator('input[name="fat"]').fill("5");
  await page.getByRole("button", { name: "保存食物" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("tab", { name: "饮食记录" }).click();
  await page.getByRole("button", { name: "记录食物", exact: true }).click();
  await page
    .getByRole("group", { name: "选择食物" })
    .getByRole("button")
    .first()
    .click();
  await page.getByLabel("实际份量").fill("150");
  await page.getByRole("button", { name: "保存记录", exact: true }).click();
  await expect(page.getByText("150 g · 包装食品 · 248 kcal")).toBeVisible();
  await page
    .getByRole("navigation", { name: "手机主导航" })
    .getByRole("link", { name: "训练" })
    .click();
  await page.getByRole("button", { name: "新建模板", exact: true }).click();
  await page.getByLabel("模板名称").fill("上肢训练");
  await page.getByLabel("添加动作").selectOption("standard-bench-press");
  await page.getByRole("button", { name: "添加", exact: true }).click();
  await page.getByLabel("重量 · kg", { exact: true }).fill("60");
  await page.getByRole("button", { name: "保存训练模板" }).click();
  await page.getByRole("button", { name: "开始训练", exact: true }).click();
  const firstWeight = page.getByLabel("杠铃卧推第1组重量");
  await firstWeight.fill("");
  await firstWeight.pressSequentially("100", { delay: 1 });
  await expect(firstWeight).toHaveValue("100");
  await firstWeight.fill("60");
  await page
    .getByRole("button", { name: "完成杠铃卧推第1组", exact: true })
    .click();
  await page.getByLabel("杠铃卧推第2组次数").fill("8");
  await page
    .getByRole("button", { name: "完成杠铃卧推第2组", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "撤销杠铃卧推第2组" }),
  ).toBeVisible();
  await expect(page.getByLabel("杠铃卧推第2组次数")).toHaveValue("8");
  await expect(page.locator(".rest-timer")).toContainText("组间休息");
  await page.getByRole("button", { name: "结束并保存训练" }).click();
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.locator(".active-workout")).toHaveCount(0);
  await page.getByRole("tab", { name: "训练历史" }).click();
  await page.getByRole("button", { name: /上肢训练.*已|上肢训练.*组/ }).click();
  await expect(page.getByRole("dialog")).toContainText("1,080 kg");
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", { name: "设置与备份" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出完整备份" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  const fs = await import("node:fs/promises");
  const backup = JSON.parse(await fs.readFile(path!, "utf8"));
  expect(backup.data.sessions[0].status).toBe("completed");
  expect(backup.data.logs[0].amount).toBe(150);
  expect(backup.data.profiles[0].targets.calories).toBe(2345);
  await page.locator('input[type="file"]').setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"invalid":true}'),
  });
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "原有记录未被更改",
  );
  await page.locator('input[type="file"]').setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByRole("dialog").last()).toContainText(
    "1 条饮食、1 次训练",
  );
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "手机主导航" })
    .getByRole("link", { name: "趋势" })
    .click();
  await expect(page.getByText("同一动作，持续对照")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "test-results/mobile-trends.png",
    fullPage: true,
    animations: "disabled",
  });
});
test("small phone and desktop empty states remain usable", async ({ page }) => {
  for (const viewport of [
    { width: 360, height: 780 },
    { width: 844, height: 390 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("./");
    await expect(
      page.getByRole("button", { name: "设置个人目标", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  }
  await page.screenshot({
    path: "test-results/desktop-home.png",
    fullPage: true,
    animations: "disabled",
  });
});
