import { db } from '../db/db';
import { TABLE_NAMES, type TableName } from '../db/types';
import { toLocalDateKey } from '../lib/format';

/**
 * ייצוא וייבוא גיבוי.
 *
 * לקובץ יש schemaVersion, ו-migrateBackup היא שרשרת מיגרציות 1→2→3…
 * כשמבנה הנתונים ישתנה בעתיד, מוסיפים פונקציה אחת ל-MIGRATIONS ומעלים את
 * CURRENT_SCHEMA_VERSION — וגיבויים ישנים ימשיכו להיטען בלי לגעת בשאר הקוד.
 */

export const CURRENT_SCHEMA_VERSION = 1;
const APP_SIGNATURE = 'workout-app';

export interface BackupFile {
  app: typeof APP_SIGNATURE;
  schemaVersion: number;
  exportedAt: number;
  data: Record<TableName, unknown[]>;
}

export type ImportMode = 'replace' | 'merge';

export interface ImportResult {
  mode: ImportMode;
  fromVersion: number;
  /** כמה רשומות נוספו בפועל, לכל טבלה. */
  added: Record<TableName, number>;
  /** במיזוג: כמה רשומות דולגו כי כבר היה id זהה. */
  skipped: Record<TableName, number>;
}

/* ------------------------------------------------------------------ ייצוא */

export async function exportBackup(): Promise<BackupFile> {
  const tables = await Promise.all(TABLE_NAMES.map((name) => db.table(name).toArray()));

  return {
    app: APP_SIGNATURE,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: Date.now(),
    data: Object.fromEntries(
      TABLE_NAMES.map((name, i) => [name, tables[i]]),
    ) as BackupFile['data'],
  };
}

export function backupFileName(now = Date.now()): string {
  return `workout-backup-${toLocalDateKey(now)}.json`;
}

/** מוריד את הגיבוי כקובץ. */
export async function downloadBackup(): Promise<string> {
  const backup = await exportBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const fileName = backupFileName();

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // שחרור מושהה — Safari זקוק ל-URL חי עד שההורדה מתחילה.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);

  return fileName;
}

/* -------------------------------------------------------------- מיגרציות */

type Migration = (backup: BackupFile) => BackupFile;

/**
 * MIGRATIONS[n] ממיר גיבוי מגרסה n לגרסה n+1.
 * כרגע ריק — גרסה 1 היא הראשונה.
 */
const MIGRATIONS: Record<number, Migration> = {};

export function migrateBackup(raw: unknown): BackupFile {
  const backup = parseBackup(raw);

  if (backup.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `הקובץ נוצר בגרסה חדשה יותר של האפליקציה (${backup.schemaVersion}). עדכן את האפליקציה ונסה שוב.`,
    );
  }

  let current = backup;
  while (current.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const migrate = MIGRATIONS[current.schemaVersion];
    if (!migrate) {
      throw new Error(`אין מסלול שדרוג מגרסה ${current.schemaVersion}. הקובץ לא נטען.`);
    }
    current = { ...migrate(current), schemaVersion: current.schemaVersion + 1 };
  }

  return current;
}

/** בדיקת שפיות על הקובץ לפני שנוגעים במסד. */
function parseBackup(raw: unknown): BackupFile {
  if (!raw || typeof raw !== 'object') throw new Error('הקובץ אינו JSON תקין.');

  const obj = raw as Partial<BackupFile>;
  if (obj.app !== APP_SIGNATURE) {
    throw new Error('הקובץ אינו גיבוי של האפליקציה הזו.');
  }
  if (typeof obj.schemaVersion !== 'number') {
    throw new Error('בקובץ חסר שדה schemaVersion.');
  }
  if (!obj.data || typeof obj.data !== 'object') {
    throw new Error('בקובץ חסר שדה data.');
  }

  const data = {} as BackupFile['data'];
  for (const name of TABLE_NAMES) {
    const rows = (obj.data as Record<string, unknown>)[name];
    // טבלה חסרה מתפרשת כריקה — כך גיבוי ישן בלי טבלה שנוספה מאוחר עדיין נטען.
    if (rows === undefined) {
      data[name] = [];
      continue;
    }
    if (!Array.isArray(rows)) throw new Error(`הטבלה "${name}" בקובץ אינה מערך.`);
    data[name] = rows;
  }

  return {
    app: APP_SIGNATURE,
    schemaVersion: obj.schemaVersion,
    exportedAt: typeof obj.exportedAt === 'number' ? obj.exportedAt : Date.now(),
    data,
  };
}

/* -------------------------------------------------------------- ייבוא */

/**
 * 'replace' — מוחק את כל הנתונים הקיימים ושם את מה שבקובץ.
 * 'merge'   — מוסיף רק רשומות עם id שלא קיים. רשומות קיימות לא משתנות,
 *             כך שייבוא של גיבוי ישן לא ידרוס עבודה חדשה יותר.
 */
export async function importBackup(raw: unknown, mode: ImportMode): Promise<ImportResult> {
  const backup = migrateBackup(raw);

  const added = emptyCounters();
  const skipped = emptyCounters();

  await db.transaction('rw', TABLE_NAMES.map((n) => db.table(n)), async () => {
    for (const name of TABLE_NAMES) {
      const table = db.table(name);
      const rows = backup.data[name] as { id?: string }[];

      if (mode === 'replace') {
        await table.clear();
        if (rows.length) await table.bulkAdd(rows);
        added[name] = rows.length;
        continue;
      }

      const valid = rows.filter((r) => r && typeof r.id === 'string');
      const existing = await table.bulkGet(valid.map((r) => r.id!));
      const fresh = valid.filter((_, i) => existing[i] === undefined);

      if (fresh.length) await table.bulkAdd(fresh);
      added[name] = fresh.length;
      skipped[name] = valid.length - fresh.length;
    }
  });

  return { mode, fromVersion: backup.schemaVersion, added, skipped };
}

/** קורא קובץ שנבחר ומחזיר את ה-JSON הגולמי. */
export async function readBackupFile(file: File): Promise<unknown> {
  const text = await file.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('לא הצלחתי לקרוא את הקובץ — הוא אינו JSON תקין.');
  }
}

/** מחיקת כל הנתונים וזריעה מחדש. */
export async function wipeAllData(): Promise<void> {
  await db.transaction('rw', TABLE_NAMES.map((n) => db.table(n)), async () => {
    await Promise.all(TABLE_NAMES.map((name) => db.table(name).clear()));
  });
}

function emptyCounters(): Record<TableName, number> {
  return Object.fromEntries(TABLE_NAMES.map((n) => [n, 0])) as Record<TableName, number>;
}
