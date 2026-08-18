import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { HScroller } from '../components/HScroller';
import { IconChart, IconPlus, IconSearch, IconTrash } from '../components/icons';
import { Sheet } from '../components/Sheet';
import { Button, Chip, EmptyState, ScreenHeader, Spinner } from '../components/ui';
import { EQUIPMENT, MUSCLE_GROUPS, type Equipment, type ID, type MuscleGroup } from '../db/types';
import { useExerciseLibrary, type LibraryEntry } from '../hooks/useData';
import { plural } from '../lib/format';
import {
  archiveExercise,
  createExercise,
  deleteExerciseIfUnused,
  unarchiveExercise,
  updateExercise,
} from '../services/exerciseLibraryService';

/**
 * ניסוח "בתוכנית אחת" / "ב-3 תוכניות" — בעברית תחילית ב' נדבקת למילה
 * ביחיד, ומופרדת במקף כשקודם לה מספר.
 */
const inCount = (n: number, one: string, many: string) => (n === 1 ? `ב${one}` : `ב-${n} ${many}`);

/**
 * ניהול מאגר התרגילים: לראות הכול במקום אחד, לזהות מה נוצר ידנית,
 * לתקן שם/קבוצה/ציוד, ולהסתיר תרגילים שלא בשימוש.
 */
