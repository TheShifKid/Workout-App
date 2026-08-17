import { NavLink } from 'react-router-dom';
import { IconHistory, IconHome, IconSettings } from './icons';

const TABS = [
  { to: '/', label: 'בית', Icon: IconHome },
  { to: '/history', label: 'היסטוריה', Icon: IconHistory },
  { to: '/settings', label: 'הגדרות', Icon: IconSettings },
];

export function BottomNav() {
  return (
    <nav className="pb-safe sticky bottom-0 z-30 border-t border-line bg-ink">
      <ul className="flex">
        {TABS.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
                  isActive ? 'font-bold text-volt' : 'font-medium text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute top-0 h-[3px] w-8 rounded-full transition-colors ${
                      isActive ? 'bg-volt' : 'bg-transparent'
                    }`}
                  />
                  <Icon className="h-6 w-6" />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
