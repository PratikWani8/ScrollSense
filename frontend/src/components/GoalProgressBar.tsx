import React from 'react';
import { Target, CheckCircle2 } from 'lucide-react';

interface GoalProgressBarProps {
  trackedSeconds: number;
  goalLimitSeconds: number;
}

export const GoalProgressBar: React.FC<GoalProgressBarProps> = ({
  trackedSeconds,
  goalLimitSeconds,
}) => {
  const trackedMinutes = Math.round(trackedSeconds / 60);
  const goalMinutes = Math.round(goalLimitSeconds / 60);
  const percentage = Math.min(100, Math.round((trackedSeconds / Math.max(1, goalLimitSeconds)) * 100));
  const isExceeded = trackedSeconds > goalLimitSeconds;

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-navy-900 border border-slate-800 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400">Daily Short-Video Goal</span>
          <p className="text-[11px] text-slate-500 mt-0.5">Target limit: {goalMinutes}m today</p>
        </div>
        <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/40 text-indigo-400">
          <Target className="w-4 h-4" />
        </div>
      </div>

      <div className="my-4">
        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-white">{trackedMinutes}m</span>
            <span className="text-xs text-slate-500 font-medium">/ {goalMinutes}m</span>
          </div>
          <span className={`text-xs font-semibold ${isExceeded ? 'text-rose-400' : 'text-slate-300'}`}>
            {percentage}%
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isExceeded
                ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        {isExceeded ? (
          <span className="text-rose-400 font-medium">
            Goal exceeded by {trackedMinutes - goalMinutes}m today. Consider a screen break!
          </span>
        ) : (
          <span className="text-slate-400">
            {goalMinutes - trackedMinutes}m remaining within your configured daily goal.
          </span>
        )}
      </div>
    </div>
  );
};