export function ExerciseLibraryScreen() {
  const navigate = useNavigate();
  const library = useExerciseLibrary();

  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [customOnly, setCustomOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<LibraryEntry | null>(null);
  const [creating, setCreating] = useState(false);

  const trimmed = query.trim();

  const filtered = useMemo(() => {
    if (!library) return [];
    return library.filter((e) => {
      if (showArchived !== (e.exercise.isArchived === 1)) return false;
      if (customOnly && !e.isCustom) return false;
      if (group && e.exercise.muscleGroup !== group) return false;
      if (trimmed && !e.exercise.name.includes(trimmed)) return false;
      return true;
    });
  }, [library, group, trimmed, customOnly, showArchived]);

  const customCount = library?.filter((e) => e.isCustom).length ?? 0;
  const archivedCount = library?.filter((e) => e.exercise.isArchived === 1).length ?? 0;

  return (
    <>
      <ScreenHeader
        title="מאגר התרגילים"
        subtitle={
          library
            ? `${plural(library.length, 'תרגיל אחד', 'תרגילים')} · ${customCount} שיצרת`
            : undefined
        }
        back="/settings"
        action={
          <Button variant="ghost" onClick={() => setCreating(true)} aria-label="תרגיל חדש">
            <IconPlus />
          </Button>
        }
      />

      <div className="border-b border-line bg-surface px-4 pb-3 pt-3">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-ink px-3">
          <IconSearch className="h-5 w-5 shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש תרגיל…"
            autoComplete="off"
            className="h-12 w-full bg-transparent outline-none"
          />
        </div>

        <div className="mt-3">
          <HScroller>
            <Chip active={group === null} onClick={() => setGroup(null)}>
              הכל
            </Chip>
            {MUSCLE_GROUPS.map((g) => (
              <Chip key={g} active={group === g} onClick={() => setGroup(g)}>
                {g}
              </Chip>
            ))}
          </HScroller>
        </div>

        <div className="mt-2 flex gap-2">
          <Chip active={customOnly} onClick={() => setCustomOnly(!customOnly)}>
            רק שיצרתי
          </Chip>
          {archivedCount > 0 && (
            <Chip active={showArchived} onClick={() => setShowArchived(!showArchived)}>
              מוסתרים ({archivedCount})
            </Chip>
          )}
        </div>
      </div>

      <div className="flex-1 p-4">
        {!library ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={showArchived ? 'אין תרגילים מוסתרים' : 'לא נמצאו תרגילים'}
            body={
              showArchived
                ? 'תרגיל שתסתיר יופיע כאן, ותמיד אפשר להחזיר אותו.'
                : 'נסה חיפוש אחר או קבוצת שריר אחרת. אפשר גם ליצור תרגיל חדש מהכפתור למעלה.'
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((entry) => (
              <li key={entry.exercise.id}>
                <button
                  type="button"
                  onClick={() => setEditing(entry)}
                  className="tap flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-right"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold">{entry.exercise.name}</span>
                      {entry.isCustom && (
                        <span className="shrink-0 rounded-full bg-volt/15 px-2 py-0.5 text-[10px] font-bold text-volt">
                          שלי
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {entry.exercise.muscleGroup} · {entry.exercise.equipment}
                      {entry.sessionsPerformed > 0 &&
                        ` · בוצע ${inCount(entry.sessionsPerformed, 'אימון אחד', 'אימונים')}`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <EditExerciseSheet
          entry={editing}
          onClose={() => setEditing(null)}
          onOpenProgress={(id) => navigate(`/exercise/${id}`)}
        />
      )}

      <CreateExerciseSheet open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function EditExerciseSheet({
  entry,
  onClose,
  onOpenProgress,
}: {
  entry: LibraryEntry;
  onClose: () => void;
  onOpenProgress: (id: ID) => void;
}) {
  const { exercise } = entry;
  const [name, setName] = useState(exercise.name);
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(exercise.muscleGroup);
  const [equipment, setEquipment] = useState<Equipment>(exercise.equipment);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  const archived = exercise.isArchived === 1;
  const inUse = entry.sessionsPerformed > 0 || entry.inPlans > 0;

  const save = async () => {
    await updateExercise(exercise.id, { name, muscleGroup, equipment });
    onClose();
  };

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title="עריכת תרגיל"
        footer={
          <Button full variant="primary" disabled={!name.trim()} onClick={save}>
            שמור
          </Button>
        }
      >
        <label className="text-xs text-muted">שם התרגיל</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-3 outline-none focus:border-volt"
        />

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted">קבוצת שריר</label>
            <select
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}
              className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-2 text-sm"
            >
              {MUSCLE_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted">ציוד</label>
            <select
              value={equipment}
              onChange={(e) => setEquipment(e.target.value as Equipment)}
              className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-2 text-sm"
            >
              {EQUIPMENT.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="tnum mt-3 text-xs text-muted">
          {entry.sessionsPerformed > 0
            ? `בוצע ${inCount(entry.sessionsPerformed, 'אימון אחד', 'אימונים')}`
            : 'עוד לא בוצע'}
          {entry.inPlans > 0 && ` · נמצא ${inCount(entry.inPlans, 'תוכנית אחת', 'תוכניות')}`}
        </p>

        {blockedMessage && (
          <p className="mt-3 rounded-xl border border-flame/40 bg-flame/5 px-3 py-2 text-xs text-flame">
            {blockedMessage}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <Button full onClick={() => onOpenProgress(exercise.id)}>
            <IconChart className="h-5 w-5" />
            התקדמות בתרגיל
          </Button>

          {archived ? (
            <Button
              full
              onClick={async () => {
                await unarchiveExercise(exercise.id);
                onClose();
              }}
            >
              החזר למאגר
            </Button>
          ) : (
            <Button
              full
              onClick={async () => {
                await archiveExercise(exercise.id);
                onClose();
              }}
            >
              הסתר מהמאגר
            </Button>
          )}

          <Button
            full
            variant="danger"
            onClick={() => {
              if (inUse) {
                setBlockedMessage(
                  'אי אפשר למחוק לצמיתות תרגיל שכבר בוצע או שנמצא בתוכנית — זה היה שובר את ההיסטוריה. אפשר להסתיר אותו במקום.',
                );
                return;
              }
              setConfirmDelete(true);
            }}
          >
            <IconTrash className="h-5 w-5" />
            מחק לצמיתות
          </Button>
        </div>

        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          הסתרה מוציאה את התרגיל מרשימות הבחירה אבל שומרת את כל ההיסטוריה שלו.
        </p>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        title={`למחוק את ״${exercise.name}״?`}
        body="התרגיל לא בוצע מעולם ולא נמצא באף תוכנית, אז המחיקה בטוחה. אי אפשר לבטל."
        confirmLabel="מחק"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          const deleted = await deleteExerciseIfUnused(exercise.id);
          setConfirmDelete(false);
          if (deleted) onClose();
          else setBlockedMessage('התרגיל נמצא בשימוש ולכן לא נמחק. אפשר להסתיר אותו.');
        }}
      />
    </>
  );
}

function CreateExerciseSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('חזה');
  const [equipment, setEquipment] = useState<Equipment>('מוט');

  const submit = async () => {
    await createExercise(name, muscleGroup, equipment);
    setName('');
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="תרגיל חדש"
      footer={
        <Button full variant="primary" disabled={!name.trim()} onClick={submit}>
          צור תרגיל
        </Button>
      }
    >
      <label className="text-xs text-muted">שם התרגיל</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="למשל: לחיצת חזה בשיפוע שלילי"
        autoFocus
        className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-3 outline-none focus:border-volt"
      />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted">קבוצת שריר</label>
          <select
            value={muscleGroup}
            onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}
            className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-2 text-sm"
          >
            {MUSCLE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted">ציוד</label>
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value as Equipment)}
            className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-2 text-sm"
          >
            {EQUIPMENT.map((eq) => (
              <option key={eq} value={eq}>
                {eq}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        התרגיל נשמר במאגר לצמיתות ויהיה זמין בכל אימון, לא רק בזה הנוכחי.
      </p>
    </Sheet>
  );
}
