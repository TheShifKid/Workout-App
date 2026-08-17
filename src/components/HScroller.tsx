import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconChevronLeft } from './icons';

/**
 * שורה גוללת אופקית עם רמז ברור שיש עוד תוכן: דעיכה בקצה + כפתור עגול
 * שגולל בלחיצה. בלי זה (גלילה אילמת בלבד) קל לפספס שיש עוד קבוצות שריר
 * מעבר לקצה המסך. פס הגלילה המובנה של הדפדפן מוסתר (no-scrollbar) —
 * הכפתור המותאם הוא המנגנון היחיד שמוצג.
 *
 * ב-RTL הכיוונים הפוכים: "עוד תוכן" נמצא בצד שמאל (סוף ה-DOM), אז שם
 * מוצג הכפתור שגולל שמאלה. גלילה חזרה לתחילת הרשימה אפשרית מהצד הימני.
 */
export function HScroller({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollStart, setCanScrollStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    // בדפדפנים מודרניים ב-RTL, scrollLeft הוא 0 בתחילת הרשימה (מימין)
    // ושלילי ככל שגוללים שמאלה לעבר סוף התוכן.
    setCanScrollStart(scrollLeft < -1);
    setCanScrollEnd(scrollLeft > -(scrollWidth - clientWidth) + 1);
  };

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  const scrollBy = (delta: number) => ref.current?.scrollBy({ left: delta, behavior: 'smooth' });

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={update}
        className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4"
      >
        {children}
      </div>

      {canScrollEnd && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-start bg-gradient-to-l from-surface via-surface/90 to-transparent">
          <button
            type="button"
            aria-label="גלול שמאלה לעוד קבוצות"
            onClick={() => scrollBy(-140)}
            className="tap pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-body shadow-hard"
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
            onClick={() => scrollBy(140)}
            className="tap pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-body shadow-hard"
          >
            <IconChevronLeft className="h-4 w-4 rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}
