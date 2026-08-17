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
  suffix,
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
  suffix?: string;
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

  const bump = (direction: 1 | -1) => {
    const base = value ?? ghost ?? 0;
    const next = clamp(round(base + direction * step, decimals), min, max);
    setText(toText(next));
    onCommit(next);
  };

  const startRepeat = (direction: 1 | -1) => {
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
    <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-ink">
      <button
        type="button"
        aria-label={`הפחת ${label}`}
        disabled={disabled}
        onPointerDown={() => startRepeat(-1)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onPointerCancel={stopRepeat}
        onContextMenu={(e) => e.preventDefault()}
        className="flex w-11 shrink-0 items-center justify-center text-muted active:bg-surface-2 active:text-body disabled:opacity-30"
      >
        <IconMinus className="h-5 w-5" />
      </button>

      <div className="relative flex min-w-0 flex-1 items-center">
        <input
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          aria-label={label}
          disabled={disabled}
          value={focused ? text : (toText(value) || (usingGhost ? toText(ghost) : ''))}
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
          className={`tnum h-12 w-full bg-transparent text-center text-lg font-semibold outline-none ${
            usingGhost && !focused ? 'text-muted' : 'text-body'
          }`}
        />
        {suffix && (
          <span className="pointer-events-none absolute left-2 text-[11px] text-muted">
            {suffix}
          </span>
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
        className="flex w-11 shrink-0 items-center justify-center text-muted active:bg-surface-2 active:text-body disabled:opacity-30"
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
