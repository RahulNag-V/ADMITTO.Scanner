import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Users, ListOrdered, Scan, BarChart3, Settings } from 'lucide-react';

export type ScannerDockTab = 'home' | 'roster' | 'log' | 'scanner' | 'stats' | 'settings';

interface AppleDockProps {
  activeTab: ScannerDockTab;
  onSelectTab: (tab: ScannerDockTab) => void;
  studentCount?: number;
  logCount?: number;
  offlineCount?: number;
  duplicateCount?: number;
}

interface DockItemDef {
  id: ScannerDockTab;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
}

export const AppleDock: React.FC<AppleDockProps> = ({
  activeTab,
  onSelectTab,
  studentCount,
  logCount = 0,
  offlineCount = 0,
  duplicateCount = 0,
}) => {
  const dockItems: DockItemDef[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
    },
    {
      id: 'log',
      label: 'Logs',
      icon: ListOrdered,
      badge: logCount > 0 ? (logCount > 99 ? '99+' : logCount) : undefined,
      badgeColor: 'bg-indigo-500 text-white',
    },
    {
      id: 'scanner',
      label: 'Scanner',
      icon: Scan,
      badge: offlineCount > 0 ? `${offlineCount}` : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    {
      id: 'stats',
      label: 'Stats',
      icon: BarChart3,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <div
      id="apple-scanner-dock"
      className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
    >
      <motion.nav
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="flex items-center gap-1.5 sm:gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-3xl bg-slate-900/85 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-white/10"
        role="navigation"
        aria-label="Scanner Apple Dock Navigation"
      >
        {dockItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isScannerBtn = item.id === 'scanner';

          return (
            <motion.button
              key={item.id}
              id={`dock-btn-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              whileHover={{ scale: 1.18, y: -4 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 450, damping: 22 }}
              className={`relative group flex flex-col items-center justify-center rounded-2xl transition-all cursor-pointer ${
                isScannerBtn
                  ? isActive
                    ? 'w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white shadow-lg shadow-indigo-500/40 ring-2 ring-white/30'
                    : 'w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-tr from-indigo-500/80 to-purple-600/80 text-white shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40'
                  : isActive
                  ? 'w-11 h-11 sm:w-12 sm:h-12 bg-white/15 text-white border border-white/20 shadow-inner'
                  : 'w-11 h-11 sm:w-12 sm:h-12 text-slate-400 hover:text-slate-100 hover:bg-white/10'
              }`}
              title={item.label}
              aria-label={item.label}
              aria-pressed={isActive}
            >
              {/* Tooltip on hover (Apple dock style) */}
              <div className="dock-tooltip absolute -top-9 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold tracking-wide border border-slate-700/80 opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none whitespace-nowrap shadow-2xl scale-90 group-hover:scale-100 z-50">
                <span className="relative z-10 text-white font-semibold">{item.label}</span>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-r border-b border-slate-700/80" />
              </div>

              {/* Icon */}
              <Icon className={`${isScannerBtn ? 'w-6 h-6' : 'w-5 h-5'} transition-transform`} />

              {/* Badge if present */}
              {item.badge !== undefined && (
                <span
                  className={`dock-badge absolute -top-1 -right-1 text-[9px] font-bold px-1.5 py-0.2 min-w-[18px] text-center rounded-full shadow-md ${
                    item.badgeColor || 'bg-indigo-500 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {/* Active Indicator Dot (Apple macOS Dock style) */}
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    layoutId="dock-active-dot"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className={`absolute -bottom-1 w-1.5 h-1.5 rounded-full ${
                      isScannerBtn
                        ? 'bg-indigo-300 shadow-[0_0_8px_#a5b4fc]'
                        : 'bg-indigo-500 dark:bg-white shadow-[0_0_6px_rgba(99,102,241,0.6)] dark:shadow-[0_0_6px_#ffffff]'
                    }`}
                  />
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </motion.nav>
    </div>
  );
};
