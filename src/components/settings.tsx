"use client";
import { useEffect, useRef, useState } from "react";
import {
  Archive,
  ArrowUpRight,
  Download,
  FileJson,
  HardDrive,
  Info,
  ShieldCheck,
  Upload,
  UserRound,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  parseBackup,
  profileAt,
  serializeBackup,
  today,
  type AppState,
} from "@/lib/model";
import { Button, Confirm, Field, FormError, Modal } from "./ui";
function download(text: string, name: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function csv(s: AppState) {
  const safe = (v: unknown) => {
    let str = String(v ?? "");
    if (/^[=+@\-\t\r]/.test(str)) str = `'${str}`;
    return `"${str.replaceAll('"', '""')}"`;
  };
  const rows: unknown[][] = [
    [
      "type",
      "date",
      "name",
      "amount",
      "unit",
      "calories",
      "protein_g",
      "carbs_g",
      "fat_g",
      "weight_kg",
      "reps",
      "seconds",
      "completed",
    ],
  ];
  for (const l of s.logs) {
    const n = l.amount / 100;
    rows.push([
      "food",
      l.date,
      l.food.name,
      l.amount,
      l.food.unit,
      l.food.per100.calories * n,
      l.food.per100.protein * n,
      l.food.per100.carbs * n,
      l.food.per100.fat * n,
    ]);
  }
  for (const w of s.weights)
    rows.push([
      "body_weight",
      w.date,
      "Body weight",
      "",
      "kg",
      "",
      "",
      "",
      "",
      w.weight,
    ]);
  for (const w of s.sessions)
    for (const e of w.exercises)
      for (const set of e.sets)
        rows.push([
          "workout",
          w.date,
          e.exercise.name,
          "",
          "",
          "",
          "",
          "",
          "",
          set.weight,
          set.reps,
          set.seconds,
          set.done,
        ]);
  return "\ufeff" + rows.map((row) => row.map(safe).join(",")).join("\r\n");
}
export function SettingsPanel({
  onClose,
  onProfile,
}: {
  onClose: () => void;
  onProfile: () => void;
}) {
  const { state, mutate, snapshot, ready, notify } = useStore();
  const [pending, setPending] = useState<AppState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [persistent, setPersistent] = useState<boolean | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const p = profileAt(state, today());
  useEffect(() => {
    navigator.storage
      ?.persisted?.()
      .then(setPersistent)
      .catch(() => {});
  }, []);
  async function backup() {
    try {
      setBusy(true);
      download(serializeBackup(await snapshot()), `fitgo-backup-${today()}.json`);
      await mutate((s) => {
        s.lastBackup = Date.now();
      });
      notify("备份已开始下载，请确认文件已保存");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "备份失败，请保留当前数据并重试。",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="设置与数据"
      description="个人记录保存在当前设备、当前浏览器。"
      onClose={onClose}
    >
      <button className="settings-profile" onClick={onProfile}>
        <span className="row-icon">
          <UserRound size={24} />
        </span>
        <span>
          <b>{p ? "身体资料与营养目标" : "设置身体资料"}</b>
          <small>
            {p
              ? `${p.height} cm · 目标基准 ${p.weight} kg`
              : "建立每日热量和营养目标"}
          </small>
        </span>
        <ArrowUpRight size={19} />
      </button>
      <section className="settings-section">
        <h3>
          <ShieldCheck size={20} />
          保存与隐私
        </h3>
        <p>
          没有账号，不上传饮食、体重或训练记录。换浏览器、清理网站数据或更换手机前，请先导出备份。无痕浏览不适合长期记录。
        </p>
        <p className="storage-status">
          存储保留：
          {persistent === null
            ? "浏览器未提供状态"
            : persistent
              ? "浏览器已允许持久存储"
              : "浏览器默认策略"}
        </p>
        {persistent === false && (
          <Button
            variant="secondary"
            onClick={async () => {
              const allowed = await navigator.storage?.persist?.();
              setPersistent(!!allowed);
              notify(
                allowed
                  ? "已获得持久存储许可，仍建议定期备份"
                  : "浏览器未授予持久存储，请保持定期备份",
              );
            }}
          >
            请求保留本地数据
          </Button>
        )}
      </section>
      <section className="settings-section">
        <h3>
          <HardDrive size={20} />
          备份与恢复
        </h3>
        <p>
          完整 JSON
          备份包含身体资料、营养目标、食物、饮食阶段、训练模板、未完成训练与历史记录。
        </p>
        <div className="backup-actions">
          <Button onClick={backup} disabled={busy || !ready}>
            <Download size={18} />
            导出完整备份
          </Button>
          <Button
            variant="secondary"
            disabled={busy || !ready}
            onClick={() => file.current?.click()}
          >
            <Upload size={18} />
            从备份恢复
          </Button>
        </div>
        <input
          className="hidden"
          type="file"
          ref={file}
          accept=".json,application/json"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setError("");
            try {
              if (f.size > 20_000_000)
                throw new Error("请选择 20 MB 以内的备份文件。");
              setPending(parseBackup(await f.text()));
            } catch (err) {
              setError(err instanceof Error ? err.message : "备份读取失败");
            }
          }}
        />
        <p className="helper">
          {state.lastBackup
            ? `上次发起导出：${new Date(state.lastBackup).toLocaleString("zh-CN")}`
            : "还没有导出过备份。建议每周保存一份。"}
        </p>
        <FormError message={error} />
        <Button
          variant="ghost"
          className="full"
          disabled={!ready || busy}
          onClick={async () => {
            try {
              download(
                csv(await snapshot()),
                `fitgo-records-${today()}.csv`,
                "text/csv;charset=utf-8",
              );
              notify("CSV 已开始下载，仅供分析，不用于恢复");
            } catch {
              setError("导出失败，请重试。");
            }
          }}
        >
          导出 CSV 分析表
        </Button>
      </section>
      <section className="settings-section">
        <h3>
          <Archive size={20} />
          已归档项目
        </h3>
        {!(
          state.foods.some((f) => f.archived) ||
          state.templates.some((t) => t.archived) ||
          state.phases.some((p) => p.archived)
        ) ? (
          <p>没有已归档项目。</p>
        ) : (
          <div className="archive-list">
            {(["foods", "templates", "phases"] as const).flatMap((type) =>
              state[type]
                .filter((i) => i.archived)
                .map((item) => (
                  <div key={item.id}>
                    <span>{item.name}</span>
                    <button
                      className="text-button"
                      onClick={() =>
                        mutate((s) => {
                          const x = s[type].find((x) => x.id === item.id);
                          if (x) x.archived = false;
                        })
                      }
                    >
                      恢复
                    </button>
                  </div>
                )),
            )}
          </div>
        )}
      </section>
      <section className="settings-section">
        <h3>
          <Download size={20} />
          添加到手机主屏幕
        </h3>
        <p>
          iPhone：在 Safari
          中打开，点“分享”→“添加到主屏幕”。Android：使用浏览器菜单中的“安装应用”或“添加到主屏幕”。首次联网打开后，可离线记录。
        </p>
        <p className="helper">
          保持使用同一个浏览器入口。主屏幕应用的存储行为由系统决定，迁移前先备份。
        </p>
      </section>
      <section className="settings-section">
        <h3>
          <Info size={20} />
          计算说明
        </h3>
        <p>
          基础代谢采用成人 Mifflin–St Jeor
          公式；每日消耗由活动系数估算。营养目标按蛋白质/碳水 4 kcal/g、脂肪 9
          kcal/g 计算，包装标签可能因纤维等存在差异。
        </p>
        <p>
          运动记录不代表精确消耗。本工具不为未成年人、孕哺期或需要医疗营养管理的人群制定方案。
        </p>
        <a
          href="https://pubmed.ncbi.nlm.nih.gov/2305711/"
          target="_blank"
          rel="noreferrer"
          className="text-button"
        >
          查看公式来源
          <ArrowUpRight size={16} />
        </a>
      </section>
      <p className="version">FitGo · 1.0.0 · LOCAL FIRST</p>
      {pending && (
        <Confirm
          title="用备份替换当前记录？"
          description={`备份包含 ${pending.logs.length} 条饮食、${pending.sessions.length} 次训练、${pending.weights.length} 条身体记录。恢复会替换当前全部数据；确认后会先发起当前数据的备份下载，请保留该文件。`}
          danger
          onCancel={() => setPending(null)}
          onConfirm={async () => {
            if (busy) return;
            setBusy(true);
            const replacement = pending;
            const ok = await mutate((s) => {
              download(
                serializeBackup(s),
                `fitgo-before-restore-${Date.now()}.json`,
              );
              const revision = s.revision;
              Object.assign(s, structuredClone(replacement));
              s.revision = revision;
            });
            setBusy(false);
            if (ok) {
              setPending(null);
              notify("备份已恢复");
              onClose();
            }
          }}
        />
      )}
    </Modal>
  );
}
