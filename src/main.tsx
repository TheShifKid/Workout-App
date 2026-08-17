import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { RestTimerProvider } from './hooks/useRestTimer';
import { seedIfEmpty } from './db/seed';
import './index.css';

// הזריעה רצה לפני הרינדור כדי שהמסך הראשון כבר יראה נתונים.
seedIfEmpty()
  .catch((err) => console.error('זריעה ראשונית נכשלה', err))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <BrowserRouter>
          <RestTimerProvider>
            <App />
          </RestTimerProvider>
        </BrowserRouter>
      </StrictMode>,
    );
  });
