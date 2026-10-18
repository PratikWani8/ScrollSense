import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, ArrowRight, AlertCircle, Lock, Mail } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('demo@scrollsense.io');
    setPassword('Password123!');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-veya-obsidian flex items-center justify-center p-4 relative overflow-hidden selection:bg-veya-orchid/30 selection:text-white">
      {/* Ambient background glowing auras */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[380px] veya-aura blur-[140px] pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-10 right-10 w-[350px] h-[300px] bg-veya-orchid/10 blur-[120px] rounded-full pointer-events-none -z-10"
        aria-hidden="true"
      />

      <motion.div
        className="w-full max-w-md p-8 sm:p-10 rounded-[32px] bg-veya-surface/90 border border-veya-borderLight shadow-2xl shadow-black/80 backdrop-blur-xl space-y-6 relative z-10"
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-veya-indigo via-[#2E284A] to-veya-surface border border-veya-borderLight text-veya-orchid shadow-lg shadow-black/40 mb-2">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-veya-offwhite tracking-tight">
            Sign in to <span className="font-display font-normal italic text-veya-blush">ScrollSense</span>
          </h2>
          <p className="text-xs text-veya-muted">
            Access your synchronized short-video wellbeing analytics
          </p>
        </div>

        {error && (
          <motion.div
            className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2.5"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="you@domain.com"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-veya-card border border-veya-border text-veya-offwhite text-xs placeholder-veya-muted/60 focus:outline-none focus:border-veya-orchid/70 focus:ring-1 focus:ring-veya-orchid/70 transition-all"
              />
              <Mail className="w-4 h-4 text-veya-muted absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-veya-muted mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-veya-card border border-veya-border text-veya-offwhite text-xs placeholder-veya-muted/60 focus:outline-none focus:border-veya-orchid/70 focus:ring-1 focus:ring-veya-orchid/70 transition-all"
              />
              <Lock className="w-4 h-4 text-veya-muted absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-veya-blush hover:bg-white text-veya-obsidian font-semibold text-xs shadow-lg shadow-veya-blush/15 hover:shadow-veya-blush/25 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-veya-obsidian/30 border-t-veya-obsidian rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-veya-border/70 flex flex-col gap-3 text-center">
          <button
            type="button"
            onClick={handleFillDemo}
            className="text-xs text-veya-blush hover:text-white font-medium transition-colors cursor-pointer"
          >
            Fill Demo Credentials
          </button>
          <p className="text-xs text-veya-muted">
            Don't have an account?{' '}
            <Link to="/register" className="text-veya-blush hover:text-white font-semibold underline underline-offset-2">
              Create an account
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
