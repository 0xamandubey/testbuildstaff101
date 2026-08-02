import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardCheck, Banknote, Users, History as HistoryIcon } from 'lucide-react';

export default function BottomNav() {
  const navItems = [
    { to: '/', label: 'Home', icon: LayoutDashboard },
    { to: '/staff', label: 'Staff', icon: Users },
    { to: '/attendance', label: 'Attend', icon: ClipboardCheck },
    { to: '/advance', label: 'Advance', icon: Banknote },
    { to: '/history', label: 'History', icon: HistoryIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-brand-black border-t border-brand-darkGray text-white z-40 pb-safe shadow-lg">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive ? 'text-brand-yellow font-medium' : 'text-zinc-400 active:text-zinc-200'
                }`
              }
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
