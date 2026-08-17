import { useNavigate } from 'react-router-dom';
import { IconChevronLeft } from '../components/icons';
import { Button, EmptyState, ScreenHeader, Spinner } from '../components/ui';
import { useSessionHistory, type SessionWithSummary } from '../hooks/useData';
import { formatDateLong, formatDuration, formatNumber, plural } from '../lib/format';

export function HistoryScreen() {
  const navigate = useNavigate();
  const history = useSessionHistory();

  return (
    <>
      <ScreenHeader
        title="היסטוריה"
        subtitle={history ? plural(history.length, 'אימון אחד', 'אימונים') : undefined}
      />

      <div className="p-4">
        {!history ? (
          <Spinner />
        ) : history.length === 0 ? (
          <EmptyState
            title="עוד לא סיימת אימון"
            body="ברגע שתסיים אימון ראשון הוא יופיע כאן, ומהאימון השני והלאה תראה בכל תרגיל מה עשית בפעם הקודמת."
            action={<Button variant="primary" onClick={() => navigate('/')}>למסך הבית</Button>}
          />
        ) : (
          Object.entries(groupByMonth(history)).map(([month, rows]) => (
            <section key={month} className="mb-6">
              <h2 className="mb-2 text-sm font-semibold text-muted">{month}</h2>
              <ul className="flex flex-col gap-2">
                {rows.map(({ session, summary, exerciseCount }) => (
                  <li key={session.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/history/${session.id}`)}
                      className="flex w-full items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-right active:bg-surface-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{session.workoutName}</p>
                        <p className="truncate text-xs text-muted">
                          {formatDateLong(session.startedAt)}
                        </p>
                        <p className="tnum mt-1 truncate text-xs text-muted">
                          {plural(exerciseCount, 'תרגיל אחד', 'תרגילים')} ·{' '}
                          {plural(summary.completedSets, 'סט אחד', 'סטים')} ·{' '}
                          {formatNumber(summary.volume)} ק"ג ·{' '}
                          {formatDuration(summary.durationSeconds)}
                        </p>
                        {session.sessionNote && (
                          <p className="mt-1 truncate text-xs text-volt">{session.sessionNote}</p>
                        )}
                      </div>
                      <IconChevronLeft className="h-5 w-5 shrink-0 text-muted" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </>
  );
}

/** קיבוץ לפי חודש — "אוגוסט 2026". שומר על סדר יורד כי הקלט כבר ממוין. */
function groupByMonth(rows: SessionWithSummary[]): Record<string, SessionWithSummary[]> {
  const groups: Record<string, SessionWithSummary[]> = {};
  for (const row of rows) {
    const key = new Date(row.session.startedAt).toLocaleDateString('he-IL', {
      month: 'long',
      year: 'numeric',
    });
    (groups[key] ??= []).push(row);
  }
  return groups;
}
