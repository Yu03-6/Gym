"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, initialState } from "./model";
import { readState, writeState } from "./storage";
type Store = {
  state: AppState;
  ready: boolean;
  error: string;
  mutate: (fn: (s: AppState) => void) => Promise<boolean>;
  snapshot: () => Promise<AppState>;
  saving: boolean;
  notify: (message: string) => void;
  message: string;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const channel = useRef<BroadcastChannel | null>(null);
  const queue = useRef(Promise.resolve());
  const pendingWrites = useRef(0);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (pendingWrites.current > 0) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  useEffect(() => {
    let active = true;
    readState()
      .then((s) => {
        if (active) {
          setState(s);
          setReady(true);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "无法读取本地记录。请允许浏览器使用网站存储后重新打开；不要清除已有网站数据。",
          );
      });
    if ("BroadcastChannel" in window) {
      channel.current = new BroadcastChannel("gym-journal");
      channel.current.onmessage = () => {
        readState()
          .then((s) => {
            if (active)
              setState((previous) =>
                s.revision >= previous.revision ? s : previous,
              );
          })
          .catch(() =>
            setError("无法同步当前设备其他标签页的修改，请刷新重试。"),
          );
      };
    }
    return () => {
      active = false;
      channel.current?.close();
    };
  }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4200);
    return () => clearTimeout(timer);
  }, [message]);
  async function mutate(fn: (s: AppState) => void) {
    let success = false;
    pendingWrites.current++;
    setSaving(true);
    const task = queue.current.then(async () => {
      setSaving(true);
      try {
        const s = await writeState(fn);
        setState((previous) =>
          s.revision >= previous.revision ? s : previous,
        );
        setError("");
        success = true;
        channel.current?.postMessage("updated");
      } catch (err) {
        setError(
          err instanceof Error && err.message.startsWith("记录已")
            ? err.message
            : "保存失败，修改尚未保存。请检查输入与可用空间后重试，并备份现有记录。",
        );
      } finally {
        pendingWrites.current--;
        if (pendingWrites.current === 0) setSaving(false);
      }
    });
    queue.current = task.catch(() => {});
    await task;
    return success;
  }
  async function snapshot() {
    const task = queue.current.then(() => readState());
    queue.current = task.then(
      () => {},
      () => {},
    );
    return task;
  }
  return (
    <Context.Provider
      value={{
        state,
        ready,
        error,
        mutate,
        snapshot,
        saving,
        message,
        notify: setMessage,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const context = useContext(Context);
  if (!context) throw new Error("Store missing");
  return context;
}
