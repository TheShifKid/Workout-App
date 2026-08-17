import { useEffect, useState, type ReactNode } from 'react';
import { Button } from './ui';

/**
 * אישור לפני פעולה בלתי הפיכה.
 * requireTyping משמש למחיקת כל הנתונים — אישור כפול שדורש הקלדה מפורשת,
 * כדי שלא ימחק בלחיצה מקרית עם יד מזיעה.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'אישור',
  cancelLabel = 'ביטול',
  destructive,
  requireTyping,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  requireTyping?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (open) setTyped('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const blocked = !!requireTyping && typed.trim() !== requireTyping;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="ביטול"
        onClick={onCancel}
        className="absolute inset-0 bg-black/75"
      />

      <div
        role="alertdialog"
        aria-modal="true"
        className="pb-safe relative w-full max-w-md rounded-2xl border border-line bg-surface p-5"
      >
        <h2 className="text-lg font-bold">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-muted">{body}</div>

        {requireTyping && (
          <div className="mt-4">
            <label className="text-xs text-muted">
              להמשך, הקלד <span className="font-bold text-body">{requireTyping}</span>
            </label>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-3 text-center outline-none focus:border-danger"
            />
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <Button full onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            full
            disabled={blocked}
            variant={destructive ? 'danger' : 'primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
