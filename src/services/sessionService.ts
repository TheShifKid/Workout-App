import { db } from '../db/db';
import { newId } from '../db/ids';
import type { ID, Session, SessionExercise, SetLog } from '../db/types';
import { toLocalDateKey } from '../lib/format';
import { DEFAULT_REST_SECONDS, DEFAULT_REPS_MAX, DEFAULT_REPS_MIN } from '../lib/constants';
import { exercisesRepo } from '../repositories/exercises.repo';
import { sessionExercisesRepo } from '../repositories/sessionExercises.repo';
import { sessionsRepo } from '../repositories/sessions.repo';
import { setLogsRepo } from '../repositories/setLogs.repo';
import { workoutExercisesRepo } from '../repositories/workoutExercises.repo';
import { workoutsRepo } from '../repositories/workouts.repo';

/**
 * ניהול מחזור החיים של אימון.
 *
 * עיקרון: ברגע "התחל אימון" נלקח צילום מצב של התוכנית לתוך sessionExercises,
 * ומאותה נקודה האימון מנותק מהתוכנית לחלוטין — עריכת התוכנית לא תשנה אותו,
 * והוא לא ישנה את התוכנית.
 */

/** פותח אימון חדש מתוך סוג אימון, כולל שורות סט ריקות לפי היעדים. */
export async function startSession(workoutId: ID): Promise<ID> {
  const workout = await workoutsRepo.get(workoutId);
  if (!workout) throw new Error('סוג האימון לא נמצא');

  const planRows = await workoutExercisesRepo.byWorkout(workoutId);
  const exercises = await exercisesRepo.getMany(planRows.map((r) => r.exerciseId));
  const nameById = new Map(exercises.filter(Boolean).map((e) => [e!.id, e!.name]));

  const now = Date.now();
  const sessionId = newId();

  const session: Session = {
    id: sessionId,
    workoutId,
    workoutName: workout.name,
    date: toLocalDateKey(now),
    startedAt: now,
    endedAt: null,
    sessionNote: '',
  };

  const snapshots: SessionExercise[] = planRows.map((row, i) => ({
    id: newId(),
    sessionId,
    exerciseId: row.exerciseId,
    order: i,
    targetSets: row.targetSets,
    targetRepsMin: row.targetRepsMin,
    targetRepsMax: row.targetRepsMax,
    restSeconds: row.restSeconds,
    note: row.note,
    exerciseName: nameById.get(row.exerciseId) ?? 'תרגיל',
  }));

  const sets: SetLog[] = snapshots.flatMap((snapshot) =>
    Array.from({ length: Math.max(1, snapshot.targetSets) }, (_, i) =>
      emptySet(sessionId, snapshot.exerciseId, i + 1),
    ),
  );

  await db.transaction('rw', db.sessions, db.sessionExercises, db.setLogs, async () => {
    await db.sessions.add(session);
    if (snapshots.length) await db.sessionExercises.bulkAdd(snapshots);
    if (sets.length) await db.setLogs.bulkAdd(sets);
  });

  return sessionId;
}

/** מוסיף תרגיל שלא היה בתוכנית, תוך כדי אימון. */
export async function addExerciseToSession(
  sessionId: ID,
  exerciseId: ID,
  targetSets = 3,
): Promise<void> {
  const [exercise, existing] = await Promise.all([
    exercisesRepo.get(exerciseId),
    sessionExercisesRepo.bySession(sessionId),
  ]);
  if (!exercise) throw new Error('התרגיל לא נמצא');
  if (existing.some((e) => e.exerciseId === exerciseId)) return;

  const snapshot: SessionExercise = {
    id: newId(),
    sessionId,
    exerciseId,
    order: existing.length,
    targetSets,
    targetRepsMin: DEFAULT_REPS_MIN,
    targetRepsMax: DEFAULT_REPS_MAX,
    restSeconds: DEFAULT_REST_SECONDS,
    note: '',
    exerciseName: exercise.name,
  };

  const sets = Array.from({ length: targetSets }, (_, i) =>
    emptySet(sessionId, exerciseId, i + 1),
  );

  await db.transaction('rw', db.sessionExercises, db.setLogs, async () => {
    await db.sessionExercises.add(snapshot);
    await db.setLogs.bulkAdd(sets);
  });
}

/** מסיר תרגיל מהאימון הנוכחי, על כל הסטים שנרשמו בו. */
export async function removeExerciseFromSession(
  sessionId: ID,
  exerciseId: ID,
): Promise<void> {
  await db.transaction('rw', db.sessionExercises, db.setLogs, async () => {
    const rows = await db.sessionExercises.where('sessionId').equals(sessionId).toArray();
    const target = rows.find((r) => r.exerciseId === exerciseId);
    if (target) await db.sessionExercises.delete(target.id);

    await db.setLogs
      .where('[sessionId+exerciseId]')
      .equals([sessionId, exerciseId])
      .delete();
  });
}

export async function addSet(sessionId: ID, exerciseId: ID): Promise<ID> {
  const existing = await setLogsRepo.bySessionAndExercise(sessionId, exerciseId);
  const nextNumber = existing.reduce((max, s) => Math.max(max, s.setNumber), 0) + 1;
  const row = emptySet(sessionId, exerciseId, nextNumber);
  await setLogsRepo.add(row);
  return row.id;
}

