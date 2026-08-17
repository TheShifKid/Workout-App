import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconChevronLeft } from './icons';

/**
 * שורה גוללת אופקית עם רמז ברור שיש עוד תוכן: דעיכה בקצה + חץ שגולל
 * בלחיצה. בלי זה (גלילה אילמת בלבד) קל לפספס שיש עוד קבוצות שריר
 * מעבר לקצה המסך.
 *
 * ב-RTL הכיוונים הפוכים: "עוד תוכן" נמצא בצד שמאל (סוף ה-DOM), אז שם
 * מוצג החץ שגולל שמאלה. גלילה חזרה לתחילת הרשימה אפשרית מהצד הימני.
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
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        {children}
      </div>

      {canScrollEnd && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-l from-surface to-transparent" />
          <button
            type="button"
            aria-label="גלול שמאלה לעוד קבוצות"
            onClick={() => scrollBy(-140)}
            className="tap absolute inset-y-0 left-0 flex w-8 items-center justify-center text-body"
          >
            <IconChevronLeft className="h-5 w-5" />
          </button>
        </>
      )}

      {canScrollStart && (
        <>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-r from-surface to-transparent" />
          <button
            type="button"
            aria-label="גלול ימינה לתחילת הרשימה"
            onClick={() => scrollBy(140)}
            className="tap absolute inset-y-0 right-0 flex w-8 items-center justify-center rotate-180 text-body"
          >
            <IconChevronLeft className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
