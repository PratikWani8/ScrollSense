import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, ShieldCheck, ArrowRight, AlertCircle, Clock, User, Mail, Lock } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await register(email.trim(), password, displayName.trim(), timezone);
      navigate('/devices'); // Redirect to connect extension
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-veya-obsidian flex items-center justify-center p-4 relative overflow-hidden selection:bg-veya-orchid/30 selection:text-white">
      {/* Ambient background glowing auras */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[420px] veya-aura blur-[140px] pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-10 left-10 w-[400px] h-[350px] bg-veya-orchid/10 blur-[120px] rounded-full pointer-events-none -z-10"
        aria-hidden="true"
      />

      <div className="w-full max-w-lg my-8">
        {/* Header */}
        <motion.div
          className="text-center mb-6"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-veya-indigo via-[#2E284A] to-veya-surface border border-veya-borderLight text-veya-orchid shadow-lg shadow-black/40 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-veya-offwhite">
            Create your account
          </h1>
          <p className="text-xs sm:text-sm text-veya-muted mt-1.5">
            Take control of your short-video habits with privacy-first insights
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          className="p-8 sm:p-10 rounded-[32px] bg-veya-surface/90 border border-veya-borderLight shadow-2xl shadow-black/80 backdrop-blur-xl relative z-10"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {error && (
            <motion.div
              className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3 text-rose-300 text-xs"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-veya-muted mb-1.5">
                Full Name or Alias
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-veya-card border border-veya-border text-veya-offwhite text-sm placeholder-veya-muted/60 focus:outline-none focus:border-veya-orchid/70 focus:ring-1 focus:ring-veya-orchid/70 transition-all"
                />
                <User className="w-4 h-4 text-veya-muted absolute left-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-veya-muted mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-veya-card border border-veya-border text-veya-offwhite text-sm placeholder-veya-muted/60 focus:outline-none focus:border-veya-orchid/70 focus:ring-1 focus:ring-veya-orchid/70 transition-all"
                />
                <Mail className="w-4 h-4 text-veya-muted absolute left-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-veya-muted mb-1.5">
                Password (min 8 chars)
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-veya-card border border-veya-border text-veya-offwhite text-sm placeholder-veya-muted/60 focus:outline-none focus:border-veya-orchid/70 focus:ring-1 focus:ring-veya-orchid/70 transition-all"
                />
                <Lock className="w-4 h-4 text-veya-muted absolute left-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-veya-muted mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-veya-card border border-veya-border text-veya-offwhite text-sm placeholder-veya-muted/60 focus:outline-none focus:border-veya-orchid/70 focus:ring-1 focus:ring-veya-orchid/70 transition-all"
                />
                <Lock className="w-4 h-4 text-veya-muted absolute left-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-veya-muted mb-1.5 flex items-center justify-between">
                <span>Timezone</span>
                <span className="text-[10px] text-veya-muted/80 font-normal">For midnight analytics cutoffs</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="e.g. America/New_York or Asia/Kolkata"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-veya-card border border-veya-border text-veya-offwhite text-sm placeholder-veya-muted/60 focus:outline-none focus:border-veya-orchid/70 focus:ring-1 focus:ring-veya-orchid/70 transition-all"
                />
                <Clock className="w-4 h-4 text-veya-muted absolute left-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3.5 px-4 rounded-2xl bg-veya-blush hover:bg-white text-veya-obsidian font-semibold text-sm shadow-lg shadow-veya-blush/15 hover:shadow-veya-blush/25 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-veya-obsidian/30 border-t-veya-obsidian rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Privacy Footnote */}
          <div className="mt-6 pt-5 border-t border-veya-border/70 flex items-start gap-2.5 text-[11px] text-veya-muted">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              Telemetry data is zero-knowledge: video URLs, accounts, and private messages are never inspected or uploaded.
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs text-veya-muted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-veya-blush hover:text-white font-semibold underline underline-offset-2">
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
};
