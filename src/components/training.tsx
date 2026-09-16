"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  ChevronRight,
  Clock3,
  Dumbbell,
  Edit3,
  History,
  Plus,
  RotateCcw,
  Timer,
  Trash2,
} from "lucide-react";
import {
  completedSets,
  exerciseSchema,
  freezeTarget,
  resolveTarget,
  sessionSchema,
  startSession,
  templateSchema,
  today,
  uid,
  validSet,
  volume,
  type Exercise,
  type Session,
  type SetLog,
  type Template,
  type TemplateExercise,
} from "@/lib/model";
import { goTo, useSection } from "@/lib/navigation";
import { useStore } from "@/lib/store";
import {
  Button,
  Confirm,
  Empty,
  Field,
  FormError,
  Modal,
  round,
  SectionHead,
} from "./ui";
const modes = {
  weighted: "负重 · kg × 次",
  bodyweight: "自重 · 次数",
  assisted: "辅助重量 · kg × 次",
  timed: "计时 · 秒",
};
const categories = {
  push: "推",
  pull: "拉",
  legs: "腿部",
  core: "核心",
  cardio: "有氧",
  other: "其他",
};
const catalogue: Exercise[] = [
  ["bench-press", "杠铃卧推", "push", "weighted"],
  ["squat", "杠铃深蹲", "legs", "weighted"],
  ["deadlift", "硬拉", "pull", "weighted"],
  ["row", "坐姿划船", "pull", "weighted"],
  ["lat-pulldown", "高位下拉", "pull", "weighted"],
  ["shoulder-press", "哑铃肩推", "push", "weighted"],
  ["curl", "哑铃弯举", "pull", "weighted"],
  ["leg-press", "腿举", "legs", "weighted"],
  ["push-up", "俯卧撑", "push", "bodyweight"],
  ["pull-up", "引体向上", "pull", "bodyweight"],
  ["assisted-pull-up", "辅助引体向上", "pull", "assisted"],
  ["plank", "平板支撑", "core", "timed"],
  ["run", "跑步", "cardio", "timed"],
  ["bike", "骑行", "cardio", "timed"],
].map(([id, name, category, mode]) => ({
  id: `standard-${id}`,
  name,
  category: category as Exercise["category"],
  mode: mode as Exercise["mode"],
  archived: false,
}));
const makeTarget = (exercise: Exercise): TemplateExercise => ({
  id: uid(),
  exercise,
  sets: 3,
  reps: 10,
  weight: 0,
  seconds: 60,
  rest: 90,
  note: "",
});
export function Training({ date }: { date: string }) {
  const { state, mutate, notify } = useStore();
  const [section] = useSection("training", "plan", [
    "plan",
    "templates",
    "history",
    "session",
  ] as const);
  const [template, setTemplate] = useState<Template | "new" | null>(null);
  const [exercise, setExercise] = useState(false);
  const [schedule, setSchedule] = useState<string | "new" | null>(null);
  const [detail, setDetail] = useState<Session | null>(null);
  const [archive, setArchive] = useState<Template | null>(null);
  const active = state.sessions.find((s) => s.status === "active");
  async function begin(t: Template) {
    if (active) {
      notify("请先完成当前训练");
      return;
    }
    const ok = await mutate((s) => {
      if (s.sessions.some((x) => x.status === "active"))
        throw new Error("Workout already running");
      s.sessions.push(startSession(t, date));
      freezeTarget(s, date);
    });
    if (ok) {
      notify("训练已开始，每组自动保存");
      goTo("training/session");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  return (
    <div className={`view-enter training-view training-${section}`}>
      {section === "session" &&
        (active ? (
          <Workout session={active} />
        ) : (
          <div className="card">
            <Empty
              icon={<Dumbbell size={28} />}
              title="当前没有进行中的训练"
              description="选择一个模板，开始本次训练。"
              action="选择训练"
              onAction={() => goTo("training/templates")}
            />
          </div>
        ))}
      {section === "plan" && (
        <>
          {active ? (
            <a className="resume-training" href="#training/session">
              <span className="summary-icon">
                <Timer size={25} />
              </span>
              <span>
                <small>训练进行中</small>
                <b>{active.name}</b>
                <small>已完成 {completedSets(active)} 组，点击继续</small>
              </span>
              <ChevronRight size={21} />
            </a>
          ) : (
            <div className="training-intro">
              <Dumbbell size={30} />
              <h2>准备好下一组。</h2>
              <p>选择你的训练模板，逐组记录每一次进步。</p>
              <Button onClick={() => goTo("training/templates")}>
                选择训练
                <ChevronRight size={19} />
              </Button>
            </div>
          )}
          <SectionHead
            title={`${date === today() ? "今天" : date.slice(5)}的安排`}
            action="安排训练"
            onAction={() => setSchedule("new")}
          />
          <div className="card list-card">
            {state.schedule
              .filter((s) => s.date === date)
              .map((slot) => {
                const t = state.templates.find((t) => t.id === slot.templateId);
                return (
                  <div className="record-row schedule-row" key={slot.id}>
                    <span className="row-icon">
                      <Dumbbell size={21} />
                    </span>
                    <button
                      className="row-main"
                      onClick={() => setSchedule(slot.id)}
                    >
                      <b>{t?.name ?? "已归档计划"}</b>
                      <small>{t?.exercises.length} 个动作 · 点击调整日期</small>
                    </button>
                    <Button
                      variant="secondary"
                      disabled={!t || !!active}
                      onClick={() => t && begin(t)}
                    >
                      开始
                    </Button>
                    <button
                      className="icon-button"
                      aria-label="取消这次安排"
                      onClick={() =>
                        mutate((s) => {
                          s.schedule = s.schedule.filter(
                            (x) => x.id !== slot.id,
                          );
                        })
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                );
              })}
            {!state.schedule.some((s) => s.date === date) && (
              <p className="rest-day">
                <span className="row-icon">
                  <Clock3 size={20} />
                </span>
                今天没有安排。可以直接开始一个模板，或留给恢复。
              </p>
            )}
          </div>
          <nav className="feature-list" aria-label="训练管理">
            <a href="#training/templates">
              <Dumbbell size={22} />
              <span>
                <b>训练模板</b>
                <small>动作、组数与目标重量</small>
              </span>
              <ChevronRight size={19} />
            </a>
            <a href="#training/history">
              <History size={22} />
              <span>
                <b>训练历史</b>
                <small>查看和更正已完成的训练</small>
              </span>
              <ChevronRight size={19} />
            </a>
          </nav>
        </>
      )}
      {section === "templates" && (
        <>
          <SectionHead
            title="我的训练模板"
            action="新建模板"
            onAction={() => setTemplate("new")}
          />
          <div className="template-grid">
            {state.templates
              .filter((t) => !t.archived)
              .map((t, i) => (
                <section className="card template-card" key={t.id}>
                  <div className="card-label">
                    <span className="template-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <button
                      className="icon-button"
                      aria-label={`编辑${t.name}`}
                      onClick={() => setTemplate(t)}
                    >
                      <Edit3 size={18} />
                    </button>
                  </div>
                  <h3>{t.name}</h3>
                  <p>
                    {t.exercises.length} 个动作 ·{" "}
                    {t.exercises.reduce((s, e) => s + e.sets, 0)} 组
                  </p>
                  <div className="exercise-tags">
                    {t.exercises.slice(0, 3).map((e) => (
                      <span key={e.id}>{e.exercise.name}</span>
                    ))}
                    {t.exercises.length > 3 && (
                      <span>+{t.exercises.length - 3}</span>
                    )}
                  </div>
                  <div className="form-actions">
                    <Button onClick={() => begin(t)} disabled={!!active}>
                      开始训练
                      <ChevronRight size={17} />
                    </Button>
                    <button
                      className="icon-button"
                      aria-label={`复制${t.name}`}
                      onClick={() =>
                        setTemplate({
                          ...structuredClone(t),
                          id: uid(),
                          name: `${t.name} 副本`,
                          exercises: t.exercises.map((e) => ({
                            ...structuredClone(e),
                            id: uid(),
                          })),
                        })
                      }
                    >
                      <Copy size={18} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`归档${t.name}`}
                      onClick={() => setArchive(t)}
                    >
                      <Archive size={18} />
                    </button>
                  </div>
                </section>
              ))}
          </div>
          {!state.templates.some((t) => !t.archived) && (
            <div className="card">
              <Empty
                icon={<Dumbbell size={30} />}
                title="把你的训练安排在这里"
                description="添加动作、组数、目标次数和重量。训练时逐组记录，随时查看上次成绩。"
                action="创建第一个模板"
                onAction={() => setTemplate("new")}
              />
            </div>
          )}
          <div className="inline-action">
            <p>常见动作已可选择，也可以添加自己的动作。</p>
            <Button variant="secondary" onClick={() => setExercise(true)}>
              <Plus size={17} />
              自定义动作
            </Button>
          </div>
        </>
      )}
      {section === "history" && (
        <>
          <SectionHead title="已完成的训练" />
          <div className="card list-card">
            {state.sessions
              .filter((s) => s.status === "completed")
              .sort(
                (a, b) =>
                  b.date.localeCompare(a.date) || b.startedAt - a.startedAt,
              )
              .map((s) => (
                <button
                  className="record-row"
                  key={s.id}
                  onClick={() => setDetail(s)}
                >
                  <span className="row-icon green">
                    <Check size={20} />
                  </span>
                  <span className="row-main">
                    <b>{s.name}</b>
                    <small>
                      {s.date} · {completedSets(s)} 组 ·{" "}
                      {Math.max(
                        1,
                        Math.round(
                          ((s.endedAt ?? s.startedAt) - s.startedAt) / 60000,
                        ),
                      )}{" "}
                      分钟
                    </small>
                  </span>
                  <ChevronRight size={19} />
                </button>
              ))}
            {!state.sessions.some((s) => s.status === "completed") && (
              <Empty
                icon={<History size={29} />}
                title="下一次训练，就是第一条记录"
                description="完成训练后，这里会保留每个动作的实际组次和重量。"
              />
            )}
          </div>
        </>
      )}
      {template && (
        <TemplateForm
          template={template === "new" ? undefined : template}
          onClose={() => setTemplate(null)}
        />
      )}{" "}
      {exercise && <ExerciseForm onClose={() => setExercise(false)} />}{" "}
      {schedule && (
        <ScheduleForm
          date={date}
          slotId={schedule === "new" ? undefined : schedule}
          onClose={() => setSchedule(null)}
        />
      )}{" "}
      {detail && (
        <SessionDetail session={detail} onClose={() => setDetail(null)} />
      )}{" "}
      {archive && (
        <Confirm
          title={`归档「${archive.name}」？`}
          description="隐藏模板并取消今天及以后的相关安排。过去训练历史及进行中的训练不会删除。"
          onCancel={() => setArchive(null)}
          onConfirm={async () => {
            if (
              await mutate((s) => {
                const t = s.templates.find((t) => t.id === archive.id);
                if (t) t.archived = true;
                s.schedule = s.schedule.filter(
                  (x) => x.templateId !== archive.id || x.date < today(),
                );
              })
            ) {
              setArchive(null);
              notify("模板已归档，训练历史已保留");
            }
          }}
        />
      )}
    </div>
  );
}
function TemplateForm({
  template,
  onClose,
}: {
  template?: Template;
  onClose: () => void;
}) {
  const { state, mutate, notify } = useStore();
  const [items, setItems] = useState<TemplateExercise[]>(
    template ? structuredClone(template.exercises) : [],
  );
  const [pick, setPick] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const exercises = [
    ...catalogue,
    ...state.exercises.filter((e) => !e.archived),
  ];
  const update = (id: string, key: keyof TemplateExercise, value: unknown) =>
    setItems(items.map((x) => (x.id === id ? { ...x, [key]: value } : x)));
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const value = templateSchema.parse({
        id: template?.id ?? uid(),
        name: new FormData(e.currentTarget).get("name"),
        exercises: items,
        archived: false,
      });
      setBusy(true);
      const ok = await mutate((s) => {
        const i = s.templates.findIndex((t) => t.id === value.id);
        if (i < 0) s.templates.push(value);
        else s.templates[i] = value;
      });
      setBusy(false);
      if (ok) {
        notify("模板已保存，已有训练历史不变");
        onClose();
      }
    } catch {
      setError("请填写名称，添加至少一个动作，并检查每个动作的目标。");
    }
  }
  return (
    <Modal
      wide
      title={template ? "编辑训练模板" : "新建训练模板"}
      description="目标只作为训练起点，实际完成情况在训练中单独记录。"
      onClose={onClose}
    >
      <form onSubmit={save}>
        <Field label="模板名称">
          <input
            name="name"
            required
            maxLength={160}
            defaultValue={template?.name}
          />
        </Field>
        <div className="inline-picker">
          <Field label="添加动作">
            <select value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">选择动作</option>
              {exercises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} · {categories[e.category]}
                </option>
              ))}
            </select>
          </Field>
          <Button
            type="button"
            variant="secondary"
            disabled={!pick || items.length >= 40}
            onClick={() => {
              const e = exercises.find((e) => e.id === pick);
              if (e) {
                setItems([...items, makeTarget(e)]);
                setPick("");
              }
            }}
          >
            <Plus size={19} />
            添加
          </Button>
        </div>
        {items.map((item, index) => (
          <fieldset key={item.id} className="exercise-builder">
            <legend>
              {index + 1}. {item.exercise.name}
            </legend>
            <p className="helper">{modes[item.exercise.mode]}</p>
            <div className="form-grid three">
              <Field label="组数">
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="20"
                  required
                  value={item.sets || ""}
                  onChange={(e) =>
                    update(item.id, "sets", Number(e.target.value))
                  }
                />
              </Field>
              {item.exercise.mode === "timed" ? (
                <Field label="每组秒数">
                  <input
                    type="number"
                    min="1"
                    max="36000"
                    required
                    value={item.seconds || ""}
                    onChange={(e) =>
                      update(item.id, "seconds", Number(e.target.value))
                    }
                  />
                </Field>
              ) : (
                <Field label="目标次数">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    required
                    value={item.reps || ""}
                    onChange={(e) =>
                      update(item.id, "reps", Number(e.target.value))
                    }
                  />
                </Field>
              )}
              {(item.exercise.mode === "weighted" ||
                item.exercise.mode === "assisted") && (
                <Field
                  label={
                    item.exercise.mode === "assisted"
                      ? "辅助重量 · kg"
                      : "重量 · kg"
                  }
                >
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="1000"
                    step="0.25"
                    required
                    value={item.weight}
                    onChange={(e) =>
                      update(item.id, "weight", Number(e.target.value))
                    }
                  />
                </Field>
              )}
              <Field label="组间休息 · 秒">
                <input
                  type="number"
                  min="0"
                  max="1800"
                  step="5"
                  required
                  value={item.rest}
                  onChange={(e) =>
                    update(item.id, "rest", Number(e.target.value))
                  }
                />
              </Field>
            </div>
            <Field label="动作备注">
              <input
                maxLength={500}
                value={item.note}
                onChange={(e) => update(item.id, "note", e.target.value)}
              />
            </Field>
            <div className="builder-tools">
              <button
                type="button"
                className="icon-button"
                disabled={index === 0}
                aria-label={`上移${item.exercise.name}`}
                onClick={() => {
                  const next = [...items];
                  [next[index - 1], next[index]] = [
                    next[index],
                    next[index - 1],
                  ];
                  setItems(next);
                }}
              >
                <ArrowUp size={18} />
              </button>
              <button
                type="button"
                className="icon-button"
                disabled={index === items.length - 1}
                aria-label={`下移${item.exercise.name}`}
                onClick={() => {
                  const next = [...items];
                  [next[index + 1], next[index]] = [
                    next[index],
                    next[index + 1],
                  ];
                  setItems(next);
                }}
              >
                <ArrowDown size={18} />
              </button>
              <button
                type="button"
                className="text-button danger-text"
                onClick={() => setItems(items.filter((x) => x.id !== item.id))}
              >
                <Trash2 size={16} />
                移除动作
              </button>
            </div>
          </fieldset>
        ))}
        <FormError message={error} />
        <div className="sticky-form-action">
          <Button className="full" type="submit" disabled={busy}>
            保存训练模板
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function ExerciseForm({ onClose }: { onClose: () => void }) {
  const { mutate, notify } = useStore();
  const [error, setError] = useState("");
  return (
    <Modal title="添加自定义动作" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          try {
            const exercise = exerciseSchema.parse({
              id: uid(),
              name: f.get("name"),
              category: f.get("category"),
              mode: f.get("mode"),
              archived: false,
            });
            if (
              await mutate((s) => {
                s.exercises.push(exercise);
              })
            ) {
              notify("自定义动作已加入动作列表");
              onClose();
            }
          } catch {
            setError("请填写有效的动作名称。");
          }
        }}
      >
        <Field label="动作名称">
          <input name="name" required maxLength={160} />
        </Field>
        <Field label="动作分类">
          <select name="category">
            {Object.entries(categories).map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="记录方式">
          <select name="mode">
            {Object.entries(modes).map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <p className="helper">
          辅助重量表示器械提供的帮助，减少辅助重量才可能意味着进步。自重和计时动作不会计入负重训练量。
        </p>
        <FormError message={error} />
        <Button className="full" type="submit">
          保存动作
        </Button>
      </form>
    </Modal>
  );
}
function ScheduleForm({
  date,
  slotId,
  onClose,
}: {
  date: string;
  slotId?: string;
  onClose: () => void;
}) {
  const { state, mutate, notify } = useStore();
  const slot = state.schedule.find((s) => s.id === slotId);
  const [busy, setBusy] = useState(false);
  const templates = state.templates.filter((t) => !t.archived);
  return (
    <Modal
      title={slot ? "调整训练安排" : "安排训练"}
      description="改期不自动改动已有饮食目标，需要时请在饮食页切换训练日。"
      onClose={onClose}
    >
      {templates.length ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            const value = {
              id: slot?.id ?? uid(),
              date: String(f.get("date")),
              templateId: String(f.get("template")),
            };
            const ok = await mutate((s) => {
              const i = s.schedule.findIndex((x) => x.id === value.id);
              if (i < 0) s.schedule.push(value);
              else s.schedule[i] = value;
            });
            setBusy(false);
            if (ok) {
              notify("训练安排已保存");
              onClose();
            }
          }}
        >
          <Field label="训练日期">
            <input
              type="date"
              name="date"
              required
              defaultValue={slot?.date ?? date}
            />
          </Field>
          <Field label="训练模板">
            <select name="template" defaultValue={slot?.templateId}>
              {templates.map((t) => (
                <option value={t.id} key={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Button className="full" type="submit" disabled={busy}>
            保存安排
          </Button>
        </form>
      ) : (
        <Empty
          title="先创建一个训练模板"
          description="设置动作和组次后，就能安排到日历中。"
        />
      )}
    </Modal>
  );
}
function Workout({ session }: { session: Session }) {
  const [exerciseIndex, setExerciseIndex] = useState(() =>
    Math.max(
      0,
      session.exercises.findIndex((e) => e.sets.some((set) => !set.done)),
    ),
  );
  const { state, mutate, notify, saving } = useStore();
  const [note, setNote] = useState(session.note);
  const [now, setNow] = useState(Date.now());
  const [finish, setFinish] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState("");
  const [replace, setReplace] = useState<string | null>(null);
  const [replacement, setReplacement] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = session.restEndsAt
    ? Math.max(0, Math.ceil((session.restEndsAt - now) / 1000))
    : 0;
  async function update(fn: (s: Session) => void) {
    return mutate((s) => {
      const current = s.sessions.find((x) => x.id === session.id);
      if (current?.status === "active") fn(current);
    });
  }
  async function updateSet(
    exerciseId: string,
    setId: string,
    patch: Partial<SetLog>,
  ) {
    await update((s) => {
      const row = s.exercises
        .find((x) => x.id === exerciseId)
        ?.sets.find((x) => x.id === setId);
      if (row) Object.assign(row, patch);
    });
  }
  const exercises = [
    ...catalogue,
    ...state.exercises.filter((e) => !e.archived),
  ];
  return (
    <section className="active-workout">
      <div className="workout-header">
        <div>
          <p className="eyebrow">
            IN SESSION <span className="live-dot" />
          </p>
          <h2>{session.name}</h2>
          <p>
            {session.date} · 已完成 {completedSets(session)} 组
          </p>
        </div>
        <div className="elapsed">
          <Clock3 size={17} />
          {Math.floor((now - session.startedAt) / 60000)}
          <small>分钟</small>
        </div>
      </div>
      <div className="rest-timer" role="timer">
        <span>
          <Timer size={19} />
          组间休息
        </span>
        <strong>
          {session.restEndsAt
            ? remaining > 0
              ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
              : "休息结束"
            : "完成一组后开始"}
        </strong>
        {session.restEndsAt && (
          <button
            className="text-button"
            onClick={() =>
              update((s) => {
                s.restEndsAt = null;
              })
            }
          >
            结束
          </button>
        )}
      </div>
      <label className="exercise-switcher">
        <span>
          动作 {exerciseIndex + 1} / {session.exercises.length}
        </span>
        <select
          aria-label="当前动作"
          value={exerciseIndex}
          disabled={saving}
          onChange={(e) => setExerciseIndex(Number(e.target.value))}
        >
          {session.exercises.map((item, index) => (
            <option value={index} key={item.id}>
              {index + 1}. {item.exercise.name} ·{" "}
              {item.sets.filter((s) => s.done).length}/{item.sets.length} 组
            </option>
          ))}
        </select>
      </label>
      {session.exercises.map((item, index) => {
        if (index !== exerciseIndex) return null;
        const previous = state.sessions
          .filter(
            (s) => s.status === "completed" && s.startedAt < session.startedAt,
          )
          .sort((a, b) => b.startedAt - a.startedAt)
          .flatMap((s) => s.exercises)
          .find((e) => e.exercise.id === item.exercise.id);
        return (
          <div className="workout-exercise" key={item.id}>
            <div className="exercise-head">
              <div>
                <span className="eyebrow">
                  EXERCISE {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{item.exercise.name}</h3>
                <p>{item.target.note || modes[item.exercise.mode]}</p>
              </div>
              {!item.sets.some((s) => s.done) && (
                <button
                  className="text-button"
                  onClick={() => {
                    setReplace(item.id);
                    setReplacement("");
                  }}
                >
                  替换
                </button>
              )}
            </div>
            {previous && (
              <p className="previous-record">
                上次：
                {previous.sets
                  .filter((s) => s.done && !s.warmup)
                  .map((s) =>
                    item.exercise.mode === "timed"
                      ? `${s.seconds}秒`
                      : item.exercise.mode === "bodyweight"
                        ? `${s.reps}次`
                        : `${s.weight}kg × ${s.reps}`,
                  )
                  .join(" / ") || "无正式组"}
              </p>
            )}
            <div className="set-table">
              <div
                className={`set-head ${item.exercise.mode === "timed" || item.exercise.mode === "bodyweight" ? "single" : ""}`}
              >
                <span>组</span>
                {(item.exercise.mode === "weighted" ||
                  item.exercise.mode === "assisted") && (
                  <span>
                    {item.exercise.mode === "assisted" ? "辅助 kg" : "重量 kg"}
                  </span>
                )}
                <span>{item.exercise.mode === "timed" ? "秒数" : "次数"}</span>
                <span>完成</span>
              </div>
              {item.sets.map((set, n) => (
                <div
                  className={`set-row ${set.done ? "done" : ""} ${item.exercise.mode === "timed" || item.exercise.mode === "bodyweight" ? "single" : ""}`}
                  key={set.id}
                >
                  <button
                    className="set-index"
                    title="点击切换热身组"
                    aria-label={`第${n + 1}组${set.warmup ? "热身" : "正式"}，点击切换`}
                    disabled={set.done}
                    onClick={() =>
                      updateSet(item.id, set.id, { warmup: !set.warmup })
                    }
                  >
                    {set.warmup ? "热身" : n + 1}
                  </button>
                  {(item.exercise.mode === "weighted" ||
                    item.exercise.mode === "assisted") && (
                    <SetNumber
                      label={`${item.exercise.name}第${n + 1}组重量`}
                      min={0}
                      max={1000}
                      value={set.weight}
                      disabled={set.done}
                      onChange={(value) =>
                        updateSet(item.id, set.id, { weight: value })
                      }
                    />
                  )}
                  <SetNumber
                    label={`${item.exercise.name}第${n + 1}组${item.exercise.mode === "timed" ? "秒数" : "次数"}`}
                    min={1}
                    max={item.exercise.mode === "timed" ? 36000 : 200}
                    integer
                    value={
                      item.exercise.mode === "timed" ? set.seconds : set.reps
                    }
                    disabled={set.done}
                    onChange={(value) =>
                      updateSet(item.id, set.id, {
                        [item.exercise.mode === "timed" ? "seconds" : "reps"]:
                          value,
                      })
                    }
                  />
                  <button
                    aria-label={`${set.done ? "撤销" : "完成"}${item.exercise.name}第${n + 1}组`}
                    className={`set-check ${set.done ? "checked" : ""}`}
                    disabled={saving}
                    onClick={async () => {
                      if (!set.done && !validSet(set, item.exercise.mode)) {
                        setError("请先填写有效的重量、次数或秒数。");
                        return;
                      }
                      setError("");
                      await update((s) => {
                        const row = s.exercises
                          .find((e) => e.id === item.id)
                          ?.sets.find((x) => x.id === set.id);
                        if (row) {
                          row.done = !row.done;
                          if (row.done && item.target.rest > 0)
                            s.restEndsAt = Date.now() + item.target.rest * 1000;
                        }
                      });
                    }}
                  >
                    <Check size={21} />
                  </button>
                </div>
              ))}
            </div>
            <div className="set-tools">
              <button
                className="text-button"
                disabled={item.sets.length >= 50}
                onClick={() =>
                  update((s) => {
                    s.exercises
                      .find((e) => e.id === item.id)
                      ?.sets.push({
                        id: uid(),
                        weight:
                          item.exercise.mode === "bodyweight"
                            ? null
                            : item.target.weight,
                        reps:
                          item.exercise.mode === "timed"
                            ? null
                            : item.target.reps,
                        seconds:
                          item.exercise.mode === "timed"
                            ? item.target.seconds
                            : null,
                        warmup: false,
                        done: false,
                      });
                  })
                }
              >
                <Plus size={17} />
                加一组
              </button>
              {item.sets.length > 1 && !item.sets.at(-1)?.done && (
                <button
                  className="text-button muted"
                  onClick={() =>
                    update((s) => {
                      s.exercises.find((e) => e.id === item.id)?.sets.pop();
                    })
                  }
                >
                  移除末组
                </button>
              )}
            </div>
          </div>
        );
      })}
      <div className="exercise-navigation">
        <Button
          variant="secondary"
          disabled={exerciseIndex === 0 || saving}
          onClick={() => setExerciseIndex(exerciseIndex - 1)}
        >
          上一个动作
        </Button>
        <Button
          variant="secondary"
          disabled={exerciseIndex >= session.exercises.length - 1 || saving}
          onClick={() => setExerciseIndex(exerciseIndex + 1)}
        >
          下一个动作
          <ChevronRight size={17} />
        </Button>
      </div>
      <details className="workout-notes">
        <summary>训练备注与计时说明</summary>
        <p className="helper">
          每次修改自动保存。锁屏后按结束时间恢复计时，不保证后台铃声。
        </p>
        <Field label="本次训练备注">
          <textarea
            value={note}
            rows={2}
            maxLength={1000}
            onChange={(e) => {
              setNote(e.target.value);
              void update((s) => {
                s.note = e.target.value;
              });
            }}
          />
        </Field>
      </details>
      <FormError message={error} />
      <div className="workout-finish">
        <Button
          disabled={completedSets(session) === 0}
          onClick={() => setFinish(true)}
        >
          <Check size={19} />
          结束并保存训练
        </Button>
        <button className="text-button muted" onClick={() => setDiscard(true)}>
          放弃本次
        </button>
      </div>
      {finish && (
        <Confirm
          title="完成本次训练？"
          description={`已完成 ${completedSets(session)} 个正式组。未勾选的组保留为未完成，不计入训练量。`}
          onCancel={() => setFinish(false)}
          onConfirm={async () => {
            if (busy) return;
            setBusy(true);
            const ok = await update((s) => {
              s.status = "completed";
              s.endedAt = Date.now();
              s.restEndsAt = null;
            });
            setBusy(false);
            if (ok) {
              notify("训练已保存，做得不错");
              goTo("training/history");
              setFinish(false);
            }
          }}
        />
      )}{" "}
      {discard && (
        <Confirm
          title="放弃本次训练？"
          description="本次未结束训练的组记录会删除。训练模板和过去已完成的训练保持不变。"
          danger
          onCancel={() => setDiscard(false)}
          onConfirm={async () => {
            if (
              await mutate((s) => {
                s.sessions = s.sessions.filter((x) => x.id !== session.id);
              })
            ) {
              notify("已放弃本次训练");
              goTo("training");
              setDiscard(false);
            }
          }}
        />
      )}{" "}
      {replace && (
        <Modal
          title="替换未开始的动作"
          description="只影响本次训练，不修改原模板。该动作尚未完成的组将按新动作重置。"
          onClose={() => setReplace(null)}
        >
          <Field label="新动作">
            <select
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
            >
              <option value="">选择动作</option>
              {exercises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>
          <Button
            className="full"
            disabled={!replacement}
            onClick={async () => {
              const exercise = exercises.find((e) => e.id === replacement);
              if (!exercise) return;
              const target = makeTarget(exercise);
              const fresh = startSession(
                {
                  id: uid(),
                  name: "replacement",
                  archived: false,
                  exercises: [target],
                },
                session.date,
              ).exercises[0];
              if (
                await update((s) => {
                  const i = s.exercises.findIndex((e) => e.id === replace);
                  if (i >= 0 && !s.exercises[i].sets.some((s) => s.done))
                    s.exercises[i] = { ...fresh, id: replace };
                })
              )
                setReplace(null);
            }}
          >
            确认替换
          </Button>
        </Modal>
      )}
    </section>
  );
}
function SessionDetail({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const { mutate, notify } = useStore();
  const [remove, setRemove] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => structuredClone(session));
  const [error, setError] = useState("");
  return (
    <Modal
      title={session.name}
      description={`${session.date} · ${completedSets(session)} 个正式组 · 负重训练量 ${round(volume(session))} kg`}
      onClose={onClose}
    >
      {editing ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const checked = sessionSchema.parse(draft);
              if (
                checked.exercises.some((e) =>
                  e.sets.some((s) => s.done && !validSet(s, e.exercise.mode)),
                )
              )
                throw new Error();
              if (
                await mutate((s) => {
                  const i = s.sessions.findIndex((x) => x.id === session.id);
                  if (i >= 0) {
                    if (
                      JSON.stringify(s.sessions[i]) !== JSON.stringify(session)
                    )
                      throw new Error(
                        "记录已在其他页面更新，请关闭后重新打开再更正。",
                      );
                    s.sessions[i] = checked;
                  }
                })
              ) {
                notify("训练记录已更正");
                onClose();
              }
            } catch {
              setError("请检查完成组的数值。");
            }
          }}
        >
          <Field label="归属日期">
            <input
              type="date"
              required
              value={draft.date}
              max={today()}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </Field>
          {draft.exercises.map((ex, i) => (
            <fieldset key={ex.id}>
              <legend>{ex.exercise.name}</legend>
              {ex.sets
                .filter((s) => s.done)
                .map((set) => (
                  <div className="form-grid" key={set.id}>
                    {(ex.exercise.mode === "weighted" ||
                      ex.exercise.mode === "assisted") && (
                      <Field label="重量 · kg">
                        <input
                          type="number"
                          min="0"
                          max="1000"
                          step="0.25"
                          required
                          value={set.weight ?? ""}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              exercises: draft.exercises.map((x, j) =>
                                j === i
                                  ? {
                                      ...x,
                                      sets: x.sets.map((s) =>
                                        s.id === set.id
                                          ? {
                                              ...s,
                                              weight: Number(e.target.value),
                                            }
                                          : s,
                                      ),
                                    }
                                  : x,
                              ),
                            })
                          }
                        />
                      </Field>
                    )}
                    <Field
                      label={ex.exercise.mode === "timed" ? "秒数" : "次数"}
                    >
                      <input
                        type="number"
                        min="1"
                        max={ex.exercise.mode === "timed" ? 36000 : 200}
                        required
                        value={
                          (ex.exercise.mode === "timed"
                            ? set.seconds
                            : set.reps) ?? ""
                        }
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            exercises: draft.exercises.map((x, j) =>
                              j === i
                                ? {
                                    ...x,
                                    sets: x.sets.map((s) =>
                                      s.id === set.id
                                        ? {
                                            ...s,
                                            [ex.exercise.mode === "timed"
                                              ? "seconds"
                                              : "reps"]: Number(e.target.value),
                                          }
                                        : s,
                                    ),
                                  }
                                : x,
                            ),
                          })
                        }
                      />
                    </Field>
                  </div>
                ))}
            </fieldset>
          ))}
          <Field label="备注">
            <textarea
              maxLength={1000}
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            />
          </Field>
          <FormError message={error} />
          <Button className="full" type="submit">
            保存更正
          </Button>
        </form>
      ) : (
        <>
          {session.exercises.map((e) => (
            <div className="history-exercise" key={e.id}>
              <h3>{e.exercise.name}</h3>
              {e.sets.map((s, i) => (
                <div key={s.id}>
                  <span>{s.warmup ? "热身" : `第 ${i + 1} 组`}</span>
                  <b>
                    {!s.done
                      ? "未完成"
                      : e.exercise.mode === "timed"
                        ? `${s.seconds} 秒`
                        : e.exercise.mode === "bodyweight"
                          ? `${s.reps} 次`
                          : `${s.weight} kg × ${s.reps} 次`}
                  </b>
                </div>
              ))}
            </div>
          ))}
          {session.note && <p className="note">{session.note}</p>}
          <Button
            variant="secondary"
            className="full"
            onClick={() => setEditing(true)}
          >
            <Edit3 size={17} />
            更正记录
          </Button>
          <Button
            variant="ghost"
            className="full danger-text"
            onClick={() => setRemove(true)}
          >
            删除这次训练
          </Button>
        </>
      )}
      {remove && (
        <Confirm
          title="删除这次训练？"
          description="仅删除这一次已完成的训练，操作不可撤销。模板保持不变。"
          danger
          onCancel={() => setRemove(false)}
          onConfirm={async () => {
            if (
              await mutate((s) => {
                s.sessions = s.sessions.filter((x) => x.id !== session.id);
              })
            ) {
              notify("训练记录已删除");
              onClose();
            }
          }}
        />
      )}
    </Modal>
  );
}

function SetNumber({
  label,
  value,
  min,
  max,
  integer = false,
  disabled,
  onChange,
}: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  integer?: boolean;
  disabled: boolean;
  onChange: (n: number | null) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value?.toString() ?? "");
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(value?.toString() ?? "");
  }, [value, focused]);
  const invalid =
    draft !== "" &&
    (!Number.isFinite(Number(draft)) ||
      Number(draft) < min ||
      Number(draft) > max ||
      (integer && !Number.isInteger(Number(draft))));
  return (
    <input
      aria-label={label}
      aria-invalid={invalid}
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      disabled={disabled}
      value={draft}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        const n = Number(raw);
        void onChange(
          raw.trim() !== "" &&
            Number.isFinite(n) &&
            n >= min &&
            n <= max &&
            (!integer || Number.isInteger(n))
            ? n
            : null,
        );
      }}
    />
  );
}
