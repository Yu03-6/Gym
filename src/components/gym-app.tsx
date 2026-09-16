"use client";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Home,
  Leaf,
  Plus,
  Settings,
  ShieldCheck,
  TrendingUp,
  WifiOff,
} from "lucide-react";
import { StoreProvider, useStore } from "@/lib/store";
import {
  completedSets,
  phaseAt,
  resolveTarget,
  shiftDate,
  today,
  totals,
} from "@/lib/model";
import { Button, Empty, round, SectionHead } from "./ui";
import { MacroBars } from "./macro-bars";
import { ProfileForm } from "./profile-form";
import { Nutrition } from "./nutrition";
import { Training } from "./training";
import { Trends } from "./trends";
import { SettingsPanel } from "./settings";
type Tab = "today" | "nutrition" | "training" | "trends";
const tabs = [
  { id: "today", name: "今日", icon: Home },
  { id: "nutrition", name: "饮食", icon: Leaf },
  { id: "training", name: "训练", icon: Dumbbell },
  { id: "trends", name: "趋势", icon: TrendingUp },
] as const;
export function GymApp() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? (
    <StoreProvider>
      <App />
    </StoreProvider>
  ) : (
    <main className="loading" role="status">
      正在打开你的训练日志…
    </main>
  );
}
function App() {
  const { state, ready, error, saving, message } = useStore();
  const [tab, setTab] = useState<Tab>("today");
  const [date, setDate] = useState(today);
  const [profile, setProfile] = useState(false);
  const [settings, setSettings] = useState(false);
  const [offline, setOffline] = useState(false);
  const [updateWorker, setUpdateWorker] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    function sync() {
      const t = location.hash.slice(1);
      if (tabs.some((x) => x.id === t)) setTab(t as Tab);
      else if (!t) setTab("today");
    }
    sync();
    window.addEventListener("hashchange", sync);
    const net = () => setOffline(!navigator.onLine);
    net();
    window.addEventListener("online", net);
    window.addEventListener("offline", net);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("online", net);
      window.removeEventListener("offline", net);
    };
  }, []);
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/sw.js`)
        .then((registration) => {
          if (registration.waiting) setUpdateWorker(registration.waiting);
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            worker?.addEventListener("statechange", () => {
              if (
                worker.state === "installed" &&
                navigator.serviceWorker.controller
              )
                setUpdateWorker(worker);
            });
          });
        })
        .catch(() => {});
    }
  }, []);
  function navigate(next: Tab) {
    location.hash = next;
    setTab(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  const d = new Date(`${date}T12:00:00`);
  const monday = shiftDate(date, -((d.getDay() + 6) % 7));
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="#today" className="brand" aria-label="Gym 首页">
          <Dumbbell size={25} />
          <span>
            GYM<span className="brand-dot">.</span>
          </span>
        </a>
        <p className="sidebar-caption">YOUR DAILY PRACTICE</p>
        <nav aria-label="主导航">
          {tabs.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className={tab === t.id ? "active" : ""}
              aria-current={tab === t.id ? "page" : undefined}
            >
              <t.icon size={21} />
              {t.name}
              <ArrowUpRight className="nav-arrow" size={17} />
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <ShieldCheck size={20} />
          <div>
            <b>记录属于你</b>
            <p>本地保存 · 随时备份</p>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="mobile-brand">
            <Dumbbell size={20} />
            <b>GYM.</b>
          </div>
          <div className="desktop-label">饮食 / 训练 / 身体变化</div>
          <div className="top-actions">
            <span className="save-state">
              <i />
              {saving ? "保存中…" : offline ? "离线 · 本地保存" : "本地保存"}
            </span>
            <button
              className="icon-button"
              onClick={() => setSettings(true)}
              aria-label="设置与备份"
            >
              <Settings size={22} />
            </button>
          </div>
        </header>
        {updateWorker && (
          <div className="offline">
            新版已准备好，已保存的记录会保留。
            <button
              className="text-button"
              disabled={saving}
              onClick={() => {
                navigator.serviceWorker.addEventListener(
                  "controllerchange",
                  () => location.reload(),
                  { once: true },
                );
                updateWorker.postMessage("ACTIVATE_UPDATE");
              }}
            >
              更新页面
            </button>
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        {offline && (
          <div className="offline">
            <WifiOff size={16} />
            当前离线，记录继续保存在本机。
          </div>
        )}
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              {d.toLocaleDateString("zh-CN", {
                month: "long",
                year: "numeric",
              })}
            </p>
            <h1>
              {tabs.find((t) => t.id === tab)?.name}
              <span>
                {tab === "today"
                  ? "一步一步来。"
                  : tab === "nutrition"
                    ? "吃得有数。"
                    : tab === "training"
                      ? "每组都算数。"
                      : "看见变化。"}
              </span>
            </h1>
          </div>
          <label className="date-picker">
            <input
              type="date"
              value={date}
              max={shiftDate(today(), 365)}
              aria-label="查看日期"
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
          </label>
        </div>
        <div className="week-strip">
          <button
            className="week-arrow"
            aria-label="上一周"
            onClick={() => setDate(shiftDate(date, -7))}
          >
            <ChevronLeft size={19} />
          </button>
          {Array.from({ length: 7 }, (_, i) => {
            const day = shiftDate(monday, i);
            const has =
              state.logs.some((l) => l.date === day) ||
              state.sessions.some((s) => s.date === day);
            return (
              <button
                key={day}
                aria-label={`${day}${day === today() ? " 今天" : ""}`}
                aria-pressed={date === day}
                className={`week-day ${date === day ? "selected" : ""} ${day === today() ? "is-today" : ""}`}
                onClick={() => setDate(day)}
              >
                <span>{["一", "二", "三", "四", "五", "六", "日"][i]}</span>
                <b>{Number(day.slice(-2))}</b>
                <i className={has ? "has-data" : ""} />
              </button>
            );
          })}
          <button
            className="week-arrow"
            aria-label="下一周"
            onClick={() => setDate(shiftDate(date, 7))}
          >
            <ChevronRight size={19} />
          </button>
        </div>
        {!ready ? (
          <div className="loading" role="status">
            {error ? "记录暂时无法打开" : "正在打开你的记录…"}
          </div>
        ) : (
          <>
            {tab === "today" && (
              <Today
                date={date}
                onSetup={() => setProfile(true)}
                navigate={navigate}
              />
            )}{" "}
            {tab === "nutrition" && (
              <Nutrition date={date} onSetup={() => setProfile(true)} />
            )}{" "}
            {tab === "training" && <Training date={date} />}{" "}
            {tab === "trends" && <Trends date={date} />}
          </>
        )}
        <footer className="page-footer">
          GYM JOURNAL<span>不赶进度，保持记录。</span>
        </footer>
      </main>
      <nav className="bottom-nav" aria-label="手机主导航">
        {tabs.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            className={tab === t.id ? "active" : ""}
            aria-current={tab === t.id ? "page" : undefined}
          >
            <t.icon size={22} />
            <span>{t.name}</span>
          </a>
        ))}
      </nav>
      {profile && <ProfileForm onClose={() => setProfile(false)} />}{" "}
      {settings && (
        <SettingsPanel
          onClose={() => setSettings(false)}
          onProfile={() => {
            setSettings(false);
            setProfile(true);
          }}
        />
      )}
      {message && (
        <div className="toast" role="status">
          <ShieldCheck size={18} />
          {message}
        </div>
      )}
    </div>
  );
}
function Today({
  date,
  onSetup,
  navigate,
}: {
  date: string;
  onSetup: () => void;
  navigate: (tab: Tab) => void;
}) {
  const { state } = useStore();
  const target = resolveTarget(state, date);
  const total = totals(state, date);
  const active = state.sessions.find((s) => s.status === "active");
  const phase = phaseAt(state, date);
  const scheduled = state.schedule.filter((s) => s.date === date);
  const sessions = state.sessions.filter(
    (s) => s.date === date && s.status === "completed",
  );
  const activity = state.activities
    .filter((a) => a.date === date)
    .reduce((s, a) => s + a.calories, 0);
  const remaining = target ? target.macros.calories - total.calories : 0;
  return (
    <div className="view-enter">
      {!target && (
        <section className="setup-callout">
          <div className="setup-art">
            <Activity size={32} />
          </div>
          <div>
            <p className="eyebrow">从你的身体开始</p>
            <h2>先定目标，再记录进步。</h2>
            <p>设置身体资料，计算每天需要的热量和营养。</p>
          </div>
          <Button onClick={onSetup}>
            设置个人目标
            <ArrowUpRight size={18} />
          </Button>
        </section>
      )}
      <div className="dashboard-grid">
        <section className="card energy-card">
          <div className="card-label">
            <span>
              <Flame size={18} />
              热量收支
            </span>
            <span className="pill">
              {target?.dayType === "training" ? "训练日" : "日常记录"}
            </span>
          </div>
          <div className="energy-top">
            <div>
              <p className="muted">
                {target
                  ? remaining >= 0
                    ? "今日还可摄入"
                    : "今日超出目标"
                  : "已记录摄入"}
              </p>
              <strong className="hero-number">
                {round(target ? Math.abs(remaining) : total.calories)}
                <small>kcal</small>
              </strong>
            </div>
            <div
              className="energy-ring"
              style={
                {
                  "--progress": `${target ? Math.min(total.calories / target.macros.calories, 1) * 100 : 0}%`,
                } as React.CSSProperties
              }
            >
              <div>
                <Flame size={25} />
                <b>
                  {target
                    ? `${Math.round((total.calories / target.macros.calories) * 100)}%`
                    : "—"}
                </b>
              </div>
            </div>
          </div>
          <div className="energy-breakdown">
            <div>
              <span>已摄入</span>
              <b>
                {round(total.calories)} <small>kcal</small>
              </b>
            </div>
            <div>
              <span>摄入目标</span>
              <b>
                {target ? round(target.macros.calories) : "—"}{" "}
                <small>kcal</small>
              </b>
            </div>
            <div>
              <span>估算消耗</span>
              <b>
                {target
                  ? round(
                      target.tdee +
                        (target.energyMode === "additional" ? activity : 0),
                    )
                  : "—"}{" "}
                <small>kcal</small>
              </b>
            </div>
          </div>
          <button className="card-link" onClick={() => navigate("nutrition")}>
            记录饮食
            <Plus size={19} />
          </button>
        </section>
        <section className="card nutrients-card">
          <div className="card-label">
            <span>
              <Leaf size={18} />
              三大营养素
            </span>
            <span className="muted small">已摄入 / 目标</span>
          </div>
          <MacroBars total={total} goal={target?.macros} />
          <p className="helper">
            {target?.source ?? "设置个人目标后查看每日分配"}
          </p>
        </section>
      </div>
      <div className="dashboard-grid lower">
        <section>
          <SectionHead
            eyebrow="TRAINING"
            title="今天的训练"
            action="查看训练"
            onAction={() => navigate("training")}
          />
          {active ? (
            <div className="workout-highlight">
              <span className="pill orange">训练进行中</span>
              <h3>{active.name}</h3>
              <p>
                已完成 {completedSets(active)} 组 · {active.date}
              </p>
              <Button onClick={() => navigate("training")}>
                继续训练
                <ArrowUpRight size={18} />
              </Button>
            </div>
          ) : scheduled.length ? (
            <div className="card list-card">
              {scheduled.map((slot) => (
                <button
                  key={slot.id}
                  className="record-row"
                  onClick={() => navigate("training")}
                >
                  <span className="row-icon">
                    <Dumbbell size={21} />
                  </span>
                  <span>
                    <b>
                      {
                        state.templates.find((t) => t.id === slot.templateId)
                          ?.name
                      }
                    </b>
                    <small>计划训练 · 点击开始</small>
                  </span>
                  <ArrowUpRight size={18} />
                </button>
              ))}
            </div>
          ) : sessions.length ? (
            <div className="card list-card">
              {sessions.map((s) => (
                <button
                  className="record-row"
                  key={s.id}
                  onClick={() => navigate("training")}
                >
                  <span className="row-icon green">
                    <Dumbbell size={21} />
                  </span>
                  <span>
                    <b>{s.name}</b>
                    <small>已完成 {completedSets(s)} 组</small>
                  </span>
                  <span className="pill">已完成</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="card">
              <Empty
                icon={<Dumbbell size={27} />}
                title="留一点时间给自己"
                description="添加训练计划，或把今天留给恢复。"
                action="安排训练"
                onAction={() => navigate("training")}
              />
            </div>
          )}
        </section>
        <section>
          <SectionHead
            eyebrow="YOUR PLAN"
            title="饮食阶段"
            action="管理阶段"
            onAction={() => navigate("nutrition")}
          />
          <div className="card phase-summary">
            <span className="phase-mark">{phase?.phase ? "01" : "—"}</span>
            <div>
              <h3>{phase?.phase?.name ?? "按自己的节奏调整"}</h3>
              <p>
                {phase?.phase
                  ? `开始于 ${phase.date} · 建议持续 ${phase.phase.days} 天`
                  : "设置阶段目标，记录每一次调整。碳水渐降方案由你确认后切换。"}
              </p>
            </div>
            <button
              className="text-button"
              onClick={() => navigate("nutrition")}
            >
              {phase?.phase ? "查看当前方案" : "创建饮食阶段"}
              <ArrowUpRight size={18} />
            </button>
          </div>
          <div className="local-note">
            <ShieldCheck size={21} />
            <p>数据保存在当前浏览器。定期在设置中导出备份，换手机也能恢复。</p>
          </div>
        </section>
      </div>
    </div>
  );
}
