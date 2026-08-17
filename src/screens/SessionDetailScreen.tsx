import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { IconChart, IconNote, IconPencil, IconTrash } from '../components/icons';
import { Sheet } from '../components/Sheet';
import { Button, EmptyState, IconButton, ScreenHeader, Spinner, Stat } from '../components/ui';
import type { ID } from '../db/types';
import { useSessionDetail } from '../hooks/useData';
import {
  formatDateLong,
  formatDuration,
  formatNumber,
  formatTime,
  formatWeight,
} from '../lib/format';
import { deleteSession, reopenSession, setSessionNote } from '../services/sessionService';
import { setVolume, summarizeSession } from '../services/statsService';

/** פירוט אימון שבוצע. עריכה נעשית ע"י פתיחה מחדש — אותו מסך אימון בדיוק. */
export function SessionDetailScreen() {
  const { sessionId } = useParams<{ sessionId: ID }>();
  const navigate = useNavigate();
  const detail = useSessionDetail(sessionId);

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);

  if (detail === undefined) return <Spinner />;
  if (detail === null) {
    return (
      <div className="p-4">
        <EmptyState
          title="האימון לא נמצא"
          body="ייתכן שנמחק. חזור לרשימת ההיסטוריה."
          action={<Button onClick={() => navigate('/history')}>להיסטוריה</Button>}
        />
      </div>
    );
  }

  const { session, snapshots, logs } = detail;
  const summary = summarizeSession(session, logs);

  return (
    <>
      <ScreenHeader
        title={session.workoutName}
        subtitle={formatDateLong(session.startedAt)}
        back="/history"
        action={
          <>
            <IconButton
              label="הערה לאימון"
              onClick={() => {
                setNoteDraft(session.sessionNote);
                setNoteOpen(true);
              }}
            >
              <IconNote className={session.sessionNote ? 'text-volt' : ''} />
            </IconButton>
            <IconButton label="מחק אימון" onClick={() => setConfirmDelete(true)}>
              <IconTrash />
            </IconButton>
          </>
        }
      />

      <div className="flex gap-3 border-b border-line bg-surface px-4 py-2.5">
        <Stat label="סטים" value={String(summary.completedSets)} />
        <Stat label="נפח" value={formatNumber(summary.volume)} hint='ק"ג' />
        <Stat label="משך" value={formatDuration(summary.durationSeconds)} />
        <Stat
          label="שעה"
          value={formatTime(session.startedAt)}
          hint={session.endedAt ? `עד ${formatTime(session.endedAt)}` : 'פעיל'}
        />
      </div>

      {session.sessionNote && (
        <p className="border-b border-line bg-volt/5 px-4 py-2 text-sm text-volt">
          {session.sessionNote}
        </p>
      )}

      <div className="flex-1 space-y-3 p-3">
        {snapshots.length === 0 ? (
          <EmptyState title="לא נרשמו תרגילים" body="האימון נסגר בלי שנרשם בו דבר." />
        ) : (
          snapshots.map((snapshot) => {
            const sets = logs
              .filter((l) => l.exerciseId === snapshot.exerciseId)
              .sort((a, b) => a.setNumber - b.setNumber);
            const volume = sets
              .filter((s) => s.isDone === 1 && s.isWarmup === 0)
              .reduce((sum, s) => sum + setVolume(s), 0);

            return (
              <section
                key={snapshot.id}
                className="overflow-hidden rounded-2xl border border-line bg-surface"
              >
                <header className="flex items-center gap-2 border-b border-line px-3 py-2.5">
                  <Link
                    to={`/exercise/${snapshot.exerciseId}`}
                    className="tap flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1 py-0.5 -mx-1"
                  >
                    <span className="truncate font-semibold">{snapshot.exerciseName}</span>
                    <IconChart className="h-4 w-4 shrink-0 text-muted" />
                  </Link>
                  <span className="tnum shrink-0 text-xs text-muted">
                    {formatNumber(volume)} ק"ג
                  </span>
                </header>

                <ul className="divide-y divide-line">
                  {sets.map((set) => (
                    <li
                      key={set.id}
                      className={`tnum flex items-center gap-3 px-3 py-2 text-sm ${
                        set.isDone === 1 ? '' : 'opacity-45'
                      }`}
                    >
                      <span className="w-6 shrink-0 text-center text-xs text-muted">
                        {set.isWarmup === 1 ? 'ח' : set.setNumber}
                      </span>
                      <span className="flex-1">
                        {formatWeight(set.weight)} ק"ג × {set.reps ?? '—'}
                      </span>
                      {set.isDone === 0 && <span className="text-xs text-muted">לא בוצע</span>}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>

      <div className="pb-safe sticky bottom-0 border-t border-line bg-ink px-4 pt-3">
        <Button full onClick={() => setConfirmReopen(true)}>
          <IconPencil className="h-5 w-5" />
          פתח לעריכה
        </Button>
      </div>

      <Sheet
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="הערה לאימון"
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
        <textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          rows={5}
          autoFocus
          className="w-full rounded-xl border border-line bg-ink p-3 leading-relaxed outline-none focus:border-volt"
        />
      </Sheet>

      <ConfirmDialog
        open={confirmReopen}
        title="לפתוח את האימון מחדש?"
        body="האימון יחזור להיות פעיל ותוכל לתקן משקלים, חזרות וסטים. בסיום פשוט לחץ ״סיים אימון״ שוב."
        confirmLabel="פתח לעריכה"
        onCancel={() => setConfirmReopen(false)}
        onConfirm={async () => {
          await reopenSession(session.id);
          navigate(`/session/${session.id}`);
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="למחוק את האימון?"
        body="כל הסטים שנרשמו באימון הזה יימחקו לצמיתות. אם התרגילים בוצעו גם באימונים אחרים, הם לא יושפעו."
        confirmLabel="מחק"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await deleteSession(session.id);
          navigate('/history', { replace: true });
        }}
      />
    </>
  );
}
