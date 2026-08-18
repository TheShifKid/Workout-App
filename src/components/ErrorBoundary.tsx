import { Component, type ReactNode } from 'react';
import { Button } from './ui';

/**
 * רשת ביטחון אחרונה: בלי זה, שגיאה בזמן רינדור מפילה את כל העץ ומשאירה
 * מסך לבן ריק בלי שום הסבר. הנתונים עצמם שמורים ב-IndexedDB, אז רענון
 * כמעט תמיד פותר — וזה בדיוק מה שהמסך הזה מציע.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('שגיאה לא צפויה בממשק', error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-extrabold">משהו נשבר</h1>
        <p className="max-w-xs text-sm leading-relaxed text-muted">
          האימונים שלך שמורים במכשיר ולא הלכו לאיבוד. רענון של הדף אמור להחזיר הכל לפעולה.
        </p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          רענן את האפליקציה
        </Button>
        <p dir="ltr" className="max-w-xs break-words text-[11px] text-muted">
          {this.state.error.message}
        </p>
      </div>
    );
  }
}
