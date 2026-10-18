import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { AIInsightReport } from '../api/types';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Target,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  Info,
} from 'lucide-react';

export const AIInsightsPage: React.FC = () => {
  const [reports, setReports] = useState<AIInsightReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<AIInsightReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goalAppliedMsg, setGoalAppliedMsg] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAIReports(1, 10);
      setReports(res.reports);
      if (res.reports.length > 0 && !selectedReport) {
        setSelectedReport(res.reports[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load AI reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      setError(null);
      const newReport = await api.generateAIReport();
      setSelectedReport(newReport);
      await fetchReports();
    } catch (err: any) {
      setError(err.message || 'Failed to generate insight report');
    } finally {
      setGenerating(false);
    }
  };

  const handleApplySuggestedGoal = async () => {
    if (!selectedReport?.suggestedGoal) return;
    try {
      await api.updateGoals({
        dailyLimitSeconds: selectedReport.suggestedGoal.dailyLimitMinutes * 60,
      });
      setGoalAppliedMsg(`Daily target updated to ${selectedReport.suggestedGoal.dailyLimitMinutes} minutes!`);
      setTimeout(() => setGoalAppliedMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to apply suggested goal');
    }
  };

  if (loading && reports.length === 0) {
    return <LoadingSkeleton count={5} />;
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
            <Sparkles className="w-4 h-4" />
            AI Habit Intelligence
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Behavioral Insights & Reports</h1>
          <p className="text-xs text-slate-400 mt-1">
            Empirical habit synthesis, objective pattern detection, and realistic habit adjustments.
          </p>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={generating}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all disabled:opacity-50 whitespace-nowrap"
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Analyzing Habits...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate New Report</span>
            </>
          )}
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold">×</button>
        </div>
      )}

      {goalAppliedMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{goalAppliedMsg}</span>
        </div>
      )}

      {/* Reports history selector (if multiple reports exist) */}
      {reports.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 text-[11px] uppercase font-bold shrink-0">Report History:</span>
          {reports.map((r) => (
            <button
              key={r.reportId}
              onClick={() => setSelectedReport(r)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all font-medium ${
                selectedReport?.reportId === r.reportId
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-slate-700/40'
              }`}
            >
              {r.createdAt ? new Date(r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : r.reportId}
            </button>
          ))}
        </div>
      )}

      {selectedReport ? (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-indigo-950/40 via-navy-900 to-slate-900 border border-indigo-500/25 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {selectedReport.modelVersion}
                </span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                  selectedReport.dataSufficiency === 'SUFFICIENT'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : selectedReport.dataSufficiency === 'MODERATE'
                    ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}>
                  {selectedReport.dataSufficiency} Telemetry
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Generated {selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'recently'}
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Executive Summary</h2>
              <p className="text-base text-white font-medium leading-relaxed">
                "{selectedReport.summary}"
              </p>
            </div>
          </div>

          {/* 4-Quadrant Insights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Positive Changes */}
            <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span>Positive Habit Indicators</span>
              </div>

              <div className="space-y-2.5">
                {selectedReport.positiveChanges.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/40 text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-2"></span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Areas to Improve */}
            <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <span>Areas for Healthy Boundary Setting</span>
              </div>

              <div className="space-y-2.5">
                {selectedReport.areasToImprove.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/40 text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-2"></span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actionable Recommendations */}
            <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <span>Actionable Recommendations</span>
              </div>

              <div className="space-y-2.5">
                {selectedReport.recommendations.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/40 text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-2"></span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Goal Adjustment */}
            <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm mb-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Target className="w-4 h-4" />
                  </div>
                  <span>Empirical Target Recommendation</span>
                </div>

                {selectedReport.suggestedGoal ? (
                  <div className="p-4 rounded-2xl bg-slate-800/40 border border-cyan-500/20 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-400">Suggested Daily Limit</span>
                      <span className="text-xl font-bold text-cyan-300">
                        {selectedReport.suggestedGoal.dailyLimitMinutes} minutes
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pt-1">
                      {selectedReport.suggestedGoal.reasoning}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Current target aligns with your routine.</p>
                )}
              </div>

              {selectedReport.suggestedGoal && (
                <button
                  onClick={handleApplySuggestedGoal}
                  className="w-full mt-4 py-2.5 px-4 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Target className="w-4 h-4" />
                  <span>Adopt Suggested {selectedReport.suggestedGoal.dailyLimitMinutes}m Target</span>
                </button>
              )}
            </div>
          </div>

          {/* Factual Grounded Observations Card */}
          <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Verified Telemetry Observations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedReport.observations.map((obs, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-800/30 border border-slate-700/30 text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed"
                >
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{obs}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Non-diagnostic Boundary Disclaimer */}
          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-[11px] text-slate-400 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-slate-300">Privacy & Observational Boundary:</span>
              <p className="leading-relaxed">
                ScrollSense AI analyzes only anonymized usage statistics. Insights do not inspect video titles, search terms, or raw DOM data, and represent digital habit reflections rather than clinical or psychiatric health assessments.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="No Behavioral Reports Generated Yet"
          description="Click the button above to synthesize your active browsing telemetry across Instagram Reels and YouTube Shorts into an explainable habit report."
          actionText="Generate First Report"
          onAction={handleGenerateReport}
        />
      )}
    </div>
  );
};
