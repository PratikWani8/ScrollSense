import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Shield,
  Download,
  Trash2,
  AlertTriangle,
  User,
  Clock,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const SettingsPrivacyPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [downloading, setDownloading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [savingRetention, setSavingRetention] = useState(false);
  const [totalStoredSessions, setTotalStoredSessions] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    api.getRetentionPolicy()
      .then((res) => {
        setRetentionDays(res.retentionDays);
        setTotalStoredSessions(res.totalSessions);
      })
      .catch(() => {});
  }, []);

  const handleUpdateRetention = async (days: number) => {
    try {
      setSavingRetention(true);
      setErrorMsg(null);
      const res = await api.updateRetentionPolicy(days);
      setRetentionDays(days);
      setSuccessMsg(res.message);
      const updated = await api.getRetentionPolicy();
      setTotalStoredSessions(updated.totalSessions);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update retention policy');
    } finally {
      setSavingRetention(false);
    }
  };

  const handleExportData = async () => {
    try {
      setDownloading(true);
      setErrorMsg(null);
      const blob = await api.exportData();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scrollsense-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccessMsg('Your complete account and tracking data has been exported.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to export data');
    } finally {
      setDownloading(false);
    }
  };

  const handleClearData = async () => {
    if (
      !window.confirm(
        'Are you sure you want to delete all tracking history? This will permanently wipe all sessions, events, and daily statistics, but keep your account active.'
      )
    ) {
      return;
    }

    try {
      setClearing(true);
      setErrorMsg(null);
      await api.clearTrackingData();
      setSuccessMsg('All tracking sessions and analytics have been permanently erased.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to clear tracking data');
    } finally {
      setClearing(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.prompt(
      'DANGER: To permanently delete your account and all associated telemetry, type "DELETE" below:'
    );

    if (confirmation !== 'DELETE') {
      return;
    }

    try {
      setDeleting(true);
      setErrorMsg(null);
      await api.deleteAccount();
      logout();
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete account');
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
          <Settings className="w-4 h-4" />
          Settings & Privacy
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Privacy & Account Controls</h1>
        <p className="text-xs text-slate-400 mt-1">
          GDPR/CCPA data export, profile configuration, and irreversible deletion tools.
        </p>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="font-bold text-rose-400">×</button>
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

      {/* Account Info Card */}
      <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Profile Information</h2>
            <p className="text-xs text-slate-400">Your account identity and localization</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Display Name</span>
            <div className="text-sm font-bold text-white mt-0.5">{user?.displayName || 'User'}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Email</span>
            <div className="text-sm font-bold text-white mt-0.5">{user?.email || '—'}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Timezone</span>
            <div className="text-sm font-bold text-white mt-0.5">{user?.timezone || 'UTC'}</div>
          </div>
        </div>
      </div>

      {/* Zero Knowledge Architecture Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/30 via-navy-900 to-slate-900 border border-emerald-500/20 space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
          <Shield className="w-4 h-4" />
          Local-First & Zero-Knowledge Architecture
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          ScrollSense operates with strict privacy boundaries:
        </p>
        <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-1">
          <li>Video URLs, titles, captions, and comments are <strong>never</strong> inspected or transmitted.</li>
          <li>Instagram/YouTube user profiles, followers, or DMs are completely inaccessible to the extension.</li>
          <li>All view estimations and dwell durations are calculated locally inside your browser.</li>
        </ul>
      </div>

      {/* Data Retention Policy */}
      <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              Automated Data Retention Policy
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose how long cloud session records and daily rollups are preserved before automated purging.
            </p>
          </div>
          {totalStoredSessions !== null && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
              {totalStoredSessions} stored session{totalStoredSessions === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {[14, 30, 60, 90].map((days) => (
            <button
              key={days}
              type="button"
              disabled={savingRetention}
              onClick={() => handleUpdateRetention(days)}
              className={`p-3 rounded-2xl border text-center transition-all ${
                retentionDays === days
                  ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold ring-1 ring-indigo-500/50'
                  : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <div className="text-sm font-extrabold">{days} Days</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {retentionDays === days ? 'Active Policy' : 'Select'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Data Governance & Export */}
      <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-6">
        <div>
          <h2 className="text-base font-bold text-white">Data Portability (GDPR Article 20)</h2>
          <p className="text-xs text-slate-400">Download a complete machine-readable copy of your tracked history.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
          <div>
            <div className="text-sm font-semibold text-white">Export Full JSON Telemetry</div>
            <p className="text-xs text-slate-400">Includes all session logs, daily rollups, goals, and paired devices.</p>
          </div>
          <button
            onClick={handleExportData}
            disabled={downloading}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>{downloading ? 'Preparing...' : 'Export JSON'}</span>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="p-6 rounded-3xl bg-rose-950/20 border border-rose-500/30 shadow-xl space-y-6">
        <div>
          <h2 className="text-base font-bold text-rose-400">Danger Zone</h2>
          <p className="text-xs text-slate-400">Irreversible deletion of your tracking data or entire account.</p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div>
              <div className="text-sm font-semibold text-white">Clear Tracking History</div>
              <p className="text-xs text-slate-400">Permanently delete all session records while keeping your login.</p>
            </div>
            <button
              onClick={handleClearData}
              disabled={clearing}
              className="px-4 py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4" />
              <span>{clearing ? 'Clearing...' : 'Clear History'}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div>
              <div className="text-sm font-semibold text-rose-300">Delete Entire Account</div>
              <p className="text-xs text-slate-400">Permanently erase your user profile, devices, and all data.</p>
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 whitespace-nowrap shadow-sm shadow-rose-600/30"
            >
              <Trash2 className="w-4 h-4" />
              <span>{deleting ? 'Deleting...' : 'Delete Account'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
