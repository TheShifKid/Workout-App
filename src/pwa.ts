import { registerSW } from 'virtual:pwa-register';

/**
 * עדכוני גרסה לאפליקציה מותקנת.
 *
 * הבעיה שזה פותר: registerType:'autoUpdate' מוריד service worker חדש
 * ברקע, אבל הדף שכבר פתוח ממשיך להריץ את ה-JS הישן שנטען לזיכרון.
 * אפליקציה שמותקנת למסך הבית נשארת פתוחה ימים, ולכן היא עלולה להיתקע
 * על גרסה ישנה גם אחרי שהאתר עודכן מזמן.
 *
 * הפתרון: בודקים עדכון בכל חזרה לאפליקציה, וברגע שה-SW החדש משתלט —
 * מרעננים פעם אחת כדי שהקוד החדש ייכנס לתוקף.
 */
export function setupPwaUpdates(): void {
  if (!('serviceWorker' in navigator)) return;

  // בהתקנה ראשונה אין controller קודם, ואז controllerchange הוא חלק
  // מהתהליך התקין — רענון שם היה גורם לטעינה כפולה מיותרת.
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const check = () => void registration.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      window.addEventListener('online', check);
      window.setInterval(check, 30 * 60 * 1000);
    },
  });
}

/** בדיקת עדכון יזומה מההגדרות. מחזיר true אם נמצאה גרסה חדשה. */
export async function checkForUpdateNow(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;

  await registration.update();
  return !!(registration.installing || registration.waiting);
}
