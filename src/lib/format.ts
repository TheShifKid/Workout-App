/** עיצוב תאריכים, מספרים ומשקלים בפורמט ישראלי. */

const HE = 'he-IL';

/** 'YYYY-MM-DD' לפי הזמן המקומי (לא UTC — אחרת אימון בערב נופל ליום הבא). */
export function toLocalDateKey(ms: number = Date.now()): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "17.8.2026" */
export function formatDate(input: number | string): string {
  return new Date(toDate(input)).toLocaleDateString(HE, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
}

/** "יום ב׳, 17 באוגוסט" */
export function formatDateLong(input: number | string): string {
  return new Date(toDate(input)).toLocaleDateString(HE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** "18:42" */
export function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(HE, { hour: '2-digit', minute: '2-digit' });
}

/** "היום" / "אתמול" / "לפני 3 ימים" / "17.8.2026" */
export function formatRelativeDay(input: number | string): string {
  const target = startOfDay(toDate(input));
  const today = startOfDay(Date.now());
  const days = Math.round((today - target) / 86_400_000);

  if (days === 0) return 'היום';
  if (days === 1) return 'אתמול';
  if (days < 0) return formatDate(input);
  if (days <= 6) return `לפני ${days} ימים`;
  if (days <= 13) return 'לפני שבוע';
  if (days <= 30) return `לפני ${Math.floor(days / 7)} שבועות`;
  return formatDate(input);
}

/** משקל: בלי אפסים מיותרים. 60 → "60", 62.5 → "62.5" */
export function formatWeight(kg: number | null | undefined): string {
  if (kg === null || kg === undefined || Number.isNaN(kg)) return '—';
  return kg.toLocaleString(HE, { maximumFractionDigits: 2 });
}

/** נפח אימון: 12500 → "12,500" */
export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString(HE);
}

/** משך: 3720 שנ' → "1:02:00", 95 שנ' → "1:35" */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/**
 * ריבוי בעברית: 1 מקבל ניסוח יחיד ("אימון אחד"), כל השאר "N אימונים".
 * העברית לא סובלת "1 אימונים", וזה מופיע בכל מסך.
 */
export function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : `${formatNumber(count)} ${pluralForm}`;
}

/** טווח חזרות לתצוגה: 8–12, או 8 אם המינימום והמקסימום זהים. */
export function formatRepRange(min: number, max: number): string {
  return min === max ? String(min) : `${min}–${max}`;
}

function toDate(input: number | string): number {
  if (typeof input === 'number') return input;
  // 'YYYY-MM-DD' מפורש כזמן מקומי ולא כ-UTC
  const [y, m, d] = input.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).getTime();
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
