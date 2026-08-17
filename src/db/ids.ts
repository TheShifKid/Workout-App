import type { ID } from './types';

/**
 * מזהים הם UUID ולא מספרים רצים, כדי שמיזוג גיבויים משתי מכשירים
 * לא ייצור התנגשויות.
 */
export function newId(): ID {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // גיבוי לדפדפנים ישנים / הקשר לא מאובטח
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
