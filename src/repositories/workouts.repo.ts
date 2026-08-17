import { db } from '../db/db';
import { newId } from '../db/ids';
import type { ID, Workout } from '../db/types';

export const workoutsRepo = {
  all(): Promise<Workout[]> {
    return db.workouts.orderBy('order').toArray();
  },

  get(id: ID): Promise<Workout | undefined> {
    return db.workouts.get(id);
  },

  async create(input: Omit<Workout, 'id' | 'order'>): Promise<ID> {
    const id = newId();
    const count = await db.workouts.count();
    await db.workouts.add({ ...input, id, order: count });
    return id;
  },

  update(id: ID, changes: Partial<Omit<Workout, 'id'>>): Promise<number> {
    return db.workouts.update(id, changes);
  },

  /** מוחק את סוג האימון ואת שורות התוכנית שלו. אימונים שבוצעו לא נוגעים. */
  async remove(id: ID): Promise<void> {
    await db.transaction('rw', db.workouts, db.workoutExercises, async () => {
      await db.workoutExercises.where('workoutId').equals(id).delete();
      await db.workouts.delete(id);
    });
  },

  async reorder(orderedIds: ID[]): Promise<void> {
    await db.transaction('rw', db.workouts, async () => {
      await Promise.all(orderedIds.map((id, order) => db.workouts.update(id, { order })));
    });
  },
};
