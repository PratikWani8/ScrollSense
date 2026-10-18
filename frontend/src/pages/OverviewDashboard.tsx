import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { OverviewMetrics, HourlyBucket, TrendDay, PlatformMetrics } from '../api/types';
import { MetricCard } from '../components/MetricCard';
import { DoomscrollMeter } from '../components/DoomscrollMeter';
import { GoalProgressBar } from '../components/GoalProgressBar';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import {
  Clock,
  Instagram,
  Youtube,
  Layers,
  Timer,
  BarChart2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Smartphone,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m 00s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
}

function formatMinutes(seconds: number): number {
  return Math.round((seconds / 60) * 10) / 10;
}

const PLATFORM_COLORS = {
  instagram: '#E1306C',
  youtube: '#FF0000',
};

import { DoomscrollBreakdownModal } from '../components/DoomscrollBreakdownModal';
import { TimeReclaimedCard } from '../components/TimeReclaimedCard';
import { IntentAwareSection } from '../components/IntentAwareSection';
import { PersonalTriggerMap } from '../components/PersonalTriggerMap';
import {
  DoomscrollScoreBreakdown,
  TimeReclaimedData,
  CurrentIntentionData,
  IntentionAdherenceMetrics,
  PersonalTriggerMapData,
  ScrollingIntentionType,
} from '../api/types';

