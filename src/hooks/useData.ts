import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Exercise, ID, Session, SessionExercise, SetLog, Workout } from '../db/types';
import { exercisesRepo } from '../repositories/exercises.repo';
import { sessionExercisesRepo } from '../repositories/sessionExercises.repo';
import { sessionsRepo } from '../repositories/sessions.repo';
import { setLogsRepo } from '../repositories/setLogs.repo';
import { workoutExercisesRepo } from '../repositories/workoutExercises.repo';
import { workoutsRepo } from '../repositories/workouts.repo';
import {
  getPreviousPerformanceMany,
  type PreviousPerformance,
} from '../services/historyService';
import {
  computePRs,
  getExerciseHistory,
  summarizeSession,
  toChartSeries,
  type ChartPoint,
  type ExercisePRs,
  type ExerciseSessionEntry,
  type SessionSummary,
} from '../services/statsService';

/**
 * שכבת ההדבק היחידה בין React למסד.
 * useLiveQuery מרנדר מחדש אוטומטית בכל שינוי — אין צורך בניהול state ידני,
 * ושינוי שנעשה במסך אחד מתעדכן מיד בכל המסכים.
 *
 * undefined = עדיין טוען. מערך ריק = נטען ואין נתונים.
 */

export function useWorkouts(): Workout[] | undefined {
  return useLiveQuery(() => workoutsRepo.all(), []);
}

export function useWorkout(id: ID | undefined): Workout | undefined | null {
  return useLiveQuery(async () => (id ? ((await workoutsRepo.get(id)) ?? null) : null), [id]);
}

export function useActiveExercises(): Exercise[] | undefined {
  return useLiveQuery(() => exercisesRepo.active(), []);
}

export function useExercise(id: ID | undefined): Exercise | undefined | null {
  return useLiveQuery(async () => (id ? ((await exercisesRepo.get(id)) ?? null) : null), [id]);
}

/** מפה מזהה→תרגיל, לחיפוש מהיר בתוך רשימות. */
export function useExerciseMap(): Map<ID, Exercise> | undefined {
  return useLiveQuery(async () => {
    const all = await exercisesRepo.all();
    return new Map(all.map((e) => [e.id, e]));
  }, []);
}

export function usePlanRows(workoutId: ID | undefined) {
  return useLiveQuery(
    () => (workoutId ? workoutExercisesRepo.byWorkout(workoutId) : Promise.resolve([])),
    [workoutId],
  );
}

/** האימון הפעיל, אם יש. null = נטען ואין. */
export function useActiveSession(): Session | undefined | null {
  return useLiveQuery(async () => (await sessionsRepo.active()) ?? null, []);
}

export function useSession(id: ID | undefined): Session | undefined | null {
  return useLiveQuery(async () => (id ? ((await sessionsRepo.get(id)) ?? null) : null), [id]);
}

export function useSessionExercises(sessionId: ID | undefined): SessionExercise[] | undefined {
  return useLiveQuery(
    () => (sessionId ? sessionExercisesRepo.bySession(sessionId) : Promise.resolve([])),
    [sessionId],
  );
}

export function useSessionSetLogs(sessionId: ID | undefined): SetLog[] | undefined {
  return useLiveQuery(
    () => (sessionId ? setLogsRepo.bySession(sessionId) : Promise.resolve([])),
    [sessionId],
  );
}

export function useSessions(limit?: number): Session[] | undefined {
  return useLiveQuery(() => sessionsRepo.recent(limit), [limit]);
}

/** נתוני "הפעם הקודמת" לכל התרגילים באימון, בקריאה אחת. */
export function usePreviousPerformances(
  exerciseIds: ID[],
  excludeSessionId?: ID,
): Map<ID, PreviousPerformance> | undefined {
  const key = exerciseIds.join('|');
  return useLiveQuery(
    () => getPreviousPerformanceMany(exerciseIds, excludeSessionId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, excludeSessionId],
  );
}

export interface WorkoutWithLast {
  workout: Workout;
  lastSession: Session | null;
  exerciseCount: number;
}

/** נתוני מסך הבית: כל סוג אימון עם התאריך שבו בוצע לאחרונה. */
export function useWorkoutsWithLast(): WorkoutWithLast[] | undefined {
  return useLiveQuery(async () => {
    const workouts = await workoutsRepo.all();
    const [sessions, planRows] = await Promise.all([
      db.sessions.toArray(),
      workoutExercisesRepo.all(),
    ]);

    const completed = sessions.filter((s) => s.endedAt !== null);

    return workouts.map((workout) => {
      const last = completed
        .filter((s) => s.workoutId === workout.id)
        .sort((a, b) => b.startedAt - a.startedAt)[0];
      return {
        workout,
        lastSession: last ?? null,
        exerciseCount: planRows.filter((r) => r.workoutId === workout.id).length,
      };
    });
  }, []);
}

export interface SessionWithSummary {
  session: Session;
  summary: SessionSummary;
  exerciseCount: number;
}

/** רשימת ההיסטוריה — כל אימון עם הסיכום שלו, מהחדש לישן. */
export function useSessionHistory(): SessionWithSummary[] | undefined {
  return useLiveQuery(async () => {
    const sessions = await sessionsRepo.recent();
    const completed = sessions.filter((s) => s.endedAt !== null);
    if (completed.length === 0) return [];

    const allLogs = await db.setLogs.toArray();
    const logsBySession = new Map<ID, SetLog[]>();
    for (const log of allLogs) {
      const list = logsBySession.get(log.sessionId);
      if (list) list.push(log);
      else logsBySession.set(log.sessionId, [log]);
    }

    return completed.map((session) => {
      const logs = logsBySession.get(session.id) ?? [];
      return {
        session,
        summary: summarizeSession(session, logs),
        exerciseCount: new Set(logs.map((l) => l.exerciseId)).size,
      };
    });
  }, []);
}

export interface ExerciseProgress {
  history: ExerciseSessionEntry[];
  prs: ExercisePRs;
  chart: ChartPoint[];
}

export function useExerciseProgress(exerciseId: ID | undefined): ExerciseProgress | undefined {
  return useLiveQuery(async () => {
    if (!exerciseId) return { history: [], prs: computePRs([]), chart: [] };
    const history = await getExerciseHistory(exerciseId);
    return { history, prs: computePRs(history), chart: toChartSeries(history) };
  }, [exerciseId]);
}

/** תוכן מלא של אימון שבוצע — למסך פירוט ההיסטוריה. */
export function useSessionDetail(sessionId: ID | undefined) {
  return useLiveQuery(async () => {
    if (!sessionId) return null;
    const session = await sessionsRepo.get(sessionId);
    if (!session) return null;

    const [snapshots, logs] = await Promise.all([
      sessionExercisesRepo.bySession(sessionId),
      setLogsRepo.bySession(sessionId),
    ]);

    return { session, snapshots, logs };
  }, [sessionId]);
}
