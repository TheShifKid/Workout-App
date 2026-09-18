import type { ID } from '../db/types';
import {
  DEFAULT_REPS_MAX,
  DEFAULT_REPS_MIN,
  DEFAULT_REST_SECONDS,
  DEFAULT_TARGET_SETS,
  DEFAULT_TIME_MAX,
  DEFAULT_TIME_MIN,
  WORKOUT_COLORS,
} from '../lib/constants';
import { exercisesRepo } from '../repositories/exercises.repo';
import { workoutExercisesRepo } from '../repositories/workoutExercises.repo';
import { workoutsRepo } from '../repositories/workouts.repo';

/** עריכת התוכנית. אף פעולה כאן לא נוגעת באימונים שכבר בוצעו. */

export async function createWorkout(name: string): Promise<ID> {
  const count = await workoutsRepo.all().then((w) => w.length);
  return workoutsRepo.create({
    name: name.trim() || 'אימון חדש',
    color: WORKOUT_COLORS[count % WORKOUT_COLORS.length],
  });
}

export function renameWorkout(id: ID, name: string): Promise<number> {
  return workoutsRepo.update(id, { name: name.trim() || 'אימון' });
}

export function recolorWorkout(id: ID, color: string): Promise<number> {
  return workoutsRepo.update(id, { color });
}

export function deleteWorkout(id: ID): Promise<void> {
  return workoutsRepo.remove(id);
}

export async function addExerciseToPlan(workoutId: ID, exerciseId: ID): Promise<ID> {
  const exercise = await exercisesRepo.get(exerciseId);
  const target = defaultTargetRange(exercise?.trackingType === 'time');

  return workoutExercisesRepo.add({
    workoutId,
    exerciseId,
    targetSets: DEFAULT_TARGET_SETS,
    targetRepsMin: target.min,
    targetRepsMax: target.max,
    restSeconds: DEFAULT_REST_SECONDS,
    note: '',
  });
}

/** האם התרגיל כבר נמצא בתוכנית של סוג האימון הזה. */
export async function isInPlan(workoutId: ID, exerciseId: ID): Promise<boolean> {
  const rows = await workoutExercisesRepo.byWorkout(workoutId);
  return rows.some((r) => r.exerciseId === exerciseId);
}

/** יעד התחלתי: חזרות לתרגיל משקל, שניות לתרגיל זמן. */
export function defaultTargetRange(isTime: boolean): { min: number; max: number } {
  return isTime
    ? { min: DEFAULT_TIME_MIN, max: DEFAULT_TIME_MAX }
    : { min: DEFAULT_REPS_MIN, max: DEFAULT_REPS_MAX };
}

/** הסרה מהתוכנית — ההיסטוריה של התרגיל נשארת שלמה. */
export function removeExerciseFromPlan(workoutExerciseId: ID): Promise<void> {
  return workoutExercisesRepo.remove(workoutExerciseId);
}

export function updatePlanRow(
  workoutExerciseId: ID,
  changes: {
    targetSets?: number;
    targetRepsMin?: number;
    targetRepsMax?: number;
    restSeconds?: number;
    note?: string;
  },
): Promise<number> {
  return workoutExercisesRepo.update(workoutExerciseId, changes);
}

export function reorderPlan(orderedIds: ID[]): Promise<void> {
  return workoutExercisesRepo.reorder(orderedIds);
}

