import { Types } from 'mongoose';
import { DailyStats } from '../models/DailyStats.js';
import { User } from '../models/User.js';
import { Goal } from '../models/Goal.js';
import { getDateStringInTimezone, getTimezoneDayRange } from './aggregation.js';

export interface DailyComparisonItem {
  date: string;
  dayName: string;
  baselineSeconds: number;
  actualSeconds: number;
  diffSeconds: number; // positive = below baseline, negative = above baseline
  status: 'BELOW_BASELINE' | 'ABOVE_BASELINE' | 'MATCHES_BASELINE';
  isCompleteDay: boolean;
}

export interface TimeReclaimedResult {
  sufficientBaseline: boolean;
  minBaselineDaysRequired: number;
  observedBaselineDays: number;
  observationWindowDays: number;
  baselineDailyAverageSeconds: number;
  todayActualSeconds: number;
  todayTimeReclaimedSeconds: number; // baselineDailyAverage - todayActual
  todayStatus: 'BELOW_BASELINE' | 'ABOVE_BASELINE' | 'MATCHES_BASELINE' | 'INSUFFICIENT_BASELINE';
  todayHeadlineText: string;
  weeklyBaselineExpectedSeconds: number;
  weeklyActualTotalSeconds: number;
  weeklyTimeReclaimedSeconds: number;
  weeklyStatus: 'BELOW_BASELINE' | 'ABOVE_BASELINE' | 'MATCHES_BASELINE' | 'INSUFFICIENT_BASELINE';
  weeklyHeadlineText: string;
  dailyGoalSeconds: number;
  goalProgressPercentage: number;
  dailyHistory: DailyComparisonItem[];
  metadata: {
    timezone: string;
    todayDate: string;
    calculationFormula: string;
    disclaimer: string;
  };
}

export class TimeReclaimedService {
  public static readonly MIN_BASELINE_DAYS = 2;

  public static async calculate(
    userId: string | Types.ObjectId,
    windowDays: number = 14
  ): Promise<TimeReclaimedResult> {
    const user = await User.findById(userId).select('timezone dailyGoals');
    const tz = user?.timezone || 'Asia/Kolkata';
    const todayStr = getDateStringInTimezone(new Date(), tz);

    // Fetch user goal
    const goal = await Goal.findOne({ userId, platform: 'all' }).lean();
    const dailyGoalSeconds =
      goal?.dailyLimitSeconds || (user?.dailyGoals?.shortVideoMinutes || 30) * 60;

    // Build baseline date list strictly excluding today
    const baselineDateList: string[] = [];
    const now = new Date();
    for (let i = 1; i <= windowDays; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      baselineDateList.push(getDateStringInTimezone(d, tz));
    }

    // Query DailyStats for baseline complete days
    const baselineStats = await DailyStats.find({
      userId,
      date: { $in: baselineDateList },
    }).lean();

    // Only count days with recorded usage or valid observed sessions
    const observedStats = baselineStats.filter((s) => s.totalDurationSeconds > 0 || s.sessionCount > 0);
    const observedDaysCount = observedStats.length;

    let baselineDailyAverageSeconds = 0;
    if (observedDaysCount >= this.MIN_BASELINE_DAYS) {
      const totalBaselineSeconds = observedStats.reduce((sum, s) => sum + s.totalDurationSeconds, 0);
      baselineDailyAverageSeconds = Math.round(totalBaselineSeconds / observedDaysCount);
    }

    // Query Today's DailyStats
    const todayStats = await DailyStats.findOne({ userId, date: todayStr }).lean();
    const todayActualSeconds = todayStats?.totalDurationSeconds || 0;

    const hasSufficientBaseline = observedDaysCount >= this.MIN_BASELINE_DAYS;

    // Calculate Today's Time Reclaimed
    // Formula: Baseline expected - Actual tracked
    const todayDiff = baselineDailyAverageSeconds - todayActualSeconds;
    let todayStatus: 'BELOW_BASELINE' | 'ABOVE_BASELINE' | 'MATCHES_BASELINE' | 'INSUFFICIENT_BASELINE' =
      'INSUFFICIENT_BASELINE';
    let todayHeadlineText = 'Building baseline. Continue tracking to view your time reclaimed score.';

    if (hasSufficientBaseline) {
      if (todayDiff > 60) {
        todayStatus = 'BELOW_BASELINE';
        const mins = Math.round(todayDiff / 60);
        todayHeadlineText = `${mins} minute${mins === 1 ? '' : 's'} below your usual daily scrolling time`;
      } else if (todayDiff < -60) {
        todayStatus = 'ABOVE_BASELINE';
        const mins = Math.abs(Math.round(todayDiff / 60));
        todayHeadlineText = `${mins} minute${mins === 1 ? '' : 's'} above your usual daily scrolling time`;
      } else {
        todayStatus = 'MATCHES_BASELINE';
        todayHeadlineText = 'Tracking in line with your historical daily average';
      }
    }

    // Calculate Past 7 Days History
    const past7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      past7Days.push(getDateStringInTimezone(d, tz));
    }

