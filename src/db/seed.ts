import { db } from './db';
import { newId } from './ids';
import type { Equipment, Exercise, MuscleGroup, Workout, WorkoutExercise } from './types';

/**
 * זריעה ראשונית. רצה פעם אחת בלבד — אם כבר יש תרגילים במסד, לא נוגעים בכלום.
 * מזהי התרגילים הזרועים קבועים (ולא UUID אקראי) כדי שמיזוג גיבוי בין מכשירים
 * לא ייצור כפילויות של אותו תרגיל.
 */

type SeedExercise = [slug: string, name: string, muscleGroup: MuscleGroup, equipment: Equipment];

const SEED_EXERCISES: SeedExercise[] = [
  // חזה
  ['bench-press', 'לחיצת חזה במוט', 'חזה', 'מוט'],
  ['incline-bench-press', 'לחיצת חזה בשיפוע חיובי במוט', 'חזה', 'מוט'],
  ['db-bench-press', 'לחיצת חזה במשקולות יד', 'חזה', 'משקולות יד'],
  ['db-incline-press', 'לחיצת חזה בשיפוע חיובי במשקולות יד', 'חזה', 'משקולות יד'],
  ['machine-chest-press', 'לחיצת חזה במכונה', 'חזה', 'מכונה'],
  ['cable-fly', 'פרפר בכבלים', 'חזה', 'כבלים'],
  ['push-up', 'שכיבות סמיכה', 'חזה', 'משקל גוף'],

  // גב
  ['pull-up', 'מתח', 'גב', 'משקל גוף'],
  ['lat-pulldown', 'משיכת פולי עליון', 'גב', 'כבלים'],
  ['barbell-row', 'חתירה במוט', 'גב', 'מוט'],
  ['db-row', 'חתירה במשקולת יד', 'גב', 'משקולות יד'],
  ['seated-row', 'חתירה בפולי תחתון', 'גב', 'כבלים'],
  ['machine-row', 'חתירה במכונה', 'גב', 'מכונה'],
  ['cable-pullover', 'פולאובר בכבלים', 'גב', 'כבלים'],
  ['deadlift', 'דדליפט', 'גב', 'מוט'],
  ['shrug', 'הרמת כתפיים (שראגס)', 'גב', 'משקולות יד'],

  // כתפיים
  ['overhead-press', 'לחיצת כתפיים במוט', 'כתפיים', 'מוט'],
  ['db-shoulder-press', 'לחיצת כתפיים במשקולות יד', 'כתפיים', 'משקולות יד'],
  ['lateral-raise', 'הרחקות צד במשקולות יד', 'כתפיים', 'משקולות יד'],
  ['cable-lateral-raise', 'הרחקות צד בכבלים', 'כתפיים', 'כבלים'],
  ['reverse-fly', 'פרפר הפוך', 'כתפיים', 'מכונה'],
  ['front-raise', 'הרמות קדמיות', 'כתפיים', 'משקולות יד'],
  ['face-pull', 'משיכת פנים בחבל', 'כתפיים', 'כבלים'],

  // יד קדמית
  ['barbell-curl', 'כפיפת מרפקים במוט', 'יד קדמית', 'מוט'],
  ['db-curl', 'כפיפת מרפקים במשקולות יד', 'יד קדמית', 'משקולות יד'],
  ['hammer-curl', 'כפיפת פטיש', 'יד קדמית', 'משקולות יד'],
  ['cable-curl', 'כפיפת מרפקים בכבלים', 'יד קדמית', 'כבלים'],
  ['preacher-curl', 'כפיפת מרפקים בספסל סקוט', 'יד קדמית', 'מכונה'],

  // יד אחורית
  ['triceps-pushdown', 'פשיטת מרפקים בפולי עליון', 'יד אחורית', 'כבלים'],
  ['rope-pushdown', 'פשיטת מרפקים בחבל', 'יד אחורית', 'כבלים'],
  ['close-grip-bench', 'לחיצה צרה במוט', 'יד אחורית', 'מוט'],
  ['dips', 'מקבילים', 'יד אחורית', 'משקל גוף'],
  ['overhead-extension', 'פשיטת מרפקים מעל הראש', 'יד אחורית', 'משקולות יד'],

  // רגליים
  ['back-squat', 'סקוואט במוט', 'רגליים', 'מוט'],
  ['front-squat', 'סקוואט קדמי', 'רגליים', 'מוט'],
  ['hack-squat', 'הק סקוואט', 'רגליים', 'מכונה'],
  ['leg-press', 'לחיצת רגליים', 'רגליים', 'מכונה'],
  ['leg-extension', 'פשיטת ברך במכונה', 'רגליים', 'מכונה'],
  ['leg-curl', 'כפיפת ברך במכונה', 'רגליים', 'מכונה'],
  ['romanian-deadlift', 'דדליפט רומני', 'רגליים', 'מוט'],
  ['walking-lunge', 'מכרעים במשקולות יד', 'רגליים', 'משקולות יד'],
  ['bulgarian-split-squat', 'סקוואט בולגרי', 'רגליים', 'משקולות יד'],
  ['goblet-squat', 'סקוואט גובלט', 'רגליים', 'קטלבל'],

  // ישבן
  ['hip-thrust', 'היפ תרסט', 'ישבן', 'מוט'],
  ['glute-bridge', 'גשר ישבן', 'ישבן', 'משקל גוף'],
  ['cable-kickback', 'בעיטת ישבן בכבלים', 'ישבן', 'כבלים'],

  // תאומים
  ['standing-calf-raise', 'הרמת עקבים בעמידה', 'תאומים', 'מכונה'],
  ['seated-calf-raise', 'הרמת עקבים בישיבה', 'תאומים', 'מכונה'],

  // בטן
  ['crunch', 'כפיפות בטן', 'בטן', 'משקל גוף'],
  ['cable-crunch', 'כפיפות בטן בכבלים', 'בטן', 'כבלים'],
  ['hanging-leg-raise', 'הרמות רגליים בתלייה', 'בטן', 'משקל גוף'],
  ['plank', 'פלאנק', 'בטן', 'משקל גוף'],
  ['ab-wheel', 'גלגלת בטן', 'בטן', 'משקל גוף'],

  // אמות
  ['wrist-curl', 'כפיפת שורש כף יד', 'אמות', 'משקולות יד'],
  ['farmers-carry', 'הליכת חווה', 'אמות', 'משקולות יד'],
];

