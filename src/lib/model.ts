import { z } from "zod";

const num = (min = 0, max = 100000) => z.number().finite().min(min).max(max);
const id = z.string().min(1).max(100);
const text = z.string().trim().min(1).max(160);
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T12:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Invalid calendar date");
export const macrosSchema = z.object({
  calories: num(0, 10000),
  protein: num(0, 1000),
  carbs: num(0, 1500),
  fat: num(0, 600),
});
const planMacrosSchema = macrosSchema.refine(
  (m) =>
    m.calories >= 1200 &&
    Math.abs(m.calories - energy(m.protein, m.carbs, m.fat)) < 0.01,
  "Invalid nutrition target",
);
export type Macros = z.infer<typeof macrosSchema>;
export const profileSchema = z.object({
  id,
  effectiveDate: dateSchema,
  age: num(18, 100).int(),
  height: num(100, 250),
  weight: num(30, 350),
  sex: z.enum(["male", "female"]),
  activity: z.enum(["1.2", "1.375", "1.55", "1.725"]),
  energyMode: z.enum(["inclusive", "additional"]),
  goal: z.enum(["lose", "maintain", "gain"]),
  adjustment: num(-1000, 1000),
  proteinPerKg: num(0.5, 3.5),
  fatPerKg: num(0.3, 2),
  bmr: num(1, 6000),
  tdee: num(1, 10000),
  targets: planMacrosSchema,
});
export type Profile = z.infer<typeof profileSchema>;
export const foodSchema = z.object({
  id,
  name: text,
  state: z.enum(["raw", "cooked", "packaged", "other"]),
  unit: z.enum(["g", "ml"]),
  per100: macrosSchema,
  source: z.string().max(400),
  favorite: z.boolean(),
  archived: z.boolean(),
});
export type Food = z.infer<typeof foodSchema>;
export const foodLogSchema = z.object({
  id,
  date: dateSchema,
  meal: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  food: foodSchema,
  amount: num(0.1, 10000),
  createdAt: num(1, 1e15),
});
export type FoodLog = z.infer<typeof foodLogSchema>;
export const exerciseSchema = z.object({
  id,
  name: text,
  category: z.enum(["push", "pull", "legs", "core", "cardio", "other"]),
  mode: z.enum(["weighted", "bodyweight", "assisted", "timed"]),
  archived: z.boolean(),
});
export type Exercise = z.infer<typeof exerciseSchema>;
export const templateExerciseSchema = z.object({
  id,
  exercise: exerciseSchema,
  sets: num(1, 20).int(),
  reps: num(1, 200).int(),
  weight: num(0, 1000),
  seconds: num(1, 36000).int(),
  rest: num(0, 1800).int(),
  note: z.string().max(500),
});
export type TemplateExercise = z.infer<typeof templateExerciseSchema>;
export const templateSchema = z.object({
  id,
  name: text,
  exercises: z.array(templateExerciseSchema).min(1).max(40),
  archived: z.boolean(),
});
export type Template = z.infer<typeof templateSchema>;
export const setSchema = z.object({
  id,
  weight: num(0, 1000).nullable(),
  reps: num(1, 200).int().nullable(),
  seconds: num(1, 36000).int().nullable(),
  warmup: z.boolean(),
  done: z.boolean(),
});
export type SetLog = z.infer<typeof setSchema>;
export const sessionSchema = z.object({
  id,
  templateId: id.nullable(),
  name: text,
  date: dateSchema,
  startedAt: num(1, 1e15),
  endedAt: num(1, 1e15).nullable(),
  status: z.enum(["active", "completed"]),
  note: z.string().max(1000),
  exercises: z
    .array(
      z.object({
        id,
        exercise: exerciseSchema,
        target: templateExerciseSchema,
        sets: z.array(setSchema).max(50),
      }),
    )
    .min(1)
    .max(40),
  restEndsAt: num(1, 1e15).nullable(),
  restTimer: z
    .object({
      id,
      exerciseId: id,
      setId: id.nullable(),
      kind: z.enum(["set", "exercise"]),
      notifiedAt: num(1, 1e15).nullable(),
    })
    .nullable()
    .default(null),
  lastCompleted: z
    .object({ exerciseId: id, setId: id })
    .nullable()
    .default(null),
  currentExerciseId: id.nullable().default(null),
  soundEnabled: z.boolean().default(true),
});
export type Session = z.infer<typeof sessionSchema>;
export const phaseSchema = z.object({
  id,
  name: text,
  days: num(1, 365).int(),
  training: planMacrosSchema,
  rest: planMacrosSchema,
  source: z.string().max(1000),
  notes: z.string().max(1000),
  archived: z.boolean(),
});
export type Phase = z.infer<typeof phaseSchema>;
export const phaseEventSchema = z.object({
  id,
  date: dateSchema,
  phase: phaseSchema.nullable(),
});
export const targetSchema = z.object({
  date: dateSchema,
  dayType: z.enum(["training", "rest"]),
  macros: planMacrosSchema,
  source: text,
  bmr: num(1, 6000),
  tdee: num(1, 10000),
  energyMode: z.enum(["inclusive", "additional"]),
});
export type Target = z.infer<typeof targetSchema>;
export const stateSchema = z
  .object({
    schemaVersion: z.literal(1),
    revision: num(0, 1e12).int(),
    updatedAt: num(0, 1e15),
    profiles: z.array(profileSchema).max(10000),
    foods: z.array(foodSchema).max(10000),
    logs: z.array(foodLogSchema).max(100000),
    exercises: z.array(exerciseSchema).max(10000),
    templates: z.array(templateSchema).max(10000),
    sessions: z.array(sessionSchema).max(100000),
    phases: z.array(phaseSchema).max(10000),
    phaseEvents: z.array(phaseEventSchema).max(10000),
    targets: z.array(targetSchema).max(100000),
    schedule: z
      .array(z.object({ id, date: dateSchema, templateId: id }))
      .max(10000),
    weights: z
      .array(
        z.object({
          id,
          date: dateSchema,
          weight: num(30, 350),
          waist: num(30, 250).nullable(),
        }),
      )
      .max(100000),
    activities: z
      .array(
        z.object({ id, date: dateSchema, name: text, calories: num(1, 5000) }),
      )
      .max(100000),
    lastBackup: num(1, 1e15).nullable(),
  })
  .superRefine((s, ctx) => {
    for (const key of [
      "profiles",
      "foods",
      "logs",
      "exercises",
      "templates",
      "sessions",
      "phases",
      "phaseEvents",
      "schedule",
      "weights",
      "activities",
    ] as const) {
      if (new Set(s[key].map((x) => x.id)).size !== s[key].length)
        ctx.addIssue({ code: "custom", path: [key], message: "Duplicate IDs" });
    }
    if (new Set(s.targets.map((t) => t.date)).size !== s.targets.length)
      ctx.addIssue({ code: "custom", message: "Duplicate daily targets" });
    if (new Set(s.weights.map((t) => t.date)).size !== s.weights.length)
      ctx.addIssue({ code: "custom", message: "Duplicate daily weights" });
    if (s.sessions.filter((x) => x.status === "active").length > 1)
      ctx.addIssue({ code: "custom", message: "Multiple active workouts" });
    for (const slot of s.schedule)
      if (!s.templates.some((t) => t.id === slot.templateId))
        ctx.addIssue({ code: "custom", message: "Missing scheduled template" });
    for (const session of s.sessions) {
      if (
        session.templateId !== null &&
        !s.templates.some((t) => t.id === session.templateId)
      )
        ctx.addIssue({ code: "custom", message: "Missing workout template" });
      if (
        new Set(session.exercises.map((e) => e.id)).size !==
        session.exercises.length
      )
        ctx.addIssue({ code: "custom", message: "Duplicate exercise IDs" });
      if (session.status === "completed" && !session.endedAt)
        ctx.addIssue({
          code: "custom",
          message: "Completed workout missing finish time",
        });
      if (session.endedAt && session.endedAt < session.startedAt)
        ctx.addIssue({ code: "custom", message: "Invalid workout time" });
      if (session.restTimer) {
        const owner = session.exercises.find(
          (e) => e.id === session.restTimer?.exerciseId,
        );
        if (
          !session.restEndsAt ||
          !owner ||
          (session.restTimer.setId &&
            !owner.sets.some(
              (row) => row.id === session.restTimer?.setId && row.done,
            ))
        )
          ctx.addIssue({ code: "custom", message: "Invalid rest timer owner" });
      }
      if (
        session.currentExerciseId &&
        !session.exercises.some((e) => e.id === session.currentExerciseId)
      )
        ctx.addIssue({ code: "custom", message: "Invalid selected exercise" });
      for (const exercise of session.exercises) {
        if (
          new Set(exercise.sets.map((s) => s.id)).size !== exercise.sets.length
        )
          ctx.addIssue({ code: "custom", message: "Duplicate set IDs" });
        for (const set of exercise.sets)
          if (set.done && !validSet(set, exercise.exercise.mode))
            ctx.addIssue({ code: "custom", message: "Invalid completed set" });
      }
    }
  });
