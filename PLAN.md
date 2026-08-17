# PLAN.md — אפליקציית אימונים אישית (PWA)

מסמך תכנון לאישור לפני כתיבת קוד.

---

## 1. סטאק ותלויות

| חבילה | תפקיד |
|---|---|
| `react` + `react-dom` + `typescript` + `vite` | בסיס |
| `tailwindcss` (v4, דרך `@tailwindcss/vite`) | עיצוב |
| `dexie` + `dexie-react-hooks` | IndexedDB + `useLiveQuery` לריאקטיביות אוטומטית |
| `react-router-dom` | ניווט בין מסכים (~15KB, לא ספריית UI) |
| `vite-plugin-pwa` | service worker + manifest + precache |
| `@dnd-kit/core` + `@dnd-kit/sortable` | גרירה לשינוי סדר בנגיעה (ראה שאלה 2) |
| `sharp` (devDependency בלבד) | סקריפט חד-פעמי שמייצר את אייקוני ה-PWA מ-SVG |

**אין**: ספריית UI, ספריית גרפים (הגרף ייכתב כ-SVG ידני), ספריית state (Dexie `useLiveQuery` מספיק), backend, analytics.

---

## 2. מבנה תיקיות

```
Workout App/
├─ PLAN.md
├─ README.md                     ← שלב ה'
├─ index.html                    ← dir="rtl" lang="he"
├─ vite.config.ts                ← + vite-plugin-pwa
├─ tsconfig.json / tailwind.config / postcss
├─ scripts/
│  └─ generate-icons.mjs         ← SVG → PNG (192/512/maskable/apple-touch)
├─ public/
│  └─ icons/                     ← פלט הסקריפט
└─ src/
   ├─ main.tsx  ·  App.tsx  ·  router.tsx  ·  index.css
   │
   ├─ db/                        ← שכבה 1: אחסון גולמי
   │  ├─ types.ts                ← כל ה-interfaces + טיפוסי enum
   │  ├─ db.ts                   ← מופע Dexie, version(1), אינדקסים
   │  ├─ seed.ts                 ← ~50 תרגילים + אימוני ברירת מחדל
   │  └─ ids.ts                  ← crypto.randomUUID
   │
   ├─ repositories/              ← שכבה 2: CRUD טהור, בלי React, בלי לוגיקה
   │  ├─ exercises.repo.ts
   │  ├─ workouts.repo.ts
   │  ├─ workoutExercises.repo.ts
   │  ├─ sessions.repo.ts
   │  ├─ sessionExercises.repo.ts
   │  └─ setLogs.repo.ts
   │
   ├─ services/                  ← שכבה 3: לוגיקה עסקית, בלי React
   │  ├─ sessionService.ts       ← התחלה/סיום אימון, הוספת תרגיל/סט תוך כדי
   │  ├─ historyService.ts       ← "הפעם הקודמת", היסטוריה, מחיקה/עריכה
   │  ├─ statsService.ts         ← נפח, 1RM, שיאים, סדרת נתונים לגרף
   │  ├─ planService.ts          ← עריכת תוכנית + סידור מחדש
   │  └─ backupService.ts        ← ייצוא/ייבוא + migrateBackup()
   │
   ├─ hooks/                     ← שכבה 4: הדבק ל-React בלבד
   │  ├─ useWorkouts / useActiveSession / usePreviousPerformance ...
   │  ├─ useRestTimer.ts
   │  └─ usePreferences.ts       ← localStorage — העדפות תצוגה בלבד
   │
   ├─ components/                ← UI טיפש: NumberStepper, SetRow, Sheet,
   │  │                             ConfirmDialog, EmptyState, LineChart, ...
   ├─ screens/                   ← מסך לכל route
   └─ lib/                       ← format.ts (he-IL), oneRepMax.ts, time.ts
```

**כלל הפרדה**: `screens/` ו-`components/` לא נוגעים ב-Dexie ישירות. הם קוראים ל-`hooks/`, שקוראים ל-`services/`, שקוראים ל-`repositories/`. כך תוספת דרישה בהמשך נוגעת בשכבה אחת.

---

## 3. סכמת הנתונים

מזהים: `string` (UUID). תאריכים: `startedAt/endedAt` = epoch ms; `date` = `'YYYY-MM-DD'` מקומי (לקיבוץ ומיון).
בוליאנים נשמרים כ-`0|1` כי IndexedDB לא מאנדקס `boolean`.

