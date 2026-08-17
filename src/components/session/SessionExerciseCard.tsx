import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Exercise, SessionExercise, SetLog } from '../../db/types';
import { useRestTimer } from '../../hooks/useRestTimer';
import { formatRelativeDay, formatRepRange } from '../../lib/format';
import { prefillForSet, type PreviousPerformance } from '../../services/historyService';
import {
  addSet,
  removeExerciseFromSession,
  removeSet,
  setDone,
  updateSet,
} from '../../services/sessionService';
import { ConfirmDialog } from '../ConfirmDialog';
import { IconChart, IconNote, IconPlus, IconTrash } from '../icons';
import { Button, IconButton } from '../ui';
import { SetRow } from './SetRow';

/** תרגיל אחד בתוך מסך האימון הפעיל, על כל הסטים שלו. */
export function SessionExerciseCard({
  snapshot,
  exercise,
  logs,
  previous,
  onEditDefaultNote,
}: {
  snapshot: SessionExercise;
  exercise: Exercise | undefined;
  logs: SetLog[];
  previous: PreviousPerformance | null;
  onEditDefaultNote: () => void;
}) {
  const { start } = useRestTimer();
  const [confirmRemove, setConfirmRemove] = useState(false);

  const sets = [...logs].sort((a, b) => a.setNumber - b.setNumber);
  const doneCount = sets.filter((s) => s.isDone === 1 && s.isWarmup === 0).length;
  const workingCount = sets.filter((s) => s.isWarmup === 0).length;

  const toggleDone = async (log: SetLog) => {
    const nowDone = log.isDone === 0;
    await setDone(log.id, nowDone, prefillForSet(previous, log.setNumber));
    // טיימר מתחיל רק בסימון, ורק לסט עבודה — אין טעם לנוח אחרי חימום קל.
    if (nowDone && log.isWarmup === 0 && snapshot.restSeconds > 0) {
      start(snapshot.restSeconds, snapshot.exerciseName);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <header className="flex items-start gap-2 border-b border-line px-3 py-3">
        <div className="min-w-0 flex-1">
          <Link
            to={`/exercise/${snapshot.exerciseId}`}
            className="flex items-center gap-1.5 font-bold"
          >
            <span className="truncate">{exercise?.name ?? snapshot.exerciseName}</span>
            <IconChart className="h-4 w-4 shrink-0 text-muted" />
          </Link>
          <p className="tnum text-xs text-muted">
            יעד {snapshot.targetSets} × {formatRepRange(snapshot.targetRepsMin, snapshot.targetRepsMax)}
            {' · '}
            {doneCount}/{workingCount} סטים
            {previous && ` · פעם קודמת ${formatRelativeDay(previous.session.startedAt)}`}
          </p>
        </div>

        <IconButton label="הערה קבועה לתרגיל" onClick={onEditDefaultNote} className="shrink-0">
          <IconNote className={`h-5 w-5 ${exercise?.defaultNote ? 'text-volt' : ''}`} />
        </IconButton>
        <IconButton
          label="הסר תרגיל מהאימון"
          onClick={() => setConfirmRemove(true)}
          className="shrink-0"
        >
          <IconTrash className="h-5 w-5" />
        </IconButton>
      </header>

      {(exercise?.defaultNote || snapshot.note) && (
        <div className="space-y-1 border-b border-line bg-volt/5 px-3 py-2">
          {exercise?.defaultNote && (
            <button
              type="button"
              onClick={onEditDefaultNote}
              className="block w-full text-right text-sm leading-snug text-volt"
            >
              {exercise.defaultNote}
            </button>
          )}
          {snapshot.note && (
            <p className="text-xs leading-snug text-muted">מהתוכנית: {snapshot.note}</p>
          )}
        </div>
      )}

      <ul className="flex flex-col gap-2 p-2">
        {sets.map((log) => (
          <SetRow
            key={log.id}
            log={log}
            prefill={prefillForSet(previous, log.setNumber)}
            canRemove={sets.length > 1}
            onCommitWeight={(v) => updateSet(log.id, { weight: v })}
            onCommitReps={(v) => updateSet(log.id, { reps: v })}
            onToggleWarmup={() => updateSet(log.id, { isWarmup: log.isWarmup === 1 ? 0 : 1 })}
            onToggleDone={() => toggleDone(log)}
            onRemove={() => removeSet(log.id)}
          />
        ))}
      </ul>

      <div className="px-2 pb-2">
        <Button full onClick={() => addSet(snapshot.sessionId, snapshot.exerciseId)}>
          <IconPlus className="h-5 w-5" />
          הוסף סט
        </Button>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title={`להסיר את ${snapshot.exerciseName} מהאימון?`}
        body="כל הסטים שנרשמו לתרגיל הזה באימון הנוכחי יימחקו. התוכנית וההיסטוריה מאימונים קודמים לא ישתנו."
        confirmLabel="הסר"
        destructive
        onCancel={() => setConfirmRemove(false)}
        onConfirm={async () => {
          await removeExerciseFromSession(snapshot.sessionId, snapshot.exerciseId);
          setConfirmRemove(false);
        }}
      />
    </section>
  );
}
