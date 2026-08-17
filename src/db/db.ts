import Dexie, { type EntityTable } from 'dexie';
import type {
  Exercise,
  Session,
  SessionExercise,
  SetLog,
  Workout,
  WorkoutExercise,
} from './types';

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
  }
}

export const db = new WorkoutDB();