```ts
exercises        id, name, muscleGroup, equipment, defaultNote, isArchived
                 index: name, muscleGroup, isArchived

workouts         id, name, color, order
                 index: order

workoutExercises id, workoutId, exerciseId, order,
                 targetSets, targetRepsMin, targetRepsMax, restSeconds, note
                 index: workoutId, [workoutId+order], exerciseId

sessions         id, workoutId, workoutName, date,
                 startedAt, endedAt, sessionNote
                 index: date, startedAt, endedAt, workoutId

setLogs          id, sessionId, exerciseId, setNumber,
                 weight, reps, isWarmup, isDone, completedAt
                 index: sessionId, exerciseId, [exerciseId+isWarmup],
                        [sessionId+exerciseId]
```

### שתי סטיות מהמפרט שאני מבקש לאשר

**א. `targetReps` → `targetRepsMin` + `targetRepsMax`**
המפרט מבקש "טווח חזרות מתוכנן". שני שדות מספריים במקום מחרוזת אחת — כדי שאפשר יהיה בהמשך להשוות ביצוע מול יעד בלי לפרסר טקסט. תצוגה: `8–12`.

**ב. טבלה שישית — `sessionExercises`** (ראה שאלה 1)

```ts
sessionExercises id, sessionId, exerciseId, order,
                 targetSets, targetRepsMin, targetRepsMax, restSeconds,
                 note, exerciseName   ← snapshot מרגע תחילת האימון
                 index: sessionId, [sessionId+order]
```

**למה**: המפרט דורש ש"עריכת תוכנית לא משנה אימונים שקרו". בלי הטבלה הזו, אימון שבוצע לא זוכר את הסדר שלו, את היעדים שהיו בתוקף, ולא מה השם של תרגיל שנמחק/שונה מאז — הכל היה נגזר בזמן אמת מהתוכנית הנוכחית. הטבלה היא צילום-מצב של התוכנית ברגע הלחיצה על "התחל אימון", ומאותו רגע היא מנותקת מהתוכנית לגמרי.
כנ"ל `sessions.workoutName` — snapshot של שם האימון.

---

## 4. החלטות מוצר (ברירות מחדל — תגיד אם משהו לא מתאים)

