import { db } from '../db/db';
import type { Equipment, Exercise, Flag, ID, MuscleGroup, TrackingType } from '../db/types';
import { exercisesRepo } from '../repositories/exercises.repo';

/**
 * ניהול מאגר התרגילים עצמו — נפרד מ-planService שעוסק בתוכניות האימון.
 *
 * כלל הברזל: תרגיל שכבר בוצע או שנמצא בתוכנית לא נמחק לצמיתות אלא
 * מאורכב, אחרת ההיסטוריה הייתה מפנה לתרגיל שלא קיים.
 */

/** תרגילים זרועים מקבלים מזהה קבוע בתחילית seed-; כל השאר נוצרו ידנית. */
export const isCustomExercise = (exercise: Exercise) => !exercise.id.startsWith('seed-');

export function createExercise(
  name: string,
  muscleGroup: MuscleGroup,
  equipment: Equipment,
  trackingType: TrackingType = 'weight',
  isUnilateral: Flag = 0,
): Promise<ID> {
  return exercisesRepo.create({
    name: name.trim(),
    muscleGroup,
    equipment,
    defaultNote: '',
    trackingType,
    isUnilateral,
  });
}

export function updateExercise(
  id: ID,
  changes: {
    name?: string;
    muscleGroup?: MuscleGroup;
    equipment?: Equipment;
    trackingType?: TrackingType;
    isUnilateral?: Flag;
  },
): Promise<number> {
  const trimmed = changes.name?.trim();
  return exercisesRepo.update(id, {
    ...changes,
    ...(trimmed ? { name: trimmed } : {}),
  });
}

/** ההערה הקבועה של התרגיל — מוצגת בכל אימון שבו הוא מופיע. */
export function setExerciseDefaultNote(id: ID, defaultNote: string): Promise<number> {
  return exercisesRepo.update(id, { defaultNote });
}

/**
 * מסמן תרגיל כחד-צדדי (או מבטל).
 *
 * sessionId אופציונלי: כשמשנים תוך כדי אימון, מעדכנים גם את צילום המצב
 * של האימון הפעיל. זה חריג מכוון לכלל שההיסטוריה קפואה — כאן המשתמש
 * מתקן במפורש איך התרגיל נמדד, ומצפה שזה יחול על מה שהוא עושה עכשיו.
 */
export async function setUnilateral(
  exerciseId: ID,
  isUnilateral: Flag,
  sessionId?: ID,
): Promise<void> {
  await exercisesRepo.update(exerciseId, { isUnilateral });
  if (!sessionId) return;

  const snapshots = await db.sessionExercises.where('sessionId').equals(sessionId).toArray();
  const target = snapshots.find((s) => s.exerciseId === exerciseId);
  if (target) await db.sessionExercises.update(target.id, { isUnilateral });
}

export const archiveExercise = (id: ID) => exercisesRepo.archive(id);
export const unarchiveExercise = (id: ID) => exercisesRepo.unarchive(id);

/**
 * מחיקה לצמיתות מותרת רק כשאין לתרגיל שום עקבות — לא בהיסטוריה ולא
 * בתוכנית. מחזיר false אם המחיקה נחסמה, כדי שה-UI יציע ארכוב במקום.
 */
export async function deleteExerciseIfUnused(id: ID): Promise<boolean> {
  const [logCount, planCount] = await Promise.all([
    db.setLogs.where('exerciseId').equals(id).count(),
    db.workoutExercises.where('exerciseId').equals(id).count(),
  ]);
  if (logCount > 0 || planCount > 0) return false;
  await db.exercises.delete(id);
  return true;
}
