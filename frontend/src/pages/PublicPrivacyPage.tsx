import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Shield,
  Lock,
  EyeOff,
  Server,
  HardDrive,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  FileText,
} from 'lucide-react';

export const PublicPrivacyPage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  const fadeIn = {
    initial: shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  };

  return (
    <div className="min-h-screen bg-veya-obsidian text-veya-offwhite font-sans py-12 sm:py-16 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden selection:bg-veya-orchid/30 selection:text-white">
      {/* Ambient background glowing auras */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[450px] veya-aura blur-[140px] pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-40 right-[-80px] w-[500px] h-[400px] bg-veya-orchid/10 blur-[130px] rounded-full pointer-events-none -z-10"
        aria-hidden="true"
      />

      <div className="max-w-4xl mx-auto space-y-10 sm:space-y-12">
        {/* Navigation & Header */}
        <motion.div
          className="space-y-4"
          initial={fadeIn.initial}
          animate={fadeIn.animate}
          transition={fadeIn.transition}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-veya-blush hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to ScrollSense Home
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-veya-surface border border-veya-borderLight flex items-center justify-center text-veya-orchid shadow-lg shadow-black/40">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-veya-offwhite">
                ScrollSense Privacy Policy
              </h1>
              <p className="text-xs text-veya-muted mt-1">
                Last updated: October 2026 • Effective version 1.0.0
              </p>
            </div>
          </div>
        </motion.div>

        {/* Commitment Banner: Zero-Knowledge & Local-First Philosophy */}
        <motion.div
          className="p-7 sm:p-8 rounded-[28px] bg-gradient-to-br from-[#181528] via-veya-surface to-[#141222] border border-veya-borderLight shadow-2xl space-y-3 relative overflow-hidden"
          initial={fadeIn.initial}
          animate={fadeIn.animate}
          transition={{ ...fadeIn.transition, delay: 0.1 }}
        >
          <div className="flex items-center gap-2.5 text-veya-blush font-bold text-sm tracking-wide">
            <Lock className="w-4 h-4 text-veya-orchid" />
            <span>Zero-Knowledge & Local-First Philosophy</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            ScrollSense exists to help you understand your short-video habits and reclaim your attention—not to surveil your browsing.
            The extension operates with strict zero-knowledge architecture: it analyzes viewport dwell time and scroll frequency locally
            without inspecting or transmitting video content, creator identities, or browsing history.
          </p>
        </motion.div>

        {/* Section 1: Single Purpose */}
        <motion.section
          className="p-7 sm:p-8 rounded-[28px] bg-veya-surface/80 border border-veya-border shadow-xl space-y-3"
          initial={fadeIn.initial}
          animate={fadeIn.animate}
          transition={{ ...fadeIn.transition, delay: 0.15 }}
        >
          <h2 className="text-lg font-bold text-veya-offwhite flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-veya-blush" />
            <span>1. Single-Purpose Statement</span>
          </h2>
          <p className="text-xs sm:text-sm text-veya-muted leading-relaxed">
            The sole purpose of ScrollSense is digital wellbeing analytics. The Chrome extension observes active engagement on supported
            Instagram Reels and YouTube Shorts feeds to measure session durations, estimate view counts, identify prolonged doomscrolling patterns,
            and provide actionable behavioral insights on your personal web dashboard.
          </p>
        </motion.section>

        {/* Section 2: Data We Collect vs Never Collect */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* What We Collect */}
          <motion.div
            className="p-7 rounded-[28px] bg-veya-surface/80 border border-veya-border shadow-xl space-y-4"
            initial={fadeIn.initial}
            animate={fadeIn.animate}
            transition={{ ...fadeIn.transition, delay: 0.2 }}
          >
            <div className="flex items-center gap-2 text-sm font-bold text-veya-blush">
              <HardDrive className="w-4 h-4 text-veya-orchid" />
              <span>What Telemetry Is Measured</span>
            </div>
            <ul className="text-xs sm:text-sm text-veya-muted space-y-2.5">
              <li className="flex items-start gap-2">
                <span className="text-veya-blush font-bold">•</span>
                <span><strong>Active Session Duration:</strong> Wall-clock seconds during which a supported feed is active in the foreground.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-veya-blush font-bold">•</span>
                <span><strong>Estimated Video Views:</strong> Count of videos centered in viewport for $\ge 2.0$ seconds.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-veya-blush font-bold">•</span>
                <span><strong>Navigation Frequency:</strong> Scroll velocity between video items to detect rapid flipping.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-veya-blush font-bold">•</span>
                <span><strong>Platform Identification:</strong> Flag indicating whether activity took place on Instagram Reels or YouTube Shorts.</span>
              </li>
            </ul>
          </motion.div>

          {/* What We NEVER Collect */}
          <motion.div
            className="p-7 rounded-[28px] bg-veya-surface/80 border border-veya-coral/25 shadow-xl space-y-4"
            initial={fadeIn.initial}
            animate={fadeIn.animate}
            transition={{ ...fadeIn.transition, delay: 0.25 }}
          >
            <div className="flex items-center gap-2 text-sm font-bold text-veya-coral">
              <EyeOff className="w-4 h-4 text-veya-coral" />
              <span>What We NEVER Collect or Transmit</span>
            </div>
            <ul className="text-xs sm:text-sm text-veya-muted space-y-2.5">
              <li className="flex items-start gap-2">
                <span className="text-veya-coral font-bold">✕</span>
                <span><strong>No Video Content:</strong> URLs, titles, captions, transcripts, comments, or creator handles.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-veya-coral font-bold">✕</span>
                <span><strong>No Personal Information:</strong> Account credentials, passwords, messages, DMs, or profile feeds.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-veya-coral font-bold">✕</span>
                <span><strong>No General Browsing History:</strong> Activity outside explicit <code>/reels/</code> or <code>/shorts/</code> paths is ignored.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-veya-coral font-bold">✕</span>
                <span><strong>No Third-Party Trackers:</strong> No advertising pixels, tracking cookies, or monetized data brokers.</span>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Section 3: Chrome Permissions Justification */}
        <motion.section
          className="space-y-4 p-7 sm:p-8 rounded-[28px] bg-veya-surface/80 border border-veya-border shadow-xl"
          initial={fadeIn.initial}
          animate={fadeIn.animate}
          transition={{ ...fadeIn.transition, delay: 0.3 }}
        >
          <h2 className="text-lg font-bold text-veya-offwhite flex items-center gap-2.5">
            <Server className="w-5 h-5 text-veya-orchid" />
            <span>2. Chrome Extension Permissions Justification</span>
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-veya-muted">
            <div className="p-3.5 rounded-2xl bg-veya-card/90 border border-veya-border">
              <div className="font-semibold text-veya-offwhite">storage</div>
              <p className="text-veya-muted mt-0.5">Used exclusively to store user goal preferences and maintain an offline event queue when disconnected.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-veya-card/90 border border-veya-border">
              <div className="font-semibold text-veya-offwhite">tabs</div>
              <p className="text-veya-muted mt-0.5">Used to pause session timers when you switch tabs or minimize the browser, preventing false duration inflation.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-veya-card/90 border border-veya-border">
              <div className="font-semibold text-veya-offwhite">alarms</div>
              <p className="text-veya-muted mt-0.5">Used for service-worker session recovery and scheduled background synchronization.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-veya-card/90 border border-veya-border">
              <div className="font-semibold text-veya-offwhite">notifications</div>
              <p className="text-veya-muted mt-0.5">Used only to send opt-in break reminders when a continuous session exceeds your configured goal.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-veya-card/90 border border-veya-border">
              <div className="font-semibold text-veya-offwhite">Host Permissions (*://*.instagram.com/*, *://*.youtube.com/*)</div>
              <p className="text-veya-muted mt-0.5">Strictly limited to the two supported platforms to inject the feed viewport observer.</p>
            </div>
          </div>
        </motion.section>

        {/* Section 4: Data Retention & User Rights */}
        <motion.section
          className="space-y-4 p-7 sm:p-8 rounded-[28px] bg-veya-surface/80 border border-veya-border shadow-xl"
          initial={fadeIn.initial}
          animate={fadeIn.animate}
          transition={{ ...fadeIn.transition, delay: 0.35 }}
        >
          <h2 className="text-lg font-bold text-veya-offwhite flex items-center gap-2.5">
            <Trash2 className="w-5 h-5 text-veya-coral" />
            <span>3. Data Retention & GDPR/CCPA Rights</span>
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-veya-muted leading-relaxed">
            <p>
              By default, cloud synchronization is optional. If you choose to pair your extension with the dashboard:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-veya-muted">
              <li><strong>Configurable Retention:</strong> You can set retention periods between 7 and 365 days (30 days default). Data older than your threshold is automatically purged.</li>
              <li><strong>Right to Portability (GDPR Article 20):</strong> Export your complete session logs and analytics as JSON anytime from the dashboard.</li>
              <li><strong>Right to Erasure (GDPR Article 17):</strong> Instantly delete all tracking telemetry with one click, or delete your entire account and all associated records.</li>
              <li><strong>Local Reset:</strong> You can wipe local extension data directly in the popup independently of your cloud account.</li>
            </ul>
          </div>
        </motion.section>

        {/* Footer */}
        <div className="pt-6 border-t border-veya-border/60 text-center text-xs text-veya-muted">
          ScrollSense • Dedicated to transparent, ethical digital wellbeing technology.
        </div>
      </div>
    </div>
  );
};
