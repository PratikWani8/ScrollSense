import React from 'react';
import { TimeReclaimedData } from '../api/types';
import { Sparkles, TrendingUp, TrendingDown, Clock, ShieldCheck, Info } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface TimeReclaimedCardProps {
  data: TimeReclaimedData | null;
  loading?: boolean;
}

function formatDuration(seconds: number): string {
  const absSecs = Math.abs(seconds);
  const hrs = Math.floor(absSecs / 3600);
  const mins = Math.floor((absSecs % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}

export const TimeReclaimedCard: React.FC<TimeReclaimedCardProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 animate-pulse space-y-4">
        <div className="h-4 w-40 bg-slate-800 rounded"></div>
        <div className="h-10 w-28 bg-slate-800 rounded"></div>
        <div className="h-32 bg-slate-800/40 rounded"></div>
      </div>
    );
  }

  if (!data || !data.hasSufficientBaseline) {
    return (
      <div className="p-6 rounded-3xl bg-navy-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Time Reclaimed Score</h2>
              <p className="text-xs text-slate-400">Personal baseline comparison</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            Calibrating Baseline
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-800/30 border border-slate-800 text-center space-y-2">
          <Clock className="w-8 h-8 text-indigo-400 mx-auto opacity-80" />
          <h3 className="text-sm font-semibold text-white">Baseline in progress</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            ScrollSense needs at least 2 complete historical days of activity (excluding today)
            to establish your authentic browsing baseline without guesswork. Keep browsing normally.
          </p>
        </div>
      </div>
    );
  }

  const isTodayPositive = data.isTodayPositive;
  const isWeeklyPositive = data.isWeeklyPositive;

  const chartData = (data.dailyHistory || []).map((d) => ({
    date: d.date.slice(5), // MM-DD
    Baseline: Math.round(d.baselineExpectedSeconds / 60),
    Actual: Math.round(d.actualSeconds / 60),
    Reclaimed: Math.round(d.timeReclaimedSeconds / 60),
  }));

  return (
    <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Time Reclaimed Score</h2>
            <p className="text-xs text-slate-400">
              Compared to your {data.baselineDaysCount}-day complete baseline ({formatDuration(data.baselineAverageSeconds)}/day)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              isWeeklyPositive
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            }`}
          >
            {isWeeklyPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            Week: {isWeeklyPositive ? '+' : '-'}{formatDuration(data.weeklyTimeReclaimedSeconds)}
          </span>
        </div>
      </div>

      {/* Main Metric Spotlight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today Reclaimed */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isTodayPositive
              ? 'bg-emerald-500/10 border-emerald-500/25'
              : 'bg-rose-500/10 border-rose-500/25'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-300">Today's Balance</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                isTodayPositive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {isTodayPositive ? 'Reclaimed' : 'Above Baseline'}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-2xl font-black ${
                isTodayPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isTodayPositive ? '+' : '-'}{formatDuration(data.todayTimeReclaimedSeconds)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {isTodayPositive
              ? 'Minutes returned to your day vs. your historical average.'
              : 'Slightly above baseline — mindful awareness helps reset the rhythm.'}
          </p>
        </div>

        {/* Daily Baseline Average */}
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-300">Daily Baseline</span>
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {formatDuration(data.baselineAverageSeconds)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Derived from {data.baselineDaysCount} complete historical days (excluding today).
          </p>
        </div>

        {/* Today's Actual Usage */}
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-300">Actual Today</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-300 mt-1">
            {formatDuration(data.todayActualSeconds)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Continuous & qualified reels & shorts dwell time so far today.
          </p>
        </div>
      </div>

      {/* Historical Trend Chart */}
      {chartData.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Recent Baseline vs. Actual (Minutes)
            </span>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500/60"></span>
                Baseline Target
              </span>
              <span className="flex items-center gap-1.5 text-cyan-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400"></span>
                Actual Time
              </span>
            </div>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} unit="m" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '11px',
                  }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="Baseline" fill="#6366f1" opacity={0.5} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Empathetic Framing Footer */}
      <div className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-800/60 flex items-start gap-2.5 text-xs text-slate-400">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-200">Compassionate wellbeing:</strong> ScrollSense calculates time reclaimed without shame or punishment. Fluctuations are natural — reclaiming even 10 minutes a day compounds into hours of reclaimed focus each month.
        </p>
      </div>
    </div>
  );
};
