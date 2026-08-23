import { useEffect, useRef, useState } from 'react';
import { IconMinus, IconPlus } from './icons';

/**
 * שדה מספרי עם כפתורי ± גדולים.
 *
 * שתי התנהגויות שחשובות באמצע סט:
 * 1. ghost — הערך מהפעם הקודמת מוצג באפור בתוך השדה. הוא לא נשמר במסד
 *    עד שנוגעים בו או מסמנים וי, כך שאף פעם אין במסד נתון שלא אישרת.
 * 2. לחיצה ארוכה על ± מריצה קפיצות רצופות, במקום 12 נקישות.
 */
export function NumberStepper({
  value,
  ghost,
  step,
  min = 0,
  max = 9999,
  decimals = 2,
  label,
  unit,
  disabled,
  onCommit,
}: {
  value: number | null;
  ghost?: number | null;
  step: number;
  min?: number;
  max?: number;
  decimals?: number;
  label: string;
  /**
   * יחידת המידה שמוצגת בתוך השדה (ק"ג / חז׳ / שנ׳).
   * יושבת כאלמנט נפרד לצד המספר ולא כשכבה מעליו, אחרת היא מסתירה
   * אותו ברגע שהמספר ארוך — בדיוק הבאג שהיה כאן קודם.
   */
  unit?: string;
  /** נעול: מוצג לקריאה בלבד ולא ניתן לשינוי (סט שכבר סומן כבוצע). */
  disabled?: boolean;
  onCommit: (next: number | null) => void;
}) {
  const [text, setText] = useState(() => toText(value));
  const [focused, setFocused] = useState(false);
  const repeatRef = useRef<{ timeout?: number; interval?: number }>({});

  // כשהערך משתנה מבחוץ (טעינה, ביטול סימון) מסנכרנים — אבל לא תוך כדי הקלדה.
  useEffect(() => {
    if (!focused) setText(toText(value));
  }, [value, focused]);

  const usingGhost = value === null && ghost !== null && ghost !== undefined;
  const shown = focused ? text : toText(value) || (usingGhost ? toText(ghost) : '');

  const bump = (direction: 1 | -1) => {
    const base = value ?? ghost ?? 0;
    const next = clamp(round(base + direction * step, decimals), min, max);
    setText(toText(next));
    onCommit(next);
  };

  const startRepeat = (direction: 1 | -1) => {
    if (disabled) return;
    bump(direction);
    stopRepeat();
    repeatRef.current.timeout = window.setTimeout(() => {
      repeatRef.current.interval = window.setInterval(() => bump(direction), 110);
    }, 420);
  };

  const stopRepeat = () => {
    window.clearTimeout(repeatRef.current.timeout);
    window.clearInterval(repeatRef.current.interval);
    repeatRef.current = {};
  };

  useEffect(() => stopRepeat, []);

  const commitText = (raw: string) => {
    const normalized = raw.replace(',', '.').trim();
    if (normalized === '') {
      onCommit(null);
      return;
    }
    const parsed = Number(normalized);
    if (Number.isNaN(parsed)) {
      setText(toText(value));
      return;
    }
    const next = clamp(round(parsed, decimals), min, max);
    setText(toText(next));
    onCommit(next);
  };

  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border border-line-strong bg-ink">
      <button
        type="button"
        aria-label={`הפחת ${label}`}
        disabled={disabled}
        onPointerDown={() => startRepeat(-1)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onPointerCancel={stopRepeat}
        onContextMenu={(e) => e.preventDefault()}
        className="flex w-10 shrink-0 items-center justify-center border-l border-line-strong bg-surface-2 text-muted hover-stepper disabled:opacity-25"
      >
        <IconMinus className="h-5 w-5" />
      </button>

      {/*
        היחידה יושבת מתחת למספר ולא לצידו: במסך צר נשארים לשדה כ-32px
        בלבד אחרי שני כפתורי ה-±, וזוג "45 ק״ג" באותה שורה פשוט נחתך.
        למטה יש מקום פנוי, אז היחידה גלויה תמיד בלי לגזול רוחב מהמספר.
      */}
      <div
        className="flex h-12 min-w-0 flex-1 flex-col items-center justify-center"
        onClick={(e) => {
          if (disabled) return;
          (e.currentTarget.querySelector('input') as HTMLInputElement | null)?.focus();
        }}
      >
        <input
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          aria-label={label}
          disabled={disabled}
          value={shown}
          onFocus={(e) => {
            setFocused(true);
            setText(toText(value));
            requestAnimationFrame(() => e.target.select());
          }}
          onBlur={(e) => {
            setFocused(false);
            commitText(e.target.value);
          }}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className={`tnum-hero w-full min-w-0 bg-transparent text-center text-xl leading-none outline-none ${
            usingGhost && !focused ? 'text-muted' : 'text-body'
          } ${disabled ? 'cursor-default' : ''}`}
        />
        {unit && (
          <span className="mt-0.5 text-[9px] font-bold leading-none text-muted">{unit}</span>
        )}
      </div>

      <button
        type="button"
        aria-label={`הוסף ${label}`}
        disabled={disabled}
        onPointerDown={() => startRepeat(1)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onPointerCancel={stopRepeat}
        onContextMenu={(e) => e.preventDefault()}
        className="flex w-10 shrink-0 items-center justify-center border-r border-line-strong bg-surface-2 text-muted hover-stepper disabled:opacity-25"
      >
        <IconPlus className="h-5 w-5" />
      </button>
    </div>
  );
}

function toText(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  return String(n);
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
