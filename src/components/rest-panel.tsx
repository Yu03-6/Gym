"use client";
import { useState } from "react";
import {
  Timer,
  Volume2,
  ChevronRight,
  Play,
  Square,
  Check,
} from "lucide-react";
import { type Session } from "@/lib/model";
import { endRest, extendRest } from "@/lib/workout";
import { useStore } from "@/lib/store";
import { useRoute } from "@/lib/navigation";
import { useRestAlerts } from "./rest-alerts";
import { Button, Field, Modal } from "./ui";
export const clockText = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
export function RestPanel({
  session,
  exerciseId,
  update,
  actionLabel,
  actionDisabled,
  actionComplete,
  onComplete,
}: {
  actionLabel: string;
  actionDisabled: boolean;
  actionComplete: boolean;
  onComplete: () => void;
  session: Session;
  exerciseId: string;
  update: (fn: (s: Session) => void) => Promise<boolean>;
}) {
  const { saving } = useStore();
  const alerts = useRestAlerts();
  const [editing, setEditing] = useState(false);
  const exercise = session.exercises.find((e) => e.id === exerciseId)!;
  const [seconds, setSeconds] = useState(String(exercise.target.rest));
  const owner = session.exercises.find(
    (e) => e.id === session.restTimer?.exerciseId,
  );
  const ownerSet = owner?.sets.find((s) => s.id === session.restTimer?.setId);
  const number =
    owner && ownerSet
      ? owner.sets
          .filter((s) => s.warmup === ownerSet.warmup)
          .findIndex((s) => s.id === ownerSet.id) + 1
      : 0;
  const remaining = session.restEndsAt
    ? Math.max(0, Math.ceil((session.restEndsAt - alerts.now) / 1000))
    : 0;
  const token = session.restTimer?.id;
  return (
    <>
      <div className="rest-setting">
        <span>
          <Timer size={16} />
          组间休息{" "}
          <b>
            {exercise.target.rest ? `${exercise.target.rest} 秒` : "不计时"}
          </b>
        </span>
        <button
          className="text-button"
          onClick={() => {
            setSeconds(String(exercise.target.rest));
            setEditing(true);
          }}
        >
          修改
        </button>
      </div>
      <div
        className={`rest-console ${session.restEndsAt && !remaining ? "finished" : ""}`}
        data-state={
          remaining ? "running" : session.restEndsAt ? "finished" : "idle"
        }
      >
        <p className="rest-owner">
          {owner
            ? `${owner.exercise.name} · ${session.restTimer?.kind === "exercise" ? "动作间休息" : `${ownerSet?.warmup ? "热身" : "正式"}第 ${number} 组后休息`}`
            : session.restEndsAt
              ? "此前保存的休息计时（未记录所属动作）"
              : `${exercise.exercise.name} · 组间休息`}
        </p>
        <div className="timer-dial">
          <svg viewBox="0 0 240 240" aria-hidden="true">
            <circle className="dial-track" cx="120" cy="120" r="110" />
            <circle
              className="dial-progress"
              cx="120"
              cy="120"
              r="110"
              pathLength="100"
              strokeDasharray="100"
              strokeDashoffset={
                session.restEndsAt
                  ? 100 *
                    (1 -
                      Math.min(
                        1,
                        Math.max(0, session.restEndsAt - alerts.now) /
                          Math.max(
                            1,
                            session.restTimer?.durationMs ||
                              (owner?.target.rest ?? exercise.target.rest) *
                                1000,
                          ),
                      ))
                  : 0
              }
            />
          </svg>
          <button
            className={`dial-button ${remaining ? "stop" : session.restEndsAt ? "expired" : "start"}`}
            aria-label={remaining ? "结束休息" : actionLabel}
            disabled={saving || (!remaining && actionDisabled)}
            onClick={(event) => {
              if (event.detail > 1) return;
              if (remaining)
                void update((s) => {
                  if (s.restTimer?.id === token) endRest(s);
                });
              else onComplete();
            }}
          >
            {remaining ? (
              <Square size={20} fill="currentColor" aria-hidden="true" />
            ) : actionComplete ? (
              <Check size={22} aria-hidden="true" />
            ) : (
              <Play size={22} fill="currentColor" aria-hidden="true" />
            )}
            <strong
              role="timer"
              aria-label={
                remaining
                  ? "休息倒计时"
                  : session.restEndsAt
                    ? "休息结束"
                    : "预设休息时间"
              }
            >
              {clockText(session.restEndsAt ? remaining : exercise.target.rest)}
            </strong>
            <span>
              {remaining ? "结束休息" : actionComplete ? "动作完成" : "开始"}
            </span>
          </button>
        </div>
        <p className="dial-caption">
          {remaining
            ? "休息中 · 点击中心提前结束"
            : session.restEndsAt
              ? "休息结束 · 完成下一组后再点击开始"
              : actionComplete
                ? "可以切换到下一个动作"
                : actionLabel}
        </p>
        {session.restEndsAt && (
          <div className="rest-controls">
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => {
                if (session.soundEnabled) void alerts.enableSound();
                void update((s) => extendRest(s, token));
              }}
            >
              ＋30 秒
            </Button>
          </div>
        )}
      </div>
      <details className="rest-options">
        <summary>
          {session.soundEnabled
            ? alerts.soundReady
              ? "声音已启用"
              : "点击启用声音提醒"
            : "声音已关闭"}{" "}
          · 提醒设置
        </summary>
        <div className="rest-preferences">
          <Button
            variant="secondary"
            onClick={() => {
              void alerts.enableSound(true);
              void update((s) => {
                s.soundEnabled = true;
              });
            }}
          >
            <Volume2 size={18} />
            启用并试听
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (!session.soundEnabled) void alerts.enableSound();
              void update((s) => {
                s.soundEnabled = !session.soundEnabled;
              });
            }}
          >
            {session.soundEnabled ? "关闭声音" : "开启声音"}
          </Button>
          <label className="wake-toggle">
            <input
              type="checkbox"
              checked={alerts.wakeWanted}
              onChange={(e) => alerts.setWakeWanted(e.target.checked)}
            />
            训练时保持屏幕常亮
          </label>
          <small>{alerts.wakeStatus}</small>
          <p className="helper">
            请先试听并检查手机音量。网页切到后台或锁屏后，无法保证准时响铃；返回后会恢复真实剩余时间。
          </p>
        </div>
      </details>
      {editing && (
        <Modal
          title="本动作的休息时间"
          description="只影响本次训练的后续休息，当前倒计时和训练模板不变。"
          onClose={() => setEditing(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const value = Number(seconds);
              if (!Number.isInteger(value) || value < 0 || value > 1800) return;
              if (
                await update((s) => {
                  const current = s.exercises.find((x) => x.id === exerciseId);
                  if (current) current.target.rest = value;
                })
              )
                setEditing(false);
            }}
          >
            <div className="rest-presets">
              {[60, 90, 120, 180].map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="secondary"
                  aria-pressed={Number(seconds) === value}
                  onClick={() => setSeconds(String(value))}
                >
                  {value} 秒
                </Button>
              ))}
            </div>
            <Field
              label="自定义休息秒数"
              hint="0 表示不自动计时，最多 1800 秒。"
            >
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={1800}
                step={1}
                required
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
              />
            </Field>
            <Button type="submit" className="full" disabled={saving}>
              保存休息时间
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function RestShortcut() {
  const { state } = useStore();
  const { now } = useRestAlerts();
  const route = useRoute();
  const session = state.sessions.find((s) => s.status === "active");
  if (!session?.restEndsAt || route === "training/session") return null;
  const remaining = Math.max(0, Math.ceil((session.restEndsAt - now) / 1000));
  const name =
    session.exercises.find((e) => e.id === session.restTimer?.exerciseId)
      ?.exercise.name ?? "训练";
  return (
    <a href="#training/session" className="rest-shortcut">
      <Timer size={18} />
      <span>
        {name} · {remaining ? `休息 ${clockText(remaining)}` : "休息结束"}
      </span>
      <ChevronRight size={18} />
    </a>
  );
}
