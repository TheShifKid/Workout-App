import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBack } from './icons';

/** אבני הבניין של הממשק. כולן עומדות בגובה מגע של 48px לפחות. */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-volt text-ink font-bold active:bg-volt-dim',
  secondary: 'bg-surface-2 text-body border border-line active:bg-line',
  ghost: 'text-body active:bg-surface-2',
  danger: 'bg-transparent text-danger border border-danger/50 active:bg-danger/10',
};

export function Button({
  variant = 'secondary',
  className = '',
  full,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; full?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`touch inline-flex items-center justify-center gap-2 rounded-xl px-4 text-base transition-colors disabled:opacity-40 ${VARIANTS[variant]} ${full ? 'w-full' : ''} ${className}`}
    />
  );
}

/** כפתור עגול לפעולות אייקון (מחיקה, סגירה, ±). */
export function IconButton({
  className = '',
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      {...props}
      className={`touch inline-flex items-center justify-center rounded-xl text-muted transition-colors active:bg-surface-2 active:text-body disabled:opacity-30 ${className}`}
    />
  );
}

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`w-full rounded-2xl border border-line bg-surface text-right ${className}`}
    >
      {children}
    </Tag>
  );
}

/**
 * מסך ריק תמיד אומר מה לעשות עכשיו — לא "אין נתונים".
 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <p className="text-lg font-bold">{title}</p>
      <p className="max-w-xs text-sm leading-relaxed text-muted">{body}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  /** true = חזרה בהיסטוריה, מחרוזת = ניווט לנתיב מפורש */
  back?: boolean | string;
  action?: ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ink/95 backdrop-blur-[2px]">
      <div className="pt-safe flex items-center gap-1 px-2 pb-2">
        {back && (
          <IconButton
            label="חזרה"
            onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
          >
            <IconBack />
          </IconButton>
        )}
        <div className={`min-w-0 flex-1 ${back ? '' : 'px-2'}`}>
          <h1 className="truncate text-xl font-bold">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-16" role="status" aria-label="טוען">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-volt" />
    </div>
  );
}

export function Chip({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-2 text-sm transition-colors ${
        active
          ? 'border-volt bg-volt text-ink font-semibold'
          : 'border-line bg-surface text-muted active:bg-surface-2'
      }`}
    >
      {children}
    </button>
  );
}

/** תווית קטנה מעל ערך מספרי, לשורות סיכום. */
export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-medium tracking-wide text-muted">{label}</p>
      <p className="tnum truncate text-lg font-bold leading-tight">{value}</p>
      {hint && <p className="truncate text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
