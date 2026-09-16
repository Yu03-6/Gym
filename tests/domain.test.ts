import { describe, expect, it } from "vitest";
import {
  calculateProfile,
  completedSets,
  energy,
  foodTotals,
  freezeTarget,
  initialState,
  parseBackup,
  resolveTarget,
  serializeBackup,
  shiftDate,
  startSession,
  stateSchema,
  totals,
  uid,
  validSet,
  volume,
  type Food,
  type Template,
} from "../src/lib/model";
const input = {
  effectiveDate: "2026-09-16",
  age: 30,
  height: 180,
  weight: 80,
  sex: "male" as const,
  activity: "1.55" as const,
  energyMode: "inclusive" as const,
  goal: "lose" as const,
  adjustment: -414,
  proteinPerKg: 1.6,
  fatPerKg: 0.8,
};
const food: Food = {
  id: "food",
  name: "Test food",
  state: "cooked",
  unit: "g",
  source: "Test fixture",
  archived: false,
  favorite: false,
  per100: { calories: 165, protein: 10, carbs: 20, fat: 5 },
};
const template: Template = {
  id: "template",
  name: "Test workout",
  archived: false,
  exercises: [
    {
      id: "target",
      exercise: {
        id: "exercise",
        name: "Test lift",
        category: "push",
        mode: "weighted",
        archived: false,
      },
      sets: 3,
      reps: 10,
      weight: 60,
      seconds: 60,
      rest: 90,
      note: "",
    },
  ],
};
describe("nutrition and history invariants", () => {
  it("calculates Mifflin and consistent macros without eating back training", () => {
    const p = calculateProfile(input);
    expect(p.bmr).toBe(1780);
    expect(p.tdee).toBeCloseTo(2759);
    expect(p.targets.calories).toBeCloseTo(2345);
    expect(p.targets).toMatchObject({ protein: 128, fat: 64 });
    expect(p.targets.carbs).toBeCloseTo(314.25);
    expect(
      energy(p.targets.protein, p.targets.carbs, p.targets.fat),
    ).toBeCloseTo(p.targets.calories);
    const s = initialState();
    s.profiles.push(p);
    s.activities.push({
      id: "act",
      date: input.effectiveDate,
      name: "Run",
      calories: 300,
    });
    expect(resolveTarget(s, input.effectiveDate)?.tdee).toBe(2759);
    expect(resolveTarget(s, input.effectiveDate)?.macros.calories).toBe(2345);
  });
  it("rejects impossible or contradicting goals", () => {
    expect(() =>
      calculateProfile({
        ...input,
        adjustment: -1000,
        proteinPerKg: 3.5,
        fatPerKg: 2,
      }),
    ).toThrow();
    expect(() =>
      calculateProfile({ ...input, goal: "maintain", adjustment: -300 }),
    ).toThrow();
  });
  it("scales food portions and preserves logged food snapshots", () => {
    const s = initialState();
    s.foods.push(structuredClone(food));
    const log = {
      id: "log",
      date: input.effectiveDate,
      food: structuredClone(food),
      amount: 150,
      meal: "lunch" as const,
      createdAt: 1,
    };
    s.logs.push(log);
    expect(foodTotals(log)).toEqual({
      calories: 247.5,
      protein: 15,
      carbs: 30,
      fat: 7.5,
    });
    s.foods[0].per100.calories = 999;
    expect(totals(s, input.effectiveDate).calories).toBe(247.5);
  });
  it("freezes nutrition history while later phases change", () => {
    const s = initialState();
    const p = calculateProfile(input);
    s.profiles.push(p);
    freezeTarget(s, "2026-09-16");
    const macros = {
      ...p.targets,
      carbs: p.targets.carbs - 30,
      calories: p.targets.calories - 120,
    };
    s.phaseEvents.push({
      id: "event",
      date: "2026-09-17",
      phase: {
        id: "phase",
        name: "Phase 2",
        days: 14,
        training: macros,
        rest: macros,
        source: "Manual",
        notes: "",
        archived: false,
      },
    });
    s.weights.push({ id: "w", date: "2026-09-17", weight: 78, waist: null });
    expect(resolveTarget(s, "2026-09-16")?.macros.calories).toBe(2345);
    expect(resolveTarget(s, "2026-09-17")?.macros.calories).toBe(2225);
  });
  it("keeps session snapshot after template edits and archive", () => {
    const s = initialState();
    s.templates.push(structuredClone(template));
    const session = startSession(s.templates[0], "2026-09-16");
    s.sessions.push(session);
    session.exercises[0].sets[0].done = true;
    session.exercises[0].sets[1].done = true;
    session.exercises[0].sets[1].reps = 8;
    s.templates[0].exercises[0].reps = 12;
    s.templates[0].archived = true;
    expect(completedSets(session)).toBe(2);
    expect(volume(session)).toBe(1080);
    expect(session.exercises[0].target.reps).toBe(10);
    expect(stateSchema.safeParse(s).success).toBe(true);
  });
  it("excludes warmups and assisted or bodyweight movements from external load volume", () => {
    const s = startSession(template, "2026-09-16");
    s.exercises[0].sets.forEach((x) => (x.done = true));
    s.exercises[0].sets[0].warmup = true;
    expect(volume(s)).toBe(1200);
    s.exercises[0].exercise.mode = "assisted";
    expect(volume(s)).toBe(0);
    expect(
      validSet({ ...s.exercises[0].sets[0], seconds: null }, "timed"),
    ).toBe(false);
  });
  it("round-trips complete state including an unfinished session", () => {
    const s = initialState();
    s.profiles.push(calculateProfile(input));
    s.templates.push(template);
    s.sessions.push(startSession(template, "2026-09-16"));
    s.sessions[0].restEndsAt = Date.now() + 90000;
    s.foods.push(food);
    const exported = serializeBackup(s);
    expect(JSON.parse(exported).app).toBe("FitGo");
    expect(parseBackup(exported)).toEqual(s);
    const legacy = JSON.parse(exported);
    legacy.app = "Gym";
    expect(parseBackup(JSON.stringify(legacy))).toEqual(s);
  });
  it("rejects duplicate IDs, invalid dates, missing template references and unknown versions", () => {
    const s = initialState();
    s.foods.push(food, food);
    expect(() => parseBackup(serializeBackup(s))).toThrow();
    const t = initialState();
    t.sessions.push(startSession(template, "2026-09-16"));
    expect(() => parseBackup(serializeBackup(t))).toThrow();
    expect(() =>
      parseBackup(
        JSON.stringify({
          app: "Gym",
          version: 2,
          data: initialState(),
          exportedAt: "x",
        }),
      ),
    ).toThrow();
    const u = initialState();
    u.weights.push({ id: "w", date: "2026-02-30", weight: 80, waist: null });
    expect(() => parseBackup(serializeBackup(u))).toThrow();
  });
  it("handles local dates through month boundaries", () => {
    expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
  });
});
