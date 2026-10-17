import React, { useState } from 'react';
import { PersonalTriggerMapData, TriggerHeatmapCell } from '../api/types';
import { MapPin, Brain, AlertCircle, Compass, HelpCircle, Check, Info } from 'lucide-react';

interface PersonalTriggerMapProps {
  data: PersonalTriggerMapData | null;
  onLogContext?: (context: string) => Promise<void>;
  loading?: boolean;
}

const TIME_BLOCKS: Array<'Night' | 'Morning' | 'Afternoon' | 'Evening'> = [
  'Night',
  'Morning',
  'Afternoon',
  'Evening',
];

const TIME_BLOCK_LABELS: Record<string, string> = {
  Night: 'Night (00–06)',
  Morning: 'Morning (06–12)',
  Afternoon: 'Afternoon (12–18)',
  Evening: 'Evening (18–24)',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CONTEXT_OPTIONS = [
  'Boredom',
  'Taking a break',
  'Procrastination',
  'Stress',
  'Habit / Automatic Opening',
  'Other',
];

function formatMinutes(seconds: number): string {
  if (!seconds) return '0m';
  const m = Math.round(seconds / 60);
  return `${m}m`;
}

export const PersonalTriggerMap: React.FC<PersonalTriggerMapProps> = ({
  data,
  onLogContext,
  loading,
}) => {
  const [selectedCell, setSelectedCell] = useState<TriggerHeatmapCell | null>(null);
  const [submittingContext, setSubmittingContext] = useState(false);
  const [contextFeedback, setContextFeedback] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 animate-pulse space-y-4">
        <div className="h-4 w-40 bg-slate-800 rounded"></div>
        <div className="h-48 bg-slate-800/40 rounded"></div>
      </div>
    );
  }

  const handleContextClick = async (ctx: string) => {
    if (!onLogContext) return;
    try {
      setSubmittingContext(true);
      await onLogContext(ctx);
      setContextFeedback(`Logged: ${ctx}`);
      setTimeout(() => setContextFeedback(null), 3000);
    } catch {
      setContextFeedback('Failed to log context.');
    } finally {
      setSubmittingContext(false);
    }
  };

  if (!data || !data.hasSufficientData) {
    const analyzed = data?.totalSessionsAnalyzed || 0;
    const required = data?.requiredSessions || 5;
    const pct = Math.min(100, Math.round((analyzed / required) * 100));

    return (
      <div className="p-6 rounded-3xl bg-navy-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Personal Doomscroll Trigger Map</h2>
              <p className="text-xs text-slate-400">Behavioral pattern discovery</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {analyzed} / {required} Sessions
          </span>
        </div>

        <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-800 text-center space-y-3">
          <Compass className="w-8 h-8 text-purple-400 mx-auto opacity-80" />
          <h3 className="text-sm font-semibold text-white">Trigger map unlocking soon</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            ScrollSense requires a minimum of 5 tracked sessions before displaying habit heatmaps.
            This avoids premature conclusions and ensures behavioral patterns are reliable.
          </p>

          <div className="max-w-xs mx-auto space-y-1.5 pt-2">
            <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
              <span>Calibration Progress</span>
              <span>{analyzed} of {required} sessions</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Build matrix lookup: key = `${dayOfWeek}_${timeBlock}`
  const cellMap = new Map<string, TriggerHeatmapCell>();
  (data.heatmap || []).forEach((c) => {
    cellMap.set(`${c.dayOfWeek}_${c.timeBlock}`, c);
  });

  return (
    <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Personal Doomscroll Trigger Map</h2>
            <p className="text-xs text-slate-400">
              Deterministic 7×4 daypart analysis across {data.totalSessionsAnalyzed} tracked sessions
            </p>
          </div>
        </div>

        {data.peakDoomscrollTimeBlocks && data.peakDoomscrollTimeBlocks.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
              Peak Vulnerability: {data.peakDoomscrollTimeBlocks.join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* 7x4 Daypart Heatmap Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-300">DAYPART HEATMAP MATRIX</span>
          <span>Click any cell for session drilldown</span>
        </div>

        <div className="overflow-x-auto pb-2">
          <table className="w-full text-center border-separate border-spacing-1.5 min-w-[540px]">
            <thead>
              <tr>
                <th className="text-[11px] font-semibold text-slate-500 text-left w-28 py-1">Time Block</th>
                {DAY_LABELS.map((day) => (
                  <th key={day} className="text-[11px] font-semibold text-slate-400 py-1">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_BLOCKS.map((timeBlock) => (
                <tr key={timeBlock}>
                  <td className="text-left text-xs font-medium text-slate-400 py-1.5 pr-2">
                    {TIME_BLOCK_LABELS[timeBlock]}
                  </td>
                  {DAY_LABELS.map((_, dayOfWeek) => {
                    const cell = cellMap.get(`${dayOfWeek}_${timeBlock}`);
                    const count = cell?.sessionCount || 0;
                    const avgMins = cell ? Math.round(cell.averageDurationSeconds / 60) : 0;
                    const prolonged = cell?.prolongedSessionCount || 0;

                    let bgClass = 'bg-slate-800/30 border-slate-800 text-slate-500';
                    if (count > 0) {
                      if (prolonged > 0 || avgMins >= 25) {
                        bgClass = 'bg-rose-500/30 border-rose-500/50 text-rose-200 hover:bg-rose-500/40';
                      } else if (avgMins >= 15) {
                        bgClass = 'bg-amber-500/25 border-amber-500/40 text-amber-200 hover:bg-amber-500/35';
                      } else {
                        bgClass = 'bg-indigo-600/25 border-indigo-500/35 text-indigo-200 hover:bg-indigo-600/35';
                      }
                    }

                    const isSelected =
                      selectedCell &&
                      selectedCell.dayOfWeek === dayOfWeek &&
                      selectedCell.timeBlock === timeBlock;

                    return (
                      <td key={dayOfWeek}>
                        <button
                          onClick={() => cell && count > 0 && setSelectedCell(cell)}
                          disabled={count === 0}
                          className={`w-full py-2.5 px-1 rounded-xl border text-xs font-semibold transition-all ${bgClass} ${
                            isSelected ? 'ring-2 ring-indigo-400' : ''
                          }`}
                        >
                          {count > 0 ? (
                            <div>
                              <div className="font-bold">{avgMins}m</div>
                              <div className="text-[10px] opacity-75">{count} sess</div>
                            </div>
                          ) : (
                            <span className="opacity-30">—</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Cell Drilldown Card */}
      {selectedCell && (
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">
              Selected Daypart Drilldown
            </span>
            <h4 className="text-sm font-bold text-white mt-0.5">
              {selectedCell.dayLabel} • {TIME_BLOCK_LABELS[selectedCell.timeBlock]}
            </h4>
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[10px]">Total Sessions</span>
              <span className="font-bold text-white">{selectedCell.sessionCount}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Average Duration</span>
              <span className="font-bold text-white">{formatMinutes(selectedCell.averageDurationSeconds)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Median Duration</span>
              <span className="font-bold text-white">{formatMinutes(selectedCell.medianDurationSeconds)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Prolonged (≥25m)</span>
              <span className="font-bold text-rose-400">{selectedCell.prolongedSessionCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Context Check-in & Behavioral Observations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Mindful Trigger Check-in Prompt */}
        <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Mindful Trigger Check-in
            </span>
            {contextFeedback && (
              <span className="text-xs text-emerald-400 font-semibold">{contextFeedback}</span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            What emotional trigger prompted your recent scrolling session?
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CONTEXT_OPTIONS.map((ctx) => (
              <button
                key={ctx}
                onClick={() => handleContextClick(ctx)}
                disabled={submittingContext}
                className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-purple-500/50 hover:bg-purple-500/10 text-slate-300 hover:text-white text-xs font-medium transition-all text-center"
              >
                {ctx}
              </button>
            ))}
          </div>

          {/* Context Tag Distribution */}
          {data.contextDistribution && Object.keys(data.contextDistribution).length > 0 && (
            <div className="pt-3 border-t border-slate-800/80 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 block">Logged Trigger Breakdown</span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.contextDistribution).map(([ctx, count]) => (
                  <span
                    key={ctx}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] text-slate-300 border border-slate-700"
                  >
                    {ctx}: <strong className="text-purple-300">{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Explainable Observations */}
        <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Behavioral Observations
            </span>

            {data.observations && data.observations.length > 0 ? (
              <ul className="space-y-2.5">
                {data.observations.map((obs, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                    <span className="text-purple-400 font-bold shrink-0">•</span>
                    <span>{obs}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">
                Continue browsing naturally; as more sessions accumulate, specific pattern correlations will appear here.
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Deterministic behavioral heuristics. Non-diagnostic.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
