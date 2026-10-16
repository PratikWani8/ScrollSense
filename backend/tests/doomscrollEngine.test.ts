import { describe, it, expect } from 'vitest';
import { DoomscrollDetectionEngine } from '../src/services/doomscrollEngine.js';

describe('Deterministic DoomscrollDetectionEngine Tests', () => {
  const defaultSettings = {
    longSessionThresholdMinutes: 25,
    returnWindowMinutes: 60,
    quietHours: { enabled: true, startHour: 22, endHour: 7 },
  };

  it('calculates deterministic scores: identical inputs strictly produce identical scores', () => {
    const inputs = {
      continuousSessionSeconds: 1200, // 20m
      dailyTotalSeconds: 1800, // 30m
      dailyGoalSeconds: 3600, // 60m
      sessionsInLastHour: 2,
      navigationEventsInSession: 15,
      currentHour: 14,
      longSessionCountToday: 0,
    };

    const res1 = DoomscrollDetectionEngine.evaluate(inputs, defaultSettings);
    const res2 = DoomscrollDetectionEngine.evaluate(inputs, defaultSettings);

    expect(res1.score).toBe(res2.score);
    expect(res1.classification).toBe(res2.classification);
    expect(res1.contributingFactors.length).toBe(res2.contributingFactors.length);
    expect(res1.ruleId).toBe(res2.ruleId);
  });

  it('triggers RULE_CONTINUOUS_EXCESS when session exceeds 25-minute continuous threshold', () => {
    const inputs = {
      continuousSessionSeconds: 28 * 60, // 28 minutes
      dailyTotalSeconds: 28 * 60,
      dailyGoalSeconds: 60 * 60,
      sessionsInLastHour: 1,
      navigationEventsInSession: 20,
      currentHour: 15,
      longSessionCountToday: 0,
    };

    const res = DoomscrollDetectionEngine.evaluate(inputs, defaultSettings);
    expect(res.score).toBeGreaterThanOrEqual(18);
    const continuousFactor = res.contributingFactors.find((f) => f.ruleId === 'RULE_CONTINUOUS_EXCESS');
    expect(continuousFactor).toBeDefined();
    expect(continuousFactor?.weight).toBe(25);
    expect(res.interventionRecommended).toBe(true);
    expect(res.recommendedAction).toBe('TAKE_A_BREAK');
  });

  it('triggers RULE_GOAL_EXCEEDED when daily total reaches or exceeds target', () => {
    const inputs = {
      continuousSessionSeconds: 10 * 60,
      dailyTotalSeconds: 70 * 60, // 70 min
      dailyGoalSeconds: 60 * 60, // 60 min goal
      sessionsInLastHour: 1,
      navigationEventsInSession: 10,
      currentHour: 16,
      longSessionCountToday: 1,
    };

    const res = DoomscrollDetectionEngine.evaluate(inputs, defaultSettings);
    expect(res.contributingFactors.some((f) => f.ruleId === 'RULE_GOAL_EXCEEDED')).toBe(true);
    expect(res.score).toBeGreaterThanOrEqual(23);
  });

  it('flags rapid feed return frequency within 60-minute window', () => {
    const inputs = {
      continuousSessionSeconds: 5 * 60,
      dailyTotalSeconds: 20 * 60,
      dailyGoalSeconds: 60 * 60,
      sessionsInLastHour: 4, // 4 visits in last hour
      navigationEventsInSession: 5,
      currentHour: 12,
      longSessionCountToday: 0,
    };

    const res = DoomscrollDetectionEngine.evaluate(inputs, defaultSettings);
    const rapidFactor = res.contributingFactors.find((f) => f.ruleId === 'RULE_RAPID_CYCLES');
    expect(rapidFactor).toBeDefined();
    expect(rapidFactor?.scoreDelta).toBe(15);
  });

  it('detects high navigation velocity (rapid skipping > 7 items/min)', () => {
    const inputs = {
      continuousSessionSeconds: 5 * 60, // 5 min
      dailyTotalSeconds: 15 * 60,
      dailyGoalSeconds: 60 * 60,
      sessionsInLastHour: 1,
      navigationEventsInSession: 50, // 10 scrolls per minute
      currentHour: 14,
      longSessionCountToday: 0,
    };

    const res = DoomscrollDetectionEngine.evaluate(inputs, defaultSettings);
    const velocityFactor = res.contributingFactors.find((f) => f.ruleId === 'RULE_HIGH_VELOCITY');
    expect(velocityFactor).toBeDefined();
    expect(velocityFactor?.scoreDelta).toBeGreaterThanOrEqual(8);
  });

  it('identifies quiet hours overnight window correctly', () => {
    // Quiet hours: 22:00 to 07:00
    expect(DoomscrollDetectionEngine.isQuietHour(23, 22, 7)).toBe(true);
    expect(DoomscrollDetectionEngine.isQuietHour(2, 22, 7)).toBe(true);
    expect(DoomscrollDetectionEngine.isQuietHour(6, 22, 7)).toBe(true);
    expect(DoomscrollDetectionEngine.isQuietHour(7, 22, 7)).toBe(false);
    expect(DoomscrollDetectionEngine.isQuietHour(14, 22, 7)).toBe(false);

    const inputs = {
      continuousSessionSeconds: 10 * 60,
      dailyTotalSeconds: 10 * 60,
      dailyGoalSeconds: 60 * 60,
      sessionsInLastHour: 1,
      navigationEventsInSession: 10,
      currentHour: 23, // 11 PM
      longSessionCountToday: 0,
    };

    const res = DoomscrollDetectionEngine.evaluate(inputs, defaultSettings);
    expect(res.contributingFactors.some((f) => f.ruleId === 'RULE_QUIET_HOURS')).toBe(true);
    expect(res.recommendedAction).toBe('LATE_NIGHT_ALERT');
  });

  it('bounds score to maximum of 100 without overflow under heavy usage', () => {
    const extremeInputs = {
      continuousSessionSeconds: 60 * 60, // 60 min continuous
      dailyTotalSeconds: 240 * 60, // 4 hours daily
      dailyGoalSeconds: 30 * 60, // 30 min limit
      sessionsInLastHour: 6,
      navigationEventsInSession: 600,
      currentHour: 2, // 2 AM quiet hour
      longSessionCountToday: 5,
      historical7DayAvgDailySeconds: 60 * 60,
    };

    const res = DoomscrollDetectionEngine.evaluate(extremeInputs, defaultSettings);
    expect(res.score).toBeLessThanOrEqual(100);
    expect(res.score).toBeGreaterThanOrEqual(80);
    expect(res.classification).toBe('Goal exceeded');
    expect(res.interventionRecommended).toBe(true);
  });

  it('handles insufficient or minimal data gracefully without false alarms', () => {
    const minimalInputs = {
      continuousSessionSeconds: 30, // 30 seconds
      dailyTotalSeconds: 30,
      dailyGoalSeconds: 30 * 60,
      sessionsInLastHour: 1,
      navigationEventsInSession: 1,
      currentHour: 12,
      longSessionCountToday: 0,
      dataQuality: 'INSUFFICIENT' as const,
    };

    const res = DoomscrollDetectionEngine.evaluate(minimalInputs, defaultSettings);
    expect(res.score).toBe(0);
    expect(res.classification).toBe('Within your goal');
    expect(res.interventionRecommended).toBe(false);
    expect(res.dataQuality).toBe('INSUFFICIENT');
  });
});
