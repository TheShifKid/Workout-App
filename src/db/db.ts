import Dexie, { type EntityTable } from 'dexie';
import type {
  Exercise,
  Session,
  SessionExercise,
  SetLog,
  Workout,
  WorkoutExercise,
} from './types';

/** תרגילים זרועים שנמדדים בזמן — משמש גם בשדרוג גרסה 1→2. */
export const TIME_BASED_SEED_IDS = new Set(['seed-plank', 'seed-farmers-carry']);

/**
 * מופע ה-Dexie היחיד באפליקציה.
 * מחרוזות האינדקס מגדירות רק את המפתחות שנשאלים — שאר השדות נשמרים ממילא.
 */
export class WorkoutDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>;
  workouts!: EntityTable<Workout, 'id'>;
  workoutExercises!: EntityTable<WorkoutExercise, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  sessionExercises!: EntityTable<SessionExercise, 'id'>;
  setLogs!: EntityTable<SetLog, 'id'>;

  constructor() {
    super('workout-app');

    this.version(1).stores({
      exercises: 'id, name, muscleGroup, equipment, isArchived',
      workouts: 'id, order',
      workoutExercises: 'id, workoutId, exerciseId, [workoutId+order]',
      sessions: 'id, date, startedAt, endedAt, workoutId',
      sessionExercises: 'id, sessionId, exerciseId, [sessionId+order]',
      setLogs:
        'id, sessionId, exerciseId, [sessionId+exerciseId], [exerciseId+isDone]',
    });

    /**
     * גרסה 2: תרגילים מבוססי זמן (פלאנק, הליכת חווה).
     * רשומות קיימות מקבלות ברירת מחדל 'weight' ו-durationSeconds=null,
     * כך ששום נתון היסטורי לא משתנה בשדרוג.
     */
    this.version(2)
      .stores({
        exercises: 'id, name, muscleGroup, equipment, isArchived, trackingType',
      })
      .upgrade(async (tx) => {
        await tx
          .table('exercises')
          .toCollection()
          .modify((e) => {
            e.trackingType = e.trackingType ?? (TIME_BASED_SEED_IDS.has(e.id) ? 'time' : 'weight');
          });
        await tx
          .table('sessionExercises')
          .toCollection()
          .modify((s) => {
            s.trackingType = s.trackingType ?? 'weight';
          });
        await tx
          .table('setLogs')
          .toCollection()
          .modify((l) => {
            l.durationSeconds = l.durationSeconds ?? null;
          });
      });
  }
}

export const db = new WorkoutDB();