export const OverviewDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [hourlyData, setHourlyData] = useState<HourlyBucket[]>([]);
  const [trendsData, setTrendsData] = useState<TrendDay[]>([]);
  const [platformData, setPlatformData] = useState<PlatformMetrics | null>(null);
  const [breakdown, setBreakdown] = useState<DoomscrollScoreBreakdown | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [activeReminder, setActiveReminder] = useState<any>(null);
  const [timeReclaimed, setTimeReclaimed] = useState<TimeReclaimedData | null>(null);
  const [currentIntention, setCurrentIntention] = useState<CurrentIntentionData | null>(null);
  const [adherenceMetrics, setAdherenceMetrics] = useState<IntentionAdherenceMetrics | null>(null);
  const [triggerMap, setTriggerMap] = useState<PersonalTriggerMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [
        overviewRes,
        hourlyRes,
        trendsRes,
        platformRes,
        breakdownRes,
        timeReclaimedRes,
        currentIntentionRes,
        adherenceRes,
        triggerMapRes,
      ] = await Promise.all([
        api.getOverview(),
        api.getHourly(),
        api.getTrends(7),
        api.getPlatforms(),
        api.getDoomscrollBreakdown().catch(() => null),
        api.getTimeReclaimed(14).catch(() => null),
        api.getCurrentIntention().catch(() => null),
        api.getIntentionAdherence(14).catch(() => null),
        api.getTriggerMap().catch(() => null),
      ]);
      setMetrics(overviewRes);
      setHourlyData(hourlyRes.hourly);
      setTrendsData(trendsRes.trends);
      setPlatformData(platformRes.platforms);
      if (breakdownRes) {
        setBreakdown(breakdownRes);
        setActiveReminder(breakdownRes.activeReminder);
      }
      if (timeReclaimedRes) setTimeReclaimed(timeReclaimedRes);
      if (currentIntentionRes) setCurrentIntention(currentIntentionRes);
      if (adherenceRes) setAdherenceMetrics(adherenceRes);
      if (triggerMapRes) setTriggerMap(triggerMapRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleSetIntention = async (type: ScrollingIntentionType, plannedDurationSeconds: number) => {
    const targetSessionId = metrics?.recentSessions?.[0]?.sessionId;
    if (targetSessionId) {
      await api.setSessionIntention(targetSessionId, { type, plannedDurationSeconds });
    }
    const [intRes, adhRes] = await Promise.all([
      api.getCurrentIntention().catch(() => null),
      api.getIntentionAdherence(14).catch(() => null),
    ]);
    if (intRes) setCurrentIntention(intRes);
    if (adhRes) setAdherenceMetrics(adhRes);
  };

  const handleLogTriggerContext = async (context: string) => {
    const targetSessionId = metrics?.recentSessions?.[0]?.sessionId;
    await api.logTriggerContext({ context, sessionId: targetSessionId });
    const trigRes = await api.getTriggerMap().catch(() => null);
    if (trigRes) setTriggerMap(trigRes);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingSkeleton count={6} />;
  }

  if (error) {
    return (
      <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-center space-y-4 max-w-xl mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-base font-bold text-white">Error Loading Dashboard</h2>
        <p className="text-xs text-rose-300">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const today = metrics?.today;
  const hasActivity = today && (today.totalDurationSeconds > 0 || today.sessionCount > 0);

  // Chart data formatting
  const hourlyChartData = hourlyData.map((b) => ({
    hour: b.hourLabel,
    Instagram: formatMinutes(b.instagramSeconds),
    YouTube: formatMinutes(b.youtubeSeconds),
  }));

  const trendChartData = trendsData.map((t) => ({
    date: t.date.slice(5), // MM-DD
    Instagram: formatMinutes(t.instagramDurationSeconds),
    YouTube: formatMinutes(t.youtubeDurationSeconds),
    Total: formatMinutes(t.totalDurationSeconds),
  }));

  const pieData = [
    { name: 'Instagram Reels', value: today?.instagramDurationSeconds || 0, color: '#E1306C' },
    { name: 'YouTube Shorts', value: today?.youtubeDurationSeconds || 0, color: '#FF0000' },
  ].filter((p) => p.value > 0);

  return (
    <div className="space-y-8">
      {/* Top Header & Sync Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Behavioral Overview
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Daily Wellbeing Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Tracking desktop feeds across Instagram Reels & YouTube Shorts • Timezone: {metrics?.timezone || 'Local'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Extension Sync Pill */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-300 font-medium">
              {metrics?.syncStatus.connectedDeviceCount ?? 0} Device(s)
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-[11px] text-slate-400">
              {metrics?.syncStatus.lastSyncAt
                ? `Synced ${new Date(metrics.syncStatus.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'No sync recorded'}
            </span>
          </div>

          <button
            onClick={fetchDashboardData}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 border border-slate-700/40 hover:bg-slate-700/50 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Intervention Alert Banner */}
      {activeReminder && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">Active Habit Reminder: </span>
              <span>{activeReminder.reason || 'Prolonged continuous scrolling detected.'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setShowBreakdown(true)}
              className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 font-semibold text-[11px] border border-amber-500/30"
            >
              Inspect Why
            </button>
            <button
              onClick={async () => {
                await api.updateReminderStatus(activeReminder.eventId, 'DISMISSED');
                setActiveReminder(null);
              }}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] border border-slate-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Disclaimers Banner */}
      <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            <strong>View Estimation Heuristic:</strong> Video counts are estimated via active tab dwell-time (≥ 2.0s) and viewport position, not direct platform analytics.
          </span>
        </div>
        <Link to="/insights" className="text-indigo-400 hover:text-indigo-300 font-semibold underline shrink-0 ml-4 hidden sm:inline">
          View AI Insights
        </Link>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="col-span-2 sm:col-span-1 lg:col-span-2">
          <MetricCard
            title="Today's Feed Duration"
            value={formatDuration(today?.totalDurationSeconds || 0)}
            subtitle={`${today?.sessionCount || 0} active browsing sessions`}
            icon={Clock}
            variant="accent"
          />
        </div>

        <div className="col-span-1 sm:col-span-1 lg:col-span-1">
          <MetricCard
            title="Est. Reels Views"
            value={today?.estimatedInstagramViews || 0}
            subtitle="Instagram (≥2s dwell)"
            icon={Instagram}
            variant="default"
          />
        </div>

        <div className="col-span-1 sm:col-span-1 lg:col-span-1">
          <MetricCard
            title="Est. Shorts Views"
            value={today?.estimatedYouTubeViews || 0}
            subtitle="YouTube (≥2s dwell)"
            icon={Youtube}
            variant="default"
          />
        </div>

        <div className="col-span-1 sm:col-span-1 lg:col-span-1">
          <MetricCard
            title="Longest Session"
            value={formatDuration(today?.longestSessionSeconds || 0)}
            subtitle="Continuous engagement"
            icon={Timer}
            variant="warning"
          />
        </div>

        <div className="col-span-1 sm:col-span-1 lg:col-span-1">
          <MetricCard
            title="Avg. Session"
            value={formatDuration(today?.averageSessionSeconds || 0)}
            subtitle="Per visit average"
            icon={BarChart2}
            variant="default"
          />
        </div>
      </div>

      {/* Risk & Goal Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DoomscrollMeter
          score={today?.doomscrollScore || 0}
          onExplain={() => setShowBreakdown(true)}
        />
        <GoalProgressBar
          trackedSeconds={today?.totalDurationSeconds || 0}
          goalLimitSeconds={metrics?.goal.dailyLimitSeconds || 3600}
        />
      </div>

      {/* Time Reclaimed Score Card */}
      <TimeReclaimedCard data={timeReclaimed} />

      {/* Usage Charts */}
      {hasActivity ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hourly Bar Chart */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Usage by Hour of Day</h2>
                <p className="text-xs text-slate-400">Minutes spent scrolling across hours (00:00 - 23:00)</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E1306C]"></span>
                  Reels
                </span>
                <span className="flex items-center gap-1.5 text-red-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF0000]"></span>
                  Shorts
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} unit="m" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="Instagram" stackId="a" fill="#E1306C" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="YouTube" stackId="a" fill="#FF0000" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Platform Split Donut */}
          <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">Platform Split</h2>
              <p className="text-xs text-slate-400">Today's active time distribution</p>
            </div>

            <div className="h-48 w-full flex items-center justify-center">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={5}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => formatDuration(Number(val))}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-slate-500">No platform distribution available</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Instagram</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {formatDuration(today?.instagramDurationSeconds || 0)}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <div className="text-slate-400 text-[10px] uppercase font-semibold">YouTube</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {formatDuration(today?.youtubeDurationSeconds || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Advanced Digital Wellbeing: Intent-Aware Scrolling */}
      <IntentAwareSection
        currentIntention={currentIntention}
        adherenceMetrics={adherenceMetrics}
        activeSession={metrics?.recentSessions?.[0]}
        onSetIntention={handleSetIntention}
      />

      {/* Advanced Digital Wellbeing: Personal Doomscroll Trigger Map */}
      <PersonalTriggerMap
        data={triggerMap}
        onLogContext={handleLogTriggerContext}
      />

      {/* 7-Day Trend Chart */}
      <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-white">7-Day Trend</h2>
              <p className="text-xs text-slate-400">Total short-video duration across the last week</p>
            </div>
          </div>
          <Link
            to="/analytics"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            Deep Analytics <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} unit="m" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
              />
              <Area
                type="monotone"
                dataKey="Total"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTotal)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Sessions Table or Empty State */}
      <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Recent Tracking Sessions</h2>
            <p className="text-xs text-slate-400">Synchronized sessions from connected browsers</p>
          </div>
          <Link
            to="/sessions"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            All Sessions <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {metrics?.recentSessions && metrics.recentSessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase font-semibold text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="pb-3 px-3">Platform</th>
                  <th className="pb-3 px-3">Started At</th>
                  <th className="pb-3 px-3">Duration</th>
                  <th className="pb-3 px-3">Est. Views</th>
                  <th className="pb-3 px-3">Navigation Events</th>
                  <th className="pb-3 px-3">Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {metrics.recentSessions.slice(0, 5).map((s) => (
                  <tr key={s.sessionId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {s.platform === 'instagram' ? (
                          <div className="p-1 rounded-lg bg-pink-500/10 text-pink-400">
                            <Instagram className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="p-1 rounded-lg bg-red-500/10 text-red-400">
                            <Youtube className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span className="capitalize font-semibold text-white">
                          {s.platform === 'instagram' ? 'Instagram Reels' : 'YouTube Shorts'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                      {new Date(s.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">
                      {formatDuration(s.activeDurationSeconds)}
                    </td>
                    <td className="py-3 px-3 text-cyan-300 font-mono">
                      ~{s.estimatedVideoViews} views
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {s.navigationEvents} scrolls
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          s.dataQuality === 'HIGH'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {s.dataQuality}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Layers}
            title="No activity tracked yet today"
            description="Install and pair the ScrollSense extension, then browse Instagram Reels or YouTube Shorts on desktop to generate real-time metrics."
            actionText="Pair Extension"
            onAction={() => (window.location.href = '/devices')}
          />
        )}
      </div>

      {/* Explainable Habit Score Breakdown Modal */}
      <DoomscrollBreakdownModal
        breakdown={breakdown}
        isOpen={showBreakdown}
        onClose={() => setShowBreakdown(false)}
      />
    </div>
  );
};
