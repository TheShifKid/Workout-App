import { db } from '../db/db';
import { newId } from '../db/ids';
import type { Exercise, ID } from '../db/types';

/** CRUD טהור על מאגר התרגילים. בלי לוגיקה עסקית ובלי React. */

export const exercisesRepo = {
  all(): Promise<Exercise[]> {
    return db.exercises.toArray();
  },

  /** רק תרגילים פעילים, ממוינים לפי שם. */
  async active(): Promise<Exercise[]> {
    const rows = await db.exercises.where('isArchived').equals(0).toArray();
    return rows.sort((a, b) => a.name.localeCompare(b.name, 'he'));
  },

  get(id: ID): Promise<Exercise | undefined> {
    return db.exercises.get(id);
  },

  getMany(ids: ID[]): Promise<(Exercise | undefined)[]> {
    return db.exercises.bulkGet(ids);
  },

  async create(input: Omit<Exercise, 'id' | 'isArchived'>): Promise<ID> {
    const id = newId();
    await db.exercises.add({ ...input, id, isArchived: 0 });
    return id;
  },

  update(id: ID, changes: Partial<Omit<Exercise, 'id'>>): Promise<number> {
    return db.exercises.update(id, changes);
  },

  /** ארכוב במקום מחיקה — כדי לא לאבד היסטוריה שמפנה לתרגיל. */
  archive(id: ID): Promise<number> {
    return db.exercises.update(id, { isArchived: 1 });
  },

  unarchive(id: ID): Promise<number> {
    return db.exercises.update(id, { isArchived: 0 });
  },
};
