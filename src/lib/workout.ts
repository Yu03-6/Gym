import { uid, validSet, type Session } from "./model";
export function formalProgress(exercise: Session["exercises"][number]) {
  const formal = exercise.sets.filter((row) => !row.warmup);
  return {
    done: formal.filter((row) => row.done).length,
    total: formal.length,
  };
}
export function endRest(session: Session) {
  session.restEndsAt = null;
  session.restTimer = null;
}
export function beginRest(
  session: Session,
  exerciseId: string,
  setId: string | null,
  kind: "set" | "exercise",
  seconds: number,
  now: number,
) {
  if (seconds <= 0) {
    endRest(session);
    return;
  }
  session.restEndsAt = now + seconds * 1000;
  session.restTimer = { id: uid(), exerciseId, setId, kind, notifiedAt: null };
}
export function completeSet(
  session: Session,
  exerciseId: string,
  setId: string,
  now = Date.now(),
) {
  if (session.status !== "active" || (session.restEndsAt ?? 0) > now)
    return false;
  const exercise = session.exercises.find((e) => e.id === exerciseId);
  const row = exercise?.sets.find((set) => set.id === setId);
  if (!exercise || !row || row.done || !validSet(row, exercise.exercise.mode))
    return false;
  row.done = true;
  session.lastCompleted = { exerciseId, setId };
  session.currentExerciseId = exerciseId;
  endRest(session);
  const progress = formalProgress(exercise);
  // A warmup can rest before working sets. Finishing the last formal set never starts rest.
  if (
    progress.done < progress.total ||
    (row.warmup && exercise.sets.some((set) => !set.done))
  )
    beginRest(session, exerciseId, setId, "set", exercise.target.rest, now);
  return true;
}
export function undoSet(session: Session, exerciseId: string, setId: string) {
  if (session.status !== "active") return false;
  const row = session.exercises
    .find((e) => e.id === exerciseId)
    ?.sets.find((set) => set.id === setId);
  if (!row?.done) return false;
  row.done = false;
  if (
    session.restTimer?.exerciseId === exerciseId &&
    session.restTimer.setId === setId
  )
    endRest(session);
  if (
    session.lastCompleted?.exerciseId === exerciseId &&
    session.lastCompleted.setId === setId
  )
    session.lastCompleted = null;
  return true;
}
export function extendRest(
  session: Session,
  token: string | undefined,
  now = Date.now(),
) {
  if (
    session.status !== "active" ||
    !session.restEndsAt ||
    session.restTimer?.id !== token
  )
    return;
  session.restEndsAt = Math.max(now, session.restEndsAt) + 30000;
  if (session.restTimer) session.restTimer.notifiedAt = null;
}
export function claimRestAlert(
  session: Session,
  token: string,
  deadline: number,
  now: number,
) {
  if (
    session.status !== "active" ||
    session.restEndsAt !== deadline ||
    deadline > now ||
    session.restTimer?.id !== token ||
    session.restTimer.notifiedAt
  )
    return false;
  session.restTimer.notifiedAt = now;
  return true;
}
