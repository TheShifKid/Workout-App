import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { PlanEditorScreen } from './screens/PlanEditorScreen';
import { ActiveSessionScreen } from './screens/ActiveSessionScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SessionDetailScreen } from './screens/SessionDetailScreen';
import { ExerciseProgressScreen } from './screens/ExerciseProgressScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { useDbStatus } from './hooks/useDbStatus';
import { Button, Spinner } from './components/ui';

/** מסכי הלשוניות — עם ניווט תחתון קבוע. */
function TabLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

/** מסכים ממוקדים — בלי ניווט תחתון, כדי לפנות מקום למסך האימון. */
function FocusLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Outlet />
    </div>
  );
}

/**
 * מסך שמוצג רק כשהחיבור למסד נותק ולא הצלחנו להתחבר מחדש — במקום
 * להשאיר את המשתמש מול ספינר שמסתובב לנצח.
 */
function DbFailedScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-extrabold">אין גישה לנתונים</h1>
      <p className="max-w-xs text-sm leading-relaxed text-muted">
        הדפדפן חסם את האחסון המקומי או שהחיבור אליו נותק. האימונים עצמם לא נמחקו. נסה לרענן,
        ואם זה קורה שוב — ודא שהאפליקציה לא פתוחה במצב גלישה פרטית.
      </p>
      <Button variant="primary" onClick={() => window.location.reload()}>
        נסה שוב
      </Button>
    </div>
  );
}

export default function App() {
  const dbStatus = useDbStatus();

  if (dbStatus === 'failed') return <DbFailedScreen />;
  if (dbStatus === 'reconnecting') return <Spinner />;

  return (
    <Routes>
      <Route element={<TabLayout />}>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Route>

      <Route element={<FocusLayout />}>
        <Route path="/workout/:workoutId/edit" element={<PlanEditorScreen />} />
        <Route path="/session/:sessionId" element={<ActiveSessionScreen />} />
        <Route path="/history/:sessionId" element={<SessionDetailScreen />} />
        <Route path="/exercise/:exerciseId" element={<ExerciseProgressScreen />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
