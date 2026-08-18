import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconChevronLeft } from './icons';

/**
 * שורה גוללת אופקית עם רמז ברור שיש עוד תוכן: דעיכה בקצה + כפתור עגול
 * שגולל בלחיצה. פס הגלילה המובנה מוסתר (no-scrollbar) — הכפתור הוא
 * המנגנון היחיד שמוצג.
 *
 * ב-RTL הכיוונים הפוכים: "עוד תוכן" נמצא בצד שמאל (סוף ה-DOM) ושם
 * scrollLeft שלילי, אז שם מוצג הכפתור שגולל שמאלה.
 */

export function HScroller({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollStart, setCanScrollStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollStart(el.scrollLeft < -1);
    setCanScrollEnd(el.scrollLeft > -max + 1);
  };

  // בלי מערך תלויות: רץ אחרי כל רינדור כדי לתפוס גם שינוי בתוכן (מספר
  // הצ'יפים) ולא רק שינוי גודל. React מדלג על רינדור אם הערכים זהים.
  useEffect(update);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /**
   * גולל כמעט רוחב מסך שלם, כך ששתי לחיצות מכסות את כל הרשימה.
   *
   * השמה ישירה ל-scrollLeft במכוון, בלי behavior:'smooth' ובלי אנימציית
   * requestAnimationFrame: שתיהן נמצאו לא-פעילות בחלק מהסביבות — הגלילה
   * פשוט לא זזה, וחלק מהלחיצות "נבלעות" והכפתור נראה שבור. קפיצה מיידית
   * פחות מרשימה אבל עובדת תמיד, וזה מה שחשוב בשורה קצרה כזו.
   */
  const page = (direction: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollLeft += direction * el.clientWidth * 0.85;
    update();
  };

  const arrowClass =
    'tap pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-body shadow-hard';

  return (
    <div className="relative">
      <div ref={ref} onScroll={update} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {children}
      </div>

      {canScrollEnd && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-start bg-gradient-to-l from-surface via-surface/90 to-transparent">
          <button
            type="button"
            aria-label="גלול שמאלה לעוד קבוצות"
            onClick={() => page(-1)}
            className={arrowClass}
          >
            <IconChevronLeft className="h-4 w-4" />
          </button>
        </div>
      )}

      {canScrollStart && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex w-12 items-center justify-end bg-gradient-to-r from-surface via-surface/90 to-transparent">
          <button
            type="button"
            aria-label="גלול ימינה לתחילת הרשימה"
            onClick={() => page(1)}
            className={arrowClass}
          >
            <IconChevronLeft className="h-4 w-4 rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}
