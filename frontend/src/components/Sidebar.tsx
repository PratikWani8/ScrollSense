import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  History,
  BarChart3,
  Sparkles,
  Target,
  Smartphone,
  ShieldAlert,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/sessions', label: 'Session History', icon: History },
  { to: '/analytics', label: 'Behavioral Analytics', icon: BarChart3 },
  { to: '/insights', label: 'AI Habit Insights', icon: Sparkles },
  { to: '/goals', label: 'Goals & Limits', icon: Target },
  { to: '/devices', label: 'Connected Devices', icon: Smartphone },
  { to: '/settings', label: 'Privacy & Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 border-r border-slate-800 bg-navy-900/60 p-4 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Navigation
        </div>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/25 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </div>

      {/* Privacy guarantee badge */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Privacy First
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          No raw URLs, titles, or browsing history are ever collected or stored.
        </p>
      </div>
    </aside>
  );
};
