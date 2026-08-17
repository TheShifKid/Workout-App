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
                `flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${
                  isActive ? 'text-volt' : 'text-muted'
                }`
              }
            >
              <Icon className="h-6 w-6" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
