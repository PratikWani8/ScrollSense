import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';

interface DoomscrollMeterProps {
  score: number; // 0 to 100
  onExplain?: () => void;
}

export const DoomscrollMeter: React.FC<DoomscrollMeterProps> = ({ score, onExplain }) => {
  let badgeText = 'Within your goal';
  let badgeColor = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  let barGradient = 'from-emerald-500 to-teal-400';
  let Icon = ShieldCheck;

  if (score >= 80) {
    badgeText = 'Goal exceeded';
    badgeColor = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    barGradient = 'from-rose-500 to-amber-500';
    Icon = AlertOctagon;
  } else if (score >= 61) {
    badgeText = 'High-usage pattern';
    badgeColor = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    barGradient = 'from-amber-500 to-yellow-400';
    Icon = AlertTriangle;
  } else if (score >= 36) {
    badgeText = 'Consider a break';
    badgeColor = 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
    barGradient = 'from-indigo-500 to-cyan-400';
    Icon = ShieldCheck;
  }

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-navy-900 border border-slate-800 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400">Habit Risk Score</span>
          <p className="text-[11px] text-slate-500 mt-0.5">Explainable behavioral habit index</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badgeColor}`}>
          <Icon className="w-3.5 h-3.5" />
          {badgeText}
        </span>
      </div>

      <div className="my-4">
        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-white">{score}</span>
            <span className="text-xs text-slate-500 font-medium">/ 100</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {score <= 35 ? 'Low Risk' : score <= 60 ? 'Moderate' : 'Elevated'}
          </span>
        </div>

        {/* Progress meter bar */}
        <div className="w-full h-2.5 rounded-full bg-slate-800/80 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700 ease-out`}
            style={{ width: `${Math.min(100, Math.max(2, score))}%` }}
          />
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Continuous dwell, goal approach & quiet hours.</span>
        {onExplain ? (
          <button
            onClick={onExplain}
            className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 text-[11px] hover:underline"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Explain Factors
          </button>
        ) : (
          <span className="text-slate-500 text-[10px]">Deterministic model</span>
        )}
      </div>
    </div>
  );
};
