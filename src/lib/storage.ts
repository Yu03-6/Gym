import { openDB } from "idb";
import { AppState, initialState, stateSchema } from "./model";
let dbPromise: ReturnType<typeof openDB> | null = null;
function db() {
  return (dbPromise ??= openDB("gym-journal", 1, {
    upgrade(db) {
      db.createObjectStore("journal");
    },
  }));
}
export async function readState(): Promise<AppState> {
  const value = await (await db()).get("journal", "state");
  return value ? stateSchema.parse(value) : initialState();
}
export async function writeState(
  update: (state: AppState) => void,
): Promise<AppState> {
  const database = await db();
  const tx = database.transaction("journal", "readwrite");
  try {
    const current = await tx.store.get("state");
    const s = structuredClone(
      current ? stateSchema.parse(current) : initialState(),
    );
    update(s);
    s.revision++;
    s.updatedAt = Date.now();
    const checked = stateSchema.parse(s);
    await tx.store.put(checked, "state");
    await tx.done;
    return checked;
  } catch (error) {
    try {
      tx.abort();
    } catch {}
    await tx.done.catch(() => {});
    throw error;
  }
}
