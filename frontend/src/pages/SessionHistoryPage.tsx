import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { TrackingSessionSummary } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import {
  History,
  Instagram,
  Youtube,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Layers,
  Clock,
  ShieldAlert,
} from 'lucide-react';

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m 00s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
}

export const SessionHistoryPage: React.FC = () => {
  const [sessions, setSessions] = useState<TrackingSessionSummary[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [platformFilter, setPlatformFilter] = useState<'all' | 'instagram' | 'youtube'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal State
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sessionDetail, setSessionDetail] = useState<{ session: TrackingSessionSummary; events: any[] } | null>(null);

  const fetchSessions = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getSessions({
        page,
        limit: 10,
        platform: platformFilter === 'all' ? undefined : platformFilter,
      });
      setSessions(res.sessions);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions(1);
  }, [platformFilter]);

  const openDetails = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setDetailLoading(true);
    try {
      const data = await api.getSessionDetails(sessionId);
      setSessionDetail(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedSessionId(null);
    setSessionDetail(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
            <History className="w-4 h-4" />
            Audit Log
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Session History</h1>
          <p className="text-xs text-slate-400 mt-1">
            Full record of desktop scrolling sessions tracked across Instagram & YouTube.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
            <button
              onClick={() => setPlatformFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                platformFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setPlatformFilter('instagram')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                platformFilter === 'instagram' ? 'bg-[#E1306C] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Instagram className="w-3.5 h-3.5" /> Reels
            </button>
            <button
              onClick={() => setPlatformFilter('youtube')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                platformFilter === 'youtube' ? 'bg-[#FF0000] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Youtube className="w-3.5 h-3.5" /> Shorts
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-4">
        {loading ? (
          <LoadingSkeleton count={5} />
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center">
            {error}
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No sessions match your filter"
            description="Browse Instagram Reels or YouTube Shorts on desktop with the extension active to record sessions."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] uppercase font-semibold text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="pb-3 px-3">Session ID</th>
                  <th className="pb-3 px-3">Platform</th>
                  <th className="pb-3 px-3">Started</th>
                  <th className="pb-3 px-3">Active Duration</th>
                  <th className="pb-3 px-3">Est. Views</th>
                  <th className="pb-3 px-3">Nav Events</th>
                  <th className="pb-3 px-3">Quality</th>
                  <th className="pb-3 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {sessions.map((s) => (
                  <tr key={s.sessionId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      {s.sessionId.slice(0, 8)}...
                    </td>
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
                          {s.platform === 'instagram' ? 'Reels' : 'Shorts'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {new Date(s.startedAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">
                      {formatDuration(s.activeDurationSeconds)}
                    </td>
                    <td className="py-3 px-3 text-cyan-300 font-mono">
                      ~{s.estimatedVideoViews}
                    </td>
                    <td className="py-3 px-3 text-slate-400">{s.navigationEvents}</td>
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
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => openDetails(s.sessionId)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700/60 inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3 text-indigo-400" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total sessions)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchSessions(pagination.page - 1)}
                className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchSessions(pagination.page + 1)}
                className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Session Detail Modal */}
      {selectedSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 rounded-3xl bg-navy-900 border border-slate-700 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Session Telemetry Breakdown</h3>
                  <p className="text-xs text-slate-400 font-mono">ID: {selectedSessionId}</p>
                </div>
              </div>
              <button
                onClick={closeDetails}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 border border-slate-700/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading session telemetry...</div>
            ) : sessionDetail ? (
              <div className="space-y-6">
                {/* Summary stat cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">Platform</span>
                    <div className="text-sm font-bold text-white mt-1 capitalize">
                      {sessionDetail.session.platform}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">Active Duration</span>
                    <div className="text-sm font-bold text-cyan-300 mt-1">
                      {formatDuration(sessionDetail.session.activeDurationSeconds)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">Est. Views</span>
                    <div className="text-sm font-bold text-indigo-400 mt-1">
                      {sessionDetail.session.estimatedVideoViews}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">Detector</span>
                    <div className="text-sm font-bold text-slate-200 mt-1">
                      v{sessionDetail.session.detectorVersion}
                    </div>
                  </div>
                </div>

                {/* Events list */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Ingested In-Session Events ({sessionDetail.events?.length || 0})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {sessionDetail.events && sessionDetail.events.length > 0 ? (
                      sessionDetail.events.map((ev, i) => (
                        <div
                          key={ev.eventId || i}
                          className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/40 text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-slate-200">{ev.eventType}</span>
                            <span className="text-slate-500 ml-2">
                              {new Date(ev.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {ev.metadata?.dwellTimeMs ? `${Math.round(ev.metadata.dwellTimeMs / 1000)}s dwell` : 'Event'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No granular events stored for this session.</p>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-[11px] text-slate-400">
                  <ShieldAlert className="w-3.5 h-3.5 text-indigo-400 inline mr-1.5" />
                  All telemetry values are strictly client-side calculated and aggregated to preserve user privacy.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
