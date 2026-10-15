import { Types } from 'mongoose';
import { DailyStats } from '../models/DailyStats.js';
import { TrackingSession } from '../models/TrackingSession.js';
import { User } from '../models/User.js';
import { DoomscrollEvent } from '../models/DoomscrollEvent.js';
import { DoomscrollDetectionEngine } from './doomscrollEngine.js';

/**
 * Format a Date object into 'YYYY-MM-DD' formatted string in a specific timezone.
 */
export function getDateStringInTimezone(date: Date, timezone: string = 'Asia/Kolkata'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    // Fallback to UTC
    return date.toISOString().split('T')[0];
  }
}

/**
 * Calculates the exact UTC start and end Date objects for a given 'YYYY-MM-DD'
 * calendar day in an IANA timezone (e.g. 'America/New_York' or 'Asia/Kolkata').
 */
export function getTimezoneDayRange(
  dateStr: string,
  timezone: string = 'Asia/Kolkata'
): { startOfDay: Date; endOfDay: Date } {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const utcGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(utcGuess);
    const getPart = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
    const tzYear = getPart('year');
    const tzMonth = getPart('month');
    const tzDay = getPart('day');
    const tzHour = getPart('hour');
    const tzMinute = getPart('minute');
    const tzSecond = getPart('second');

    const asUtc = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond);
    const offsetMs = asUtc - utcGuess.getTime();

    const startOfDay = new Date(utcGuess.getTime() - offsetMs);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
    return { startOfDay, endOfDay };
  } catch {
    const startOfDay = new Date(`${dateStr}T00:00:00Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
    return { startOfDay, endOfDay };
  }
}

/**
 * Reconcile and update DailyStats when a tracking session is synchronized or completed.
 */
export async function updateDailyStatsForSession(
  userId: string | Types.ObjectId,
  session: {
    platform: 'instagram' | 'youtube';
    startedAt: Date;
    activeDurationSeconds: number;
    estimatedVideoViews: number;
    navigationEvents: number;
  }
): Promise<void> {
  const user = await User.findById(userId).select('timezone dailyGoals');
  const tz = user?.timezone || 'Asia/Kolkata';
  const dateStr = getDateStringInTimezone(session.startedAt, tz);

  // Find or create DailyStats record
  let stats = await DailyStats.findOne({ userId, date: dateStr });
  if (!stats) {
    stats = new DailyStats({
      userId,
      date: dateStr,
      timezone: tz,
      instagramDurationSeconds: 0,
      youtubeDurationSeconds: 0,
      totalDurationSeconds: 0,
      estimatedInstagramViews: 0,
      estimatedYouTubeViews: 0,
      sessionCount: 0,
      longSessionCount: 0,
      doomscrollScore: 0,
    });
  }

  // Calculate accurate UTC day boundaries for the user's timezone
  const { startOfDay, endOfDay } = getTimezoneDayRange(dateStr, tz);

  // Aggregate directly from distinct sessions for this local day
  const sessions = await TrackingSession.find({
    userId,
    startedAt: { $gte: startOfDay, $lte: endOfDay },
  });

  let igDuration = 0;
  let ytDuration = 0;
  let igViews = 0;
  let ytViews = 0;
  let longSessions = 0;

  for (const s of sessions) {
    if (s.platform === 'instagram') {
      igDuration += s.activeDurationSeconds;
      igViews += s.estimatedVideoViews;
    } else {
      ytDuration += s.activeDurationSeconds;
      ytViews += s.estimatedVideoViews;
    }
    if (s.activeDurationSeconds >= 25 * 60) {
      longSessions += 1;
    }
  }

  stats.instagramDurationSeconds = igDuration;
  stats.youtubeDurationSeconds = ytDuration;
  stats.totalDurationSeconds = igDuration + ytDuration;
  stats.estimatedInstagramViews = igViews;
  stats.estimatedYouTubeViews = ytViews;
  stats.sessionCount = sessions.length;
  stats.longSessionCount = longSessions;

  // Calculate deterministic server-side doomscroll score using DoomscrollDetectionEngine
  const goalMinutes = user?.dailyGoals?.shortVideoMinutes || 30;
  const goalSeconds = goalMinutes * 60;

  // Count sessions in the last 60 minutes
  const oneHourAgo = new Date(session.startedAt.getTime() - 60 * 60 * 1000);
  const recentSessions = await TrackingSession.countDocuments({
    userId,
    startedAt: { $gte: oneHourAgo, $lte: session.startedAt },
  });

  // Calculate local hour of the session
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    hourCycle: 'h23',
  });
  const currentHour = Number(formatter.format(session.startedAt));

  const evaluation = DoomscrollDetectionEngine.evaluate(
    {
      continuousSessionSeconds: session.activeDurationSeconds,
      dailyTotalSeconds: stats.totalDurationSeconds,
      dailyGoalSeconds: goalSeconds,
      sessionsInLastHour: Math.max(1, recentSessions),
      navigationEventsInSession: session.navigationEvents,
      currentHour,
      longSessionCountToday: stats.longSessionCount,
      dataQuality: 'SUFFICIENT',
    },
    {
      quietHours: user?.quietHours || { enabled: false, startHour: 22, endHour: 7 },
    }
  );

  stats.doomscrollScore = evaluation.score;
  await stats.save();

  // If intervention is recommended, record a DoomscrollEvent if outside cooldown (30 min)
  if (evaluation.interventionRecommended) {
    const cooldownPeriod = new Date(Date.now() - 30 * 60 * 1000);
    const existingRecentAlert = await DoomscrollEvent.findOne({
      userId,
      detectedAt: { $gte: cooldownPeriod },
    });

    if (!existingRecentAlert) {
      await DoomscrollEvent.create({
        userId,
        detectedAt: new Date(),
        ruleId: evaluation.ruleId,
        severity: evaluation.score >= 80 ? 'HIGH' : evaluation.score >= 60 ? 'MEDIUM' : 'LOW',
        score: evaluation.score,
        contributingSignals: evaluation.contributingFactors.map((f) => ({
          factor: f.factor,
          scoreDelta: f.scoreDelta,
          description: f.description,
        })),
        thresholdValues: evaluation.thresholds,
        reminderStatus: 'SHOWN',
      });
    }
  }
}
