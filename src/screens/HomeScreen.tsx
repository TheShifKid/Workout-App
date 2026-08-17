import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { IconPencil, IconPlay, IconPlus } from '../components/icons';
import { Sheet } from '../components/Sheet';
import { Button, EmptyState, ScreenHeader, Spinner } from '../components/ui';
import type { ID } from '../db/types';
import { useActiveSession, useWorkoutsWithLast } from '../hooks/useData';
import { formatRelativeDay, plural } from '../lib/format';
import { createWorkout } from '../services/planService';
import {
  discardSession,
  finishSession,
  sessionHasData,
  startSession,
} from '../services/sessionService';

export function HomeScreen() {
  const navigate = useNavigate();
  const rows = useWorkoutsWithLast();
  const activeSession = useActiveSession();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  /** סוג האימון שמחכה להחלטה כי יש כבר אימון פעיל. */
  const [pendingWorkoutId, setPendingWorkoutId] = useState<ID | null>(null);

  const begin = async (workoutId: ID) => {
    if (activeSession) {
      setPendingWorkoutId(workoutId);
      return;
    }
    navigate(`/session/${await startSession(workoutId)}`);
  };

  const closeActiveAndStart = async () => {
    if (!activeSession || !pendingWorkoutId) return;
    // אימון שלא נרשם בו כלום נמחק; אימון עם נתונים נסגר ונשמר בהיסטוריה.
    const hasData = await sessionHasData(activeSession.id);
    await (hasData ? finishSession(activeSession.id) : discardSession(activeSession.id));
    const id = await startSession(pendingWorkoutId);
    setPendingWorkoutId(null);
    navigate(`/session/${id}`);
  };

  const submitNewWorkout = async () => {
    const id = await createWorkout(newName);
    setNewName('');
    setCreating(false);
    navigate(`/workout/${id}/edit`);
  };

  return (
    <>
      <ScreenHeader
        title="אימונים"
        action={
          <Button variant="ghost" onClick={() => setCreating(true)} aria-label="סוג אימון חדש">
            <IconPlus />
          </Button>
        }
      />

      {activeSession && (
        <button
          type="button"
          onClick={() => navigate(`/session/${activeSession.id}`)}
          className="flex w-full items-center gap-3 border-b-2 border-volt bg-volt/10 px-4 py-3 text-right"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-volt opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-volt" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-volt">
              המשך אימון
            </span>
            <span className="block truncate font-bold">
              {activeSession.workoutName}
              <span className="font-normal text-muted">
                {' · התחיל '}
                {formatRelativeDay(activeSession.startedAt)}
              </span>
            </span>
          </span>
          <IconPlay className="h-5 w-5 shrink-0 text-volt" />
        </button>
      )}

      <div className="flex flex-col gap-3 p-4">
        {!rows ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState
            title="עוד אין סוגי אימון"
            body="סוג אימון הוא תבנית קבועה — למשל ״דחיפה״ או ״רגליים״. צור אחד, הוסף לו תרגילים, ומשם כל אימון מתחיל בלחיצה אחת."
            action={
              <Button variant="primary" onClick={() => setCreating(true)}>
                <IconPlus className="h-5 w-5" />
                צור סוג אימון
              </Button>
            }
          />
        ) : (
          rows.map(({ workout, lastSession, exerciseCount }) => (
            <div
              key={workout.id}
              className="flex items-stretch rounded-2xl border border-line bg-surface"
              style={{ boxShadow: `3px 3px 0 0 ${workout.color}` }}
            >
              <div className="w-2 shrink-0 rounded-s-2xl" style={{ backgroundColor: workout.color }} />

              <button
                type="button"
                onClick={() => navigate(`/workout/${workout.id}/edit`)}
                className="min-w-0 flex-1 px-4 py-3 text-right active:bg-surface-2"
              >
                <p className="truncate text-xl font-extrabold tracking-tight">{workout.name}</p>
                <p className="truncate text-xs text-muted">
                  {exerciseCount > 0
                    ? plural(exerciseCount, 'תרגיל אחד', 'תרגילים')
                    : 'עדיין בלי תרגילים'}
                  {' · '}
                  {lastSession ? `בוצע ${formatRelativeDay(lastSession.startedAt)}` : 'טרם בוצע'}
                </p>
              </button>

              <div className="flex shrink-0 items-center gap-1 pl-3">
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/workout/${workout.id}/edit`)}
                  aria-label={`ערוך את ${workout.name}`}
                  className="px-2"
                >
                  <IconPencil className="h-5 w-5 text-muted" />
                </Button>
                <Button
                  variant="primary"
                  onClick={() => begin(workout.id)}
                  disabled={exerciseCount === 0}
                  aria-label={`התחל ${workout.name}`}
                  className="px-4"
                >
                  התחל
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title="סוג אימון חדש"
        footer={
          <Button full variant="primary" disabled={!newName.trim()} onClick={submitNewWorkout}>
            צור והוסף תרגילים
          </Button>
        }
      >
        <label className="text-sm text-muted">שם האימון</label>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && newName.trim() && submitNewWorkout()}
          placeholder="דחיפה / משיכה / רגליים…"
          autoFocus
          className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-3 outline-none focus:border-volt"
        />
      </Sheet>

      <ConfirmDialog
        open={pendingWorkoutId !== null}
        title="יש אימון פעיל"
        body={
          <>
            <span className="block">
              האימון ״{activeSession?.workoutName}״ עדיין פתוח. אפשר להמשיך אותו, או לסגור אותו
              ולהתחיל חדש.
            </span>
            <span className="mt-2 block text-xs">
              אם לא נרשם בו כלום הוא פשוט יימחק — אחרת הוא יישמר בהיסטוריה.
            </span>
          </>
        }
        cancelLabel="המשך את הקיים"
        confirmLabel="סגור והתחל חדש"
        onCancel={() => {
          const id = activeSession?.id;
          setPendingWorkoutId(null);
          if (id) navigate(`/session/${id}`);
        }}
        onConfirm={closeActiveAndStart}
      />
    </>
  );
}
