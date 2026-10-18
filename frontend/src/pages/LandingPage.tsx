import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Sparkles,
  Shield,
  Clock,
  ArrowRight,
  Eye,
  CheckCircle2,
  Lock,
  Activity,
  Layers,
  Compass,
  Zap,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const fadeIn = {
    initial: shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  };

  return (
    <div className="min-h-screen bg-veya-obsidian text-veya-offwhite flex flex-col relative selection:bg-veya-orchid/30 selection:text-white overflow-x-hidden font-sans">
      {/* Ambient background glowing auras */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[450px] veya-aura blur-[140px] pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute top-[800px] right-[-100px] w-[500px] h-[400px] bg-veya-indigo/15 blur-[120px] rounded-full pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-40 left-[-100px] w-[550px] h-[450px] bg-veya-orchid/10 blur-[130px] rounded-full pointer-events-none -z-10"
        aria-hidden="true"
      />

      {/* ========================================================= */}
      {/* HERO SECTION (Desktop 2-Column Balanced Editorial Layout) */}
      {/* ========================================================= */}
      <section className="relative pt-12 sm:pt-20 lg:pt-24 pb-20 sm:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* Hero Left Column: Editorial Headline & Actions */}
          <motion.div
            className="lg:col-span-7 flex flex-col items-start text-left"
            initial={fadeIn.initial}
            animate={fadeIn.animate}
            transition={fadeIn.transition}
          >
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-veya-surface/90 border border-veya-borderLight text-veya-blush text-xs font-medium tracking-wide shadow-sm shadow-black/20">
              <Sparkles className="w-3.5 h-3.5 text-veya-orchid" />
              <span>AI-Powered Digital Wellbeing & Habit Analytics</span>
            </div>

            {/* Editorial Headline */}
            <h1 className="mt-6 text-4xl sm:text-6xl lg:text-[4.25rem] font-bold tracking-tight text-veya-offwhite leading-[1.08]">
              Understand your scrolling. <br />
              <span className="font-display font-normal italic bg-gradient-to-r from-veya-blush via-veya-orchid to-veya-lavender bg-clip-text text-transparent">
                Reclaim your time.
              </span>
            </h1>

            {/* Hero Subtitle / Description */}
            <p className="mt-6 text-base sm:text-lg text-veya-muted max-w-xl leading-relaxed">
              ScrollSense monitors desktop Instagram Reels and YouTube Shorts usage locally.
              Measure active feed duration, estimate qualified video views, detect doomscrolling patterns,
              and build sustainable digital focus.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3.5 sm:gap-4 w-full sm:w-auto">
              {user ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3.5 rounded-2xl bg-veya-blush hover:bg-white text-veya-obsidian font-semibold text-sm shadow-lg shadow-veya-blush/15 hover:shadow-veya-blush/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Open Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3.5 rounded-2xl bg-veya-blush hover:bg-white text-veya-obsidian font-semibold text-sm shadow-lg shadow-veya-blush/15 hover:shadow-veya-blush/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Get Started Free
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 rounded-2xl bg-veya-surface hover:bg-veya-surface/80 text-veya-offwhite font-medium text-sm border border-veya-border hover:border-veya-borderLight transition-all"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>

            {/* Trust and Local-First Architecture Assurances */}
            <div className="mt-10 pt-6 border-t border-veya-border/70 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-veya-muted w-full">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-veya-orchid" />
                <span>On-Device Privacy Engine</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-veya-lavender" />
                <span>Zero-Knowledge Telemetry</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>No video URLs or titles stored</span>
              </div>
            </div>
          </motion.div>

          {/* Hero Right Column: Abstract Diagnostic Attention Radar */}
          <motion.div
            className="lg:col-span-5 relative w-full"
            initial={fadeIn.initial}
            animate={fadeIn.animate}
            transition={{ ...fadeIn.transition, delay: 0.15 }}
          >
            {/* Luminous aura behind card */}
            <div
              className="absolute -inset-3 bg-gradient-to-tr from-veya-orchid/20 via-veya-lavender/10 to-veya-coral/15 blur-2xl rounded-[32px] pointer-events-none"
              aria-hidden="true"
            />

            {/* Diagnostic Card Container */}
            <motion.div
              className="relative rounded-[28px] bg-veya-surface/90 border border-veya-borderLight p-6 sm:p-7 backdrop-blur-xl shadow-2xl shadow-black/60"
              animate={shouldReduceMotion ? {} : { y: [0, -6, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              
              {/* Header Status Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-veya-border/70">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  <span className="text-xs font-medium text-veya-offwhite">Local Engine Active</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-veya-orchid/15 text-veya-orchid border border-veya-orchid/30">
                    Reels
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-veya-coral/15 text-veya-coral border border-veya-coral/30">
                    Shorts
                  </span>
                </div>
              </div>

              {/* Attention Rhythm Visualizer */}
              <div className="py-6 flex flex-col items-center text-center">
                <div className="relative w-36 h-36 flex items-center justify-center my-2">
                  {/* Glowing orbital ring */}
                  <div className="absolute inset-0 rounded-full border border-veya-borderLight/60"></div>
                  <div className="absolute inset-2 rounded-full border border-veya-orchid/20 animate-pulse"></div>
                  <div className="absolute inset-6 rounded-full bg-gradient-to-tr from-veya-indigo/40 via-veya-surface to-veya-card flex items-center justify-center shadow-inner">
                    <Activity className="w-8 h-8 text-veya-orchid" />
                  </div>
                </div>

                <span className="text-[11px] uppercase tracking-widest text-veya-muted font-semibold mt-2">
                  Habit Attention State
                </span>
                <span className="text-xl font-bold text-veya-offwhite mt-1">
                  Within Mindful Limits
                </span>
                <p className="text-xs text-veya-muted max-w-xs mt-1">
                  Continuous dwell slices under threshold. No rapid doomscroll loops detected.
                </p>
              </div>

              {/* Three Telemetry Sensor Cards */}
              <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-veya-border/70 text-left">
                <div className="p-2.5 rounded-xl bg-veya-card/80 border border-veya-border">
                  <span className="block text-[10px] text-veya-muted">Monotonic Dwell</span>
                  <span className="text-xs font-semibold text-veya-offwhite">18m 40s</span>
                </div>
                <div className="p-2.5 rounded-xl bg-veya-card/80 border border-veya-border">
                  <span className="block text-[10px] text-veya-muted">Qualified Views</span>
                  <span className="text-xs font-semibold text-veya-blush">14 Videos</span>
                </div>
                <div className="p-2.5 rounded-xl bg-veya-card/80 border border-veya-border">
                  <span className="block text-[10px] text-veya-muted">Habit Score</span>
                  <span className="text-xs font-semibold text-emerald-400">22 / 100</span>
                </div>
              </div>

              {/* Card Footer Micro-note */}
              <div className="mt-4 pt-3 border-t border-veya-border/50 flex items-center justify-between text-[11px] text-veya-muted">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-veya-lavender" />
                  On-Device Sandbox
                </span>
                <span>Active Tab Only</span>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* FEATURE SECTION (Polished 3-Card Grid)                   */}
      {/* ========================================================= */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-veya-border/60">
        <div className="max-w-2xl mb-14 text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-veya-surface border border-veya-border text-veya-lavender text-xs font-medium mb-3">
            <Layers className="w-3 h-3 text-veya-orchid" />
            <span>Engineered for Clarity</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-veya-offwhite">
            Precision tracking without surveillance.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-veya-muted leading-relaxed">
            ScrollSense measures behavior objectively through deterministic browser telemetry, keeping all telemetry strictly private to your computer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Feature 1: Estimated View Qualification */}
          <motion.div
            className="p-7 sm:p-8 rounded-[28px] bg-veya-surface/80 border border-veya-border hover:border-veya-borderLight/80 shadow-lg shadow-black/20 flex flex-col justify-between transition-all"
            initial={fadeIn.initial}
            animate={fadeIn.animate}
            whileHover={shouldReduceMotion ? {} : { y: -6, transition: { duration: 0.25 } }}
            transition={fadeIn.transition}
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-veya-lavender/15 border border-veya-lavender/25 flex items-center justify-center text-veya-blush mb-5">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-veya-offwhite mb-2.5">
                Estimated View Qualification
              </h3>
              <p className="text-sm text-veya-muted leading-relaxed">
                Evaluates candidate video viewport visibility and continuous dwell time (≥ 2.0s)
                to estimate short-video views without claiming exact platform telemetry.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-veya-border/70 text-xs text-veya-lavender flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Session-scoped deduplication</span>
            </div>
          </motion.div>

          {/* Feature 2: Discrete Sliced Dwell Tracking */}
          <motion.div
            className="p-7 sm:p-8 rounded-[28px] bg-veya-surface/80 border border-veya-border hover:border-veya-borderLight/80 shadow-lg shadow-black/20 flex flex-col justify-between transition-all"
            initial={fadeIn.initial}
            animate={fadeIn.animate}
            whileHover={shouldReduceMotion ? {} : { y: -6, transition: { duration: 0.25 } }}
            transition={{ ...fadeIn.transition, delay: 0.1 }}
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-veya-coral/15 border border-veya-coral/25 flex items-center justify-center text-veya-coral mb-5">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-veya-offwhite mb-2.5">
                Discrete Sliced Dwell Tracking
              </h3>
              <p className="text-sm text-veya-muted leading-relaxed">
                Active feed duration is measured with monotonic timestamp slices. Background tabs, window blurs,
                and minimized windows stop timer accumulation instantly.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-veya-border/70 text-xs text-veya-coral flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero in-memory interval drift</span>
            </div>
          </motion.div>

          {/* Feature 3: Local-First Privacy Architecture */}
          <motion.div
            className="p-7 sm:p-8 rounded-[28px] bg-veya-surface/80 border border-veya-border hover:border-veya-borderLight/80 shadow-lg shadow-black/20 flex flex-col justify-between transition-all"
            initial={fadeIn.initial}
            animate={fadeIn.animate}
            whileHover={shouldReduceMotion ? {} : { y: -6, transition: { duration: 0.25 } }}
            transition={{ ...fadeIn.transition, delay: 0.2 }}
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-veya-orchid/15 border border-veya-orchid/25 flex items-center justify-center text-veya-orchid mb-5">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-veya-offwhite mb-2.5">
                Local-First Privacy Architecture
              </h3>
              <p className="text-sm text-veya-muted leading-relaxed">
                Works 100% offline. Raw video URLs, titles, search queries, private messages, and full browsing history
                are never accessed or stored.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-veya-border/70 text-xs text-veya-orchid flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cryptographic device pairing</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* ARCHITECTURAL HOW IT WORKS SECTION                        */}
      {/* ========================================================= */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-veya-border/60">
        <div className="max-w-2xl mb-14 text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-veya-surface border border-veya-border text-veya-coral text-xs font-medium mb-3">
            <Zap className="w-3 h-3 text-veya-coral" />
            <span>How It Works</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-veya-offwhite">
            Transparent behavioral feedback loop.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-veya-muted leading-relaxed">
            From client-side tab observation to supportive AI insights, every phase operates without intrusive telemetry.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-veya-surface/50 border border-veya-border">
            <span className="text-xs font-semibold text-veya-orchid tracking-widest uppercase">01 / Detect</span>
            <h4 className="text-base font-bold text-veya-offwhite mt-2 mb-1.5">Local Observer</h4>
            <p className="text-xs text-veya-muted leading-relaxed">
              Detects supported Instagram Reels and YouTube Shorts URLs using DOM Mutation and Route Observers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-veya-surface/50 border border-veya-border">
            <span className="text-xs font-semibold text-veya-blush tracking-widest uppercase">02 / Measure</span>
            <h4 className="text-base font-bold text-veya-offwhite mt-2 mb-1.5">Monotonic Slicing</h4>
            <p className="text-xs text-veya-muted leading-relaxed">
              Dwell time accumulates strictly while feed video is visible in the active foreground tab.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-veya-surface/50 border border-veya-border">
            <span className="text-xs font-semibold text-veya-lavender tracking-widest uppercase">03 / Score</span>
            <h4 className="text-base font-bold text-veya-offwhite mt-2 mb-1.5">Deterministic Rules</h4>
            <p className="text-xs text-veya-muted leading-relaxed">
              Transparent 0-100 score computed against your configured limits, quiet hours, and session length.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-veya-surface/50 border border-veya-border">
            <span className="text-xs font-semibold text-veya-coral tracking-widest uppercase">04 / Reflect</span>
            <h4 className="text-base font-bold text-veya-offwhite mt-2 mb-1.5">AI Habit Coaching</h4>
            <p className="text-xs text-veya-muted leading-relaxed">
              Compassionate weekly reflection summaries with non-diagnostic feedback and healthy alternatives.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* FINAL CTA SECTION (Editorial High-Contrast Container)     */}
      {/* ========================================================= */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <motion.div
          className="relative rounded-[32px] bg-gradient-to-b from-veya-surface via-[#171424] to-veya-obsidian border border-veya-borderLight p-8 sm:p-14 lg:p-16 text-center overflow-hidden shadow-2xl shadow-black/80"
          initial={fadeIn.initial}
          animate={fadeIn.animate}
          transition={fadeIn.transition}
        >
          {/* Subtle background glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-veya-orchid/15 blur-[100px] rounded-full pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-veya-card border border-veya-border text-veya-blush text-xs font-medium mb-6">
              <Compass className="w-3.5 h-3.5 text-veya-orchid" />
              <span>Take Control of Your Digital Attention</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-veya-offwhite leading-tight">
              Transform your digital habits. <br />
              <span className="font-display font-normal italic bg-gradient-to-r from-veya-blush via-veya-orchid to-veya-lavender bg-clip-text text-transparent">
                Take control of your attention.
              </span>
            </h2>

            <p className="mt-4 text-sm sm:text-base text-veya-muted max-w-lg leading-relaxed">
              Install the lightweight Chrome extension, pair with your private dashboard, and build intentional browsing habits with zero data harvesting.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto justify-center">
              {user ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 rounded-2xl bg-veya-blush hover:bg-white text-veya-obsidian font-semibold text-sm shadow-lg shadow-veya-blush/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Open Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 rounded-2xl bg-veya-blush hover:bg-white text-veya-obsidian font-semibold text-sm shadow-lg shadow-veya-blush/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Get Started Free
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 rounded-2xl bg-veya-surface hover:bg-veya-surface/80 text-veya-offwhite font-medium text-sm border border-veya-border hover:border-veya-borderLight transition-all"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>

            <p className="mt-6 text-xs text-veya-muted">
              100% Free & Open-Source • Manifest V3 Compliant • Zero Cloud Dependency for Local Tracking
            </p>
          </div>
        </motion.div>
      </section>

      {/* ========================================================= */}
      {/* RESTYLED FOOTER                                           */}
      {/* ========================================================= */}
      <footer className="border-t border-veya-border/70 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-xs text-veya-muted">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-veya-surface border border-veya-border flex items-center justify-center text-veya-orchid">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-veya-offwhite text-sm">ScrollSense</span>
              <p className="text-[11px] text-veya-muted">Designed for mindful digital wellbeing.</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <Link to="/privacy" className="hover:text-veya-offwhite transition-colors">
              Privacy Policy
            </Link>
            <Link to="/login" className="hover:text-veya-offwhite transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-veya-offwhite transition-colors">
              Get Started
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-veya-border/40 flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-veya-muted/80">
          <p>© 2026 ScrollSense. Built for mindful digital wellbeing.</p>
          <p>Non-diagnostic habit reflection tools. Preserves 100% local user privacy.</p>
        </div>
      </footer>
    </div>
  );
};