export type AppState = z.infer<typeof stateSchema>;
export function uid() {
  return crypto.randomUUID();
}
export function today() {
  return dateKey(new Date());
}
export function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function shiftDate(date: string, offset: number) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + offset);
  return dateKey(d);
}
export function energy(protein: number, carbs: number, fat: number) {
  return protein * 4 + carbs * 4 + fat * 9;
}
export function calculateProfile(
  input: Omit<Profile, "id" | "bmr" | "tdee" | "targets">,
): Profile {
  if (
    (input.goal === "lose" && input.adjustment > 0) ||
    (input.goal === "gain" && input.adjustment < 0) ||
    (input.goal === "maintain" && input.adjustment !== 0)
  )
    throw new Error(
      "请让热量调整与目标一致：减脂为负值，维持为 0，增肌为正值。",
    );
  const bmr =
    10 * input.weight +
    6.25 * input.height -
    5 * input.age +
    (input.sex === "male" ? 5 : -161);
  const tdee = bmr * Number(input.activity);
  const calories = tdee + input.adjustment,
    protein = input.weight * input.proteinPerKg,
    fat = input.weight * input.fatPerKg;
  const carbs = (calories - protein * 4 - fat * 9) / 4;
  if (calories < 1200)
    throw new Error(
      "当前目标低于 1,200 kcal，请提高目标热量；此工具不提供极低热量方案。",
    );
  if (carbs < 0)
    throw new Error("蛋白质和脂肪已超过目标热量，请调整比例或提高热量。");
  return profileSchema.parse({
    ...input,
    id: uid(),
    bmr,
    tdee,
    targets: { calories, protein, fat, carbs },
  });
}
export function profileAt(s: AppState, date: string) {
  return s.profiles
    .filter((p) => p.effectiveDate <= date)
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
    .at(-1);
}
export function phaseAt(s: AppState, date: string) {
  return s.phaseEvents
    .filter((p) => p.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
}
export function resolveTarget(s: AppState, date: string): Target | null {
  const saved = s.targets.find((t) => t.date === date);
  if (saved) return saved;
  const p = profileAt(s, date);
  if (!p) return null;
  const dayType =
    s.schedule.some((x) => x.date === date) ||
    s.sessions.some((x) => x.date === date)
      ? "training"
      : "rest";
  const phase = phaseAt(s, date)?.phase;
  return {
    date,
    dayType,
    macros: phase ? phase[dayType] : p.targets,
    source: phase ? phase.name : "个人营养目标",
    bmr: p.bmr,
    tdee: p.tdee,
    energyMode: p.energyMode,
  };
}
export function freezeTarget(s: AppState, date: string) {
  if (!s.targets.some((x) => x.date === date)) {
    const t = resolveTarget(s, date);
    if (t) s.targets.push(structuredClone(t));
  }
}
export function foodTotals(log: FoodLog): Macros {
  const n = log.amount / 100;
  return {
    calories: log.food.per100.calories * n,
    protein: log.food.per100.protein * n,
    carbs: log.food.per100.carbs * n,
    fat: log.food.per100.fat * n,
  };
}
export function totals(s: AppState, date: string) {
  return s.logs
    .filter((l) => l.date === date)
    .reduce(
      (a, l) => {
        const m = foodTotals(l);
        return {
          calories: a.calories + m.calories,
          protein: a.protein + m.protein,
          carbs: a.carbs + m.carbs,
          fat: a.fat + m.fat,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
}
export function validSet(set: SetLog, mode: Exercise["mode"]) {
  return mode === "timed"
    ? set.seconds !== null && set.seconds > 0
    : set.reps !== null &&
        set.reps > 0 &&
        (mode === "bodyweight" || (set.weight !== null && set.weight >= 0));
}
export function volume(session: Session) {
  return session.exercises.reduce(
    (v, e) =>
      v +
      (e.exercise.mode === "weighted"
        ? e.sets
            .filter((s) => s.done && !s.warmup)
            .reduce((a, s) => a + (s.weight ?? 0) * (s.reps ?? 0), 0)
        : 0),
    0,
  );
}
export function completedSets(session: Session) {
  return session.exercises.reduce(
    (v, e) => v + e.sets.filter((s) => s.done && !s.warmup).length,
    0,
  );
}
export function startSession(template: Template, date: string): Session {
  return {
    id: uid(),
    templateId: template.id,
    name: template.name,
    date,
    startedAt: Date.now(),
    endedAt: null,
    status: "active",
    note: "",
    restEndsAt: null,
    restTimer: null,
    lastCompleted: null,
    currentExerciseId: null,
    soundEnabled: true,
    exercises: template.exercises.map((t) => ({
      id: uid(),
      exercise: structuredClone(t.exercise),
      target: structuredClone(t),
      sets: Array.from({ length: t.sets }, () => ({
        id: uid(),
        weight: t.exercise.mode === "bodyweight" ? null : t.weight,
        reps: t.exercise.mode === "timed" ? null : t.reps,
        seconds: t.exercise.mode === "timed" ? t.seconds : null,
        warmup: false,
        done: false,
      })),
    })),
  };
}
export function initialState(): AppState {
  return {
    schemaVersion: 1,
    revision: 0,
    updatedAt: 0,
    profiles: [],
    foods: [],
    logs: [],
    exercises: [],
    templates: [],
    sessions: [],
    phases: [],
    phaseEvents: [],
    targets: [],
    schedule: [],
    weights: [],
    activities: [],
    lastBackup: null,
  };
}
export function parseBackup(raw: string): AppState {
  if (raw.length > 20_000_000)
    throw new Error("文件过大，请选择 20 MB 以内的 FitGo 备份。");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("无法读取 JSON 文件，请选择完整的 FitGo 备份。");
  }
  const result = z
    .object({
      app: z.enum(["Gym", "FitGo"]),
      version: z.literal(1),
      exportedAt: z.string(),
      data: stateSchema,
    })
    .safeParse(parsed);
  if (!result.success)
    throw new Error("备份格式、版本或数据校验未通过。原有记录未被更改。");
  return result.data.data;
}
export function serializeBackup(s: AppState) {
  const raw = JSON.stringify(
    { app: "FitGo", version: 1, exportedAt: new Date().toISOString(), data: s },
    null,
    2,
  );
  if (new TextEncoder().encode(raw).length > 20_000_000)
    throw new Error(
      "完整备份超过当前 20 MB 容量上限，无法生成可恢复文件。请保留当前网站数据并联系维护者扩容；CSV 不能替代完整备份。",
    );
  return raw;
}
