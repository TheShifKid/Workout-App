import { IconCheck, IconTrash } from '../icons';
import { NumberStepper } from '../NumberStepper';
import type { SetLog } from '../../db/types';
import { REPS_STEP, WEIGHT_STEP } from '../../lib/constants';
import { formatWeight } from '../../lib/format';

/**
 * שורת סט אחת — היחידה שהכי הרבה נוגעים בה באמצע אימון.
 *
 * שורה עליונה: מספר הסט, מה עשית בפעם הקודמת, וכפתורי חימום/מחיקה.
 * שורה תחתונה: משקל, חזרות, וי.
 *
 * חימום (כתום/להבה) ובוצע (ליים) מקבלים שני צבעים שונים לגמרי —
 * כדי שאף פעם אי אפשר לבלבל בין "לא נספר בסטטיסטיקה" לבין "בוצע".
 */
export function SetRow({
  log,
  prefill,
  canRemove,
  onCommitWeight,
  onCommitReps,
  onToggleWarmup,
  onToggleDone,
  onRemove,
}: {
  log: SetLog;
  prefill: { weight: number | null; reps: number | null };
  canRemove: boolean;
  onCommitWeight: (v: number | null) => void;
  onCommitReps: (v: number | null) => void;
  onToggleWarmup: () => void;
  onToggleDone: () => void;
  onRemove: () => void;
}) {
  const done = log.isDone === 1;
  const warmup = log.isWarmup === 1;

  const previousText =
    prefill.weight !== null || prefill.reps !== null
      ? `קודם: ${formatWeight(prefill.weight)} ק"ג × ${prefill.reps ?? '—'}`
      : 'אין נתונים קודמים';

  return (
    <li
      className={`rounded-xl border px-2 py-2 transition-colors ${
        done
          ? 'border-volt bg-volt/8'
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
      </div>

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <NumberStepper
            value={log.weight}
            ghost={prefill.weight}
            step={WEIGHT_STEP}
            max={999}
            label={`משקל בסט ${log.setNumber}`}
            suffix='ק"ג'
            onCommit={onCommitWeight}
          />
        </div>

        <div className="min-w-0 flex-1">
          <NumberStepper
            value={log.reps}
            ghost={prefill.reps}
            step={REPS_STEP}
            max={999}
            decimals={0}
            label={`חזרות בסט ${log.setNumber}`}
            suffix="חז׳"
            onCommit={onCommitReps}
          />
        </div>

        <button
          type="button"
          onClick={onToggleDone}
          aria-pressed={done}
          aria-label={done ? `בטל סימון סט ${log.setNumber}` : `סמן סט ${log.setNumber} כבוצע`}
          className={`flex h-12 w-14 shrink-0 items-center justify-center rounded-xl border-2 transition-colors ${
            done
              ? 'border-volt bg-volt text-ink'
              : 'border-line-strong bg-surface-2 text-muted active:border-volt active:text-volt'
          }`}
        >
          <IconCheck className="h-6 w-6" />
        </button>
      </div>
    </li>
  );
}