const seedExerciseId = (slug: string) => `seed-${slug}`;

type SeedWorkout = {
  name: string;
  color: string;
  /** [slug, סטים, מינ' חזרות, מקס' חזרות, מנוחה בשניות] */
  items: [string, number, number, number, number][];
};

const SEED_WORKOUTS: SeedWorkout[] = [
  {
    name: 'דחיפה',
    color: '#F97316',
    items: [
      ['bench-press', 4, 6, 8, 150],
      ['db-incline-press', 3, 8, 12, 120],
      ['db-shoulder-press', 3, 8, 12, 120],
      ['cable-fly', 3, 12, 15, 90],
      ['lateral-raise', 4, 12, 20, 60],
      ['rope-pushdown', 3, 10, 15, 75],
    ],
  },
  {
    name: 'משיכה',
    color: '#38BDF8',
    items: [
      ['pull-up', 4, 6, 10, 150],
      ['barbell-row', 4, 8, 10, 150],
      ['lat-pulldown', 3, 10, 12, 105],
      ['seated-row', 3, 10, 12, 105],
      ['face-pull', 3, 15, 20, 60],
      ['barbell-curl', 3, 8, 12, 75],
      ['hammer-curl', 3, 10, 15, 60],
    ],
  },
  {
    name: 'רגליים',
    color: '#A78BFA',
    items: [
      ['back-squat', 4, 5, 8, 180],
      ['romanian-deadlift', 3, 8, 10, 150],
      ['leg-press', 3, 10, 15, 120],
      ['leg-curl', 3, 10, 15, 90],
      ['leg-extension', 3, 12, 15, 90],
      ['standing-calf-raise', 4, 12, 20, 60],
      ['hanging-leg-raise', 3, 10, 15, 60],
    ],
  },
];

export async function seedIfEmpty(): Promise<void> {
  const existing = await db.exercises.count();
  if (existing > 0) return;

  const exercises: Exercise[] = SEED_EXERCISES.map(
    ([slug, name, muscleGroup, equipment]) => ({
      id: seedExerciseId(slug),
      name,
      muscleGroup,
      equipment,
      defaultNote: '',
      isArchived: 0,
    }),
  );

  const workouts: Workout[] = [];
  const workoutExercises: WorkoutExercise[] = [];

  SEED_WORKOUTS.forEach((seed, workoutIndex) => {
    const workoutId = newId();
    workouts.push({
      id: workoutId,
      name: seed.name,
      color: seed.color,
      order: workoutIndex,
    });

    seed.items.forEach(([slug, targetSets, targetRepsMin, targetRepsMax, restSeconds], i) => {
      workoutExercises.push({
        id: newId(),
        workoutId,
        exerciseId: seedExerciseId(slug),
        order: i,
        targetSets,
        targetRepsMin,
        targetRepsMax,
        restSeconds,
        note: '',
      });
    });
  });

  await db.transaction('rw', db.exercises, db.workouts, db.workoutExercises, async () => {
    await db.exercises.bulkAdd(exercises);
    await db.workouts.bulkAdd(workouts);
    await db.workoutExercises.bulkAdd(workoutExercises);
  });
}
