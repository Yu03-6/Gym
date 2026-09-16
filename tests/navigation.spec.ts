import { test, expect } from "@playwright/test";

test("mobile sections stay focused and browser Back restores the parent", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "饮食阶段" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "上一周" })).toHaveCount(0);
  await page.getByRole("button", { name: "展开周历" }).click();
  await expect(page.getByRole("button", { name: "上一周" })).toBeVisible();
  await page.getByRole("button", { name: /记录饮食/ }).click();
  await expect(page.getByRole("dialog", { name: "选择食物" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "今日", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "手机主导航" })
    .getByRole("link", { name: "饮食" })
    .click();
  await page.getByRole("link", { name: "我的食物", exact: true }).click();
  await expect(page.getByRole("heading", { name: "当天饮食" })).toHaveCount(0);
  await expect(page.getByLabel("查看日期")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "我的食物", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "返回饮食" }).click();
  await page.getByRole("button", { name: "记录早餐", exact: true }).click();
  await page.getByRole("button", { name: "新增食物", exact: true }).click();
  await page.locator('input[name="name"]').fill("Navigation test food");
  await page.locator('input[name="protein"]').fill("10");
  await page.locator('input[name="carbs"]').fill("20");
  await page.locator('input[name="fat"]').fill("5");
  await page.getByRole("button", { name: "保存食物" }).click();
  await expect(page.getByRole("dialog", { name: "选择食物" })).toBeVisible();
  await page
    .getByRole("group", { name: "选择食物" })
    .getByRole("button")
    .click();
  await expect(page.locator('select[name="meal"]')).toHaveValue("breakfast");
  await expect(page.getByLabel("搜索食物")).toHaveCount(0);
  await page.getByLabel("实际份量").fill("150");
  await page.locator('select[name="meal"]').selectOption("dinner");
  await page
    .getByRole("button", { name: /Navigation test food.*更换/ })
    .click();
  await page
    .getByRole("group", { name: "选择食物" })
    .getByRole("button")
    .click();
  await expect(page.locator('select[name="meal"]')).toHaveValue("dinner");
  await expect(page.getByLabel("实际份量")).toHaveValue("150");
  await page.getByRole("button", { name: "保存记录", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "手机主导航" })
    .getByRole("link", { name: "趋势" })
    .click();
  await expect(page.getByRole("heading", { name: "摄入与目标" })).toHaveCount(
    0,
  );
  await page.getByRole("link", { name: "饮食趋势" }).click();
  await expect(page.getByRole("heading", { name: "摄入与目标" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "看趋势，不看单日波动" }),
  ).toHaveCount(0);
});

test("workouts show one exercise and retain sets across navigation", async ({
  page,
}) => {
  await page.goto("./#training/templates");
  await page.getByRole("button", { name: "新建模板", exact: true }).click();
  await page.getByLabel("模板名称").fill("Focused workout");
  for (const exercise of ["standard-bench-press", "standard-squat"]) {
    await page.getByLabel("添加动作").selectOption(exercise);
    await page.getByRole("button", { name: "添加", exact: true }).click();
  }
  await page.getByRole("button", { name: "保存训练模板" }).click();
  await page.getByRole("button", { name: "开始训练", exact: true }).click();
  await expect(page).toHaveURL(/#training\/session$/);
  await expect(page.getByRole("heading", { name: "我的训练模板" })).toHaveCount(
    0,
  );
  await expect(page.getByLabel("杠铃深蹲第1组次数")).toHaveCount(0);
  await page.getByLabel("杠铃卧推第1组重量").fill("60");
  await page
    .getByRole("button", { name: "完成杠铃卧推第1组", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "撤销杠铃卧推第1组" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "下一个动作" }).click();
  await expect(page.getByLabel("杠铃深蹲第1组次数")).toBeVisible();
  await expect(page.getByLabel("杠铃卧推第1组次数")).toHaveCount(0);
  await page.getByRole("link", { name: "返回训练" }).click();
  await page.getByRole("link", { name: /训练进行中/ }).click();
  await expect(
    page.getByRole("button", { name: "撤销杠铃卧推第1组" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 360, height: 780 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});
