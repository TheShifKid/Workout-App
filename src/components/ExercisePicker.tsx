import { useMemo, useState } from 'react';
import { EQUIPMENT, MUSCLE_GROUPS, type Equipment, type ID, type MuscleGroup } from '../db/types';
import { useActiveExercises } from '../hooks/useData';
import { createExercise } from '../services/exerciseLibraryService';
import { IconPlus, IconSearch } from './icons';
import { Sheet } from './Sheet';
import { Button, Chip, EmptyState, Spinner } from './ui';
import { HScroller } from './HScroller';

/**
 * בורר תרגילים: חיפוש, סינון לפי קבוצת שריר, ויצירת תרגיל חדש בשורה אחת
 * בלי לצאת מהמסך.
 */
export function ExercisePicker({
  open,
  onClose,
  onPick,
  excludeIds = [],
  title = 'הוספת תרגיל',
}: {
  open: boolean;
  onClose: () => void;
  /** מוחזר ערך כלשהו כדי שאפשר יהיה להעביר ישירות פונקציית שירות שמחזירה מזהה. */
  onPick: (exerciseId: ID) => unknown;
  excludeIds?: ID[];
  title?: string;
}) {
  const exercises = useActiveExercises();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [newGroup, setNewGroup] = useState<MuscleGroup>('חזה');
  const [newEquipment, setNewEquipment] = useState<Equipment>('מוט');

  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);
  const trimmed = query.trim();

  const filtered = useMemo(() => {
    if (!exercises) return [];
    return exercises.filter((e) => {
      if (excluded.has(e.id)) return false;
      if (group && e.muscleGroup !== group) return false;
      if (trimmed && !e.name.includes(trimmed)) return false;
      return true;
    });
  }, [exercises, excluded, group, trimmed]);

  const exactExists = useMemo(
    () => !!exercises?.some((e) => e.name === trimmed),
    [exercises, trimmed],
  );

  const reset = () => {
    setQuery('');
    setGroup(null);
  };

  const pick = async (id: ID) => {
    await onPick(id);
    reset();
    onClose();
  };

  const createAndPick = async () => {
    const id = await createExercise(trimmed, newGroup, newEquipment);
    await pick(id);
  };

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={title}
    >
      <div className="sticky -top-4 z-10 -mx-4 -mt-4 mb-3 bg-surface px-4 pb-3 pt-4">
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
      </div>

      {trimmed && !exactExists && (
        <div className="mb-3 rounded-xl border border-volt/40 bg-volt/5 p-3">
          <p className="mb-2 text-sm">
            יצירת תרגיל חדש: <span className="font-bold">{trimmed}</span>
          </p>
          <div className="flex gap-2">
            <select
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value as MuscleGroup)}
              aria-label="קבוצת שריר"
              className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-ink px-2 text-sm"
            >
              {MUSCLE_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <select
              value={newEquipment}
              onChange={(e) => setNewEquipment(e.target.value as Equipment)}
              aria-label="ציוד"
              className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-ink px-2 text-sm"
            >
              {EQUIPMENT.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
            <Button variant="primary" onClick={createAndPick} aria-label="צור והוסף">
              <IconPlus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {!exercises ? (
        <Spinner />
      ) : filtered.length === 0 && !trimmed ? (
        <EmptyState
          title="אין תרגילים בקטגוריה הזו"
          body="בחר קבוצת שריר אחרת, או הקלד שם כדי ליצור תרגיל חדש."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((exercise) => (
            <li key={exercise.id}>
              <button
                type="button"
                onClick={() => pick(exercise.id)}
                className="tap touch flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 text-right"
              >
                <span className="min-w-0 flex-1 truncate py-2 font-medium">{exercise.name}</span>
                <span className="shrink-0 text-xs text-muted">
                  {exercise.muscleGroup} · {exercise.equipment}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
