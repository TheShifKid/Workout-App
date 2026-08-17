import { db } from '../db/db';
import type { ID, Session, SetLog } from '../db/types';
import { estimateOneRepMax, roundToHalf } from '../lib/oneRepMax';
import { setLogsRepo } from '../repositories/setLogs.repo';

/**
 * חישובי סטטיסטיקה. כל החישובים סופרים אך ורק סטים מסומנים שאינם חימום.
 */

export const isCounted = (s: SetLog) => s.isDone === 1 && s.isWarmup === 0;

export const setVolume = (s: SetLog) => (s.weight ?? 0) * (s.reps ?? 0);

export interface SessionSummary {
  completedSets: number;
  plannedSets: number;
  volume: number;
  /** משך בשניות. באימון פעיל — מרגע ההתחלה עד עכשיו. */
  durationSeconds: number;
}

export function summarizeSession(session: Session, logs: SetLog[], now = Date.now()): SessionSummary {
  const counted = logs.filter(isCounted);
  return {
    completedSets: counted.length,
    plannedSets: logs.filter((l) => l.isWarmup === 0).length,
    volume: counted.reduce((sum, s) => sum + setVolume(s), 0),
    durationSeconds: Math.floor(((session.endedAt ?? now) - session.startedAt) / 1000),
  };
}

export interface ExerciseSessionEntry {
  session: Session;
  sets: SetLog[];
  volume: number;
  /** הסט הכבד ביותר באימון הזה. */
  topSet: SetLog | null;
  bestOneRepMax: number;
}

/** כל הפעמים שתרגיל בוצע, מהחדש לישן. */
export async function getExerciseHistory(exerciseId: ID): Promise<ExerciseSessionEntry[]> {
  const logs = (await setLogsRepo.byExercise(exerciseId)).filter(isCounted);
  if (logs.length === 0) return [];

  const sessionIds = [...new Set(logs.map((l) => l.sessionId))];
  const sessions = (await db.sessions.bulkGet(sessionIds)).filter((s): s is Session => !!s);

  return sessions
    .map((session) => {
      const sets = logs
        .filter((l) => l.sessionId === session.id)
        .sort((a, b) => a.setNumber - b.setNumber);
      return {
        session,
        sets,
        volume: sets.reduce((sum, s) => sum + setVolume(s), 0),
        topSet: sets.reduce<SetLog | null>(
          (best, s) => (!best || (s.weight ?? 0) > (best.weight ?? 0) ? s : best),
          null,
        ),
        bestOneRepMax: sets.reduce(
          (best, s) => Math.max(best, estimateOneRepMax(s.weight ?? 0, s.reps ?? 0)),
          0,
        ),
      };
    })
    .sort((a, b) => b.session.startedAt - a.session.startedAt);
}

export interface ExercisePRs {
  /** המשקל הכבד ביותר שהורם אי פעם. */
  heaviest: { weight: number; reps: number; date: string } | null;
  /** ה-1RM המשוער הגבוה ביותר — לוקח בחשבון גם משקל וגם חזרות. */
  bestOneRepMax: { value: number; weight: number; reps: number; date: string } | null;
  totalSets: number;
  totalVolume: number;
}

export function computePRs(history: ExerciseSessionEntry[]): ExercisePRs {
  let heaviest: ExercisePRs['heaviest'] = null;
  let bestOneRepMax: ExercisePRs['bestOneRepMax'] = null;
  let totalSets = 0;
  let totalVolume = 0;

  for (const entry of history) {
    totalSets += entry.sets.length;
    totalVolume += entry.volume;

    for (const set of entry.sets) {
      const weight = set.weight ?? 0;
      const reps = set.reps ?? 0;
      if (!weight || !reps) continue;

      if (!heaviest || weight > heaviest.weight) {
        heaviest = { weight, reps, date: entry.session.date };
      }

      const e1rm = estimateOneRepMax(weight, reps);
      if (!bestOneRepMax || e1rm > bestOneRepMax.value) {
        bestOneRepMax = { value: roundToHalf(e1rm), weight, reps, date: entry.session.date };
      }
    }
  }

  return { heaviest, bestOneRepMax, totalSets, totalVolume };
}

export interface ChartPoint {
  t: number;
  date: string;
  topWeight: number;
  oneRepMax: number;
}

/** סדרת נתונים לגרף — נקודה אחת לאימון, מהישן לחדש. */
export function toChartSeries(history: ExerciseSessionEntry[]): ChartPoint[] {
  return history
    .filter((e) => e.topSet && (e.topSet.weight ?? 0) > 0)
    .map((e) => ({
      t: e.session.startedAt,
      date: e.session.date,
      topWeight: e.topSet!.weight ?? 0,
      oneRepMax: roundToHalf(e.bestOneRepMax),
    }))
    .sort((a, b) => a.t - b.t);
}