    const past7Stats = await DailyStats.find({
      userId,
      date: { $in: past7Days },
    }).lean();
    const past7Map = new Map(past7Stats.map((s) => [s.date, s]));

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyHistory: DailyComparisonItem[] = past7Days.map((dStr) => {
      const s = past7Map.get(dStr);
      const actual = s?.totalDurationSeconds || (dStr === todayStr ? todayActualSeconds : 0);
      const isCompleteDay = dStr !== todayStr;
      const diff = baselineDailyAverageSeconds - actual;

      let status: 'BELOW_BASELINE' | 'ABOVE_BASELINE' | 'MATCHES_BASELINE' = 'MATCHES_BASELINE';
      if (diff > 60) status = 'BELOW_BASELINE';
      else if (diff < -60) status = 'ABOVE_BASELINE';

      const [y, m, d] = dStr.split('-').map(Number);
      const dayOfWeekIdx = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

      return {
        date: dStr,
        dayName: daysOfWeek[dayOfWeekIdx] || 'Day',
        baselineSeconds: baselineDailyAverageSeconds,
        actualSeconds: actual,
        diffSeconds: diff,
        status,
        isCompleteDay,
      };
    });

    // Weekly comparison: compare complete days of the current 7-day period
    const observedWeekDays = dailyHistory.filter((item) => item.actualSeconds > 0 || item.isCompleteDay);
    const weeklyBaselineExpectedSeconds = baselineDailyAverageSeconds * Math.max(1, observedWeekDays.length);
    const weeklyActualTotalSeconds = observedWeekDays.reduce((acc, item) => acc + item.actualSeconds, 0);
    const weeklyTimeReclaimedSeconds = weeklyBaselineExpectedSeconds - weeklyActualTotalSeconds;

    let weeklyStatus: 'BELOW_BASELINE' | 'ABOVE_BASELINE' | 'MATCHES_BASELINE' | 'INSUFFICIENT_BASELINE' =
      'INSUFFICIENT_BASELINE';
    let weeklyHeadlineText = 'Insufficient baseline for weekly score';

    if (hasSufficientBaseline) {
      if (weeklyTimeReclaimedSeconds > 60) {
        weeklyStatus = 'BELOW_BASELINE';
        const mins = Math.round(weeklyTimeReclaimedSeconds / 60);
        weeklyHeadlineText = `${mins} minute${mins === 1 ? '' : 's'} below your usual scrolling this week`;
      } else if (weeklyTimeReclaimedSeconds < -60) {
        weeklyStatus = 'ABOVE_BASELINE';
        const mins = Math.abs(Math.round(weeklyTimeReclaimedSeconds / 60));
        weeklyHeadlineText = `${mins} minute${mins === 1 ? '' : 's'} above your usual scrolling this week`;
      } else {
        weeklyStatus = 'MATCHES_BASELINE';
        weeklyHeadlineText = 'Weekly scrolling matches your historical average';
      }
    }

    const goalProgressPercentage =
      dailyGoalSeconds > 0
        ? Math.min(100, Math.round((todayActualSeconds / dailyGoalSeconds) * 100))
        : 0;

    return {
      sufficientBaseline: hasSufficientBaseline,
      minBaselineDaysRequired: this.MIN_BASELINE_DAYS,
      observedBaselineDays: observedDaysCount,
      observationWindowDays: windowDays,
      baselineDailyAverageSeconds,
      todayActualSeconds,
      todayTimeReclaimedSeconds: hasSufficientBaseline ? todayDiff : 0,
      todayStatus,
      todayHeadlineText,
      weeklyBaselineExpectedSeconds,
      weeklyActualTotalSeconds,
      weeklyTimeReclaimedSeconds: hasSufficientBaseline ? weeklyTimeReclaimedSeconds : 0,
      weeklyStatus,
      weeklyHeadlineText,
      dailyGoalSeconds,
      goalProgressPercentage,
      dailyHistory,
      metadata: {
        timezone: tz,
        todayDate: todayStr,
        calculationFormula: 'Time Reclaimed = Baseline Expected Daily Duration - Actual Tracked Duration',
        disclaimer:
          'Time below baseline represents an estimate of reduced short-video consumption relative to your personal historical habits, not a guarantee of productivity.',
      },
    };
  }
}
