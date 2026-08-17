import { useEffect, useState } from 'react';

/** שעון שמתעדכן כל שנייה — לשעון "זמן מתחילת האימון". */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    const sync = () => setNow(Date.now());
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [intervalMs]);

  return now;
}
