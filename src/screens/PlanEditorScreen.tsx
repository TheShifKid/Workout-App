import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ExercisePicker } from '../components/ExercisePicker';
import {
  IconChart,
  IconChevronDown,
  IconGrip,
  IconPlus,
  IconTrash,
} from '../components/icons';
import { NumberStepper } from '../components/NumberStepper';
import { Button, EmptyState, IconButton, ScreenHeader, Spinner } from '../components/ui';
import type { ID, WorkoutExercise } from '../db/types';
import { usePlanRows, useExerciseMap, useWorkout } from '../hooks/useData';
import { WORKOUT_COLORS } from '../lib/constants';
import { formatRepRange, plural } from '../lib/format';
import {
  addExerciseToPlan,
  deleteWorkout,
  recolorWorkout,
  removeExerciseFromPlan,
  renameWorkout,
  reorderPlan,
  updatePlanRow,
} from '../services/planService';

export function PlanEditorScreen() {
  const { workoutId } = useParams<{ workoutId: ID }>();
  const navigate = useNavigate();

  const workout = useWorkout(workoutId);
  const planRows = usePlanRows(workoutId);
  const exerciseMap = useExerciseMap();

  const [picking, setPicking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expandedId, setExpandedId] = useState<ID | null>(null);
  /** סדר מקומי — כדי שהגרירה תרגיש מיידית ולא תחכה למסד. */
  const [order, setOrder] = useState<ID[]>([]);

  useEffect(() => {
    if (planRows) setOrder(planRows.map((r) => r.id));
  }, [planRows]);

  const sensors = useSensors(
    // השהיה קצרה לפני שגרירה נתפסת, אחרת אי אפשר לגלול את הרשימה באצבע.
    useSensor(PointerSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (workout === undefined || planRows === undefined || exerciseMap === undefined) {
    return <Spinner />;
  }
  if (workout === null) {
    return (
      <div className="p-4">
        <EmptyState
          title="סוג האימון לא נמצא"
          body="ייתכן שנמחק. חזור למסך הבית ובחר אימון אחר."
          action={<Button onClick={() => navigate('/')}>למסך הבית</Button>}
        />
      </div>
    );
  }

  const byId = new Map(planRows.map((r) => [r.id, r]));
  const ordered = order.map((id) => byId.get(id)).filter((r): r is WorkoutExercise => !!r);

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = arrayMove(
      order,
      order.indexOf(active.id as ID),
      order.indexOf(over.id as ID),
    );
    setOrder(next);
    await reorderPlan(next);
  };

  return (
    <>
      <ScreenHeader
        title={workout.name}
        subtitle={`${plural(planRows.length, 'תרגיל אחד', 'תרגילים')} בתוכנית`}
        back="/"
        action={
          <IconButton label="מחק סוג אימון" onClick={() => setConfirmDelete(true)}>
            <IconTrash />
          </IconButton>
        }
      />

      <div className="flex-1 p-4 pb-28">
        {/* שם וצבע */}
        <div className="mb-4 rounded-2xl border border-line bg-surface p-3">
          <label className="text-xs text-muted">שם האימון</label>
          <input
            defaultValue={workout.name}
            onBlur={(e) => renameWorkout(workout.id, e.target.value)}
            className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-3 text-lg font-bold outline-none focus:border-volt"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {WORKOUT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`צבע ${color}`}
                onClick={() => recolorWorkout(workout.id, color)}
                style={{ backgroundColor: color }}
                className={`tap h-9 w-9 rounded-full transition-transform ${
                  workout.color === color ? 'ring-2 ring-body ring-offset-2 ring-offset-surface' : ''
                }`}
              />
            ))}
          </div>
        </div>

        {ordered.length === 0 ? (
          <EmptyState
            title="התוכנית ריקה"
            body="הוסף את התרגילים שאתה עושה באימון הזה, בסדר שבו אתה עושה אותם. אפשר לשנות סדר בגרירה בכל רגע."
            action={
              <Button variant="primary" onClick={() => setPicking(true)}>
                <IconPlus className="h-5 w-5" />
                הוסף תרגיל
              </Button>
            }
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-2">
                {ordered.map((row, index) => (
                  <PlanRow
                    key={row.id}
                    row={row}
                    index={index}
                    name={exerciseMap.get(row.exerciseId)?.name ?? 'תרגיל שנמחק'}
                    expanded={expandedId === row.id}
                    onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="pb-safe sticky bottom-0 border-t border-line bg-ink px-4 pt-3">
        <Button full variant="primary" onClick={() => setPicking(true)}>
          <IconPlus className="h-5 w-5" />
          הוסף תרגיל
        </Button>
      </div>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        excludeIds={planRows.map((r) => r.exerciseId)}
        onPick={(exerciseId) => addExerciseToPlan(workout.id, exerciseId)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={`למחוק את ״${workout.name}״?`}
        body="סוג האימון והתוכנית שלו יימחקו. אימונים שכבר ביצעת יישארו בהיסטוריה כמו שהם."
        confirmLabel="מחק"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await deleteWorkout(workout.id);
          navigate('/');
        }}
      />
    </>
  );
}

function PlanRow({
  row,
  index,
  name,
  expanded,
  onToggle,
}: {
  row: WorkoutExercise;
  index: number;
  name: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`overflow-hidden rounded-2xl border bg-surface ${
        isDragging ? 'z-10 border-volt opacity-90 shadow-lg shadow-black/40' : 'border-line'
      }`}
    >
      <div className="flex items-center">
        <button
          type="button"
          aria-label={`שנה סדר: ${name}`}
          {...attributes}
          {...listeners}
          className="touch flex shrink-0 cursor-grab touch-none items-center justify-center px-1 text-muted active:text-body"
        >
          <IconGrip />
        </button>

        <button
          type="button"
          onClick={onToggle}
          className="tap min-w-0 flex-1 py-3 pl-2 text-right"
        >
          <p className="truncate font-semibold">
            <span className="tnum text-muted">{index + 1}. </span>
            {name}
          </p>
          <p className="tnum text-xs text-muted">
            {row.targetSets} סטים × {formatRepRange(row.targetRepsMin, row.targetRepsMax)} חזרות ·
            מנוחה {row.restSeconds} שנ׳
          </p>
        </button>

        <IconButton label="פרטים" onClick={onToggle} className="shrink-0">
          <IconChevronDown className={`h-5 w-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </IconButton>
      </div>

      {expanded && (
        <div className="border-t border-line bg-surface-2 p-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="סטים">
              <NumberStepper
                value={row.targetSets}
                step={1}
                min={1}
                max={20}
                decimals={0}
                label="סטים"
                onCommit={(v) => updatePlanRow(row.id, { targetSets: v ?? 1 })}
              />
            </Field>
            <Field label="מנוחה (שניות)">
              <NumberStepper
                value={row.restSeconds}
                step={15}
                min={0}
                max={600}
                decimals={0}
                label="מנוחה"
                onCommit={(v) => updatePlanRow(row.id, { restSeconds: v ?? 0 })}
              />
            </Field>
            <Field label="חזרות — מינימום">
              <NumberStepper
                value={row.targetRepsMin}
                step={1}
                min={1}
                max={100}
                decimals={0}
                label="מינימום חזרות"
                onCommit={(v) => {
                  const min = v ?? 1;
                  updatePlanRow(row.id, {
                    targetRepsMin: min,
                    targetRepsMax: Math.max(min, row.targetRepsMax),
                  });
                }}
              />
            </Field>
            <Field label="חזרות — מקסימום">
              <NumberStepper
                value={row.targetRepsMax}
                step={1}
                min={1}
                max={100}
                decimals={0}
                label="מקסימום חזרות"
                onCommit={(v) => {
                  const max = v ?? 1;
                  updatePlanRow(row.id, {
                    targetRepsMax: max,
                    targetRepsMin: Math.min(max, row.targetRepsMin),
                  });
                }}
              />
            </Field>
          </div>

          <label className="mt-3 block text-xs text-muted">הערה לתרגיל באימון הזה</label>
          <input
            defaultValue={row.note}
            onBlur={(e) => updatePlanRow(row.id, { note: e.target.value })}
            placeholder="למשל: מושב בגובה 4"
            className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-3 outline-none focus:border-volt"
          />

          <div className="mt-3 flex gap-2">
            <Button full onClick={() => navigate(`/exercise/${row.exerciseId}`)}>
              <IconChart className="h-5 w-5" />
              התקדמות
            </Button>
            <Button full variant="danger" onClick={() => removeExerciseFromPlan(row.id)}>
              <IconTrash className="h-5 w-5" />
              הסר
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted">
            הסרה מהתוכנית לא מוחקת את ההיסטוריה של התרגיל.
          </p>
        </div>
      )}
    </li>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted">{label}</label>
      {children}
    </div>
  );
}
