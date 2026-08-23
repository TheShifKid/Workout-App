/** קפיצת המשקל בכפתורי ±. 1.25 ק"ג = הצלחת הקטנה ביותר ברוב החדרים. */
export const WEIGHT_STEP = 1.25;

/** קפיצת החזרות בכפתורי ±. */
export const REPS_STEP = 1;

/** זמן מנוחה כשלא הוגדר אחרת. */
export const DEFAULT_REST_SECONDS = 90;

/** ברירות מחדל לתרגיל שנוסף לתוכנית. */
export const DEFAULT_TARGET_SETS = 3;
export const DEFAULT_REPS_MIN = 8;
export const DEFAULT_REPS_MAX = 12;

/**
 * יעד ברירת מחדל לתרגיל שנמדד בזמן. בלי זה תרגיל כמו פלאנק היה מקבל
 * "יעד 8–12 שניות", שזה חסר משמעות.
 */
export const DEFAULT_TIME_MIN = 30;
export const DEFAULT_TIME_MAX = 60;

/** צבעים לבחירה בסוג אימון חדש. */
export const WORKOUT_COLORS = [
  '#F97316',
  '#38BDF8',
  '#A78BFA',
  '#34D399',
  '#F472B6',
  '#FBBF24',
  '#F87171',
  '#22D3EE',
];
