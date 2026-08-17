/**
 * הטיפוסים של שכבת הנתונים. זהו מקור האמת היחיד למבנה הרשומות —
 * כל שאר האפליקציה מייבאת מכאן ולא מגדירה מחדש.
 */

export type ID = string;

/** IndexedDB לא מאנדקס boolean, לכן דגלים נשמרים כ-0/1. */
export type Flag = 0 | 1;

export const MUSCLE_GROUPS = [
  'חזה',
  'גב',
  'כתפיים',
  'יד קדמית',
  'יד אחורית',
  'רגליים',
  'ישבן',
  'תאומים',
  'בטן',
  'אמות',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT = [
  'מוט',
  'משקולות יד',
  'מכונה',
  'כבלים',
  'משקל גוף',
  'קטלבל',
  'גומייה',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

/** מאגר התרגילים. תרגיל אף פעם לא נמחק — רק מסומן כמאורכב. */
export interface Exercise {
  id: ID;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  /** הערה קבועה שמוצגת בכל פעם שמבצעים את התרגיל. */
  defaultNote: string;
  isArchived: Flag;
}

/** סוג אימון בתוכנית ("דחיפה", "משיכה"...). */
export interface Workout {
  id: ID;
  name: string;
  color: string;
  order: number;
}

/** שורה בתוכנית: תרגיל אחד בתוך סוג אימון אחד. */
export interface WorkoutExercise {
  id: ID;
  workoutId: ID;
  exerciseId: ID;
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restSeconds: number;
  /** הערה ספציפית לתרגיל בתוך האימון הזה (מעבר להערה הקבועה של התרגיל). */
  note: string;
}

/** אימון שבוצע בפועל. */
export interface Session {
  id: ID;
  /** null אם האימון נפתח בלי סוג אימון מוגדר. */
  workoutId: ID | null;
  /** צילום מצב של שם האימון — כדי ששינוי או מחיקה בתוכנית לא ישנו היסטוריה. */
  workoutName: string;
  /** 'YYYY-MM-DD' לפי הזמן המקומי — לקיבוץ ומיון. */
  date: string;
  startedAt: number;
  /** null = אימון פעיל שלא נסגר. */
  endedAt: number | null;
  sessionNote: string;
}

/**
 * צילום מצב של שורת התוכנית ברגע תחילת האימון.
 * מרגע היצירה מנותק לחלוטין מ-workoutExercises.
 */
export interface SessionExercise {
  id: ID;
  sessionId: ID;
  exerciseId: ID;
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restSeconds: number;
  note: string;
  /** שם התרגיל כפי שהיה — כדי שההיסטוריה תישאר קריאה גם אחרי שינוי שם. */
  exerciseName: string;
}

/** סט בודד שנרשם באימון. */
export interface SetLog {
  id: ID;
  sessionId: ID;
  exerciseId: ID;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  isWarmup: Flag;
  /** רק סט מסומן נחשב כבוצע — לסטטיסטיקות ול"פעם הקודמת". */
  isDone: Flag;
  completedAt: number | null;
}

/** כל שמות הטבלאות במקום אחד — משמש את הגיבוי ואת מחיקת הנתונים. */
export const TABLE_NAMES = [
  'exercises',
  'workouts',
  'workoutExercises',
  'sessions',
  'sessionExercises',
  'setLogs',
] as const;
export type TableName = (typeof TABLE_NAMES)[number];
