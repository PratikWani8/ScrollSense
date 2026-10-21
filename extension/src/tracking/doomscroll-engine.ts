/**
 * DoomscrollDetectionEngine
 *
 * Deterministic, explainable behavioral assessment engine.
 * Computes a normalized score from 0 to 100 based on discrete, documented signals:
 * - Continuous active feed duration
 * - Total daily usage relative to user's daily goal
 * - Frequency of repeated visits in a 60-minute window
 * - Video navigation velocity (fast skipping rate)
 * - Late-night usage during quiet hours
 * - Frequency of long sessions (>25 min) today
 *
 * NOTE: This is a digital wellbeing habit guide, NOT a medical or psychological diagnosis.
 */

import {
  DoomscrollFactor,
  DoomscrollScoreResult,
  DoomscrollClassification,
  UserSettings,
} from '../shared/types';

export interface DoomscrollInputs {
  continuousDurationSeconds: number;
  dailyTotalDurationSeconds: number;
  dailyGoalSeconds: number;
  sessionsInLastHour: number;
  navigationEventsInSession: number;
  currentHour: number; // 0-23
  longSessionCountToday: number;
  hasSufficientData?: boolean;
}

export class DoomscrollEngine {
  /**
   * Calculate deterministic doomscroll score and factor breakdown.
   */
  public static calculateScore(inputs: DoomscrollInputs, settings: UserSettings): DoomscrollScoreResult {
    const factors: DoomscrollFactor[] = [];
    let totalScore = 0;

    // 1. Continuous Active Duration (Max 30 points)
    // Target threshold: settings.longSessionReminderMinutes (default 25 mins)
    const longSessionThresholdSec = settings.longSessionReminderMinutes * 60;
    const continuousRatio = inputs.continuousDurationSeconds / longSessionThresholdSec;

    if (continuousRatio >= 1.0) {
      const extraRatio = Math.min(2.0, continuousRatio - 1.0);
      const scoreDelta = Math.min(30, Math.round(20 + extraRatio * 10));
      factors.push({
        factor: 'Continuous Feed Duration',
        weight: 30,
        scoreDelta,
        description: `Current session (${Math.round(inputs.continuousDurationSeconds / 60)}m) exceeds continuous threshold (${settings.longSessionReminderMinutes}m).`,
      });
      totalScore += scoreDelta;
    } else if (continuousRatio >= 0.6) {
      const scoreDelta = Math.round(continuousRatio * 15);
      factors.push({
        factor: 'Extended Continuous Feed',
        weight: 30,
        scoreDelta,
        description: `Current session (${Math.round(inputs.continuousDurationSeconds / 60)}m) approaching break threshold.`,
      });
      totalScore += scoreDelta;
    }

    // 2. Daily Usage vs Daily Goal (Max 30 points)
    // Compare total tracked seconds against user's daily goal
    const dailyGoalSec = Math.max(300, settings.dailyShortVideoGoalMinutes * 60);
    const goalRatio = inputs.dailyTotalDurationSeconds / dailyGoalSec;

    if (goalRatio >= 1.0) {
      const excessRatio = Math.min(1.0, goalRatio - 1.0);
      const scoreDelta = Math.min(30, Math.round(22 + excessRatio * 8));
      factors.push({
        factor: 'Daily Goal Limit',
        weight: 30,
        scoreDelta,
        description: `Total today (${Math.round(inputs.dailyTotalDurationSeconds / 60)}m) reached or exceeded daily limit (${settings.dailyShortVideoGoalMinutes}m).`,
      });
      totalScore += scoreDelta;
    } else if (goalRatio >= 0.7) {
      const scoreDelta = Math.round(goalRatio * 14);
      factors.push({
        factor: 'Daily Goal Approach',
        weight: 30,
        scoreDelta,
        description: `Total today (${Math.round(inputs.dailyTotalDurationSeconds / 60)}m) is at ${Math.round(goalRatio * 100)}% of daily limit.`,
      });
      totalScore += scoreDelta;
    }

    // 3. Repeated Return Frequency in 60m window (Max 15 points)
    if (inputs.sessionsInLastHour >= 4) {
      const scoreDelta = 15;
      factors.push({
        factor: 'Rapid Return Pattern',
        weight: 15,
        scoreDelta,
        description: `${inputs.sessionsInLastHour} separate visits initiated within the past 60 minutes.`,
      });
      totalScore += scoreDelta;
    } else if (inputs.sessionsInLastHour >= 2) {
      const scoreDelta = 8;
      factors.push({
        factor: 'Multiple Returns',
        weight: 15,
        scoreDelta,
        description: `${inputs.sessionsInLastHour} visits in the past 60 minutes.`,
      });
      totalScore += scoreDelta;
    }

    // 4. Navigation Velocity / Rapid Skipping (Max 15 points)
    // If navigation events are high relative to session minutes (> 8 per min)
    const sessionMinutes = Math.max(1, inputs.continuousDurationSeconds / 60);
    const navsPerMinute = inputs.navigationEventsInSession / sessionMinutes;

    if (sessionMinutes >= 3 && navsPerMinute >= 8) {
      const scoreDelta = Math.min(15, Math.round(Math.min(2.0, navsPerMinute / 8) * 12));
      factors.push({
        factor: 'Rapid Navigation Velocity',
        weight: 15,
        scoreDelta,
        description: `High swipe rate (${Math.round(navsPerMinute)} items/min), indicating fast browsing loops.`,
      });
      totalScore += scoreDelta;
    }

    // 5. Late-Night Usage During Quiet Hours (Max 10 points)
    if (settings.quietHours.enabled && this.isQuietHour(inputs.currentHour, settings.quietHours.startHour, settings.quietHours.endHour)) {
      const scoreDelta = 10;
      factors.push({
        factor: 'Quiet Hours Usage',
        weight: 10,
        scoreDelta,
        description: `Browsing during configured quiet hours (${settings.quietHours.startHour}:00 - ${settings.quietHours.endHour}:00).`,
      });
      totalScore += scoreDelta;
    }

    const finalScore = Math.min(100, Math.max(0, totalScore));

    // Determine classification
    let classification: DoomscrollClassification = 'Within your goal';
    let interventionRecommended = false;
    let recommendedAction: 'TAKE_A_BREAK' | 'GOAL_ALERT' | 'LATE_NIGHT_ALERT' | undefined;

    if (finalScore >= 80 || goalRatio >= 1.2) {
      classification = 'Goal exceeded';
      interventionRecommended = true;
      recommendedAction = 'GOAL_ALERT';
    } else if (finalScore >= 60 || continuousRatio >= 1.0) {
      classification = 'High-usage pattern';
      interventionRecommended = true;
      recommendedAction = 'TAKE_A_BREAK';
    } else if (finalScore >= 35) {
      classification = 'Consider a break';
      interventionRecommended = continuousRatio >= 0.8;
      recommendedAction = 'TAKE_A_BREAK';
    } else {
      classification = 'Within your goal';
      interventionRecommended = false;
    }

    // Quiet hours override action if late at night
    if (factors.some((f) => f.factor === 'Quiet Hours Usage')) {
      recommendedAction = 'LATE_NIGHT_ALERT';
      if (finalScore >= 18 || continuousRatio >= 0.5) {
        interventionRecommended = true;
      }
    }

    return {
      score: finalScore,
      classification,
      contributingFactors: factors,
      interventionRecommended,
      recommendedAction,
    };
  }

  /**
   * Check if given hour falls inside quiet hours window.
   * Handles overnight windows (e.g. 23:00 to 07:00).
   */
  public static isQuietHour(hour: number, startHour: number, endHour: number): boolean {
    if (startHour === endHour) return false;
    if (startHour < endHour) {
      return hour >= startHour && hour < endHour;
    }
    // Overnight window (e.g., 23 to 7)
    return hour >= startHour || hour < endHour;
  }
}
