import { useRestTimer } from '../hooks/useRestTimer';
import { formatDuration } from '../lib/format';

/**
 * בר טיימר המנוחה — נעוץ לתחתית מסך האימון.
 * הכפתורים גדולים ומרוחקים כדי שאפשר יהיה לדלג באגודל בלי להסתכל.
 */
export function RestTimerBar() {
  const { remainingSeconds, totalSeconds, label, isRunning, addSeconds, skip } = useRestTimer();

  if (!isRunning) return null;

  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const almostDone = remainingSeconds <= 10;

  return (
    <div className="pb-safe border-t border-line bg-surface px-3 pt-2">
      <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-linear ${
            almostDone ? 'bg-danger' : 'bg-volt'
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => addSeconds(-15)}
          className="touch shrink-0 rounded-xl border border-line px-3 text-sm text-muted active:bg-surface-2"
        >
          ‎−15
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p
            className={`tnum text-2xl font-bold leading-none ${almostDone ? 'text-danger' : 'text-volt'}`}
          >
            {formatDuration(remainingSeconds)}
          </p>
          <p className="truncate text-[11px] text-muted">{label || 'מנוחה'}</p>
        </div>

        <button
          type="button"
          onClick={() => addSeconds(15)}
          className="touch shrink-0 rounded-xl border border-line px-3 text-sm text-muted active:bg-surface-2"
        >
          ‎+15
        </button>

        <button
          type="button"
          onClick={skip}
          className="touch shrink-0 rounded-xl bg-volt px-4 text-sm font-bold text-ink active:bg-volt-dim"
        >
          דלג
        </button>
      </div>
    </div>
  );
}
