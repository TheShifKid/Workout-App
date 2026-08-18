import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ExercisePicker } from '../components/ExercisePicker';
import { IconNote, IconPlus } from '../components/icons';
import { RestTimerBar } from '../components/RestTimerBar';
import { SessionExerciseCard } from '../components/session/SessionExerciseCard';
import { Sheet } from '../components/Sheet';
import { Button, EmptyState, ScreenHeader, Spinner, Stat } from '../components/ui';
import type { ID } from '../db/types';
import {
  useExerciseMap,
  usePreviousPerformances,
  useSession,
  useSessionExercises,
  useSessionSetLogs,
} from '../hooks/useData';
import { useNow } from '../hooks/useNow';
import { formatDuration, formatNumber, plural } from '../lib/format';
import { setExerciseDefaultNote } from '../services/exerciseLibraryService';
import {
  addExerciseToSession,
  discardSession,
  finishSession,
  sessionHasData,
  setSessionNote,
} from '../services/sessionService';
import { summarizeSession } from '../services/statsService';

/**
 * מסך האימון הפעיל.
 * כל שינוי נשמר מיד ל-IndexedDB — אין "שמור". סגירת הדפדפן באמצע אימון
 * לא מאבדת כלום, והחזרה למסך משחזרת בדיוק את אותו מצב.
 */
