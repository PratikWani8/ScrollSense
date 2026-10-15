/**
 * Deterministic DoomscrollDetectionEngine
 *
 * Evaluates discrete, documented behavioral signals without medical diagnosis.
 * Normalized to a strict 0-100 scale with explainable contributing factors.
 */

export type DoomscrollClassification =
  | 'Within your goal'
  | 'Consider a break'
  | 'High-usage pattern'
  | 'Goal exceeded';

export type InterventionAction =
  | 'TAKE_A_BREAK'
  | 'GOAL_ALERT'
  | 'LATE_NIGHT_ALERT'
  | 'REDUCE_VELOCITY';

export interface DoomscrollFactorBreakdown {
  ruleId: string;
  factor: string;
  weight: number;
  scoreDelta: number;
  description: string;
  normalizedValue: number; // 0.0 to 1.0
}

export interface DoomscrollEngineInputs {
  continuousSessionSeconds: number;
  dailyTotalSeconds: number;
  dailyGoalSeconds: number;
  sessionsInLastHour: number;
  navigationEventsInSession: number;
  currentHour: number; // 0-23 in local timezone
  longSessionCountToday: number;
  historical7DayAvgDailySeconds?: number;
  dataQuality?: 'SUFFICIENT' | 'PARTIAL' | 'INSUFFICIENT';
}

export interface DoomscrollEngineSettings {
  longSessionThresholdMinutes?: number; // default 25 min
  returnWindowMinutes?: number; // default 60 min
  quietHours?: {
    enabled: boolean;
    startHour: number;
    endHour: number;
  };
  reminderCooldownMinutes?: number; // default 30 min
}

export interface DoomscrollScoreBreakdown {
  score: number; // 0 - 100
  classification: DoomscrollClassification;
  ruleId: string;
  contributingFactors: DoomscrollFactorBreakdown[];
  thresholds: {
    longSessionMinutes: number;
    dailyGoalMinutes: number;
    returnWindowMinutes: number;
    quietHours: {
      enabled: boolean;
      startHour: number;
      endHour: number;
    };
  };
  dataQuality: 'SUFFICIENT' | 'PARTIAL' | 'INSUFFICIENT';
  interventionRecommended: boolean;
  recommendedAction?: InterventionAction;
  interventionReason?: string;
}

export class DoomscrollDetectionEngine {
  public static readonly DEFAULT_LONG_SESSION_MINUTES = 25;
  public static readonly DEFAULT_RETURN_WINDOW_MINUTES = 60;
  public static readonly DEFAULT_COOLDOWN_MINUTES = 30;

