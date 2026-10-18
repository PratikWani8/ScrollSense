import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { GoalData } from '../api/types';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import {
  Target,
  Bell,
  Moon,
  CheckCircle2,
  AlertCircle,
  Save,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export const GoalsPage: React.FC = () => {
  const [goal, setGoal] = useState<GoalData | null>(null);
  const [dailyLimitMinutes, setDailyLimitMinutes] = useState(60);
  const [reminderInterval, setReminderInterval] = useState(20);
  const [platform, setPlatform] = useState<'all' | 'instagram' | 'youtube'>('all');
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietStartHour, setQuietStartHour] = useState(22);
  const [quietEndHour, setQuietEndHour] = useState(7);
  const [enabled, setEnabled] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getGoals();
      if (res.goal) {
        setGoal(res.goal);
        setDailyLimitMinutes(Math.round(res.goal.dailyLimitSeconds / 60));
        setReminderInterval(res.goal.reminderIntervalMinutes || 20);
        setPlatform(res.goal.platform || 'all');
        setQuietHoursEnabled(res.goal.quietHours?.enabled ?? true);
        setQuietStartHour(res.goal.quietHours?.startHour ?? 22);
        setQuietEndHour(res.goal.quietHours?.endHour ?? 7);
        setEnabled(res.goal.enabled ?? true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.updateGoals({
        dailyLimitSeconds: dailyLimitMinutes * 60,
        reminderIntervalMinutes: reminderInterval,
        platform,
        quietHours: {
          enabled: quietHoursEnabled,
          startHour: quietStartHour,
          endHour: quietEndHour,
        },
        enabled,
      });
      setGoal(res.goal);
      setSuccessMsg('Goals and wellbeing limits updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update goals');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton count={4} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
          <Target className="w-4 h-4" />
          Digital Wellbeing
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Goals & Interventions</h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure daily usage targets, break notifications, and quiet hours to prevent compulsive scrolling.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold text-rose-400">×</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-400 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold text-emerald-400">×</button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Daily Time Target */}
        <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Daily Target Limit</h2>
                <p className="text-xs text-slate-400">Maximum recommended short-video consumption per day</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Target Duration</span>
              <span className="text-lg font-bold text-indigo-400">{dailyLimitMinutes} minutes</span>
            </div>

            <input
              type="range"
              min={15}
              max={240}
              step={5}
              value={dailyLimitMinutes}
              onChange={(e) => setDailyLimitMinutes(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />

            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>15m (Strict)</span>
              <span>60m (Moderate)</span>
              <span>120m (Relaxed)</span>
              <span>240m</span>
            </div>
          </div>

          {/* Scope Selector */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Apply Target To
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'all', label: 'All Feeds' },
                { id: 'instagram', label: 'Instagram Only' },
                { id: 'youtube', label: 'YouTube Only' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPlatform(opt.id as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    platform === opt.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Break Reminders */}
        <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Break Reminders</h2>
              <p className="text-xs text-slate-400">Alert interval during continuous scrolling sessions</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 pt-2">
            {[15, 20, 30, 45].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setReminderInterval(mins)}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  reminderInterval === mins
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                Every {mins} min
              </button>
            ))}
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Quiet Hours (Late-Night Guard)</h2>
                <p className="text-xs text-slate-400">Flag scrolling during designated sleeping hours as elevated risk</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={quietHoursEnabled}
                onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Sleep Window Start
                </label>
                <select
                  value={quietStartHour}
                  onChange={(e) => setQuietStartHour(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>
                      {h < 10 ? `0${h}:00` : `${h}:00`} ({h >= 12 ? (h === 12 ? '12 PM' : `${h - 12} PM`) : (h === 0 ? '12 AM' : `${h} AM`)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Sleep Window End
                </label>
                <select
                  value={quietEndHour}
                  onChange={(e) => setQuietEndHour(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>
                      {h < 10 ? `0${h}:00` : `${h}:00`} ({h >= 12 ? (h === 12 ? '12 PM' : `${h - 12} PM`) : (h === 0 ? '12 AM' : `${h} AM`)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Goal Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
