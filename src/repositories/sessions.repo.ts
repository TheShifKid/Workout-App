import { db } from '../db/db';
import type { ID, Session } from '../db/types';

export const sessionsRepo = {
  all(): Promise<Session[]> {
    return db.sessions.toArray();
  },

  get(id: ID): Promise<Session | undefined> {
    return db.sessions.get(id);
  },

  /** כל האימונים, החדש ביותר ראשון. */
  recent(limit?: number): Promise<Session[]> {
    const q = db.sessions.orderBy('startedAt').reverse();
    return limit ? q.limit(limit).toArray() : q.toArray();
  },

  /** האימון הפעיל — זה שאין לו endedAt. אמור להיות אחד לכל היותר. */
  async active(): Promise<Session | undefined> {
    const open = await db.sessions.filter((s) => s.endedAt === null).toArray();
    return open.sort((a, b) => b.startedAt - a.startedAt)[0];
  },

  /** האימון האחרון שנסגר מסוג מסוים — משמש ל"בוצע לאחרונה" במסך הבית. */
  async lastCompletedByWorkout(workoutId: ID): Promise<Session | undefined> {
    const rows = await db.sessions.where('workoutId').equals(workoutId).toArray();
    return rows.filter((s) => s.endedAt !== null).sort((a, b) => b.startedAt - a.startedAt)[0];
  },

  add(session: Session): Promise<ID> {
    return db.sessions.add(session);
  },

  update(id: ID, changes: Partial<Omit<Session, 'id'>>): Promise<number> {
    return db.sessions.update(id, changes);
  },

  /** מחיקת אימון מוחקת גם את הסטים ואת צילום התוכנית שלו. */
  async remove(id: ID): Promise<void> {
    await db.transaction('rw', db.sessions, db.sessionExercises, db.setLogs, async () => {
      await db.setLogs.where('sessionId').equals(id).delete();
      await db.sessionExercises.where('sessionId').equals(id).delete();
      await db.sessions.delete(id);
    });
  },
};
