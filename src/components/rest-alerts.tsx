"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useStore } from "@/lib/store";
import { claimRestAlert } from "@/lib/workout";

type Alerts = {
  now: number;
  soundReady: boolean;
  enableSound: (preview?: boolean) => Promise<void>;
  wakeWanted: boolean;
  wakeStatus: string;
  setWakeWanted: (value: boolean) => void;
};
const Context = createContext<Alerts | null>(null);
export function RestAlertsProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const latest = useRef(store);
  latest.current = store;
  const audio = useRef<AudioContext | null>(null);
  const checking = useRef(false);
  const [now, setNow] = useState(Date.now());
  const [soundReady, setSoundReady] = useState(false);
  const [wakeWanted, setWakeWanted] = useState(false);
  const [wakeStatus, setWakeStatus] = useState("未开启");
  const activeId = store.state.sessions.find((s) => s.status === "active")?.id;
  function ring() {
    const context = audio.current;
    if (!context || context.state !== "running") return false;
    for (let i = 0; i < 3; i++) {
      const start = context.currentTime + i * 0.32;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = i === 1 ? 880 : 660;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.23);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.25);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    }
    return true;
  }
  async function enableSound(preview = false) {
    try {
      if (!audio.current) {
        audio.current = new AudioContext();
        audio.current.onstatechange = () =>
          setSoundReady(audio.current?.state === "running");
      }
      await audio.current.resume();
      setSoundReady(audio.current.state === "running");
      if (preview && !ring())
        latest.current.notify("声音尚未启用，请再次点击试听，并检查音量。");
    } catch {
      setSoundReady(false);
      latest.current.notify("浏览器未能启用声音，仍会显示休息结束提示。");
    }
  }
  useEffect(() => {
    async function tick() {
      const time = Date.now();
      setNow((previous) =>
        Math.floor(previous / 1000) === Math.floor(time / 1000)
          ? previous
          : time,
      );
      if (document.visibilityState !== "visible" || checking.current) return;
      const session = latest.current.state.sessions.find(
        (s) => s.status === "active",
      );
      const rest = session?.restTimer;
      const deadline = session?.restEndsAt;
      if (!session || !rest || !deadline || deadline > time || rest.notifiedAt)
        return;
      checking.current = true;
      let claimed = false;
      try {
        const ok = await latest.current.mutate((s) => {
          const current = s.sessions.find((x) => x.id === session.id);
          if (current)
            claimed = claimRestAlert(current, rest.id, deadline, Date.now());
        });
        if (ok && claimed) {
          // A late return receives a visual notice; it must not play a stale alarm minutes later.
          const sounded =
            session.soundEnabled &&
            Date.now() - deadline <= 10000 &&
            document.visibilityState === "visible" &&
            ring();
          const name =
            session.exercises.find((e) => e.id === rest.exerciseId)?.exercise
              .name ?? "训练";
          latest.current.notify(
            `${name}：休息结束${sounded ? "" : "，请准备下一组"}`,
          );
        }
      } finally {
        checking.current = false;
      }
    }
    const interval = setInterval(() => {
      void tick();
    }, 250);
    const refresh = () => {
      void tick();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    void tick();
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("focus", refresh);
      if (audio.current) {
        audio.current.onstatechange = null;
        void audio.current.close();
        audio.current = null;
      }
    };
  }, []);
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    let acquiring = false;
    async function acquire() {
      if (!wakeWanted || !activeId) {
        setWakeStatus("未开启");
        return;
      }
      if (!("wakeLock" in navigator)) {
        setWakeStatus("此浏览器不支持");
        return;
      }
      if (document.visibilityState !== "visible" || sentinel || acquiring)
        return;
      acquiring = true;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          await lock.release();
          return;
        }
        sentinel = lock;
        setWakeStatus("常亮已开启");
        lock.addEventListener("release", () => {
          sentinel = null;
          if (!cancelled) setWakeStatus("常亮已暂停");
        });
      } catch {
        if (!cancelled) setWakeStatus("无法保持常亮，请检查省电设置");
      } finally {
        acquiring = false;
      }
    }
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      void sentinel?.release();
    };
  }, [wakeWanted, activeId]);
  return (
    <Context.Provider
      value={{
        now,
        soundReady,
        enableSound,
        wakeWanted,
        wakeStatus,
        setWakeWanted,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useRestAlerts() {
  const context = useContext(Context);
  if (!context) throw new Error("Rest alerts provider missing");
  return context;
}
