import { test, expect, type Page } from "@playwright/test";
import { initialState, serializeBackup, type Template } from "../src/lib/model";
const template: Template = {
  id: "back-day",
  name: "练背计划",
  archived: false,
  exercises: ["高位下拉", "坐姿划船"].map((name, index) => ({
    id: `target-${index}`,
    exercise: {
      id: `lift-${index}`,
      name,
      category: "pull",
      mode: "weighted",
      archived: false,
    },
    sets: 4,
    weight: 40,
    reps: 10,
    seconds: 60,
    rest: 90,
    note: "",
  })),
};
async function session(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("gym-journal", 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    try {
      return await new Promise<any>((resolve, reject) => {
        const req = db
          .transaction("journal")
          .objectStore("journal")
          .get("state");
        req.onsuccess = () => resolve(req.result.sessions[0]);
        req.onerror = () => reject(req.error);
      });
    } finally {
      db.close();
    }
  });
}
async function setup(page: Page, seconds = 90) {
  const state = initialState();
  state.templates.push(template);
  await page.addInitScript(() => {
    (window as any).__tones = 0;
    const original = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (when = 0) {
      (window as any).__tones++;
      return original.call(this, when);
    };
  });
  await page.goto("./");
  await page.getByRole("button", { name: "设置与备份" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "test.json",
    mimeType: "application/json",
    buffer: Buffer.from(serializeBackup(state)),
  });
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("./#training/templates");
  await page.getByRole("button", { name: "开始训练", exact: true }).click();
  await page.getByLabel("休息时间设置").selectOption("uniform");
  await page.getByLabel("本次组间休息秒数").fill(String(seconds));
  await page.getByRole("button", { name: "开始本次训练", exact: true }).click();
  await expect(page.locator(".set-progress")).toContainText("0 / 4");
}
test("owned rest controls, undo, warmups, final set and navigation remain consistent", async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator(".rest-console")).toHaveAttribute(
    "data-state",
    "idle",
  );
  await expect(page.getByRole("timer")).toHaveText("1:30");
  await page.evaluate(() => window.scrollTo(0, 0));
  const dial = await page.locator(".timer-dial").boundingBox();
  expect(dial!.y + dial!.height).toBeLessThan(740);
  await page.screenshot({ path: "test-results/workout-dial-idle.png" });
  await page
    .getByRole("button", { name: "完成第1组并休息", exact: true })
    .dblclick();
  await expect(page.locator(".set-progress")).toContainText("1 / 4");
  await expect(page.locator(".rest-owner")).toContainText(
    "高位下拉 · 正式第 1 组后休息",
  );
  await expect
    .poll(async () =>
      Number(
        await page.locator(".dial-progress").getAttribute("stroke-dashoffset"),
      ),
    )
    .toBeGreaterThan(0);
  const first = await session(page);
  await page.getByRole("button", { name: "＋30 秒", exact: true }).click();
  await expect
    .poll(async () => (await session(page)).restEndsAt)
    .toBe(first.restEndsAt + 30000);
  await expect(page.locator(".set-progress")).toContainText("1 / 4");
  await page.getByRole("button", { name: "结束休息", exact: true }).click();
  await page
    .getByRole("button", { name: "完成第2组并休息", exact: true })
    .click();
  await expect(page.locator(".set-progress")).toContainText("2 / 4");
  const second = await session(page);
  await page
    .getByRole("button", { name: "撤销高位下拉第1组", exact: true })
    .click();
  await expect(page.locator(".set-progress")).toContainText("1 / 4");
  expect((await session(page)).restTimer.id).toBe(second.restTimer.id);
  await page.getByRole("button", { name: /撤销刚才一组/ }).click();
  await expect(page.locator(".rest-console")).toHaveAttribute(
    "data-state",
    "idle",
  );
  await expect(page.locator(".set-progress")).toContainText("0 / 4");
  await page.getByRole("button", { name: "＋ 热身组", exact: true }).click();
  await page
    .getByRole("button", { name: "完成热身第1组并休息", exact: true })
    .click();
  await expect(page.locator(".set-progress")).toContainText("0 / 4");
  await expect(page.locator(".set-progress")).toContainText("热身 1 / 1");
  await page.getByRole("button", { name: "结束休息", exact: true }).click();
  for (let i = 1; i <= 4; i++) {
    await page
      .getByRole("button", {
        name: `完成第${i}组${i < 4 ? "并休息" : ""}`,
        exact: true,
      })
      .click();
    await expect(page.locator(".set-progress")).toContainText(`${i} / 4`);
    if (i < 4)
      await page.getByRole("button", { name: "结束休息", exact: true }).click();
  }
  await expect(page.locator(".rest-console")).toHaveAttribute(
    "data-state",
    "idle",
  );
  await expect(
    page.getByRole("button", { name: "前往下一个动作" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "开始动作间休息（90 秒）" }).click();
  await expect(page.locator(".rest-owner")).toContainText("动作间休息");
  const rest = await session(page);
  await page
    .getByRole("navigation", { name: "手机主导航" })
    .getByRole("link", { name: "饮食" })
    .click();
  await expect(page.locator(".rest-shortcut")).toContainText("高位下拉");
  await page.locator(".rest-shortcut").click();
  await page.reload();
  await expect(page.locator(".set-progress")).toContainText("4 / 4");
  expect((await session(page)).restEndsAt).toBe(rest.restEndsAt);
  await page.getByRole("button", { name: "前往下一个动作" }).click();
  await expect(page.getByLabel("当前动作")).toHaveValue("1");
  await expect(page.locator(".rest-owner")).toContainText("高位下拉");
  await page.setViewportSize({ width: 360, height: 780 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/workout-rest-mobile.png",
    fullPage: true,
  });
});
test("alarm fires once on another page and expiry never increments completion", async ({
  page,
}) => {
  await setup(page, 2);
  await page
    .getByRole("button", { name: "完成第1组并休息", exact: true })
    .click();
  await expect(page.locator(".set-progress")).toContainText("1 / 4");
  await page
    .getByRole("navigation", { name: "手机主导航" })
    .getByRole("link", { name: "饮食" })
    .click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__tones), { timeout: 8000 })
    .toBe(3);
  await expect(page.locator(".rest-shortcut")).toContainText("休息结束");
  expect(
    (await session(page)).exercises[0].sets.filter((s: any) => s.done),
  ).toHaveLength(1);
  const claim = (await session(page)).restTimer.notifiedAt;
  await page.locator(".rest-shortcut").click();
  await expect(page.locator(".set-progress")).toContainText("1 / 4");
  expect(await page.evaluate(() => (window as any).__tones)).toBe(3);
  await page.reload();
  await expect(page.locator(".rest-console")).toContainText("休息结束");
  expect((await session(page)).restTimer.notifiedAt).toBe(claim);
  expect(await page.evaluate(() => (window as any).__tones)).toBe(0);
});
