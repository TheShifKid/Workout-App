import { db } from '../db/db';
import type { ID, SetLog } from '../db/types';

export const setLogsRepo = {
  all(): Promise<SetLog[]> {
    return db.setLogs.toArray();
  },

  get(id: ID): Promise<SetLog | undefined> {
    return db.setLogs.get(id);
  },

  bySession(sessionId: ID): Promise<SetLog[]> {
    return db.setLogs.where('sessionId').equals(sessionId).toArray();
  },

  /** כל הסטים שנרשמו אי פעם בתרגיל מסוים — בסיס למסך ההתקדמות. */
  byExercise(exerciseId: ID): Promise<SetLog[]> {
    return db.setLogs.where('exerciseId').equals(exerciseId).toArray();
  },

  async bySessionAndExercise(sessionId: ID, exerciseId: ID): Promise<SetLog[]> {
    const rows = await db.setLogs
      .where('[sessionId+exerciseId]')
      .equals([sessionId, exerciseId])
      .toArray();
    return rows.sort((a, b) => a.setNumber - b.setNumber);
  },

  add(row: SetLog): Promise<ID> {
    return db.setLogs.add(row);
  },

  bulkAdd(rows: SetLog[]): Promise<ID> {
    return db.setLogs.bulkAdd(rows) as Promise<ID>;
  },

  update(id: ID, changes: Partial<Omit<SetLog, 'id'>>): Promise<number> {
    return db.setLogs.update(id, changes);
  },

  remove(id: ID): Promise<void> {
    return db.setLogs.delete(id);
  },
};
