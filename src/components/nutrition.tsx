"use client";
import { useState, type FormEvent } from "react";
import {
  Archive,
  ArrowUpRight,
  Check,
  Copy,
  Edit3,
  Leaf,
  Plus,
  Search,
  Star,
  Trash2,
  Utensils,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  energy,
  foodSchema,
  foodTotals,
  freezeTarget,
  phaseAt,
  phaseSchema,
  resolveTarget,
  today,
  totals,
  uid,
  type Food,
  type FoodLog,
  type Phase,
} from "@/lib/model";
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
import { MacroBars } from "./macro-bars";
const meals = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
} as const;
const states = {
  raw: "生重",
  cooked: "熟重",
  packaged: "包装食品",
  other: "其他",
};
export function Nutrition({
  date,
  onSetup,
}: {
  date: string;
  onSetup: () => void;
}) {
  const { state, mutate, notify } = useStore();
  const [section, setSection] = useState<"diary" | "foods" | "phases">("diary");
  const [log, setLog] = useState<FoodLog | "new" | null>(null);
  const [food, setFood] = useState<Food | "new" | null>(null);
  const [phase, setPhase] = useState<Phase | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [copy, setCopy] = useState(false);
  const [deleteLog, setDeleteLog] = useState<FoodLog | null>(null);
  const [activate, setActivate] = useState<Phase | null>(null);
  const [pause, setPause] = useState(false);
  const target = resolveTarget(state, date);
  const total = totals(state, date);
  const active = phaseAt(state, today());
  async function removeLog() {
    if (!deleteLog) return;
    const deleted = deleteLog;
    const ok = await mutate((s) => {
      s.logs = s.logs.filter((l) => l.id !== deleted.id);
    });
    if (ok) {
      setDeleteLog(null);
      notify("饮食记录已删除");
    }
  }
  async function applyPhase(p: Phase | null) {
    const ok = await mutate((s) => {
      s.phaseEvents = s.phaseEvents.filter((e) => e.date !== today());
      s.phaseEvents.push({
        id: uid(),
        date: today(),
        phase: p ? structuredClone(p) : null,
      });
      s.targets = s.targets.filter((t) => t.date !== today());
      freezeTarget(s, today());
    });
    if (ok) {
      setActivate(null);
      setPause(false);
      notify(p ? "阶段已启用，今天起使用新目标" : "阶段已暂停，恢复个人目标");
    }
  }
  return (
    <div className="view-enter">
      <div className="segmented" role="tablist" aria-label="饮食栏目">
        {(
          [
            { id: "diary", label: "饮食记录" },
            { id: "foods", label: "我的食物" },
            { id: "phases", label: "阶段计划" },
          ] as const
        ).map((t) => (
          <button
            role="tab"
            aria-selected={section === t.id}
            key={t.id}
            onClick={() => setSection(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {section === "diary" && (
        <>
          <div className="nutrition-top">
            <section className="card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">DAILY INTAKE</p>
                  <h2>
                    <span className="number">{round(total.calories)}</span>
                    <small>
                      {" "}
                      / {target ? round(target.macros.calories) : "—"} kcal
                    </small>
                  </h2>
                </div>
                <Leaf className="accent" size={28} />
              </div>
              <MacroBars total={total} goal={target?.macros} />
              {target ? (
                <div className="target-note">
                  <span>{target.source}</span>
                  <select
                    aria-label="当天饮食日类型"
                    value={target.dayType}
                    onChange={async (e) => {
                      const type = e.target.value as "training" | "rest";
                      await mutate((s) => {
                        freezeTarget(s, date);
                        const t = s.targets.find((t) => t.date === date);
                        const phase = phaseAt(s, date)?.phase;
                        if (t) {
                          t.dayType = type;
                          if (phase) t.macros = structuredClone(phase[type]);
                        }
                      });
                    }}
                  >
                    <option value="rest">休息日</option>
                    <option value="training">训练日</option>
                  </select>
                </div>
              ) : (
                <Button variant="secondary" onClick={onSetup}>
                  设置营养目标
                </Button>
              )}
            </section>
            <section className="diet-actions">
              <Button onClick={() => setLog("new")}>
                <Plus size={20} />
                记录食物
              </Button>
              <Button variant="secondary" onClick={() => setCopy(true)}>
                <Copy size={18} />
                复制某天记录
              </Button>
              <p>只记录实际吃下的食物。常用食物和份量可以随时修改。</p>
            </section>
          </div>
          <SectionHead title="当天饮食" />
          <div className="meal-grid">
            {Object.entries(meals).map(([key, label]) => {
              const entries = state.logs.filter(
                (l) => l.date === date && l.meal === key,
              );
              return (
                <section className="card meal-card" key={key}>
                  <div className="card-label">
                    <span>
                      <Utensils size={17} />
                      {label}
                    </span>
                    <b>
                      {round(
                        entries.reduce((a, l) => a + foodTotals(l).calories, 0),
                      )}{" "}
                      <small>kcal</small>
                    </b>
                  </div>
                  {entries.length ? (
                    entries.map((l) => (
                      <div className="food-row" key={l.id}>
                        <button
                          className="food-row-main"
                          onClick={() => setLog(l)}
                        >
                          <b>{l.food.name}</b>
                          <small>
                            {l.amount} {l.food.unit} · {states[l.food.state]} ·{" "}
                            {round(foodTotals(l).calories)} kcal
                          </small>
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`删除${l.food.name}记录`}
                          onClick={() => setDeleteLog(l)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="meal-empty">还没有记录</p>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
      {section === "foods" && (
        <>
          <SectionHead
            eyebrow="YOUR FOOD LIBRARY"
            title="常吃的，记下来"
            action="新增食物"
            onAction={() => setFood("new")}
          />
          <div className="search">
            <Search size={19} />
            <input
              aria-label="搜索我的食物"
              placeholder="搜索食物名称"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="card list-card">
            {state.foods
              .filter(
                (f) =>
                  !f.archived &&
                  f.name.toLowerCase().includes(search.toLowerCase()),
              )
              .sort((a, b) => Number(b.favorite) - Number(a.favorite))
              .map((f) => (
                <div className="record-row" key={f.id}>
                  <span className="row-icon">
                    <Leaf size={20} />
                  </span>
                  <button className="row-main" onClick={() => setFood(f)}>
                    <b>{f.name}</b>
                    <small>
                      每 100 {f.unit} · {round(f.per100.calories)} kcal ·{" "}
                      {states[f.state]}
                    </small>
                  </button>
                  <button
                    className={`icon-button ${f.favorite ? "accent" : ""}`}
                    aria-label={`${f.favorite ? "取消常用" : "设为常用"} ${f.name}`}
                    onClick={() =>
                      mutate((s) => {
                        const item = s.foods.find((x) => x.id === f.id);
                        if (item) item.favorite = !item.favorite;
                      })
                    }
                  >
                    <Star
                      size={19}
                      fill={f.favorite ? "currentColor" : "none"}
                    />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`编辑${f.name}`}
                    onClick={() => setFood(f)}
                  >
                    <Edit3 size={18} />
                  </button>
                </div>
              ))}
            {!state.foods.some(
              (f) =>
                !f.archived &&
                f.name.toLowerCase().includes(search.toLowerCase()),
            ) && (
              <Empty
                icon={<Leaf size={28} />}
                title={search ? "没有找到匹配食物" : "建立自己的食物库"}
                description="按照包装标签或可靠营养数据添加食物，之后只需填写吃了多少。"
                action="新增食物"
                onAction={() => setFood("new")}
              />
            )}
          </div>
        </>
      )}
      {section === "phases" && (
        <>
          <SectionHead
            eyebrow="NUTRITION PHASES"
            title="有计划地调整"
            action="创建阶段"
            onAction={() => setPhase("new")}
          />
          <div className="note">
            <Leaf size={19} />
            <span>
              阶段设置营养目标，不生成食谱。记录方案来源，再根据自己的情况确认启用。持续天数仅作提醒，不会自动减碳水。
            </span>
          </div>
          {active?.phase && (
            <section className="phase-active card">
              <span className="pill orange">当前使用</span>
              <h3>{active.phase.name}</h3>
              <p>
                {active.date} 开始 · 建议 {active.phase.days} 天
              </p>
              <Button variant="secondary" onClick={() => setPause(true)}>
                暂停阶段
              </Button>
            </section>
          )}
          <div className="phase-grid">
            {state.phases
              .filter((p) => !p.archived)
              .map((p) => (
                <section className="card phase-card" key={p.id}>
                  <span className="eyebrow">{p.days} DAYS</span>
                  <h3>{p.name}</h3>
                  <div className="detail-list">
                    <div>
                      <span>训练日</span>
                      <b>{round(p.training.calories)} kcal</b>
                    </div>
                    <div>
                      <span>休息日</span>
                      <b>{round(p.rest.calories)} kcal</b>
                    </div>
                    <div>
                      <span>碳水 · 训练 / 休息</span>
                      <b>
                        {round(p.training.carbs)} / {round(p.rest.carbs)} g
                      </b>
                    </div>
                  </div>
                  {p.source && <p className="source-text">来源：{p.source}</p>}
                  {p.notes && <p className="helper">{p.notes}</p>}
                  <div className="form-actions">
                    <Button variant="secondary" onClick={() => setPhase(p)}>
                      编辑
                    </Button>
                    <Button
                      onClick={() => (target ? setActivate(p) : onSetup())}
                    >
                      启用
                      <ArrowUpRight size={17} />
                    </Button>
                  </div>
                </section>
              ))}
          </div>
          {!state.phases.some((p) => !p.archived) && (
            <div className="card">
              <Empty
                icon={<Leaf size={28} />}
                title="给下一阶段一个明确目标"
                description="可以设置训练日与休息日的蛋白质、碳水和脂肪，保留每次调整的依据。"
                action="创建阶段"
                onAction={() => setPhase("new")}
              />
            </div>
          )}
        </>
      )}
      {log && (
        <LogForm
          entry={log === "new" ? undefined : log}
          date={date}
          onClose={() => setLog(null)}
          onCreate={() => {
            setLog(null);
            setFood("new");
          }}
        />
      )}
      {food && (
        <FoodForm
          food={food === "new" ? undefined : food}
          onClose={() => setFood(null)}
        />
      )}{" "}
      {phase && (
        <PhaseForm
          phase={phase === "new" ? undefined : phase}
          onClose={() => setPhase(null)}
        />
      )}{" "}
      {copy && <CopyDay date={date} onClose={() => setCopy(false)} />}{" "}
      {deleteLog && (
        <Confirm
          title="删除这条饮食记录？"
          description={`${deleteLog.food.name}，${deleteLog.amount} ${deleteLog.food.unit}。删除后会重新汇总当天摄入，食物库不受影响。`}
          danger
          onCancel={() => setDeleteLog(null)}
          onConfirm={removeLog}
        />
      )}{" "}
      {activate && (
        <Confirm
          title={`启用「${activate.name}」？`}
          description="从今天起使用此阶段的营养目标，今天已有的目标会更新，过去日期的记录保持不变。编辑模板不会自动修改已启用阶段。"
          onCancel={() => setActivate(null)}
          onConfirm={() => applyPhase(activate)}
        />
      )}{" "}
      {pause && (
        <Confirm
          title="暂停当前饮食阶段？"
          description="从今天起恢复个人营养目标。过去阶段和饮食记录保持不变。"
          onCancel={() => setPause(false)}
          onConfirm={() => applyPhase(null)}
        />
      )}
    </div>
  );
}
function FoodForm({ food, onClose }: { food?: Food; onClose: () => void }) {
  const { mutate, notify } = useStore();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [archive, setArchive] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const protein = Number(f.get("protein")),
      carbs = Number(f.get("carbs")),
      fat = Number(f.get("fat"));
    const kcal = String(f.get("calories")).trim();
    try {
      if (f.get("unit") === "g" && protein + carbs + fat > 105)
        throw new Error("每 100 g/ml 的营养素合计异常，请核对计量基准。");
      const value = foodSchema.parse({
        id: food?.id ?? uid(),
        name: f.get("name"),
        state: f.get("state"),
        unit: f.get("unit"),
        source: f.get("source"),
        favorite: food?.favorite ?? false,
        archived: false,
        per100: {
          protein,
          carbs,
          fat,
          calories: kcal ? Number(kcal) : energy(protein, carbs, fat),
        },
      });
      setBusy(true);
      const ok = await mutate((s) => {
        const i = s.foods.findIndex((x) => x.id === value.id);
        if (i < 0) s.foods.push(value);
        else s.foods[i] = value;
      });
      setBusy(false);
      if (ok) {
        notify("食物已保存，旧饮食记录保持不变");
        onClose();
      }
    } catch (err) {
      setError(
        err instanceof Error && !("issues" in err)
          ? err.message
          : "请检查食物名称和营养数值。",
      );
    }
  }
  return (
    <Modal
      title={food ? "编辑食物" : "新增食物"}
      description="填写每 100 g 或 100 ml 的营养值，请核对生熟状态。"
      onClose={onClose}
    >
      <form onSubmit={save}>
        <Field label="食物名称">
          <input
            name="name"
            maxLength={160}
            required
            defaultValue={food?.name}
          />
        </Field>
        <div className="form-grid">
          <Field label="食物状态">
            <select name="state" defaultValue={food?.state ?? "packaged"}>
              {Object.entries(states).map(([k, v]) => (
                <option value={k} key={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="计量单位">
            <select name="unit" defaultValue={food?.unit ?? "g"}>
              <option value="g">每 100 g</option>
              <option value="ml">每 100 ml</option>
            </select>
          </Field>
        </div>
        <div className="form-grid">
          {(["protein", "carbs", "fat"] as const).map((k, i) => (
            <Field key={k} label={`${["蛋白质", "碳水", "脂肪"][i]} · g`}>
              <input
                name={k}
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="0.01"
                required
                defaultValue={food?.per100[k]}
              />
            </Field>
          ))}
          <Field
            label="热量 · kcal"
            hint="有包装热量时按标签填写；留空按三大营养素计算。"
          >
            <input
              name="calories"
              type="number"
              inputMode="decimal"
              min="0"
              max="1000"
              step="0.01"
              defaultValue={food?.per100.calories}
            />
          </Field>
        </div>
        <Field label="数据来源" hint="例如包装营养标签，或数据页面网址。">
          <input name="source" maxLength={400} defaultValue={food?.source} />
        </Field>
        <FormError message={error} />
        <Button type="submit" className="full" disabled={busy}>
          <Check size={18} />
          保存食物
        </Button>
        {food && (
          <Button
            variant="ghost"
            className="full"
            onClick={() => setArchive(true)}
            type="button"
          >
            <Archive size={17} />
            归档食物
          </Button>
        )}
      </form>
      {archive && (
        <Confirm
          title="归档这个食物？"
          description="从可选食物中隐藏，过去的饮食记录不受影响。备份仍会保留该食物。"
          onCancel={() => setArchive(false)}
          onConfirm={async () => {
            if (
              await mutate((s) => {
                const f = s.foods.find((x) => x.id === food?.id);
                if (f) f.archived = true;
              })
            ) {
              notify("食物已归档");
              onClose();
            }
          }}
        />
      )}
    </Modal>
  );
}
function LogForm({
  entry,
  date,
  onClose,
  onCreate,
}: {
  entry?: FoodLog;
  date: string;
  onClose: () => void;
  onCreate: () => void;
}) {
  const { state, mutate, notify } = useStore();
  const [selected, setSelected] = useState(entry?.food.id ?? "");
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState(entry?.amount.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const food =
    entry?.food.id === selected
      ? entry.food
      : state.foods.find((f) => f.id === selected);
  const options = state.foods
    .filter(
      (f) => !f.archived && f.name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => Number(b.favorite) - Number(a.favorite));
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!food) {
      setError("请先选择一个食物。");
      return;
    }
    const f = new FormData(e.currentTarget);
    const grams = Number(amount);
    if (!Number.isFinite(grams) || grams <= 0 || grams > 10000) {
      setError("请填写 0–10,000 以内的实际份量。");
      return;
    }
    setBusy(true);
    const value: FoodLog = {
      id: entry?.id ?? uid(),
      date,
      food: structuredClone(food),
      amount: grams,
      meal: f.get("meal") as FoodLog["meal"],
      createdAt: entry?.createdAt ?? Date.now(),
    };
    const ok = await mutate((s) => {
      freezeTarget(s, date);
      const i = s.logs.findIndex((l) => l.id === value.id);
      if (i < 0) s.logs.push(value);
      else s.logs[i] = value;
    });
    setBusy(false);
    if (ok) {
      notify("饮食记录已保存");
      onClose();
    }
  }
  return (
    <Modal
      title={entry ? "编辑饮食记录" : "记录食物"}
      description={date}
      onClose={onClose}
    >
      <form onSubmit={save}>
        <Field label="餐次">
          <select name="meal" defaultValue={entry?.meal ?? "lunch"}>
            {Object.entries(meals).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <div className="search">
          <Search size={18} />
          <input
            aria-label="搜索食物"
            placeholder="搜索你的食物库"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="food-picker" role="group" aria-label="选择食物">
          {entry && !options.some((f) => f.id === entry.food.id) && (
            <button
              type="button"
              className={selected === entry.food.id ? "selected" : ""}
              onClick={() => setSelected(entry.food.id)}
            >
              {entry.food.name} · 历史营养值
            </button>
          )}
          {options.map((f) => (
            <button
              type="button"
              key={f.id}
              className={selected === f.id ? "selected" : ""}
              onClick={() => setSelected(f.id)}
            >
              <span>
                {f.name}
                <small>
                  {states[f.state]} · {round(f.per100.calories)} kcal / 100{" "}
                  {f.unit}
                </small>
              </span>
              {selected === f.id && <Check size={18} />}
            </button>
          ))}
        </div>
        {!options.length && (
          <p className="helper">
            暂无匹配食物。先按营养标签添加，之后可重复使用。
          </p>
        )}
        <button className="text-button" type="button" onClick={onCreate}>
          <Plus size={17} />
          新增食物
        </button>
        <Field label={`实际份量 · ${food?.unit ?? "g / ml"}`}>
          <input
            type="number"
            inputMode="decimal"
            min="0.1"
            max="10000"
            step="0.1"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        {food && Number(amount) > 0 && (
          <div className="note">
            <Leaf size={18} />
            <span>
              {round((food.per100.calories * Number(amount)) / 100)} kcal · 蛋白{" "}
              {round((food.per100.protein * Number(amount)) / 100, 1)} g · 碳水{" "}
              {round((food.per100.carbs * Number(amount)) / 100, 1)} g · 脂肪{" "}
              {round((food.per100.fat * Number(amount)) / 100, 1)} g
            </span>
          </div>
        )}
        <FormError message={error} />
        <Button className="full" type="submit" disabled={busy}>
          <Check size={18} />
          保存记录
        </Button>
      </form>
    </Modal>
  );
}
function CopyDay({ date, onClose }: { date: string; onClose: () => void }) {
  const { state, mutate, notify } = useStore();
  const [from, setFrom] = useState("");
  const [busy, setBusy] = useState(false);
  const records = state.logs.filter((l) => l.date === from);
  return (
    <Modal
      title="复制饮食记录"
      description="将选定日期的实际记录追加到当天，不覆盖已有记录。"
      onClose={onClose}
    >
      <Field label="来源日期">
        <input
          type="date"
          max={today()}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </Field>
      <p className="helper">
        找到 {records.length} 条记录，复制到 {date}。复制后请核对实际份量。
      </p>
      <Button
        disabled={!records.length || from === date || busy}
        className="full"
        onClick={async () => {
          setBusy(true);
          const ok = await mutate((s) => {
            freezeTarget(s, date);
            s.logs.push(
              ...records.map((l) => ({
                ...structuredClone(l),
                id: uid(),
                date,
                createdAt: Date.now(),
              })),
            );
          });
          setBusy(false);
          if (ok) {
            notify(`已复制 ${records.length} 条记录`);
            onClose();
          }
        }}
      >
        确认追加 {records.length} 条记录
      </Button>
    </Modal>
  );
}
function PhaseForm({ phase, onClose }: { phase?: Phase; onClose: () => void }) {
  const { state, mutate, notify } = useStore();
  const baseline = resolveTarget(state, today())?.macros;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const targets = (prefix: string) => {
        const protein = Number(f.get(`${prefix}protein`)),
          carbs = Number(f.get(`${prefix}carbs`)),
          fat = Number(f.get(`${prefix}fat`));
        const calories = energy(protein, carbs, fat);
        if (calories < 1200)
          throw new Error("阶段目标低于 1,200 kcal，请核对并提高营养目标。");
        return { protein, carbs, fat, calories };
      };
      const value = phaseSchema.parse({
        id: phase?.id ?? uid(),
        name: f.get("name"),
        days: Number(f.get("days")),
        training: targets("training"),
        rest: targets("rest"),
        source: f.get("source"),
        notes: f.get("notes"),
        archived: false,
      });
      setBusy(true);
      const ok = await mutate((s) => {
        const i = s.phases.findIndex((p) => p.id === value.id);
        if (i < 0) s.phases.push(value);
        else s.phases[i] = value;
      });
      setBusy(false);
      if (ok) {
        notify("阶段模板已保存，启用后才影响目标");
        onClose();
      }
    } catch (err) {
      setError(
        err instanceof Error && !("issues" in err)
          ? err.message
          : "请检查阶段名称与数值。",
      );
    }
  }
  return (
    <Modal
      title={phase ? "编辑阶段模板" : "创建饮食阶段"}
      description="训练日和休息日分别设置，总热量由营养素计算。"
      onClose={onClose}
    >
      <form onSubmit={save}>
        <div className="form-grid">
          <Field label="阶段名称">
            <input
              name="name"
              required
              maxLength={160}
              defaultValue={phase?.name}
            />
          </Field>
          <Field label="建议持续天数">
            <input
              name="days"
              type="number"
              min="1"
              max="365"
              required
              defaultValue={phase?.days ?? 14}
            />
          </Field>
        </div>
        {(["training", "rest"] as const).map((type) => (
          <fieldset key={type}>
            <legend>{type === "training" ? "训练日" : "休息日"}</legend>
            <div className="form-grid three">
              {(["protein", "carbs", "fat"] as const).map((k, i) => (
                <Field key={k} label={`${["蛋白质", "碳水", "脂肪"][i]} · g`}>
                  <input
                    name={type + k}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="1000"
                    step="0.1"
                    required
                    defaultValue={
                      phase
                        ? Number(phase[type][k].toFixed(1))
                        : baseline
                          ? Number(baseline[k].toFixed(1))
                          : undefined
                    }
                  />
                </Field>
              ))}
            </div>
          </fieldset>
        ))}
        <Field
          label="方案来源"
          hint="可填写博主、视频链接、发布时间。不确定的规则先不要填入目标。"
        >
          <textarea
            name="source"
            rows={2}
            maxLength={1000}
            defaultValue={phase?.source}
          />
        </Field>
        <Field label="调整依据与备注">
          <textarea
            name="notes"
            rows={3}
            maxLength={1000}
            defaultValue={phase?.notes}
          />
        </Field>
        <FormError message={error} />
        <Button className="full" type="submit" disabled={busy}>
          保存阶段模板
        </Button>
        {phase && (
          <Button
            className="full"
            type="button"
            variant="ghost"
            onClick={async () => {
              if (
                await mutate((s) => {
                  const p = s.phases.find((p) => p.id === phase.id);
                  if (p) p.archived = true;
                })
              ) {
                notify("模板已归档，当前启用阶段不受影响");
                onClose();
              }
            }}
          >
            归档模板
          </Button>
        )}
      </form>
    </Modal>
  );
}
