import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_REST_SECONDS } from '../lib/constants';

/**
 * טיימר המנוחה.
 *
 * הטיימר שומר רק את הזמן שבו הוא אמור להסתיים (timestamp) ב-localStorage,
 * ולא ספירה לאחור ב-state. לכן הוא נשאר מדויק גם אם המסך כובה, הדפדפן
 * מוזער או הדף נטען מחדש — מה שקורה בפועל כל אימון.
 *
 * זו העדפת תצוגה ולא נתוני אימון, ולכן localStorage מותר כאן.
 */

const STORAGE_KEY = 'workout-app:rest-timer';

interface StoredTimer {
  endsAt: number;
  totalSeconds: number;
  label: string;
}

interface RestTimerValue {
  remainingSeconds: number;
  totalSeconds: number;
  label: string;
  isRunning: boolean;
  start: (seconds?: number, label?: string) => void;
  addSeconds: (delta: number) => void;
  skip: () => void;
}

const RestTimerContext = createContext<RestTimerValue | null>(null);

function read(): StoredTimer | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTimer;
    if (typeof parsed?.endsAt !== 'number') return null;
    if (parsed.endsAt <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [timer, setTimer] = useState<StoredTimer | null>(read);
  const [now, setNow] = useState(() => Date.now());
  const alertedRef = useRef(false);

  // טיק כל חצי שנייה — מספיק חלק לתצוגה ולא מעיר את המכשיר לחינם.
  useEffect(() => {
    if (!timer) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [timer]);

  // כשחוזרים לאפליקציה, מיישרים מיד את הזמן במקום לחכות לטיק הבא.
  useEffect(() => {
    const sync = () => setNow(Date.now());
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const remainingMs = timer ? timer.endsAt - now : 0;
  const isRunning = !!timer && remainingMs > 0;

  // רטט קצר בסיום. אם המכשיר לא תומך — פשוט לא קורה כלום.
  useEffect(() => {
    if (!timer) {
      alertedRef.current = false;
      return;
    }
    if (remainingMs > 0 || alertedRef.current) return;

    alertedRef.current = true;
    navigator.vibrate?.([180, 90, 180]);

    const id = window.setTimeout(() => {
      setTimer(null);
      localStorage.removeItem(STORAGE_KEY);
    }, 4000);
    return () => window.clearTimeout(id);
  }, [remainingMs, timer]);

  const persist = useCallback((next: StoredTimer | null) => {
    setTimer(next);
    setNow(Date.now());
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const start = useCallback(
    (seconds = DEFAULT_REST_SECONDS, label = '') => {
      const total = Math.max(5, Math.round(seconds));
      alertedRef.current = false;
      persist({ endsAt: Date.now() + total * 1000, totalSeconds: total, label });
    },
    [persist],
  );

  const addSeconds = useCallback(
    (delta: number) => {
      setTimer((current) => {
        if (!current) return current;
        const endsAt = Math.max(Date.now() + 1000, current.endsAt + delta * 1000);
        const next = {
          ...current,
          endsAt,
          totalSeconds: Math.max(5, current.totalSeconds + delta),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        alertedRef.current = false;
        return next;
      });
      setNow(Date.now());
    },
    [],
  );

  const skip = useCallback(() => persist(null), [persist]);

  const value = useMemo<RestTimerValue>(
    () => ({
      remainingSeconds: Math.max(0, Math.ceil(remainingMs / 1000)),
      totalSeconds: timer?.totalSeconds ?? 0,
      label: timer?.label ?? '',
      isRunning,
      start,
      addSeconds,
      skip,
    }),
    [remainingMs, timer, isRunning, start, addSeconds, skip],
  );

  return <RestTimerContext.Provider value={value}>{children}</RestTimerContext.Provider>;
}

export function useRestTimer(): RestTimerValue {
  const ctx = useContext(RestTimerContext);
  if (!ctx) throw new Error('useRestTimer חייב לרוץ בתוך RestTimerProvider');
  return ctx;
}
