import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { DeviceItem } from '../api/types';
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  ExternalLink,
  Laptop,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [pairingCode, setPairingCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const res = await api.getDevices();
      setDevices(res.devices);
    } catch (err: any) {
      setError(err.message || 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleApprovePairing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingCode.trim()) return;

    setError(null);
    setSuccessMsg(null);
    try {
      setApproving(true);
      const res = await api.approvePairing(pairingCode.trim().toUpperCase());
      setSuccessMsg(`Device "${res.deviceName}" paired successfully!`);
      setPairingCode('');
      await loadDevices();
    } catch (err: any) {
      setError(err.message || 'Failed to pair device');
    } finally {
      setApproving(false);
    }
  };

  const handleRevoke = async (deviceId: string, deviceName: string) => {
    if (!window.confirm(`Revoke device "${deviceName}"? It will no longer synchronize tracking data.`)) {
      return;
    }

    try {
      await api.revokeDevice(deviceId);
      setSuccessMsg(`Device "${deviceName}" revoked.`);
      await loadDevices();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke device');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
          <Smartphone className="w-4 h-4" />
          Extension Connection
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Connected Devices</h1>
        <p className="text-sm text-slate-400 mt-1">
          Pair the ScrollSense Chrome extension to enable real-time tracking sync and habit analytics.
        </p>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400/80 hover:text-rose-300 font-bold">×</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-400 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400/80 hover:text-emerald-300 font-bold">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pairing Code Card */}
        <div className="lg:col-span-1 p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Pair New Device</h2>
              <p className="text-xs text-slate-400">Enter code from extension popup</p>
            </div>
          </div>

          <form onSubmit={handleApprovePairing} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Pairing Code
              </label>
              <input
                type="text"
                placeholder="SS-XXXX"
                value={pairingCode}
                onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="w-full text-center tracking-widest text-lg font-mono font-bold px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 uppercase"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Format: <code className="text-indigo-400">SS-XXXX</code> (expires in 10 minutes)
              </p>
            </div>

            <button
              type="submit"
              disabled={approving || !pairingCode.trim()}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {approving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Approve & Connect</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="font-semibold text-slate-300">Quick Pairing Steps:</div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
              <li>Open Chrome and click the ScrollSense puzzle icon.</li>
              <li>Under "Cloud Sync", click <strong>"Connect to Web Dashboard"</strong>.</li>
              <li>Copy the 6-character code and paste it above.</li>
            </ol>
          </div>
        </div>

        {/* Paired Devices List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Active Paired Extensions</h2>
                <p className="text-xs text-slate-400">Authorized instances reporting telemetry</p>
              </div>
              <button
                onClick={loadDevices}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 border border-slate-700/40 transition-colors"
                title="Refresh list"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading devices...</div>
            ) : devices.length === 0 ? (
              <div className="py-10 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80">
                <Laptop className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-300">No paired devices found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Connect your Chrome browser extension to view your Instagram and YouTube habit statistics.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {devices.map((device) => (
                  <div
                    key={device.deviceId}
                    className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{device.deviceName}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                            v{device.extensionVersion}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Last Synced:{' '}
                          {device.lastSyncAt
                            ? new Date(device.lastSyncAt).toLocaleString()
                            : 'Pending first sync'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevoke(device.deviceId, device.deviceName)}
                      className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                      title="Revoke device access"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Setup Guide Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-navy-900 to-slate-900 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs mb-1">
                <ShieldCheck className="w-4 h-4" />
                Developer Mode Loading
              </div>
              <p className="text-xs text-slate-300">
                To test locally, load the <code className="text-cyan-300">extension/dist</code> folder in <code className="text-cyan-300">chrome://extensions</code>.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all whitespace-nowrap"
            >
              <span>View Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
