import React, { useState } from 'react';
import {
  CurrentIntentionData,
  IntentionAdherenceMetrics,
  ScrollingIntentionType,
  TrackingSessionSummary,
} from '../api/types';
import { Target, CheckCircle2, AlertTriangle, Clock, ArrowRight, Compass, Sparkles } from 'lucide-react';

interface IntentAwareSectionProps {
  currentIntention: CurrentIntentionData | null;
  adherenceMetrics: IntentionAdherenceMetrics | null;
  activeSession?: TrackingSessionSummary | null;
  onSetIntention?: (type: ScrollingIntentionType, plannedDurationSeconds: number) => Promise<void>;
  loading?: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) {
    return `${m}m ${s > 0 ? `${s}s` : ''}`;
  }
  return `${s}s`;
}

export const IntentAwareSection: React.FC<IntentAwareSectionProps> = ({
  currentIntention,
  adherenceMetrics,
  activeSession,
  onSetIntention,
  loading,
}) => {
  const [selectedType, setSelectedType] = useState<ScrollingIntentionType>('Taking a Short Break');
  const [selectedMinutes, setSelectedMinutes] = useState<number>(10);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 animate-pulse space-y-4">
        <div className="h-4 w-40 bg-slate-800 rounded"></div>
        <div className="h-24 bg-slate-800/40 rounded"></div>
      </div>
    );
  }

  const handleCommit = async () => {
    if (!onSetIntention) return;
    try {
      setSubmitting(true);
      await onSetIntention(selectedType, selectedMinutes * 60);
      setFeedbackMsg(`Committed ${selectedMinutes}m for ${selectedType}!`);
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch {
      setFeedbackMsg('Failed to set intention. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeIntent = currentIntention?.session?.intention || activeSession?.intention;
  const hasActive = !!activeIntent;

  const totalWithIntent = adherenceMetrics?.totalSessionsWithIntent || 0;
  const adherenceRate = adherenceMetrics?.adherenceRatePercentage ?? 0;
  const breakdowns = adherenceMetrics?.intentBreakdown || {};

  return (
    <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Intent-Aware Scrolling</h2>
            <p className="text-xs text-slate-400">
              Declare your scrolling objective beforehand to prevent unconscious looping
            </p>
          </div>
        </div>

        {totalWithIntent > 0 && (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {adherenceRate}% Intention Adherence
            </span>
          </div>
        )}
      </div>

      {/* Active Session Intention or Quick Commitment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Current Active Intention Status */}
        <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Active Intention State
            </span>
            {hasActive ? (
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  activeIntent.isExceeded
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {activeIntent.isExceeded ? 'Plan Exceeded' : 'On Track'}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                No Active Intent
              </span>
            )}
          </div>

          {hasActive ? (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-lg font-bold text-white">🎯 {activeIntent.type}</span>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Planned limit: {formatDuration(activeIntent.plannedDurationSeconds)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-mono">
                    Elapsed: {formatDuration(activeSession?.activeDurationSeconds || 0)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              {activeIntent.plannedDurationSeconds > 0 && (
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      activeIntent.isExceeded ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          ((activeSession?.activeDurationSeconds || 0) /
                            activeIntent.plannedDurationSeconds) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                {activeIntent.isExceeded
                  ? '⚠️ You have exceeded your planned intention time. Gentle reminder fired.'
                  : 'Gentle notification will trigger when your planned time is reached.'}
              </p>
            </div>
          ) : (
            <div className="py-2 space-y-2">
              <p className="text-xs text-slate-300">
                No active session is currently bound to an intent. You can pre-commit an intent below or pick one inside the extension popup when opening Reels or Shorts.
              </p>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold">
                <Compass className="w-4 h-4" />
                Mindful intent reduces mindless feed visits by up to 40%.
              </div>
            </div>
          )}

          {/* Quick Commit Controls */}
          {onSetIntention && (
            <div className="pt-3 border-t border-slate-800/80 space-y-3">
              <span className="text-xs font-semibold text-slate-300">Commit Intent Now:</span>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as ScrollingIntentionType)}
                  className="bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="Learning">Learning</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Finding Something Specific">Finding Something Specific</option>
                  <option value="Taking a Short Break">Taking a Short Break</option>
                  <option value="Other">Other</option>
                </select>

                <select
                  value={selectedMinutes}
                  onChange={(e) => setSelectedMinutes(parseInt(e.target.value, 10))}
                  className="bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="20">20 minutes</option>
                  <option value="30">30 minutes</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleCommit}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {submitting ? 'Committing...' : 'Set Active Intent'}
                </button>
                {feedbackMsg && (
                  <span className="text-xs text-emerald-400 font-semibold">{feedbackMsg}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Adherence Performance Metrics */}
        <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              14-Day Intention Adherence
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {totalWithIntent} Intent Sessions
            </span>
          </div>

          {totalWithIntent > 0 ? (
            <div className="space-y-3.5">
              {Object.entries(breakdowns).map(([type, stats]) => (
                <div key={type} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{type}</span>
                    <span className="text-slate-400 font-mono">
                      {stats.adheredCount}/{stats.count} sessions ({stats.adherenceRate}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, stats.adherenceRate))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto opacity-70" />
              <h4 className="text-xs font-semibold text-white">No intentions logged yet</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Once you set scrolling intentions using the extension or the selector on the left, your adherence rate and category insights will display here.
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
            Adherence measures whether you gracefully exited your feed within your declared time window.
          </div>
        </div>
      </div>
    </div>
  );
};
