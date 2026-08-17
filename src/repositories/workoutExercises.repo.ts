import { db } from '../db/db';
import { newId } from '../db/ids';
import type { ID, WorkoutExercise } from '../db/types';

export const workoutExercisesRepo = {
  all(): Promise<WorkoutExercise[]> {
    return db.workoutExercises.toArray();
  },

  async byWorkout(workoutId: ID): Promise<WorkoutExercise[]> {
    const rows = await db.workoutExercises.where('workoutId').equals(workoutId).toArray();
    return rows.sort((a, b) => a.order - b.order);
  },

  async add(input: Omit<WorkoutExercise, 'id' | 'order'>): Promise<ID> {
    const id = newId();
    const siblings = await db.workoutExercises
      .where('workoutId')
      .equals(input.workoutId)
      .count();
    await db.workoutExercises.add({ ...input, id, order: siblings });
    return id;
  },

  update(id: ID, changes: Partial<Omit<WorkoutExercise, 'id'>>): Promise<number> {
    return db.workoutExercises.update(id, changes);
  },

  /** הסרה מהתוכנית בלבד — setLogs שמפנים לתרגיל נשארים. */
  remove(id: ID): Promise<void> {
    return db.workoutExercises.delete(id);
  },

  async reorder(orderedIds: ID[]): Promise<void> {
    await db.transaction('rw', db.workoutExercises, async () => {
      await Promise.all(
        orderedIds.map((id, order) => db.workoutExercises.update(id, { order })),
      );
    });
  },
};