/**
 * מסיר סט ומספר מחדש את הנותרים.
 * תמיד נשארת לפחות שורה אחת לתרגיל — כדי שהתרגיל לא ייעלם מהמסך.
 */
export async function removeSet(setLogId: ID): Promise<void> {
  const target = await setLogsRepo.get(setLogId);
  if (!target) return;

  await db.transaction('rw', db.setLogs, async () => {
    const siblings = await db.setLogs
      .where('[sessionId+exerciseId]')
      .equals([target.sessionId, target.exerciseId])
      .toArray();
    if (siblings.length <= 1) return;

    await db.setLogs.delete(setLogId);

    const remaining = siblings
      .filter((s) => s.id !== setLogId)
      .sort((a, b) => a.setNumber - b.setNumber);
    await Promise.all(
      remaining.map((s, i) =>
        s.setNumber === i + 1 ? undefined : db.setLogs.update(s.id, { setNumber: i + 1 }),
      ),
    );
  });
}

export function updateSet(
  setLogId: ID,
  changes: Partial<Pick<SetLog, 'weight' | 'reps' | 'isWarmup'>>,
): Promise<number> {
  return setLogsRepo.update(setLogId, changes);
}

/**
 * מסמן/מבטל סימון של סט.
 * בסימון, ערכים שמולאו מראש ולא נגעו בהם (null) מתקבעים לערך שהוצג —
 * כך מה שרואים על המסך הוא בדיוק מה שנשמר.
 */
export async function setDone(
  setLogId: ID,
  done: boolean,
  fallback?: { weight: number | null; reps: number | null },
): Promise<void> {
  const current = await setLogsRepo.get(setLogId);
  if (!current) return;

  if (!done) {
    await setLogsRepo.update(setLogId, { isDone: 0, completedAt: null });
    return;
  }

  await setLogsRepo.update(setLogId, {
    isDone: 1,
    completedAt: Date.now(),
    weight: current.weight ?? fallback?.weight ?? null,
    reps: current.reps ?? fallback?.reps ?? null,
  });
}

export function setSessionNote(sessionId: ID, sessionNote: string): Promise<number> {
  return sessionsRepo.update(sessionId, { sessionNote });
}

/** הערה ספציפית לתרגיל בתוך האימון הזה (לא ההערה הקבועה של התרגיל). */
export function setSessionExerciseNote(sessionExerciseId: ID, note: string): Promise<number> {
  return sessionExercisesRepo.update(sessionExerciseId, { note });
}

/**
 * סוגר את האימון ומנקה מה שלא בוצע: שורות סט שנשארו ריקות ולא סומנו,
 * ואחריהן תרגילים שלא נשאר בהם ולו סט אחד — כדי שההיסטוריה תראה
 * את מה שבאמת עשית ולא את מה שתוכנן.
 */
export async function finishSession(sessionId: ID): Promise<void> {
  await db.transaction('rw', db.sessions, db.sessionExercises, db.setLogs, async () => {
    const logs = await db.setLogs.where('sessionId').equals(sessionId).toArray();
    const empty = logs.filter((l) => l.isDone === 0 && l.weight === null && l.reps === null);
    if (empty.length) await db.setLogs.bulkDelete(empty.map((l) => l.id));

    const remaining = new Set(
      logs.filter((l) => !empty.some((e) => e.id === l.id)).map((l) => l.exerciseId),
    );
    const snapshots = await db.sessionExercises.where('sessionId').equals(sessionId).toArray();
    const untouched = snapshots.filter((s) => !remaining.has(s.exerciseId));
    if (untouched.length) await db.sessionExercises.bulkDelete(untouched.map((s) => s.id));

    await db.sessions.update(sessionId, { endedAt: Date.now() });
  });
}

/** מבטל סגירה — לחזור לאימון שנסגר בטעות. */
export function reopenSession(sessionId: ID): Promise<number> {
  return sessionsRepo.update(sessionId, { endedAt: null });
}

/** מוחק אימון פעיל בלי לשמור כלום (למשל אם נפתח בטעות). */
export function discardSession(sessionId: ID): Promise<void> {
  return sessionsRepo.remove(sessionId);
}

/** מחיקת אימון מההיסטוריה, על כל הסטים שלו. */
export function deleteSession(sessionId: ID): Promise<void> {
  return sessionsRepo.remove(sessionId);
}

/** האם נרשם באימון משהו בכלל — מבדיל בין "נפתח בטעות" ל"אימון אמיתי". */
export async function sessionHasData(sessionId: ID): Promise<boolean> {
  const logs = await setLogsRepo.bySession(sessionId);
  return logs.some((l) => l.isDone === 1 || l.weight !== null || l.reps !== null);
}

function emptySet(sessionId: ID, exerciseId: ID, setNumber: number): SetLog {
  return {
    id: newId(),
    sessionId,
    exerciseId,
    setNumber,
    weight: null,
    reps: null,
    isWarmup: 0,
    isDone: 0,
    completedAt: null,
  };
}
