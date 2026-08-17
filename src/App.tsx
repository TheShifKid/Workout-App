import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { PlanEditorScreen } from './screens/PlanEditorScreen';
import { ActiveSessionScreen } from './screens/ActiveSessionScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SessionDetailScreen } from './screens/SessionDetailScreen';
import { ExerciseProgressScreen } from './screens/ExerciseProgressScreen';

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

export default function App() {
  return (
    <Routes>
      <Route element={<TabLayout />}>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
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
