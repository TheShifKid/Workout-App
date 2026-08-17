import type { Equipment, ID, MuscleGroup } from '../db/types';
import {
  DEFAULT_REPS_MAX,
  DEFAULT_REPS_MIN,
  DEFAULT_REST_SECONDS,
  DEFAULT_TARGET_SETS,
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

export function addExerciseToPlan(workoutId: ID, exerciseId: ID): Promise<ID> {
  return workoutExercisesRepo.add({
    workoutId,
    exerciseId,
    targetSets: DEFAULT_TARGET_SETS,
    targetRepsMin: DEFAULT_REPS_MIN,
    targetRepsMax: DEFAULT_REPS_MAX,
    restSeconds: DEFAULT_REST_SECONDS,
    note: '',
  });
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

/** יצירת תרגיל חדש מתוך בורר התרגילים, בשורה אחת. */
export function createExercise(
  name: string,
  muscleGroup: MuscleGroup,
  equipment: Equipment,
): Promise<ID> {
  return exercisesRepo.create({
    name: name.trim(),
    muscleGroup,
    equipment,
    defaultNote: '',
  });
}

/** ההערה הקבועה של התרגיל — מוצגת בכל אימון שבו הוא מופיע. */
export function setExerciseDefaultNote(exerciseId: ID, defaultNote: string): Promise<number> {
  return exercisesRepo.update(exerciseId, { defaultNote });
}
