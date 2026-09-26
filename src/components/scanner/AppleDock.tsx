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
        className="flex items-center gap-1.5 sm:gap-2.5 px-3 sm:px-4 py-2 rounded-2xl bg-[#1B303A] border border-[#314A56]"
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
              whileHover={{ scale: 1.08, y: -2 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 450, damping: 22 }}
              className={`relative group flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
                isScannerBtn
                  ? isActive
                    ? 'w-11 h-11 sm:w-12 sm:h-12 bg-[#FFE3A6] text-[#10232D] border border-[#FFE3A6]'
                    : 'w-11 h-11 sm:w-12 sm:h-12 bg-[#10232D] text-[#FFE3A6] border border-[#314A56] hover:border-[#FFE3A6]/50'
                  : isActive
                  ? 'w-10 h-10 sm:w-11 sm:h-11 bg-[#10232D] text-[#FFE3A6] border border-[#314A56]'
                  : 'w-10 h-10 sm:w-11 sm:h-11 text-[#8A9BA8] hover:text-[#ECEEF0] hover:bg-[#10232D]'
              }`}
              title={item.label}
              aria-label={item.label}
              aria-pressed={isActive}
            >
              {/* Tooltip on hover */}
              <div className="dock-tooltip absolute -top-8 px-2 py-0.5 rounded bg-[#10232D] text-[#ECEEF0] text-[10px] font-medium border border-[#314A56] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-50">
                <span className="relative z-10 text-[#ECEEF0]">{item.label}</span>
              </div>

              {/* Icon */}
              <Icon className={`${isScannerBtn ? 'w-5 h-5' : 'w-4 h-4'} transition-transform`} />

              {/* Badge if present */}
              {item.badge !== undefined && (
                <span
                  className="dock-badge absolute -top-1 -right-1 text-[9px] font-bold px-1.5 py-0.2 min-w-[16px] text-center rounded-full bg-[#E4A0B3] text-[#10232D]"
                >
                  {item.badge}
                </span>
              )}

              {/* Active Indicator Dot */}
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    layoutId="dock-active-dot"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#FFE3A6]"
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
