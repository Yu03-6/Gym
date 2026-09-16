"use client";
import { useSyncExternalStore } from "react";

const subscribe = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
};
export function useRoute() {
  return useSyncExternalStore(
    subscribe,
    () => location.hash.slice(1) || "today",
    () => "today",
  );
}
export function goTo(route: string) {
  location.hash = route;
}
export function useSection<T extends string>(
  root: string,
  fallback: T,
  allowed: readonly T[],
) {
  const route = useRoute();
  const segment = route.split("/")[1] as T;
  const section = allowed.includes(segment) ? segment : fallback;
  return [
    section,
    (next: T) => goTo(next === fallback ? root : `${root}/${next}`),
  ] as const;
}
