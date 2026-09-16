import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import {
  initialState,
  parseBackup,
  serializeBackup,
  startSession,
  type Template,
} from "../src/lib/model";
import {
  beginRest,
  claimRestAlert,
  completeSet,
  endRest,
  extendRest,
  formalProgress,
  undoSet,
} from "../src/lib/workout";
import { readState, writeState } from "../src/lib/storage";
const template: Template = {
  id: "back",
  name: "Back day",
  archived: false,
  exercises: [
    {
      id: "target",
      exercise: {
        id: "pulldown",
        name: "Pulldown",
        mode: "weighted",
        category: "pull",
        archived: false,
      },
      sets: 4,
      reps: 10,
      weight: 40,
      seconds: 60,
      rest: 90,
      note: "",
    },
  ],
};
function fixture() {
  const s = startSession(template, "2026-09-16");
  s.templateId = null;
  return s;
}
describe("workout completion and owned rest timers", () => {
  it("starts at 0/4 and completes a captured set only once", () => {
    const s = fixture(),
      e = s.exercises[0],
      now = Date.now();
    expect(formalProgress(e)).toEqual({ done: 0, total: 4 });
    expect(completeSet(s, e.id, e.sets[0].id, now)).toBe(true);
    const deadline = s.restEndsAt;
    expect(completeSet(s, e.id, e.sets[0].id, now + 1)).toBe(false);
    expect(completeSet(s, e.id, e.sets[1].id, now + 1)).toBe(false);
    expect(formalProgress(e)).toEqual({ done: 1, total: 4 });
    expect(s.restEndsAt).toBe(deadline);
    expect(s.restTimer).toMatchObject({
      exerciseId: e.id,
      setId: e.sets[0].id,
      kind: "set",
    });
  });
  it("extends and ends rest without changing completion", () => {
    const s = fixture(),
      e = s.exercises[0],
      now = Date.now();
    completeSet(s, e.id, e.sets[0].id, now);
    extendRest(s, "stale", now);
    expect(s.restEndsAt).toBe(now + 90000);
    extendRest(s, s.restTimer!.id, now);
    expect(s.restEndsAt).toBe(now + 120000);
    extendRest(s, s.restTimer!.id, now + 150000);
    expect(s.restEndsAt).toBe(now + 180000);
    endRest(s);
    expect(s.restTimer).toBeNull();
    expect(s.restEndsAt).toBeNull();
    expect(formalProgress(e).done).toBe(1);
  });
  it("undo cancels only its own rest and remains idempotent", () => {
    const s = fixture(),
      e = s.exercises[0],
      now = Date.now();
    completeSet(s, e.id, e.sets[0].id, now);
    endRest(s);
    completeSet(s, e.id, e.sets[1].id, now + 1000);
    const rest = structuredClone(s.restTimer);
    undoSet(s, e.id, e.sets[0].id);
    expect(s.restTimer).toEqual(rest);
    undoSet(s, e.id, e.sets[1].id);
    expect(s.restEndsAt).toBeNull();
    expect(undoSet(s, e.id, e.sets[1].id)).toBe(false);
    expect(formalProgress(e).done).toBe(0);
  });
  it("keeps warmups separate and the final formal set does not start rest", () => {
    const s = fixture(),
      e = s.exercises[0],
      now = Date.now();
    e.sets.unshift({ ...e.sets[0], id: "warmup", warmup: true });
    completeSet(s, e.id, "warmup", now);
    expect(formalProgress(e)).toEqual({ done: 0, total: 4 });
    for (const row of e.sets.filter((r) => !r.warmup)) {
      endRest(s);
      completeSet(s, e.id, row.id, now + 1000);
    }
    expect(formalProgress(e)).toEqual({ done: 4, total: 4 });
    expect(s.restEndsAt).toBeNull();
    // Optional exercise rest is owned by the last completed set and is undoable.
    beginRest(s, e.id, e.sets.at(-1)!.id, "exercise", 90, now + 2000);
    expect(s.restTimer?.kind).toBe("exercise");
    undoSet(s, e.id, e.sets.at(-1)!.id);
    expect(s.restEndsAt).toBeNull();
  });
  it("the final formal set skips rest even with an unfinished warmup", () => {
    const s = fixture(),
      e = s.exercises[0],
      now = Date.now();
    e.sets.push({ ...e.sets[0], id: "unfinished-warmup", warmup: true });
    for (const row of e.sets.filter((r) => !r.warmup)) {
      endRest(s);
      completeSet(s, e.id, row.id, now);
    }
    expect(s.restEndsAt).toBeNull();
    expect(formalProgress(e).done).toBe(4);
  });
  it("claims an expired alarm once without counting another set", () => {
    const s = fixture(),
      e = s.exercises[0],
      now = Date.now();
    completeSet(s, e.id, e.sets[0].id, now);
    const token = s.restTimer!.id,
      deadline = s.restEndsAt!;
    expect(claimRestAlert(s, token, deadline, deadline - 1)).toBe(false);
    expect(claimRestAlert(s, token, deadline, deadline + 1)).toBe(true);
    expect(claimRestAlert(s, token, deadline, deadline + 2)).toBe(false);
    expect(formalProgress(e).done).toBe(1);
    extendRest(s, token, deadline + 1000);
    expect(claimRestAlert(s, token, deadline, deadline + 2000)).toBe(false);
    expect(s.restTimer!.notifiedAt).toBeNull();
  });
  it("restores old backups without inventing timer ownership", () => {
    const s = initialState(),
      session = fixture();
    session.restEndsAt = Date.now() + 90000;
    s.sessions.push(session);
    const backup = JSON.parse(serializeBackup(s));
    for (const key of [
      "restTimer",
      "lastCompleted",
      "currentExerciseId",
      "soundEnabled",
    ])
      delete backup.data.sessions[0][key];
    const result = parseBackup(JSON.stringify(backup)).sessions[0];
    expect(result.restEndsAt).toBe(session.restEndsAt);
    expect(result.restTimer).toBeNull();
    expect(result.soundEnabled).toBe(true);
  });
  it("rejects malformed timer ownership on import", () => {
    const s = initialState(),
      session = fixture();
    s.sessions.push(session);
    beginRest(session, "missing", null, "exercise", 90, Date.now());
    expect(() => parseBackup(serializeBackup(s))).toThrow();
  });
  it("serializes duplicate completions and rolls back a failed write", async () => {
    const session = fixture(),
      e = session.exercises[0],
      now = Date.now();
    await writeState((s) => {
      Object.assign(s, initialState());
      s.sessions.push(session);
    });
    await Promise.all(
      [0, 1].map(() =>
        writeState((s) => {
          completeSet(s.sessions[0], e.id, e.sets[0].id, now);
        }),
      ),
    );
    const saved = await readState();
    expect(formalProgress(saved.sessions[0].exercises[0]).done).toBe(1);
    expect(saved.sessions[0].restEndsAt).toBe(now + 90000);
    await expect(
      writeState((s) => {
        endRest(s.sessions[0]);
        completeSet(s.sessions[0], e.id, e.sets[1].id, now);
        s.sessions[0].exercises[0].sets[1].weight = -1;
      }),
    ).rejects.toThrow();
    expect(await readState()).toEqual(saved);
  });
});
