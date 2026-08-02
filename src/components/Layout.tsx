import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { store } from '../database/db';
import BottomNav from './BottomNav';
import { ChevronLeft, Settings as SettingsIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  rightAction?: ReactNode;
}

export default function Layout({ children, title, showBack = false, rightAction }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const settings = store.getSettings();
  const headerTitle = title || settings.businessName || 'Staff Attendance';

  const isSettingsPage = location.pathname === '/settings';

  return (
    <div className="min-h-screen bg-brand-black text-brand-lightGray pb-24 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 bg-brand-black text-white h-14 flex items-center justify-between px-4 z-40 border-b border-brand-darkGray shadow-md">
        <div className="flex items-center space-x-2">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-1 -ml-1 text-white hover:text-brand-yellow active:scale-95 transition-transform flex items-center justify-center rounded-lg"
              aria-label="Go back"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <h1 className="text-base font-bold uppercase tracking-wider select-none truncate max-w-[240px]">
            {headerTitle}
          </h1>
        </div>
        <div>
          {rightAction ? (
            rightAction
          ) : (
            !isSettingsPage && (
              <button
                onClick={() => navigate('/settings')}
                className="p-2 text-zinc-400 hover:text-brand-yellow active:scale-95 transition-transform flex items-center justify-center rounded-lg"
                aria-label="Settings"
              >
                <SettingsIcon className="w-5 h-5" />
              </button>
            )
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom Tab Navigation */}
      <BottomNav />
    </div>
  );
}