| נושא | ההחלטה |
|---|---|
| **"הפעם הקודמת"** | ה-session האחרון (לפי `startedAt`, `endedAt != null`) שיש בו סט **מסומן** באותו `exerciseId` — בלי קשר לסוג האימון. חימומים לא נחשבים. |
| **מילוי מראש** | סט מס' N נטען מסט העבודה מס' N של הפעם הקודמת. סטים מעבר לזה נטענים מהסט האחרון. אין נתונים → שדות ריקים + "אין נתונים קודמים". |
| **מילוי ≠ ביצוע** | ערך שמולא מראש נשאר אפור עד סימון ה-וי. סט לא מסומן = לא בוצע, לא נכנס לסטטיסטיקות ולא ל"פעם הקודמת". |
| **אימון פעיל** | אחד בכל רגע. `endedAt === null` ⇒ באנר "המשך אימון". התחלת אימון חדש כשיש פעיל → שאלה: להמשיך את הקיים או לסגור אותו. |
| **סטים נוצרים מראש** | בתחילת אימון נוצרות שורות ריקות לפי `targetSets`. לכל תרגיל תמיד נשארת לפחות שורה אחת. |
| **טיימר מנוחה** | מתחיל בסימון וי, לפי `restSeconds` של התרגיל (ברירת מחדל 90 שנ'). ±15 שנ' ודילוג. רץ בבר תחתון קבוע. מבוסס timestamp — שורד רענון ומינימיזציה. |
| **נפח** | `Σ משקל × חזרות` על סטים מסומנים שאינם חימום. |
| **1RM משוער** | Epley: `weight × (1 + reps/30)`. מוצג מעוגל ל-0.5 ק"ג. |
| **שיא אישי** | שני שיאים נפרדים: המשקל הכבד ביותר (עם החזרות שלו), וה-1RM המשוער הגבוה ביותר. |
| **מקלדת** | `inputMode="decimal"` למשקל, `"numeric"` לחזרות + כפתורי ±1.25 ק"ג / ±1 חזרה. לחיצה ארוכה = חזרה מהירה. |
| **מחיקת תרגיל מהמאגר** | לא נמחק — `isArchived=1`. ההיסטוריה נשמרת, התרגיל נעלם מהבחירה. |
| **גיבוי** | `schemaVersion: 1`, `exportedAt`, `app: "workout-app"` + כל הטבלאות. `migrateBackup(raw)` היא שרשרת `1→2→3` — היום מזהה זהות, מוכנה לשינוי הבא. ייבוא: החלפה מלאה / מיזוג (מיזוג = upsert לפי `id`, קיים מנצח בהחלטה מודעת... ראה שאלה 3). |
| **localStorage** | רק: מצב תצוגה, טיימר מנוחה אחרון שנבחר, מסך אחרון. אף פעם לא נתוני אימון. |

---

## 5. מסכים ו-routes

| Route | מסך |
|---|---|
| `/` | בית — רשימת סוגי אימון, "בוצע לאחרונה: …", כפתור התחלה, באנר אימון פעיל |
| `/workout/:id/edit` | עריכת תוכנית — גרירה, יעדים, בורר תרגילים |
| `/session/:id` | **אימון פעיל** — לב האפליקציה |
| `/history` | היסטוריה לפי תאריך |
| `/history/:sessionId` | פירוט אימון + עריכה/מחיקה |
| `/exercise/:id` | התקדמות — כל הביצועים, שיאים, גרף SVG |
| `/settings` | ייצוא / ייבוא / מחיקת הכל |

ניווט תחתון קבוע (בית / היסטוריה / הגדרות), מוסתר במסך אימון פעיל כדי לפנות מקום. אזורי מגע ≥48px, `env(safe-area-inset-bottom)`, מצב כהה כברירת מחדל.

---

## 6. מאגר התרגילים לזריעה (~50)

מחולק ל: חזה (6), גב (8), כתפיים (6), יד קדמית (4), יד אחורית (5), רגליים (9), ישבן (3), תאומים (2), בטן (5), אמות (2).
ציוד: מוט / משקולות יד / מכונה / כבלים / משקל גוף / קטלבל / גומייה.
כל תרגיל בעברית עם `defaultNote` ריק.

---

## 7. שלבי בנייה (עצירה + קומיט אחרי כל שלב)

| שלב | תוכן | מה תבדוק בנייד |
|---|---|---|
| **א** | `git init`, scaffold, Tailwind RTL/כהה, סכמה מלאה, זריעה, מסך בית, ניווט תחתון | הרשימה נטענת, אפשר להוסיף סוג אימון, המסכים הריקים מסבירים מה לעשות |
| **ב** | עריכת תוכנית: הוספה/הסרה, גרירה, יעדים, בורר תרגילים עם חיפוש+סינון, יצירת תרגיל בשורה | לבנות תוכנית אמיתית באצבע אחת |
| **ג** | אימון פעיל: טבלת סטים, "קודם: 60 ק"ג × 8", מילוי מראש, ±, וי, חימום, הוספה/הסרת סט, הוספת תרגיל, טיימר מנוחה, סיכום עליון, סיום עם אישור | לבצע אימון מלא, לסגור דפדפן באמצע ולוודא ששום דבר לא אבד |
| **ד** | הערות (קבועה לתרגיל + לאימון הנוכחי), היסטוריה, פירוט אימון, עריכה/מחיקה, מסך התקדמות + שיאים + גרף | לראות שהפעם הקודמת באמת מופיעה באימון הבא |
| **ה** | ייצוא/ייבוא JSON + `schemaVersion` + מיגרציה, מחיקת הכל, `vite-plugin-pwa`, אייקונים, בדיקת אופליין, `README.md` | התקנה למסך הבית, מצב טיסה, גיבוי ושחזור |

---

## 8. החלטות שסוכמו

1. **טבלה שישית `sessionExercises`** — ✅ מאושר. 6 טבלאות, כמתואר בסעיף 3ב.
2. **שינוי סדר תרגילים** — ✅ `@dnd-kit` עם ידית אחיזה גדולה, מותאם למגע.
3. **אימוני ברירת מחדל** — ✅ לזרוע "דחיפה / משיכה / רגליים" מוכנים עם תרגילים, ניתנים לעריכה ומחיקה.
