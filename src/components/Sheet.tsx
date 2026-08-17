import { useEffect, type ReactNode } from 'react';
import { IconX } from './icons';
import { IconButton } from './ui';

/**
 * חלונית שנפתחת מלמטה. נבחרה על פני מודאל במרכז המסך כי היא מגיעה
 * לאזור שהאגודל מגיע אליו ביד אחת.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  // נעילת גלילת הרקע + סגירה ב-Escape
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="סגירה"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />

      <div className="relative flex max-h-[88vh] flex-col rounded-t-3xl border-t border-line bg-surface">
        <div className="flex items-center gap-2 border-b border-line px-2 py-2">
          <h2 className="flex-1 px-2 text-lg font-bold">{title}</h2>
          <IconButton label="סגירה" onClick={onClose}>
            <IconX />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {children}
        </div>

        {footer && <div className="pb-safe border-t border-line px-4 pt-3">{footer}</div>}
      </div>
    </div>
  );
}
