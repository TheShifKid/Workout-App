import { IconCheck, IconLock, IconTimer, IconTrash } from '../icons';
import { NumberStepper } from '../NumberStepper';
import type { SetLog, TrackingType } from '../../db/types';
import { REPS_STEP, WEIGHT_STEP } from '../../lib/constants';
import { formatDuration, formatWeight } from '../../lib/format';
import { useSetTimer } from '../../hooks/useSetTimer';
import type { Prefill } from '../../services/historyService';

/**
 * שורת סט אחת — היחידה שהכי הרבה נוגעים בה באמצע אימון.
 *
 * שורה עליונה: מספר הסט, מה עשית בפעם הקודמת, וכפתורי חימום/מחיקה
 * (או טיימר, בתרגיל מבוסס זמן).
 * שורה תחתונה: משקל, חזרות (או שניות), וי.
 *
 * סט שסומן כבוצע (ירוק) ננעל לעריכה: באמצע גלילה ביד אחת קל מאוד
 * להיתקל בכפתור ± ולשנות בטעות משקל שכבר נרשם. לחיצה על הוי מבטלת
 * את הסימון ומחזירה את השדות לעריכה.
 */
export function SetRow({
  log,
  prefill,
  trackingType,
  canRemove,
  onCommitWeight,
  onCommitReps,
  onCommitDuration,
  onToggleWarmup,
  onToggleDone,
  onRemove,
}: {
  log: SetLog;
  prefill: Prefill;
  trackingType: TrackingType;
  canRemove: boolean;
  onCommitWeight: (v: number | null) => void;
  onCommitReps: (v: number | null) => void;
  onCommitDuration: (v: number | null) => void;
  onToggleWarmup: () => void;
  onToggleDone: () => void;
  onRemove: () => void;
}) {
  const { activeSetLogId, elapsedSeconds, start, stop } = useSetTimer();

  const done = log.isDone === 1;
  const warmup = log.isWarmup === 1;
  const isTime = trackingType === 'time';
  const timing = activeSetLogId === log.id;

  const previousText = describePrevious(prefill, isTime);

  const toggleTimer = () => {
    if (timing) onCommitDuration(stop());
    else start(log.id);
  };

  return (
    <li
      className={`rounded-xl border px-2 py-2 transition-colors ${
        done
          ? 'border-volt bg-volt/8'
          : timing
            ? 'border-flame bg-flame/8'
            : warmup
              ? 'border-flame/40 bg-flame/5'
              : 'border-line bg-ink'
      }`}
    >
      <div className="mb-1.5 flex items-center gap-2 pr-1">
        <span
          className={`tnum-hero flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs ${
            warmup ? 'bg-flame/15 text-flame' : done ? 'bg-volt text-ink' : 'bg-surface-2 text-body'
          }`}
        >
          {warmup ? 'ח' : log.setNumber}
        </span>

        <span className="tnum min-w-0 flex-1 truncate text-xs text-muted">{previousText}</span>

        {done ? (
          // סט נעול: מסבירים למה אי אפשר לערוך, במקום להשאיר כפתורים מתים
          <span className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-bold text-volt">
            <IconLock className="h-3.5 w-3.5" />
            נעול
          </span>
        ) : (
          <>
            {isTime && (
              <button
                type="button"
                onClick={toggleTimer}
                aria-label={timing ? `עצור מדידה של סט ${log.setNumber}` : `מדוד סט ${log.setNumber}`}
                className={`tnum flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-bold transition-colors ${
                  timing ? 'bg-flame text-ink' : 'tap bg-surface-2 text-flame'
                }`}
              >
                <IconTimer className="h-3.5 w-3.5" />
                {timing ? `עצור ${formatDuration(elapsedSeconds)}` : 'מדוד'}
              </button>
            )}

            {!timing && (
              <>
                <button
                  type="button"
                  onClick={onToggleWarmup}
                  aria-pressed={warmup}
                  className={`shrink-0 rounded-md px-2 py-1.5 text-[11px] font-bold transition-colors ${
                    warmup ? 'bg-flame/15 text-flame' : 'tap text-muted'
                  }`}
                >
                  חימום
                </button>

                <button
                  type="button"
                  onClick={onRemove}
                  disabled={!canRemove}
                  aria-label={`מחק סט ${log.setNumber}`}
                  className="tap shrink-0 rounded-md p-1.5 text-muted disabled:opacity-25"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <NumberStepper
            value={log.weight}
            ghost={prefill.weight}
            step={WEIGHT_STEP}
            max={999}
            disabled={done}
            label={`משקל בסט ${log.setNumber}`}
            unit='ק"ג'
            onCommit={onCommitWeight}
          />
        </div>

        <div className="min-w-0 flex-1">
          {isTime ? (
            <NumberStepper
              // בזמן מדידה השדה מציג את הספירה החיה, וננעל כדי שלא יתנגש בה
              value={timing ? elapsedSeconds : log.durationSeconds}
              ghost={prefill.durationSeconds}
              step={5}
              max={7200}
              decimals={0}
              disabled={done || timing}
              label={`שניות בסט ${log.setNumber}`}
              unit="שנ׳"
              onCommit={onCommitDuration}
            />
          ) : (
            <NumberStepper
              value={log.reps}
              ghost={prefill.reps}
              step={REPS_STEP}
              max={999}
              decimals={0}
              disabled={done}
              label={`חזרות בסט ${log.setNumber}`}
              unit="חז׳"
              onCommit={onCommitReps}
            />
          )}
        </div>

        <button
          type="button"
          onClick={onToggleDone}
          aria-pressed={done}
          aria-label={done ? `בטל סימון סט ${log.setNumber}` : `סמן סט ${log.setNumber} כבוצע`}
          className={`flex h-12 w-14 shrink-0 items-center justify-center rounded-xl border-2 transition-colors ${
            done
              ? 'border-volt bg-volt text-ink'
              : 'border-line-strong bg-surface-2 text-muted hover-check'
          }`}
        >
          <IconCheck className="h-6 w-6" />
        </button>
      </div>
    </li>
  );
}

/** "קודם: 60 ק"ג × 8" / "קודם: 1:00" / "קודם: 20 ק"ג × 0:45" */
function describePrevious(prefill: Prefill, isTime: boolean): string {
  const { weight, reps, durationSeconds } = prefill;
  if (weight === null && reps === null && durationSeconds === null) return 'אין נתונים קודמים';

  const weightPart = weight !== null ? `${formatWeight(weight)} ק"ג` : '';

  if (isTime) {
    const timePart = durationSeconds !== null ? formatDuration(durationSeconds) : '—';
    return weightPart ? `קודם: ${weightPart} × ${timePart}` : `קודם: ${timePart}`;
  }

  return `קודם: ${weightPart || '—'} × ${reps ?? '—'}`;
}
