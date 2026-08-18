import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IconNote, IconTrophy } from '../components/icons';
import { LineChart } from '../components/LineChart';
import { Sheet } from '../components/Sheet';
import { Button, Chip, EmptyState, IconButton, ScreenHeader, Spinner } from '../components/ui';
import type { ID } from '../db/types';
import { useExercise, useExerciseProgress } from '../hooks/useData';
import { formatDateLong, formatNumber, formatWeight, plural } from '../lib/format';
import { setExerciseDefaultNote } from '../services/exerciseLibraryService';

type Metric = 'topWeight' | 'oneRepMax';

export function ExerciseProgressScreen() {
  const { exerciseId } = useParams<{ exerciseId: ID }>();
  const navigate = useNavigate();

  const exercise = useExercise(exerciseId);
  const progress = useExerciseProgress(exerciseId);

  const [metric, setMetric] = useState<Metric>('topWeight');
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  if (exercise === undefined || progress === undefined) return <Spinner />;
  if (exercise === null) {
    return (
      <div className="p-4">
        <EmptyState
          title="התרגיל לא נמצא"
          body="ייתכן שנמחק מהמאגר."
          action={<Button onClick={() => navigate('/')}>למסך הבית</Button>}
        />
      </div>
    );
  }

  const { history, prs, chart } = progress;

  return (
    <>
      <ScreenHeader
        title={exercise.name}
        subtitle={`${exercise.muscleGroup} · ${exercise.equipment}`}
        back
        action={
          <IconButton
            label="הערה קבועה"
            onClick={() => {
              setNoteDraft(exercise.defaultNote);
              setNoteOpen(true);
            }}
          >
            <IconNote className={exercise.defaultNote ? 'text-volt' : ''} />
          </IconButton>
        }
      />

      <div className="flex-1 space-y-4 p-4">
        {exercise.defaultNote && (
          <p className="rounded-xl border border-volt/30 bg-volt/5 px-3 py-2 text-sm text-volt">
            {exercise.defaultNote}
          </p>
        )}

        {history.length === 0 ? (
          <EmptyState
            title="עוד לא ביצעת את התרגיל הזה"
            body="ברגע שתסמן סט ראשון באימון, יופיעו כאן השיאים, גרף ההתקדמות וכל הפעמים שביצעת אותו."
          />
        ) : (
          <>
            {/* שיאים */}
            <section className="grid grid-cols-2 gap-3">
              <PRCard
                title="המשקל הכבד ביותר"
                value={prs.heaviest ? `${formatWeight(prs.heaviest.weight)} ק"ג` : '—'}
                hint={
                  prs.heaviest
                    ? `${prs.heaviest.reps} חזרות · ${formatDateLong(prs.heaviest.date)}`
                    : undefined
                }
              />
              <PRCard
                title="1RM משוער"
                value={prs.bestOneRepMax ? `${formatWeight(prs.bestOneRepMax.value)} ק"ג` : '—'}
                hint={
                  prs.bestOneRepMax
                    ? `מ-${formatWeight(prs.bestOneRepMax.weight)} × ${prs.bestOneRepMax.reps}`
                    : undefined
                }
              />
            </section>

            <p className="tnum text-xs text-muted">
              {plural(history.length, 'אימון אחד', 'אימונים')} ·{' '}
              {plural(prs.totalSets, 'סט אחד', 'סטים')} · נפח מצטבר{' '}
              {formatNumber(prs.totalVolume)} ק"ג
            </p>

            {/* גרף */}
            {chart.length > 1 ? (
              <section className="rounded-2xl border border-line bg-surface p-3">
                <div className="mb-2 flex gap-2">
                  <Chip active={metric === 'topWeight'} onClick={() => setMetric('topWeight')}>
                    משקל מרבי
                  </Chip>
                  <Chip active={metric === 'oneRepMax'} onClick={() => setMetric('oneRepMax')}>
                    1RM משוער
                  </Chip>
                </div>
                <LineChart points={chart} metric={metric} />
              </section>
            ) : (
              <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-sm text-muted">
                אחרי אימון שני יופיע כאן גרף התקדמות.
              </p>
            )}

            {/* כל הפעמים */}
            <section>
              <h2 className="mb-2 text-sm font-semibold text-muted">כל הפעמים</h2>
              <ul className="flex flex-col gap-2">
                {history.map((entry) => (
                  <li
                    key={entry.session.id}
                    className="overflow-hidden rounded-2xl border border-line bg-surface"
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/history/${entry.session.id}`)}
                      className="tap flex w-full items-center gap-2 border-b border-line px-3 py-2 text-right"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {formatDateLong(entry.session.startedAt)}
                      </span>
                      <span className="tnum shrink-0 text-xs text-muted">
                        {entry.session.workoutName} · {formatNumber(entry.volume)} ק"ג
                      </span>
                    </button>
                    <div className="tnum flex flex-wrap gap-x-3 gap-y-1 px-3 py-2 text-sm">
                      {entry.sets.map((set) => (
                        <span key={set.id} className="text-muted">
                          <span className="font-semibold text-body">
                            {formatWeight(set.weight)}
                          </span>
                          {' × '}
                          {set.reps ?? '—'}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>

      <Sheet
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="הערה קבועה לתרגיל"
        footer={
          <Button
            full
            variant="primary"
            onClick={async () => {
              await setExerciseDefaultNote(exercise.id, noteDraft.trim());
              setNoteOpen(false);
            }}
          >
            שמור
          </Button>
        }
      >
        <p className="mb-2 text-sm text-muted">
          ההערה תוצג בכל פעם שתעשה את התרגיל, בכל אימון.
        </p>
        <textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          rows={4}
          autoFocus
          placeholder="למשל: מרפקים צמודים, מושב בגובה 4"
          className="w-full rounded-xl border border-line bg-ink p-3 leading-relaxed outline-none focus:border-volt"
        />
      </Sheet>
    </>
  );
}

function PRCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3 shadow-hard-volt">
      <div className="mb-1 flex items-center gap-1.5 text-flame">
        <IconTrophy className="h-4 w-4" />
        <span className="text-[11px] font-bold uppercase tracking-wider">{title}</span>
      </div>
      <p className="tnum-hero text-2xl">{value}</p>
      {hint && <p className="tnum mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
