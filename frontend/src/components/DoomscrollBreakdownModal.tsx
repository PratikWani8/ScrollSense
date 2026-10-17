import React from 'react';
import { DoomscrollScoreBreakdown } from '../api/types';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Info,
  Clock,
  Target,
  Moon,
  Sparkles,
} from 'lucide-react';

interface DoomscrollBreakdownModalProps {
  breakdown: DoomscrollScoreBreakdown | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DoomscrollBreakdownModal: React.FC<DoomscrollBreakdownModalProps> = ({
  breakdown,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !breakdown) return null;

  const { score, classification, contributingFactors, thresholds, dataQuality, ruleId } = breakdown;

  let badgeColor = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  let Icon = ShieldCheck;
  if (score >= 80) {
    badgeColor = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    Icon = AlertOctagon;
  } else if (score >= 61) {
    badgeColor = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    Icon = AlertTriangle;
  } else if (score >= 36) {
    badgeColor = 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
    Icon = Info;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-navy-900 border border-slate-700 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Explainable Habit Score Breakdown</h2>
              <p className="text-xs text-slate-400">Deterministic scoring model • Primary rule: <code className="text-indigo-300 font-mono text-[11px]">{ruleId}</code></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 border border-slate-700/40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Score Banner */}
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{score}</span>
            <span className="text-xs text-slate-400 font-medium">/ 100</span>
            <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeColor}`}>
              {classification}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-400">Data Quality:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-semibold font-mono">
              {dataQuality}
            </span>
          </div>
        </div>

        {/* Contributing Factors */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Contributing Behavioral Factors ({contributingFactors.length})
          </h3>

          {contributingFactors.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-800/30 text-xs text-slate-400 text-center">
              No elevated risk factors detected today. Consumption is currently balanced.
            </div>
          ) : (
            contributingFactors.map((f, i) => (
              <div
                key={f.ruleId || i}
                className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/40 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    {f.factor}
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-500 text-[11px]">Max {f.weight} pts</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[11px]">
                      +{f.scoreDelta} pts
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{f.description}</p>

                {/* Progress ratio */}
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                    style={{ width: `${Math.min(100, Math.round(f.normalizedValue * 100))}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Configured Thresholds Grid */}
        <div className="pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Active Threshold Configuration
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <span className="text-slate-500 text-[10px] uppercase font-semibold">Break Target</span>
              <div className="font-bold text-white mt-0.5">{thresholds.longSessionMinutes} minutes</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <span className="text-slate-500 text-[10px] uppercase font-semibold">Daily Limit</span>
              <div className="font-bold text-white mt-0.5">{thresholds.dailyGoalMinutes} minutes</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <span className="text-slate-500 text-[10px] uppercase font-semibold">Return Window</span>
              <div className="font-bold text-white mt-0.5">{thresholds.returnWindowMinutes} minutes</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <span className="text-slate-500 text-[10px] uppercase font-semibold">Quiet Hours</span>
              <div className="font-bold text-white mt-0.5">
                {thresholds.quietHours.enabled
                  ? `${thresholds.quietHours.startHour}:00 - ${thresholds.quietHours.endHour}:00`
                  : 'Disabled'}
              </div>
            </div>
          </div>
        </div>

        {/* Non-medical Disclaimer */}
        <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-[11px] text-slate-400 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <p>
            <strong>Transparent Wellbeing Engine:</strong> ScrollSense scores are deterministic algorithmic metrics designed for mindful awareness. They do not diagnose addiction, psychiatric conditions, or medical disorders.
          </p>
        </div>
      </div>
    </div>
  );
};
