import { db } from '../db/db';
import type { ID, Session, SetLog } from '../db/types';
import { setLogsRepo } from '../repositories/setLogs.repo';

/**
 * "הפעם הקודמת" — הפיצ'ר המרכזי של האפליקציה.
 *
 * ההגדרה: האימון האחרון שנסגר (endedAt != null) שבו יש סט עבודה מסומן
 * באותו תרגיל — בלי קשר לסוג האימון שבו הוא בוצע.
 * סטי חימום וסטים לא מסומנים אינם נחשבים.
 */

export interface PreviousPerformance {
  session: Session;
  /** סטי עבודה מסומנים בלבד, לפי סדר. */
  sets: SetLog[];
}

/** גרסה לתרגיל בודד. */
export async function getPreviousPerformance(
  exerciseId: ID,
  excludeSessionId?: ID,
): Promise<PreviousPerformance | null> {
  const map = await getPreviousPerformanceMany([exerciseId], excludeSessionId);
  return map.get(exerciseId) ?? null;
}

/**
 * גרסה מרובת-תרגילים — קריאה אחת למסך אימון שלם במקום קריאה לכל תרגיל.
 */
export async function getPreviousPerformanceMany(
  exerciseIds: ID[],
  excludeSessionId?: ID,
): Promise<Map<ID, PreviousPerformance>> {
  const result = new Map<ID, PreviousPerformance>();
  if (exerciseIds.length === 0) return result;

  const logsPerExercise = await Promise.all(
    exerciseIds.map((id) => setLogsRepo.byExercise(id)),
  );

  const relevant = logsPerExercise.map((logs) =>
    logs.filter(
      (l) => l.isDone === 1 && l.isWarmup === 0 && l.sessionId !== excludeSessionId,
    ),
  );

  const sessionIds = [...new Set(relevant.flat().map((l) => l.sessionId))];
  if (sessionIds.length === 0) return result;

  const sessions = (await db.sessions.bulkGet(sessionIds)).filter(
    (s): s is Session => !!s && s.endedAt !== null,
  );
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  exerciseIds.forEach((exerciseId, i) => {
    let best: Session | undefined;
    for (const log of relevant[i]) {
      const session = sessionById.get(log.sessionId);
      if (!session) continue;
      if (!best || session.startedAt > best.startedAt) best = session;
    }
    if (!best) return;

    const sets = relevant[i]
      .filter((l) => l.sessionId === best.id)
      .sort((a, b) => a.setNumber - b.setNumber);

    result.set(exerciseId, { session: best, sets });
  });

  return result;
}

/**
 * הערך שממלא מראש את שורת הסט.
 * סט מס' N נטען מסט העבודה מס' N של הפעם הקודמת; סטים נוספים מעבר
 * למה שהיה אז — נטענים מהסט האחרון.
 */
export function prefillForSet(
  previous: PreviousPerformance | null | undefined,
  setNumber: number,
): { weight: number | null; reps: number | null } {
  if (!previous || previous.sets.length === 0) return { weight: null, reps: null };
  const index = Math.min(setNumber, previous.sets.length) - 1;
  const source = previous.sets[Math.max(0, index)];
  return { weight: source?.weight ?? null, reps: source?.reps ?? null };
}
