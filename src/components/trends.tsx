"use client";
import { useState, type FormEvent } from "react";
import {
  Activity,
  ArrowDownRight,
  Dumbbell,
  Plus,
  Ruler,
  Scale,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  completedSets,
  freezeTarget,
  resolveTarget,
  shiftDate,
  today,
  totals,
  uid,
} from "@/lib/model";
import {
  Button,
  Empty,
  Field,
  FormError,
  Modal,
  round,
  SectionHead,
} from "./ui";
export function Trends({ date }: { date: string }) {
  const { state, mutate } = useStore();
  const [weight, setWeight] = useState(false);
  const [activity, setActivity] = useState(false);
  const [range, setRange] = useState(30);
  const [selected, setSelected] = useState("");
  const start = shiftDate(date, 1 - range);
  const weights = state.weights
    .filter((w) => w.date >= start && w.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date));
  const recent = state.weights.filter(
    (w) => w.date >= shiftDate(date, -6) && w.date <= date,
  );
  const average = recent.length
    ? recent.reduce((s, w) => s + w.weight, 0) / recent.length
    : null;
  const sessions = state.sessions.filter(
    (s) => s.status === "completed" && s.date >= start && s.date <= date,
  );
  const loggedDays = new Set(
    state.logs
      .filter((l) => l.date >= start && l.date <= date)
      .map((l) => l.date),
  );
  const exerciseMap = new Map(
    sessions
      .flatMap((s) => s.exercises)
      .map((e) => [e.exercise.id, e.exercise]),
  );
  const exerciseId = selected || [...exerciseMap.keys()][0];
  const exerciseRows = sessions
    .sort((a, b) => b.date.localeCompare(a.date) || b.startedAt - a.startedAt)
    .flatMap((s) =>
      s.exercises
        .filter((e) => e.exercise.id === exerciseId)
        .map((e) => ({ date: s.date, exercise: e })),
    );
  const bars = Array.from({ length: 7 }, (_, i) => {
    const day = shiftDate(date, i - 6);
    return {
      date: day,
      total: totals(state, day).calories,
      target: resolveTarget(state, day)?.macros.calories,
      recorded: state.logs.some((l) => l.date === day),
    };
  });
  const ceiling = Math.max(1, ...bars.flatMap((b) => [b.total, b.target ?? 0]));
  return (
    <div className="view-enter">
      <div className="section-head">
        <div
          className="segmented compact"
          role="group"
          aria-label="趋势时间范围"
        >
          {[7, 30, 90].map((r) => (
            <button
              key={r}
              aria-pressed={range === r}
              onClick={() => setRange(r)}
            >
              {r} 天
            </button>
          ))}
        </div>
        <Button variant="secondary" onClick={() => setWeight(true)}>
          <Plus size={17} />
          记录体重
        </Button>
      </div>
      <div className="stat-grid">
        <div className="card stat">
          <Scale size={20} />
          <p>7 日体重均值</p>
          <strong>
            {average ? round(average, 1) : "—"}
            <small>kg</small>
          </strong>
          <span>基于最近 7 天的 {recent.length} 次记录</span>
        </div>
        <div className="card stat">
          <Dumbbell size={20} />
          <p>已完成训练</p>
          <strong>
            {sessions.length}
            <small>次</small>
          </strong>
          <span>
            共 {sessions.reduce((s, w) => s + completedSets(w), 0)} 个正式组
          </span>
        </div>
        <div className="card stat">
          <Activity size={20} />
          <p>饮食记录天数</p>
          <strong>
            {loggedDays.size}
            <small>/ {range}</small>
          </strong>
          <span>有记录不代表全天饮食完整</span>
        </div>
      </div>
      <div className="dashboard-grid">
        <section className="card">
          <SectionHead eyebrow="BODY WEIGHT" title="看趋势，不看单日波动" />
          {weights.length >= 2 ? (
            <WeightChart values={weights} />
          ) : (
            <Empty
              icon={<TrendingUp size={26} />}
              title={weights.length ? "再记一次，看见趋势" : "还没有体重记录"}
              description="尽量在相近时间、相同条件下称重。至少两条记录后展示曲线。"
            />
          )}
          <details>
            <summary>查看与更正体重记录（{weights.length}）</summary>
            <div className="measurement-list">
              {weights.map((w) => (
                <div key={w.id}>
                  <span>{w.date}</span>
                  <b>
                    {round(w.weight, 1)} kg
                    {w.waist ? ` · 腰围 ${w.waist} cm` : ""}
                  </b>
                  <button
                    className="icon-button"
                    aria-label={`删除${w.date}体重`}
                    onClick={() => {
                      if (
                        confirm(
                          "删除该日期的体重记录？不会修改已设定的营养目标。",
                        )
                      )
                        void mutate((s) => {
                          s.weights = s.weights.filter((x) => x.id !== w.id);
                        });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <p className="helper">更正记录：选择同一日期重新记录体重即可。</p>
          </details>
        </section>
        <section className="card">
          <SectionHead eyebrow="LAST 7 DAYS" title="摄入与目标" />
          <div className="chart-legend">
            <span>
              <i className="actual" />
              实际摄入
            </span>
            <span>
              <i className="goal" />
              当天目标
            </span>
          </div>
          <div
            className="intake-chart"
            role="img"
            aria-label="最近七天摄入与目标，详细数值见下方表格"
          >
            {bars.map((b) => (
              <div key={b.date}>
                <div className="bar-pair">
                  <i
                    className="actual"
                    style={{ height: `${(b.total / ceiling) * 100}%` }}
                  />
                  <i
                    className="goal"
                    style={{ height: `${((b.target ?? 0) / ceiling) * 100}%` }}
                  />
                </div>
                <span>{Number(b.date.slice(-2))}</span>
              </div>
            ))}
          </div>
          <details>
            <summary>查看每日数值</summary>
            <div className="measurement-list">
              {bars.map((b) => (
                <div key={b.date}>
                  <span>{b.date.slice(5)}</span>
                  <b>
                    {b.recorded ? `${round(b.total)} kcal` : "未记录"} /{" "}
                    {b.target ? round(b.target) : "—"}
                  </b>
                </div>
              ))}
            </div>
          </details>
          <p className="helper">
            无记录的日期不按零摄入判断；目前不自动根据体重波动削减热量。
          </p>
        </section>
      </div>
      <SectionHead eyebrow="STRENGTH LOG" title="同一动作，持续对照" />
      {exerciseMap.size ? (
        <section className="card">
          <Field label="选择动作">
            <select
              value={exerciseId}
              onChange={(e) => setSelected(e.target.value)}
            >
              {[...exerciseMap.values()].map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="measurement-list">
            {exerciseRows.map((r, i) => (
              <div key={`${r.date}-${i}`}>
                <span>{r.date}</span>
                <b>
                  {r.exercise.sets
                    .filter((s) => s.done && !s.warmup)
                    .map((s) =>
                      r.exercise.exercise.mode === "timed"
                        ? `${s.seconds}秒`
                        : r.exercise.exercise.mode === "bodyweight"
                          ? `${s.reps}次`
                          : `${s.weight}kg × ${s.reps}`,
                    )
                    .join(" / ") || "无正式组"}
                </b>
              </div>
            ))}
          </div>
          <p className="helper">
            对照相同动作与记录方式。辅助重量越小代表帮助越少；不同动作的训练量不直接比较。
          </p>
        </section>
      ) : (
        <div className="card">
          <Empty
            icon={<Dumbbell size={26} />}
            title="完成训练后查看动作历史"
            description="每次实际重量、次数和秒数都会保留，帮助你决定下一次的目标。"
          />
        </div>
      )}
      <SectionHead
        title="当天活动消耗"
        action="添加活动"
        onAction={() => setActivity(true)}
      />
      <div className="card list-card">
        {state.activities
          .filter((a) => a.date === date)
          .map((a) => (
            <div key={a.id} className="record-row">
              <span className="row-icon">
                <Activity size={20} />
              </span>
              <span className="row-main">
                <b>{a.name}</b>
                <small>净运动消耗估算 · {a.calories} kcal</small>
              </span>
              <button
                className="icon-button"
                aria-label={`删除${a.name}`}
                onClick={() =>
                  mutate((s) => {
                    s.activities = s.activities.filter((x) => x.id !== a.id);
                  })
                }
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        {!state.activities.some((a) => a.date === date) && (
          <p className="rest-day">
            尚无额外活动记录。力量训练不会被自动换算为精确热量。
          </p>
        )}
      </div>
      <p className="helper">
        只有“另记净运动消耗”模式会将这里的数值加到消耗估算中。它不会自动增加摄入目标；不要填手表的全天总消耗。
      </p>
      {weight && <WeightForm date={date} onClose={() => setWeight(false)} />}{" "}
      {activity && (
        <ActivityForm date={date} onClose={() => setActivity(false)} />
      )}
    </div>
  );
}
function WeightChart({
  values,
}: {
  values: { date: string; weight: number }[];
}) {
  const nums = values.map((v) => v.weight);
  const min = Math.min(...nums) - 0.3,
    max = Math.max(...nums) + 0.3;
  const start = new Date(values[0].date).getTime(),
    end = new Date(values.at(-1)!.date).getTime();
  const x = (v: { date: string }) =>
    40 +
    ((new Date(v.date).getTime() - start) / Math.max(1, end - start)) * 320;
  const y = (n: number) => 170 - ((n - min) / (max - min)) * 135;
  const line = values
    .map((v, i) => `${i ? "L" : "M"}${x(v)},${y(v.weight)}`)
    .join(" ");
  return (
    <div className="weight-chart">
      <svg
        viewBox="0 0 390 210"
        role="img"
        aria-label={`体重从 ${values[0].weight} kg 到 ${values.at(-1)!.weight} kg，具体数据见下方列表`}
      >
        <defs>
          <linearGradient id="weight-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity=".18" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[min, (min + max) / 2, max].map((n) => (
          <g key={n}>
            <line
              x1="40"
              x2="370"
              y1={y(n)}
              y2={y(n)}
              stroke="var(--border)"
              strokeDasharray="3 5"
            />
            <text x="0" y={y(n) + 4} fill="var(--muted)" fontSize="11">
              {n.toFixed(1)}
            </text>
          </g>
        ))}
        <path d={`${line} L360,175 L40,175 Z`} fill="url(#weight-fill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {values.map((v) => (
          <circle
            key={v.date}
            cx={x(v)}
            cy={y(v.weight)}
            r="4"
            fill="var(--surface)"
            stroke="var(--accent)"
            strokeWidth="2"
          />
        ))}
        <text x="40" y="200" fill="var(--muted)" fontSize="12">
          {values[0].date.slice(5)}
        </text>
        <text x="330" y="200" fill="var(--muted)" fontSize="12">
          {values.at(-1)!.date.slice(5)}
        </text>
      </svg>
    </div>
  );
}
function WeightForm({ date, onClose }: { date: string; onClose: () => void }) {
  const { state, mutate, notify } = useStore();
  const [day, setDay] = useState(date);
  const existing = state.weights.find((w) => w.date === day);
  return (
    <Modal
      title="记录身体数据"
      description="同一天再次保存会更正当天记录，不会修改营养目标。"
      onClose={onClose}
    >
      <form
        key={day}
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const waist = String(f.get("waist")).trim();
          if (
            await mutate((s) => {
              s.weights = s.weights.filter((w) => w.date !== day);
              s.weights.push({
                id: existing?.id ?? uid(),
                date: day,
                weight: Number(f.get("weight")),
                waist: waist ? Number(waist) : null,
              });
            })
          ) {
            notify("身体数据已保存");
            onClose();
          }
        }}
      >
        <Field label="记录日期">
          <input
            type="date"
            max={today()}
            required
            value={day}
            onChange={(e) => e.target.value && setDay(e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label="体重 · kg">
            <input
              name="weight"
              type="number"
              inputMode="decimal"
              min="30"
              max="350"
              step="0.1"
              required
              defaultValue={existing?.weight}
            />
          </Field>
          <Field label="腰围 · cm（选填）">
            <input
              name="waist"
              type="number"
              inputMode="decimal"
              min="30"
              max="250"
              step="0.1"
              defaultValue={existing?.waist ?? undefined}
            />
          </Field>
        </div>
        <Button className="full" type="submit">
          保存身体数据
        </Button>
      </form>
    </Modal>
  );
}
function ActivityForm({
  date,
  onClose,
}: {
  date: string;
  onClose: () => void;
}) {
  const { mutate, notify } = useStore();
  return (
    <Modal
      title="记录活动消耗"
      description="仅填写运动带来的净额外消耗，不含静息消耗，也不是手表全天消耗。"
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          if (
            await mutate((s) => {
              freezeTarget(s, date);
              s.activities.push({
                id: uid(),
                date,
                name: String(f.get("name")),
                calories: Number(f.get("calories")),
              });
            })
          ) {
            notify("活动已记录，摄入目标保持不变");
            onClose();
          }
        }}
      >
        <Field label="活动名称">
          <input name="name" required maxLength={160} />
        </Field>
        <Field label="净运动消耗估算 · kcal">
          <input
            name="calories"
            type="number"
            inputMode="numeric"
            min="1"
            max="5000"
            required
          />
        </Field>
        <Button type="submit" className="full">
          保存活动
        </Button>
      </form>
    </Modal>
  );
}
