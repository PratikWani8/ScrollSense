import { describe, it, expect } from 'vitest';
import { DoomscrollEngine, DoomscrollInputs } from '../../src/tracking/doomscroll-engine';
import { DEFAULT_USER_SETTINGS } from '../../src/shared/constants';

describe('DoomscrollEngine Scoring & Rules', () => {
  const baseInputs: DoomscrollInputs = {
    continuousDurationSeconds: 300,  // 5 mins
    dailyTotalDurationSeconds: 600,  // 10 mins
    dailyGoalSeconds: 1800,          // 30 mins goal
    sessionsInLastHour: 1,
    navigationEventsInSession: 5,
    currentHour: 15,                 // 3 PM (daytime)
    longSessionCountToday: 0,
  };

  it('is completely deterministic for identical input data', () => {
    const res1 = DoomscrollEngine.calculateScore(baseInputs, DEFAULT_USER_SETTINGS);
    const res2 = DoomscrollEngine.calculateScore(baseInputs, DEFAULT_USER_SETTINGS);

    expect(res1.score).toBe(res2.score);
    expect(res1.classification).toBe(res2.classification);
    expect(res1.interventionRecommended).toBe(res2.interventionRecommended);
    expect(res1.contributingFactors).toEqual(res2.contributingFactors);
  });

  it('classifies light usage within goals with low score', () => {
    const res = DoomscrollEngine.calculateScore(baseInputs, DEFAULT_USER_SETTINGS);

    expect(res.score).toBeLessThanOrEqual(25);
    expect(res.classification).toBe('Within your goal');
    expect(res.interventionRecommended).toBe(false);
  });

  it('triggers break intervention when continuous duration exceeds 25 minutes threshold', () => {
    const inputs: DoomscrollInputs = {
      ...baseInputs,
      continuousDurationSeconds: 26 * 60, // 26 mins
    };

    const res = DoomscrollEngine.calculateScore(inputs, DEFAULT_USER_SETTINGS);

    expect(res.score).toBeGreaterThanOrEqual(20);
    expect(res.interventionRecommended).toBe(true);
    expect(res.recommendedAction).toBe('TAKE_A_BREAK');

    const continuousFactor = res.contributingFactors.find((f) => f.factor === 'Continuous Feed Duration');
    expect(continuousFactor).toBeDefined();
    expect(continuousFactor?.scoreDelta).toBeGreaterThanOrEqual(20);
  });

  it('triggers goal alert when daily usage exceeds goal', () => {
    const inputs: DoomscrollInputs = {
      ...baseInputs,
      dailyTotalDurationSeconds: 40 * 60, // 40 mins (exceeds 30m goal)
    };

    const res = DoomscrollEngine.calculateScore(inputs, DEFAULT_USER_SETTINGS);

    expect(res.score).toBeGreaterThanOrEqual(22);
    const goalFactor = res.contributingFactors.find((f) => f.factor === 'Daily Goal Limit');
    expect(goalFactor).toBeDefined();
    expect(goalFactor?.scoreDelta).toBeGreaterThanOrEqual(22);
  });

  it('evaluates overnight quiet hours correctly', () => {
    expect(DoomscrollEngine.isQuietHour(23, 23, 7)).toBe(true);  // 11 PM
    expect(DoomscrollEngine.isQuietHour(2, 23, 7)).toBe(true);   // 2 AM
    expect(DoomscrollEngine.isQuietHour(6, 23, 7)).toBe(true);   // 6 AM
    expect(DoomscrollEngine.isQuietHour(7, 23, 7)).toBe(false);  // 7 AM (end)
    expect(DoomscrollEngine.isQuietHour(14, 23, 7)).toBe(false); // 2 PM (daytime)
  });

  it('adds quiet hours factor and flags late night alert during configured quiet hours', () => {
    const lateNightInputs: DoomscrollInputs = {
      ...baseInputs,
      currentHour: 1, // 1:00 AM
      continuousDurationSeconds: 15 * 60, // 15 mins
    };

    const res = DoomscrollEngine.calculateScore(lateNightInputs, DEFAULT_USER_SETTINGS);

    const quietFactor = res.contributingFactors.find((f) => f.factor === 'Quiet Hours Usage');
    expect(quietFactor).toBeDefined();
    expect(quietFactor?.scoreDelta).toBe(10);
    expect(res.recommendedAction).toBe('LATE_NIGHT_ALERT');
  });

  it('detects rapid video skipping velocity as a contributing behavioral factor', () => {
    const fastNavInputs: DoomscrollInputs = {
      ...baseInputs,
      continuousDurationSeconds: 5 * 60, // 5 mins
      navigationEventsInSession: 50,      // 10 skips per minute!
    };

    const res = DoomscrollEngine.calculateScore(fastNavInputs, DEFAULT_USER_SETTINGS);

    const navFactor = res.contributingFactors.find((f) => f.factor === 'Rapid Navigation Velocity');
    expect(navFactor).toBeDefined();
    expect(navFactor?.scoreDelta).toBeGreaterThanOrEqual(10);
  });

  it('guarantees normalized score stays strictly within 0 to 100', () => {
    const extremeInputs: DoomscrollInputs = {
      continuousDurationSeconds: 120 * 60, // 2 hours
      dailyTotalDurationSeconds: 240 * 60, // 4 hours
      dailyGoalSeconds: 30 * 60,
      sessionsInLastHour: 10,
      navigationEventsInSession: 200,
      currentHour: 3, // 3 AM
      longSessionCountToday: 5,
    };

    const res = DoomscrollEngine.calculateScore(extremeInputs, DEFAULT_USER_SETTINGS);

    expect(res.score).toBeLessThanOrEqual(100);
    expect(res.score).toBeGreaterThanOrEqual(0);
    expect(res.classification).toBe('Goal exceeded');
  });
});
