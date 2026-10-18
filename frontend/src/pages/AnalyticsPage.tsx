import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { TrendDay, PlatformMetrics, HourlyBucket } from '../api/types';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import {
  BarChart3,
  TrendingUp,
  Instagram,
  Youtube,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Clock,
  Flame,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function formatMinutes(seconds: number): number {
  return Math.round((seconds / 60) * 10) / 10;
}

export const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<7 | 30>(7);
  const [trends, setTrends] = useState<TrendDay[]>([]);
  const [platforms, setPlatforms] = useState<PlatformMetrics | null>(null);
  const [hourly, setHourly] = useState<HourlyBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async (days: 7 | 30) => {
    try {
      setLoading(true);
      setError(null);
      const [trendRes, platformRes, hourlyRes] = await Promise.all([
        api.getTrends(days),
        api.getPlatforms(),
        api.getHourly(),
      ]);
      setTrends(trendRes.trends);
      setPlatforms(platformRes.platforms);
      setHourly(hourlyRes.hourly);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(timeRange);
  }, [timeRange]);

  if (loading) {
    return <LoadingSkeleton count={6} />;
  }

  // Aggregate stats across the selected period
  const totalDuration = trends.reduce((acc, t) => acc + t.totalDurationSeconds, 0);
  const totalViews = trends.reduce((acc, t) => acc + t.estimatedInstagramViews + t.estimatedYouTubeViews, 0);
  const totalSessions = trends.reduce((acc, t) => acc + t.sessionCount, 0);
  const avgDoomscore = trends.length > 0 ? Math.round(trends.reduce((acc, t) => acc + t.doomscrollScore, 0) / trends.length) : 0;

  // Chart models
  const durationChartData = trends.map((t) => ({
    date: t.date.slice(5),
    Instagram: formatMinutes(t.instagramDurationSeconds),
    YouTube: formatMinutes(t.youtubeDurationSeconds),
    Total: formatMinutes(t.totalDurationSeconds),
  }));

  const viewsChartData = trends.map((t) => ({
    date: t.date.slice(5),
    Instagram: t.estimatedInstagramViews,
    YouTube: t.estimatedYouTubeViews,
  }));

  const riskChartData = trends.map((t) => ({
    date: t.date.slice(5),
    HabitScore: t.doomscrollScore,
  }));

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
            <BarChart3 className="w-4 h-4" />
            Behavioral Intelligence
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Habit & Usage Analytics</h1>
          <p className="text-xs text-slate-400 mt-1">
            Historical consumption trends, platform breakdown, and habit risk modeling.
          </p>
        </div>

        {/* 7d vs 30d Toggle */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
          <button
            onClick={() => setTimeRange(7)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              timeRange === 7 ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeRange(30)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              timeRange === 30 ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-navy-900/90 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Period Duration</span>
          <div className="text-xl font-bold text-white mt-1">{formatDuration(totalDuration)}</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">{trends.length} days tracked</span>
        </div>
        <div className="p-4 rounded-2xl bg-navy-900/90 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Est. Short Videos</span>
          <div className="text-xl font-bold text-cyan-400 mt-1">~{totalViews}</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Estimated ≥ 2s dwell</span>
        </div>
        <div className="p-4 rounded-2xl bg-navy-900/90 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Sessions</span>
          <div className="text-xl font-bold text-white mt-1">{totalSessions}</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Desktop visits</span>
        </div>
        <div className="p-4 rounded-2xl bg-navy-900/90 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Avg. Habit Risk</span>
          <div className="text-xl font-bold text-amber-400 mt-1">{avgDoomscore}/100</div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Velocity & duration model</span>
        </div>
      </div>

      {/* Duration Area Chart */}
      <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Daily Scrolling Duration (Minutes)</h2>
            <p className="text-xs text-slate-400">Total active feed time by day and platform</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-pink-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E1306C]"></span> Reels
            </span>
            <span className="flex items-center gap-1.5 text-red-500">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF0000]"></span> Shorts
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={durationChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E1306C" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#E1306C" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorYt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF0000" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#FF0000" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} unit="m" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
              />
              <Area type="monotone" dataKey="Instagram" stroke="#E1306C" fillOpacity={1} fill="url(#colorIg)" />
              <Area type="monotone" dataKey="YouTube" stroke="#FF0000" fillOpacity={1} fill="url(#colorYt)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Estimated Views & Habit Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estimated Views Chart */}
        <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-4">
          <div>
            <h2 className="text-base font-bold text-white">Estimated Video Views by Day</h2>
            <p className="text-xs text-slate-400">Heuristic qualified views (≥ 2s dwell threshold)</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={viewsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                />
                <Bar dataKey="Instagram" fill="#E1306C" radius={[2, 2, 0, 0]} />
                <Bar dataKey="YouTube" fill="#FF0000" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Habit Risk Trend */}
        <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-4">
          <div>
            <h2 className="text-base font-bold text-white">Daily Habit Risk Score (0-100)</h2>
            <p className="text-xs text-slate-400">Score derived from duration, scroll velocity & session length</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                />
                <Line
                  type="monotone"
                  dataKey="HabitScore"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#f59e0b' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Platform Comparison Cards */}
      {platforms && (
        <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-4">
          <div>
            <h2 className="text-base font-bold text-white">Platform Comparison</h2>
            <p className="text-xs text-slate-400">Lifetime comparison between Instagram Reels and YouTube Shorts</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Instagram Card */}
            <div className="p-5 rounded-2xl bg-slate-800/40 border border-pink-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-pink-400 font-bold text-sm">
                  <Instagram className="w-4 h-4" /> Instagram Reels
                </div>
                <span className="text-xs font-mono font-bold text-pink-400">
                  {platforms.instagramPercentage}% of time
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/50 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Duration</span>
                  <div className="font-bold text-white mt-0.5">
                    {formatDuration(platforms.instagram.totalDurationSeconds)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Est. Views</span>
                  <div className="font-bold text-cyan-300 mt-0.5">
                    ~{platforms.instagram.estimatedViews}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Sessions</span>
                  <div className="font-bold text-white mt-0.5">
                    {platforms.instagram.sessionCount}
                  </div>
                </div>
              </div>
            </div>

            {/* YouTube Card */}
            <div className="p-5 rounded-2xl bg-slate-800/40 border border-red-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <Youtube className="w-4 h-4" /> YouTube Shorts
                </div>
                <span className="text-xs font-mono font-bold text-red-400">
                  {platforms.youtubePercentage}% of time
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/50 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Duration</span>
                  <div className="font-bold text-white mt-0.5">
                    {formatDuration(platforms.youtube.totalDurationSeconds)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Est. Views</span>
                  <div className="font-bold text-cyan-300 mt-0.5">
                    ~{platforms.youtube.estimatedViews}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Sessions</span>
                  <div className="font-bold text-white mt-0.5">
                    {platforms.youtube.sessionCount}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
