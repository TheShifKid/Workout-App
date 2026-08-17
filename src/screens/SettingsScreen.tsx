import { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { IconDownload, IconTrash, IconUpload } from '../components/icons';
import { Button, ScreenHeader } from '../components/ui';
import { TABLE_NAMES, type TableName } from '../db/types';
import { seedIfEmpty } from '../db/seed';
import { formatDate, formatNumber } from '../lib/format';
import {
  CURRENT_SCHEMA_VERSION,
  downloadBackup,
  importBackup,
  migrateBackup,
  readBackupFile,
  wipeAllData,
  type BackupFile,
  type ImportMode,
  type ImportResult,
} from '../services/backupService';

const TABLE_LABELS: Record<TableName, string> = {
  exercises: 'תרגילים',
  workouts: 'סוגי אימון',
  workoutExercises: 'שורות תוכנית',
  sessions: 'אימונים',
  sessionExercises: 'תרגילים באימונים',
  setLogs: 'סטים',
};

export function SettingsScreen() {
  const fileInput = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ raw: unknown; backup: BackupFile } | null>(null);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [confirmImport, setConfirmImport] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [storage, setStorage] = useState<{ usedMB: string; persisted: boolean } | null>(null);

  useEffect(() => {
    void refreshStorage().then(setStorage);
  }, []);

  const onExport = async () => {
    setError(null);
    try {
      const name = await downloadBackup();
      setMessage(`הגיבוי הורד בשם ${name}`);
    } catch {
      setError('ההורדה נכשלה. נסה שוב.');
    }
  };

  const onFileChosen = async (file: File | undefined) => {
    setError(null);
    setMessage(null);
    setResult(null);
    if (!file) return;
    try {
      const raw = await readBackupFile(file);
      setPending({ raw, backup: migrateBackup(raw) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'הקובץ לא נטען.');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const runImport = async () => {
    if (!pending) return;
    setConfirmImport(false);
    try {
      const res = await importBackup(pending.raw, mode);
      setResult(res);
      setPending(null);
      setStorage(await refreshStorage());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'הייבוא נכשל.');
    }
  };

  const runWipe = async () => {
    setConfirmWipe(false);
    await wipeAllData();
    await seedIfEmpty();
    setResult(null);
    setPending(null);
    setMessage('כל הנתונים נמחקו והאפליקציה חזרה למצב ההתחלתי.');
    setStorage(await refreshStorage());
  };

  return (
    <>
      <ScreenHeader title="הגדרות" />

      <div className="space-y-6 p-4">
        {message && (
          <p className="rounded-xl border border-volt/30 bg-volt/5 px-3 py-2 text-sm text-volt">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-xl border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        {/* ייצוא */}
        <Section title="גיבוי" body="קובץ JSON אחד עם כל הנתונים. שמור אותו בענן או שלח לעצמך.">
          <Button full variant="primary" onClick={onExport}>
            <IconDownload className="h-5 w-5" />
            ייצא גיבוי
          </Button>
        </Section>

        {/* ייבוא */}
        <Section
          title="שחזור מגיבוי"
          body="טוען קובץ שיוצא מהאפליקציה. תמיד תראה מה נמצא בקובץ לפני שמשהו משתנה."
        >
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => onFileChosen(e.target.files?.[0])}
          />
          <Button full onClick={() => fileInput.current?.click()}>
            <IconUpload className="h-5 w-5" />
            בחר קובץ גיבוי
          </Button>

          {pending && (
            <div className="mt-3 rounded-xl border border-line bg-surface p-3">
              <p className="text-sm font-semibold">
                גיבוי מ-{formatDate(pending.backup.exportedAt)}
                <span className="font-normal text-muted">
                  {' '}
                  · גרסת מבנה {pending.backup.schemaVersion}
                  {pending.backup.schemaVersion !== CURRENT_SCHEMA_VERSION &&
                    ` (שודרג ל-${CURRENT_SCHEMA_VERSION})`}
                </span>
              </p>

              <ul className="tnum mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted">
                {TABLE_NAMES.map((name) => (
                  <li key={name} className="flex justify-between gap-2">
                    <span>{TABLE_LABELS[name]}</span>
                    <span className="text-body">
                      {formatNumber(pending.backup.data[name].length)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 space-y-2">
                <ModeOption
                  active={mode === 'merge'}
                  onClick={() => setMode('merge')}
                  title="מיזוג"
                  body="מוסיף רק רשומות שלא קיימות. מה שכבר יש אצלך לא ישתנה."
                />
                <ModeOption
                  active={mode === 'replace'}
                  onClick={() => setMode('replace')}
                  title="החלפה מלאה"
                  body="מוחק את כל הנתונים הקיימים ושם במקומם את מה שבקובץ."
                />
              </div>

              <div className="mt-3 flex gap-2">
                <Button full onClick={() => setPending(null)}>
                  ביטול
                </Button>
                <Button full variant="primary" onClick={() => setConfirmImport(true)}>
                  המשך
                </Button>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-3 rounded-xl border border-volt/30 bg-volt/5 p-3 text-sm">
              <p className="font-semibold text-volt">
                {result.mode === 'replace' ? 'ההחלפה הושלמה' : 'המיזוג הושלם'}
              </p>
              <ul className="tnum mt-1 space-y-0.5 text-xs text-muted">
                {TABLE_NAMES.filter((n) => result.added[n] || result.skipped[n]).map((name) => (
                  <li key={name}>
                    {TABLE_LABELS[name]}: נוספו {result.added[name]}
                    {result.mode === 'merge' && result.skipped[name] > 0 &&
                      `, דולגו ${result.skipped[name]} (כבר היו)`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        {/* אחסון */}
        {storage && (
          <Section
            title="אחסון במכשיר"
            body={`הנתונים תופסים ${storage.usedMB} MB ב-IndexedDB. ${
              storage.persisted
                ? 'האחסון מסומן כקבוע — הדפדפן לא ימחק אותו כשנגמר מקום.'
                : 'הדפדפן עלול למחוק אותם אם ייגמר המקום במכשיר.'
            }`}
          >
            {!storage.persisted && (
              <Button
                full
                onClick={async () => {
                  await navigator.storage?.persist?.();
                  setStorage(await refreshStorage());
                }}
              >
                בקש אחסון קבוע
              </Button>
            )}
          </Section>
        )}

        {/* מחיקה */}
        <Section
          title="מחיקת כל הנתונים"
          body="מוחק אימונים, תוכניות ותרגילים. פעולה בלתי הפיכה — ייצא גיבוי לפני."
        >
          <Button full variant="danger" onClick={() => setConfirmWipe(true)}>
            <IconTrash className="h-5 w-5" />
            מחק הכל
          </Button>
        </Section>

        <p className="pb-4 text-center text-xs text-muted">
          כל הנתונים נשמרים במכשיר בלבד. אין שרת ואין חשבון.
        </p>
      </div>

      <ConfirmDialog
        open={confirmImport}
        title={mode === 'replace' ? 'להחליף את כל הנתונים?' : 'למזג את הגיבוי?'}
        body={
          mode === 'replace'
            ? 'כל מה שקיים כרגע במכשיר יימחק ויוחלף בתוכן הקובץ. אין דרך לבטל.'
            : 'רשומות שכבר קיימות אצלך יישארו כמו שהן, ורק מה שחסר יתווסף.'
        }
        confirmLabel={mode === 'replace' ? 'החלף הכל' : 'מזג'}
        destructive={mode === 'replace'}
        onCancel={() => setConfirmImport(false)}
        onConfirm={runImport}
      />

      <ConfirmDialog
        open={confirmWipe}
        title="למחוק את כל הנתונים?"
        body="כל האימונים, התוכניות והתרגילים יימחקו לצמיתות. האפליקציה תחזור למצב ההתחלתי: מאגר התרגילים ושלושת אימוני ברירת המחדל."
        confirmLabel="מחק הכל"
        destructive
        requireTyping="מחק"
        onCancel={() => setConfirmWipe(false)}
        onConfirm={runWipe}
      />
    </>
  );
}

function Section({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-bold">{title}</h2>
      <p className="mb-3 mt-0.5 text-sm leading-relaxed text-muted">{body}</p>
      {children}
    </section>
  );
}

function ModeOption({
  active,
  onClick,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-right transition-colors ${
        active ? 'border-volt bg-volt/5' : 'border-line bg-ink'
      }`}
    >
      <p className={`font-semibold ${active ? 'text-volt' : ''}`}>{title}</p>
      <p className="mt-0.5 text-xs leading-snug text-muted">{body}</p>
    </button>
  );
}

async function refreshStorage() {
  try {
    const estimate = await navigator.storage?.estimate?.();
    const persisted = (await navigator.storage?.persisted?.()) ?? false;
    return {
      usedMB: ((estimate?.usage ?? 0) / 1_048_576).toFixed(1),
      persisted,
    };
  } catch {
    return null;
  }
}
