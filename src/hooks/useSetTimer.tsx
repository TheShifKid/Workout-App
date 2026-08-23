import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * טיימר למדידת סט מבוסס-זמן (פלאנק, הליכת חווה) — סופר למעלה במקום למטה.
 *
 * כמו טיימר המנוחה, נשמר רק ה-timestamp שבו התחלנו ולא הספירה עצמה, כך
 * שהמדידה נשארת מדויקת גם אם המסך כבה או הדף נטען מחדש באמצע החזקה.
 * טיימר אחד בלבד פעיל בכל רגע — אי אפשר להחזיק שני פלאנקים במקביל.
 *
 * זו מדידה זמנית שעדיין לא אושרה, ולכן localStorage ולא IndexedDB:
 * הערך נכנס לנתוני האימון רק כשעוצרים.
 */

const STORAGE_KEY = 'workout-app:set-timer';

interface StoredSetTimer {
  setLogId: string;
  startedAt: number;
}

interface SetTimerValue {
  /** מזהה הסט שנמדד כרגע, אם יש. */
  activeSetLogId: string | null;
  /** שניות שחלפו מתחילת המדידה. */
  elapsedSeconds: number;
  start: (setLogId: string) => void;
  /** עוצר ומחזיר את המשך שנמדד, כדי שהקורא ישמור אותו. */
  stop: () => number;
  cancel: () => void;
}

const SetTimerContext = createContext<SetTimerValue | null>(null);

function read(): StoredSetTimer | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSetTimer;
    if (typeof parsed?.startedAt !== 'number' || typeof parsed?.setLogId !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function SetTimerProvider({ children }: { children: ReactNode }) {
  const [timer, setTimer] = useState<StoredSetTimer | null>(read);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timer) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [timer]);

  // חזרה לאפליקציה מיישרת מיד את הזמן במקום לחכות לטיק הבא.
  useEffect(() => {
    const sync = () => setNow(Date.now());
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const start = useCallback((setLogId: string) => {
    const next = { setLogId, startedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setTimer(next);
    setNow(Date.now());
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setTimer(null);
  }, []);

  const stop = useCallback(() => {
    const seconds = timer ? Math.max(0, Math.round((Date.now() - timer.startedAt) / 1000)) : 0;
    clear();
    return seconds;
  }, [timer, clear]);

  const value = useMemo<SetTimerValue>(
    () => ({
      activeSetLogId: timer?.setLogId ?? null,
      elapsedSeconds: timer ? Math.max(0, Math.round((now - timer.startedAt) / 1000)) : 0,
      start,
      stop,
      cancel: clear,
    }),
    [timer, now, start, stop, clear],
  );

  return <SetTimerContext.Provider value={value}>{children}</SetTimerContext.Provider>;
}

export function useSetTimer(): SetTimerValue {
  const ctx = useContext(SetTimerContext);
  if (!ctx) throw new Error('useSetTimer חייב לרוץ בתוך SetTimerProvider');
  return ctx;
}
