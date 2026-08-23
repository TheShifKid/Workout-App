import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { RestTimerProvider } from './hooks/useRestTimer';
import { SetTimerProvider } from './hooks/useSetTimer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { seedIfEmpty } from './db/seed';
import { setupPwaUpdates } from './pwa';
import './index.css';

// import.meta.env.BASE_URL מגיע מ-vite base. הראוטר חייב להכיר את
// הקידומת, אחרת כל הנתיבים יישברו בפריסה תחת תת-נתיב.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

setupPwaUpdates();

// הזריעה רצה לפני הרינדור כדי שהמסך הראשון כבר יראה נתונים.
seedIfEmpty()
  .catch((err) => console.error('זריעה ראשונית נכשלה', err))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ErrorBoundary>
          <BrowserRouter basename={basename}>
            <RestTimerProvider>
              <SetTimerProvider>
                <App />
              </SetTimerProvider>
            </RestTimerProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </StrictMode>,
    );
  });
