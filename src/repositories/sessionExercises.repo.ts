import { db } from '../db/db';
import type { ID, SessionExercise } from '../db/types';

export const sessionExercisesRepo = {
  all(): Promise<SessionExercise[]> {
    return db.sessionExercises.toArray();
  },

  async bySession(sessionId: ID): Promise<SessionExercise[]> {
    const rows = await db.sessionExercises.where('sessionId').equals(sessionId).toArray();
    return rows.sort((a, b) => a.order - b.order);
  },

  bulkAdd(rows: SessionExercise[]): Promise<ID> {
    return db.sessionExercises.bulkAdd(rows) as Promise<ID>;
  },

  add(row: SessionExercise): Promise<ID> {
    return db.sessionExercises.add(row);
  },

  update(id: ID, changes: Partial<Omit<SessionExercise, 'id'>>): Promise<number> {
    return db.sessionExercises.update(id, changes);
  },

  remove(id: ID): Promise<void> {
    return db.sessionExercises.delete(id);
  },
};