export function ActiveSessionScreen() {
  const { sessionId } = useParams<{ sessionId: ID }>();
  const navigate = useNavigate();

  const session = useSession(sessionId);
  const snapshots = useSessionExercises(sessionId);
  const logs = useSessionSetLogs(sessionId);
  const exerciseMap = useExerciseMap();
  const now = useNow();

  const exerciseIds = useMemo(() => snapshots?.map((s) => s.exerciseId) ?? [], [snapshots]);
  const previousMap = usePreviousPerformances(exerciseIds, sessionId);

  const [picking, setPicking] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [defaultNoteFor, setDefaultNoteFor] = useState<ID | null>(null);
  const [defaultNoteDraft, setDefaultNoteDraft] = useState('');
  const [confirmFinish, setConfirmFinish] = useState(false);

  if (session === undefined || snapshots === undefined || logs === undefined || !exerciseMap) {
    return <Spinner />;
  }

  if (session === null) {
    return (
      <div className="p-4">
        <EmptyState
          title="האימון לא נמצא"
          body="ייתכן שנמחק או שהקישור ישן. חזור למסך הבית כדי להתחיל אימון."
          action={<Button onClick={() => navigate('/')}>למסך הבית</Button>}
        />
      </div>
    );
  }

  const summary = summarizeSession(session, logs, now);
  const isFinished = session.endedAt !== null;

  const openSessionNote = () => {
    setNoteDraft(session.sessionNote);
    setNoteOpen(true);
  };

  const openDefaultNote = (exerciseId: ID) => {
    setDefaultNoteDraft(exerciseMap.get(exerciseId)?.defaultNote ?? '');
    setDefaultNoteFor(exerciseId);
  };

  const finish = async () => {
    // אימון שלא נרשם בו כלום לא ראוי להיכנס להיסטוריה.
    if (await sessionHasData(session.id)) {
      await finishSession(session.id);
      navigate(`/history/${session.id}`, { replace: true });
    } else {
      await discardSession(session.id);
      navigate('/', { replace: true });
    }
  };

  return (
    <>
      <ScreenHeader
        title={session.workoutName}
        back="/"
        action={
          <Button variant="ghost" onClick={openSessionNote} aria-label="הערה לאימון">
            <IconNote className={session.sessionNote ? 'text-volt' : ''} />
          </Button>
        }
      />

      <div className="flex gap-3 border-b border-line bg-surface px-4 py-2.5">
        <Stat label="זמן" value={formatDuration(summary.durationSeconds)} />
        <Stat
          label="סטים"
          value={`${summary.completedSets}/${summary.plannedSets}`}
          hint="הושלמו"
        />
        <Stat label="נפח" value={formatNumber(summary.volume)} hint='ק"ג' />
      </div>

      {session.sessionNote && (
        <button
          type="button"
          onClick={openSessionNote}
          className="block w-full border-b border-line bg-surface-2 px-4 py-2 text-right text-sm text-muted"
        >
          {session.sessionNote}
        </button>
      )}

      <div className="flex-1 space-y-3 p-3">
        {snapshots.length === 0 ? (
          <EmptyState
            title="אין תרגילים באימון הזה"
            body="התוכנית של סוג האימון הייתה ריקה. אפשר להוסיף תרגילים עכשיו — הם יירשמו לאימון הנוכחי בלבד."
            action={
              <Button variant="primary" onClick={() => setPicking(true)}>
                <IconPlus className="h-5 w-5" />
                הוסף תרגיל
              </Button>
            }
          />
        ) : (
          snapshots.map((snapshot) => (
            <SessionExerciseCard
              key={snapshot.id}
              snapshot={snapshot}
              exercise={exerciseMap.get(snapshot.exerciseId)}
              logs={logs.filter((l) => l.exerciseId === snapshot.exerciseId)}
              previous={previousMap?.get(snapshot.exerciseId) ?? null}
              onEditDefaultNote={() => openDefaultNote(snapshot.exerciseId)}
            />
          ))
        )}

        {snapshots.length > 0 && (
          <Button full onClick={() => setPicking(true)}>
            <IconPlus className="h-5 w-5" />
            הוסף תרגיל לאימון
          </Button>
        )}
      </div>

      <div className="sticky bottom-0 z-30">
        <RestTimerBar />
        <div className="pb-safe border-t border-line bg-ink px-4 pt-3">
          <Button full variant="primary" onClick={() => setConfirmFinish(true)}>
            {isFinished ? 'חזור להיסטוריה' : 'סיים אימון'}
          </Button>
        </div>
      </div>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        excludeIds={exerciseIds}
        title="הוספת תרגיל לאימון"
        onPick={(exerciseId) => addExerciseToSession(session.id, exerciseId)}
      />

      <Sheet
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="הערה לאימון הזה"
        footer={
          <Button
            full
            variant="primary"
            onClick={async () => {
              await setSessionNote(session.id, noteDraft.trim());
              setNoteOpen(false);
            }}
          >
            שמור
          </Button>
        }
      >
        <p className="mb-2 text-sm text-muted">
          נשמרת על האימון הזה בלבד — למשל ״כאב בכתף״, ״ישנתי גרוע״.
        </p>
        <textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          rows={5}
          autoFocus
          className="w-full rounded-xl border border-line bg-ink p-3 leading-relaxed outline-none focus:border-volt"
        />
      </Sheet>

      <Sheet
        open={defaultNoteFor !== null}
        onClose={() => setDefaultNoteFor(null)}
        title="הערה קבועה לתרגיל"
        footer={
          <Button
            full
            variant="primary"
            onClick={async () => {
              if (defaultNoteFor) {
                await setExerciseDefaultNote(defaultNoteFor, defaultNoteDraft.trim());
              }
              setDefaultNoteFor(null);
            }}
          >
            שמור
          </Button>
        }
      >
        <p className="mb-2 text-sm text-muted">
          {defaultNoteFor && exerciseMap.get(defaultNoteFor)?.name} — ההערה תוצג בכל פעם שתעשה את
          התרגיל, בכל אימון.
        </p>
        <textarea
          value={defaultNoteDraft}
          onChange={(e) => setDefaultNoteDraft(e.target.value)}
          rows={4}
          autoFocus
          placeholder="למשל: מרפקים צמודים, מושב בגובה 4"
          className="w-full rounded-xl border border-line bg-ink p-3 leading-relaxed outline-none focus:border-volt"
        />
      </Sheet>

      <ConfirmDialog
        open={confirmFinish}
        title="לסיים את האימון?"
        body={
          <>
            <span className="block">
              {plural(summary.completedSets, 'סט אחד הושלם', 'סטים הושלמו')}, נפח{' '}
              {formatNumber(summary.volume)} ק"ג, משך{' '}
              {formatDuration(summary.durationSeconds)}.
            </span>
            <span className="mt-2 block text-xs">
              שורות סט שנשארו ריקות ולא סומנו יימחקו. תמיד אפשר לפתוח את האימון מחדש מההיסטוריה.
            </span>
          </>
        }
        confirmLabel="סיים אימון"
        onCancel={() => setConfirmFinish(false)}
        onConfirm={finish}
      />
    </>
  );
}
