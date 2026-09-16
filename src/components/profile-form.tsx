"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, Check, Info } from "lucide-react";
import { calculateProfile, profileAt, today, type Profile } from "@/lib/model";
import { useStore } from "@/lib/store";
import { Button, Field, FormError, Modal, round } from "./ui";
export function ProfileForm({ onClose }: { onClose: () => void }) {
  const { state, mutate, notify } = useStore();
  const prior = profileAt(state, today());
  const [preview, setPreview] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const p = calculateProfile({
        effectiveDate: today(),
        age: Number(f.get("age")),
        height: Number(f.get("height")),
        weight: Number(f.get("weight")),
        sex: f.get("sex") as Profile["sex"],
        activity: f.get("activity") as Profile["activity"],
        energyMode: f.get("energyMode") as Profile["energyMode"],
        goal: f.get("goal") as Profile["goal"],
        adjustment: Number(f.get("adjustment")),
        proteinPerKg: Number(f.get("proteinPerKg")),
        fatPerKg: Number(f.get("fatPerKg")),
      });
      setError("");
      setPreview(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "请检查填写内容。");
    }
  }
  async function save() {
    if (!preview) return;
    setBusy(true);
    const ok = await mutate((s) => {
      s.profiles = s.profiles.filter((p) => p.effectiveDate !== today());
      s.profiles.push(preview);
      s.targets = s.targets.filter((t) => t.date !== today());
      if (!s.weights.some((w) => w.date === today()))
        s.weights.push({
          id: crypto.randomUUID(),
          date: today(),
          weight: preview.weight,
          waist: null,
        });
    });
    setBusy(false);
    if (ok) {
      notify("个人目标已保存，从今天起生效");
      onClose();
    }
  }
  return (
    <Modal
      title={prior ? "身体资料与目标" : "设定你的起点"}
      description="只需设置一次，之后可以随时调整。适用于 18 岁及以上成人。"
      onClose={onClose}
    >
      <form onSubmit={submit} className={preview ? "hidden" : ""}>
        <div className="form-grid">
          <Field label="年龄">
            <input
              name="age"
              type="number"
              inputMode="numeric"
              min="18"
              max="100"
              required
              defaultValue={prior?.age}
            />
          </Field>
          <Field label="公式性别参数">
            <select name="sex" defaultValue={prior?.sex ?? "male"}>
              <option value="male">男性参数</option>
              <option value="female">女性参数</option>
            </select>
          </Field>
          <Field label="身高 · cm">
            <input
              name="height"
              type="number"
              inputMode="decimal"
              min="100"
              max="250"
              step="0.1"
              required
              defaultValue={prior?.height}
            />
          </Field>
          <Field label="体重 · kg">
            <input
              name="weight"
              type="number"
              inputMode="decimal"
              min="30"
              max="350"
              step="0.1"
              required
              defaultValue={prior?.weight}
            />
          </Field>
        </div>
        <Field
          label="活动水平"
          hint="按平时一周的整体活动选择，不按最忙的一天。"
        >
          <select name="activity" defaultValue={prior?.activity ?? "1.2"}>
            <option value="1.2">久坐，日常活动较少 · 1.2</option>
            <option value="1.375">轻度活动，每周少量运动 · 1.375</option>
            <option value="1.55">中度活动，每周规律训练 · 1.55</option>
            <option value="1.725">高度活动，日常与训练量较大 · 1.725</option>
          </select>
        </Field>
        <Field
          label="运动消耗的计算方式"
          hint="如果活动水平已经包含训练，不要再叠加当天运动。"
        >
          <select
            name="energyMode"
            defaultValue={prior?.energyMode ?? "inclusive"}
          >
            <option value="inclusive">活动系数已包含训练（推荐）</option>
            <option value="additional">
              系数只包含日常活动，另记净运动消耗
            </option>
          </select>
        </Field>
        <div className="form-grid">
          <Field label="当前目标">
            <select name="goal" defaultValue={prior?.goal ?? "lose"}>
              <option value="lose">减脂</option>
              <option value="maintain">维持</option>
              <option value="gain">增肌</option>
            </select>
          </Field>
          <Field
            label="每日热量调整 · kcal"
            hint="减脂填负值，维持填 0，增肌填正值。"
          >
            <input
              name="adjustment"
              type="number"
              min="-1000"
              max="1000"
              step="1"
              required
              defaultValue={prior?.adjustment ?? -300}
            />
          </Field>
          <Field label="蛋白质 · g/kg">
            <input
              name="proteinPerKg"
              type="number"
              inputMode="decimal"
              min="0.5"
              max="3.5"
              step="0.1"
              required
              defaultValue={prior?.proteinPerKg ?? 1.6}
            />
          </Field>
          <Field label="脂肪 · g/kg">
            <input
              name="fatPerKg"
              type="number"
              inputMode="decimal"
              min="0.3"
              max="2"
              step="0.1"
              required
              defaultValue={prior?.fatPerKg ?? 0.8}
            />
          </Field>
        </div>
        <div className="note">
          <Info size={18} />
          <span>
            碳水由剩余热量计算。g/kg
            使用本次设置的体重，之后记录体重不会自动改写目标。
          </span>
        </div>
        <FormError message={error} />
        <Button type="submit" className="full">
          计算并预览
          <ArrowRight size={18} />
        </Button>
      </form>
      {preview && (
        <div>
          <p className="eyebrow">你的每日营养目标</p>
          <div className="preview-energy">
            {round(preview.targets.calories)}
            <span>kcal / 天</span>
          </div>
          <div className="macro-preview">
            {[
              ["蛋白质", preview.targets.protein],
              ["碳水", preview.targets.carbs],
              ["脂肪", preview.targets.fat],
            ].map(([name, value]) => (
              <div key={name}>
                <strong>
                  {round(Number(value), 1)}
                  <small> g</small>
                </strong>
                <span>{name}</span>
              </div>
            ))}
          </div>
          <div className="detail-list">
            <div>
              <span>基础代谢 BMR</span>
              <b>{round(preview.bmr)} kcal</b>
            </div>
            <div>
              <span>每日消耗估算 TDEE</span>
              <b>{round(preview.tdee)} kcal</b>
            </div>
            <div>
              <span>热量调整</span>
              <b>
                {preview.adjustment > 0 ? "+" : ""}
                {preview.adjustment} kcal
              </b>
            </div>
          </div>
          <p className="helper">
            基于 Mifflin–St Jeor
            公式估算，不是测量值。运动增量模式只调整消耗估算，不自动增加可吃热量。保存会更新今天的基础目标，过去记录保持不变；若正在使用饮食阶段，以阶段目标为准。
          </p>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setPreview(null)}>
              返回调整
            </Button>
            <Button onClick={save} disabled={busy}>
              <Check size={18} />
              保存目标
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
