/**
 * 1RM משוער לפי נוסחת Epley.
 * מדויקת סבירה עד ~10 חזרות, ומאבדת אמינות מעבר לזה — לכן היא מוצגת
 * תמיד כ"משוער" ולא כמספר מוחלט.
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (!weight || !reps || reps < 1) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** עיגול ל-0.5 ק"ג הקרוב — רזולוציה שמשמעותית בחדר כושר. */
export function roundToHalf(kg: number): number {
  return Math.round(kg * 2) / 2;
}
