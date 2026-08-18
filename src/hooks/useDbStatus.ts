import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { seedIfEmpty } from '../db/seed';

/**
 * ניטור בריאות החיבור ל-IndexedDB.
 *
 * למה זה נחוץ: אם החיבור נסגר באמצע (לשונית שנייה משדרגת גרסה, הדפדפן
 * מפנה אחסון, או המסד נמחק מבחוץ) — כל useLiveQuery פשוט מפסיק להחזיר
 * ערך, ו-ה-UI נתקע על ספינר לנצח בלי שום הודעה. במקום זה מזהים את
 * הניתוק, מנסים להתחבר מחדש, ורק אם באמת נכשלנו מציגים מסך שגיאה.
 */
export type DbStatus = 'ok' | 'reconnecting' | 'failed';

export function useDbStatus(): DbStatus {
  const [status, setStatus] = useState<DbStatus>(() => (db.isOpen() ? 'ok' : 'reconnecting'));

  useEffect(() => {
    let cancelled = false;
    let reopening = false;

    const reopen = async () => {
      if (cancelled || reopening || db.isOpen()) return;
      reopening = true;
      setStatus('reconnecting');
      try {
        await db.open();
        // אם המסד נמחק מבחוץ הוא נפתח מחדש ריק — מחזירים את מאגר התרגילים.
        await seedIfEmpty();
        if (!cancelled) setStatus('ok');
      } catch {
        if (!cancelled) setStatus('failed');
      } finally {
        reopening = false;
      }
    };

    const onClose = () => void reopen();
    db.on('close', onClose);

    // בדיקה תקופתית: אירוע close לא נורה בכל תרחיש ניתוק.
    const timer = window.setInterval(() => {
      if (db.isOpen()) setStatus((s) => (s === 'ok' ? s : 'ok'));
      else void reopen();
    }, 2000);

    if (!db.isOpen()) void reopen();

    return () => {
      cancelled = true;
      db.on('close').unsubscribe(onClose);
      window.clearInterval(timer);
    };
  }, []);

  return status;
}