  /**
   * Calculate deterministic score and factor breakdown.
   * Identical inputs will strictly produce identical scores.
   */
  public static evaluate(
    inputs: DoomscrollEngineInputs,
    settings: DoomscrollEngineSettings = {}
  ): DoomscrollScoreBreakdown {
    const longSessionMin = settings.longSessionThresholdMinutes || this.DEFAULT_LONG_SESSION_MINUTES;
    const returnWindowMin = settings.returnWindowMinutes || this.DEFAULT_RETURN_WINDOW_MINUTES;
    const quietHours = settings.quietHours || { enabled: false, startHour: 22, endHour: 7 };
    const dataQuality = inputs.dataQuality || 'SUFFICIENT';

    const factors: DoomscrollFactorBreakdown[] = [];
    let totalScore = 0;
    let primaryRuleId = 'RULE_NORMAL_USAGE';

    // 1. Continuous Active Session Duration (Weight: 25)
    const longSessionSec = Math.max(300, longSessionMin * 60);
    const continuousRatio = inputs.continuousSessionSeconds / longSessionSec;
    if (continuousRatio >= 1.0) {
      const excess = Math.min(1.0, continuousRatio - 1.0);
      const scoreDelta = Math.min(25, Math.round(18 + excess * 7));
      factors.push({
        ruleId: 'RULE_CONTINUOUS_EXCESS',
        factor: 'Continuous Session Duration',
        weight: 25,
        scoreDelta,
        normalizedValue: Math.min(1.0, continuousRatio),
        description: `Current session (${Math.round(inputs.continuousSessionSeconds / 60)}m) exceeded the ${longSessionMin}m continuous break threshold.`,
      });
      totalScore += scoreDelta;
      primaryRuleId = 'RULE_CONTINUOUS_EXCESS';
    } else if (continuousRatio >= 0.6) {
      const scoreDelta = Math.round(continuousRatio * 15);
      factors.push({
        ruleId: 'RULE_CONTINUOUS_APPROACH',
        factor: 'Extended Active Session',
        weight: 25,
        scoreDelta,
        normalizedValue: continuousRatio,
        description: `Current session (${Math.round(inputs.continuousSessionSeconds / 60)}m) is approaching the ${longSessionMin}m reminder threshold.`,
      });
      totalScore += scoreDelta;
    }

    // 2. Daily Usage vs Daily Goal (Weight: 25)
    const dailyGoalSec = Math.max(300, inputs.dailyGoalSeconds);
    const goalRatio = inputs.dailyTotalSeconds / dailyGoalSec;
    if (goalRatio >= 1.0) {
      const excess = Math.min(1.0, goalRatio - 1.0);
      const scoreDelta = Math.min(25, Math.round(18 + excess * 7));
      factors.push({
        ruleId: 'RULE_GOAL_EXCEEDED',
        factor: 'Daily Target Exceeded',
        weight: 25,
        scoreDelta,
        normalizedValue: Math.min(1.0, goalRatio),
        description: `Today's accumulated duration (${Math.round(inputs.dailyTotalSeconds / 60)}m) has reached or exceeded your configured daily limit (${Math.round(dailyGoalSec / 60)}m).`,
      });
      totalScore += scoreDelta;
      if (primaryRuleId === 'RULE_NORMAL_USAGE') primaryRuleId = 'RULE_GOAL_EXCEEDED';
    } else if (goalRatio >= 0.75) {
      const scoreDelta = Math.round(goalRatio * 14);
      factors.push({
        ruleId: 'RULE_GOAL_APPROACH',
        factor: 'Daily Limit Proximity',
        weight: 25,
        scoreDelta,
        normalizedValue: goalRatio,
        description: `Today's consumption is at ${Math.round(goalRatio * 100)}% of your daily target limit.`,
      });
      totalScore += scoreDelta;
    }

    // 3. Repeated Return Frequency in 60m Window (Weight: 15)
    if (inputs.sessionsInLastHour >= 4) {
      const scoreDelta = 15;
      factors.push({
        ruleId: 'RULE_RAPID_CYCLES',
        factor: 'High Visit Frequency',
        weight: 15,
        scoreDelta,
        normalizedValue: 1.0,
        description: `${inputs.sessionsInLastHour} separate short-video sessions initiated within the past ${returnWindowMin} minutes.`,
      });
      totalScore += scoreDelta;
      if (primaryRuleId === 'RULE_NORMAL_USAGE') primaryRuleId = 'RULE_RAPID_CYCLES';
    } else if (inputs.sessionsInLastHour >= 2) {
      const scoreDelta = 8;
      factors.push({
        ruleId: 'RULE_MULTIPLE_RETURNS',
        factor: 'Recurring Feed Returns',
        weight: 15,
        scoreDelta,
        normalizedValue: inputs.sessionsInLastHour / 4,
        description: `${inputs.sessionsInLastHour} visits recorded in the past ${returnWindowMin} minutes.`,
      });
      totalScore += scoreDelta;
    }

    // 4. Excessive Navigation Velocity / Fast Skipping (Weight: 10)
    const sessionMinutes = Math.max(1, inputs.continuousSessionSeconds / 60);
    const navsPerMinute = inputs.navigationEventsInSession / sessionMinutes;
    if (sessionMinutes >= 2 && navsPerMinute >= 7) {
      const scoreDelta = Math.min(10, Math.round(Math.min(2.0, navsPerMinute / 7) * 8));
      factors.push({
        ruleId: 'RULE_HIGH_VELOCITY',
        factor: 'High Navigation Velocity',
        weight: 10,
        scoreDelta,
        normalizedValue: Math.min(1.0, navsPerMinute / 12),
        description: `Rapid swipe velocity (${Math.round(navsPerMinute)} items/min), reflecting quick skipping through content.`,
      });
      totalScore += scoreDelta;
    }

    // 5. Usage During Configured Quiet Hours (Weight: 10)
    if (
      quietHours.enabled &&
      this.isQuietHour(inputs.currentHour, quietHours.startHour, quietHours.endHour)
    ) {
      const scoreDelta = 10;
      factors.push({
        ruleId: 'RULE_QUIET_HOURS',
        factor: 'Late-Night Quiet Hours',
        weight: 10,
        scoreDelta,
        normalizedValue: 1.0,
        description: `Browsing feed during designated quiet sleep hours (${quietHours.startHour}:00 - ${quietHours.endHour}:00).`,
      });
      totalScore += scoreDelta;
      primaryRuleId = 'RULE_QUIET_HOURS';
    }

    // 6. Frequency of Prolonged Sessions Today (Weight: 10)
    if (inputs.longSessionCountToday >= 3) {
      const scoreDelta = 10;
      factors.push({
        ruleId: 'RULE_REPEATED_LONG_SESSIONS',
        factor: 'Repeated Prolonged Sessions',
        weight: 10,
        scoreDelta,
        normalizedValue: 1.0,
        description: `${inputs.longSessionCountToday} extended sessions exceeding ${longSessionMin}m logged today.`,
      });
      totalScore += scoreDelta;
    } else if (inputs.longSessionCountToday >= 1) {
      const scoreDelta = 5;
      factors.push({
        ruleId: 'RULE_PROLONGED_SESSION_COUNT',
        factor: 'Prolonged Session Logged',
        weight: 10,
        scoreDelta,
        normalizedValue: 0.5,
        description: `${inputs.longSessionCountToday} session exceeding ${longSessionMin}m recorded earlier today.`,
      });
      totalScore += scoreDelta;
    }

    // 7. Baseline Deviation (Weight: 5)
    if (inputs.historical7DayAvgDailySeconds && inputs.historical7DayAvgDailySeconds > 600) {
      const baselineRatio = inputs.dailyTotalSeconds / inputs.historical7DayAvgDailySeconds;
      if (baselineRatio >= 1.5) {
        const scoreDelta = 5;
        factors.push({
          ruleId: 'RULE_BASELINE_SURGE',
          factor: 'Historical Baseline Surge',
          weight: 5,
          scoreDelta,
          normalizedValue: Math.min(1.0, baselineRatio / 2),
          description: `Usage today is ${Math.round((baselineRatio - 1) * 100)}% above your 7-day average daily baseline.`,
        });
        totalScore += scoreDelta;
      }
    }

    // Normalized Final Score (0 - 100)
    const finalScore = Math.min(100, Math.max(0, totalScore));

    // Understandable Classifications
    let classification: DoomscrollClassification = 'Within your goal';
    let interventionRecommended = false;
    let recommendedAction: InterventionAction | undefined;
    let interventionReason: string | undefined;

    if (finalScore >= 80 || goalRatio >= 1.2) {
      classification = 'Goal exceeded';
      interventionRecommended = true;
      recommendedAction = 'GOAL_ALERT';
      interventionReason = 'Daily short-video target exceeded. Consider ending this session.';
    } else if (finalScore >= 61 || continuousRatio >= 1.0) {
      classification = 'High-usage pattern';
      interventionRecommended = true;
      recommendedAction = 'TAKE_A_BREAK';
      interventionReason = `Continuous session exceeded ${longSessionMin} minutes. Taking a pause is recommended.`;
    } else if (finalScore >= 36) {
      classification = 'Consider a break';
      interventionRecommended = continuousRatio >= 0.8;
      recommendedAction = 'TAKE_A_BREAK';
      interventionReason = 'Extended session length detected. Step away or stretch your eyes.';
    } else {
      classification = 'Within your goal';
      interventionRecommended = false;
    }

    // Quiet hours alert override
    if (factors.some((f) => f.ruleId === 'RULE_QUIET_HOURS')) {
      recommendedAction = 'LATE_NIGHT_ALERT';
      interventionReason = 'Browsing during quiet hours. Consider resting your eyes for sleep.';
      if (finalScore >= 20 || continuousRatio >= 0.4) {
        interventionRecommended = true;
      }
    }

    return {
      score: finalScore,
      classification,
      ruleId: primaryRuleId,
      contributingFactors: factors,
      thresholds: {
        longSessionMinutes: longSessionMin,
        dailyGoalMinutes: Math.round(dailyGoalSec / 60),
        returnWindowMinutes: returnWindowMin,
        quietHours,
      },
      dataQuality,
      interventionRecommended,
      recommendedAction,
      interventionReason,
    };
  }

  /**
   * Check if given local hour falls in quiet hours. Handles overnight windows.
   */
  public static isQuietHour(hour: number, startHour: number, endHour: number): boolean {
    if (startHour === endHour) return false;
    if (startHour < endHour) {
      return hour >= startHour && hour < endHour;
    }
    // Overnight (e.g. 22:00 to 07:00)
    return hour >= startHour || hour < endHour;
  }
}
