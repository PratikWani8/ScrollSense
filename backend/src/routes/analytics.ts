import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { DailyStats } from '../models/DailyStats.js';
import { TrackingSession } from '../models/TrackingSession.js';
import { User } from '../models/User.js';
import { Goal } from '../models/Goal.js';
import { Device } from '../models/Device.js';
import { authenticateUser } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { z } from 'zod';
import { getDateStringInTimezone, getTimezoneDayRange } from '../services/aggregation.js';
import { TriggerAnalysisService } from '../services/triggerAnalysis.js';
import { TimeReclaimedService } from '../services/timeReclaimed.js';

const router = Router();

/**
 * GET /api/v1/analytics/overview
 * Real-time high-level dashboard metrics for today.
 */
router.get('/overview', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const user = await User.findById(userId).select('timezone dailyGoals');
  const tz = user?.timezone || 'Asia/Kolkata';
  const todayStr = getDateStringInTimezone(new Date(), tz);

  // 1. Fetch Today's DailyStats
  const todayStats = await DailyStats.findOne({ userId, date: todayStr }).lean();

  // 2. Fetch Sessions for Today using timezone day range
  const { startOfDay, endOfDay } = getTimezoneDayRange(todayStr, tz);

  const todaySessions = await TrackingSession.find({
    userId,
    startedAt: { $gte: startOfDay, $lte: endOfDay },
  }).lean();

  let longestSessionSeconds = 0;
  let totalActiveSeconds = 0;

  for (const s of todaySessions) {
    if (s.activeDurationSeconds > longestSessionSeconds) {
      longestSessionSeconds = s.activeDurationSeconds;
    }
    totalActiveSeconds += s.activeDurationSeconds;
  }

  const sessionCount = todaySessions.length;
  const averageSessionSeconds = sessionCount > 0 ? Math.round(totalActiveSeconds / sessionCount) : 0;

  // 3. Goal Progress
  const goal = await Goal.findOne({ userId, platform: 'all' }).lean();
  const dailyGoalSeconds = goal?.dailyLimitSeconds || (user?.dailyGoals?.shortVideoMinutes || 30) * 60;
  const goalProgressPercentage = Math.min(100, Math.round((totalActiveSeconds / dailyGoalSeconds) * 100));

  // 4. Connected devices & sync info
  const devices = await Device.find({ userId }).select('lastSyncAt syncEnabled deviceName').lean();
  const connectedDeviceCount = devices.length;
  const lastSyncAt = devices.reduce<Date | undefined>((latest, d) => {
    if (!d.lastSyncAt) return latest;
    if (!latest || d.lastSyncAt > latest) return d.lastSyncAt;
    return latest;
  }, undefined);

  // 5. Recent 5 sessions
  const recentSessions = await TrackingSession.find({ userId })
    .sort({ startedAt: -1 })
    .limit(5)
    .lean();

  res.status(200).json({
    date: todayStr,
    timezone: tz,
    today: {
      totalDurationSeconds: totalActiveSeconds,
      instagramDurationSeconds: todayStats?.instagramDurationSeconds || 0,
      youtubeDurationSeconds: todayStats?.youtubeDurationSeconds || 0,
      estimatedInstagramViews: todayStats?.estimatedInstagramViews || 0,
      estimatedYouTubeViews: todayStats?.estimatedYouTubeViews || 0,
      sessionCount,
      longestSessionSeconds,
      averageSessionSeconds,
      doomscrollScore: todayStats?.doomscrollScore || 0,
    },
    goal: {
      dailyLimitSeconds: dailyGoalSeconds,
      progressPercentage: goalProgressPercentage,
      isGoalExceeded: totalActiveSeconds > dailyGoalSeconds,
    },
    syncStatus: {
      connectedDeviceCount,
      lastSyncAt,
      isSyncActive: connectedDeviceCount > 0,
    },
    recentSessions,
  });
});

/**
 * GET /api/v1/analytics/trends
 * 7-day or 30-day daily aggregated metrics.
 */
router.get('/trends', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const days = req.query.days === '30' ? 30 : 7;
  const user = await User.findById(userId).select('timezone');
  const tz = user?.timezone || 'Asia/Kolkata';

  // Generate date array for last N days
  const dateList: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dateList.push(getDateStringInTimezone(d, tz));
  }

  const stats = await DailyStats.find({
    userId,
    date: { $in: dateList },
  }).lean();

  const statsMap = new Map(stats.map((s) => [s.date, s]));

  // Fill zero-data days cleanly so charts are continuous
  const trends = dateList.map((date) => {
    const s = statsMap.get(date);
    return {
      date,
      totalDurationSeconds: s?.totalDurationSeconds || 0,
      instagramDurationSeconds: s?.instagramDurationSeconds || 0,
      youtubeDurationSeconds: s?.youtubeDurationSeconds || 0,
      estimatedInstagramViews: s?.estimatedInstagramViews || 0,
      estimatedYouTubeViews: s?.estimatedYouTubeViews || 0,
      sessionCount: s?.sessionCount || 0,
      doomscrollScore: s?.doomscrollScore || 0,
    };
  });

  res.status(200).json({ days, trends });
});

/**
 * GET /api/v1/analytics/platforms
 * Platform distribution breakdown.
 */
router.get('/platforms', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = new Types.ObjectId(req.user!.userId);

  const aggregation = await TrackingSession.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: '$platform',
        totalDurationSeconds: { $sum: '$activeDurationSeconds' },
        estimatedViews: { $sum: '$estimatedVideoViews' },
        sessionCount: { $sum: 1 },
      },
    },
  ]);

  const result: Record<string, any> = {
    instagram: { totalDurationSeconds: 0, estimatedViews: 0, sessionCount: 0 },
    youtube: { totalDurationSeconds: 0, estimatedViews: 0, sessionCount: 0 },
  };

  for (const item of aggregation) {
    if (item._id === 'instagram') {
      result.instagram = {
        totalDurationSeconds: item.totalDurationSeconds,
        estimatedViews: item.estimatedViews,
        sessionCount: item.sessionCount,
      };
    } else if (item._id === 'youtube') {
      result.youtube = {
        totalDurationSeconds: item.totalDurationSeconds,
        estimatedViews: item.estimatedViews,
        sessionCount: item.sessionCount,
      };
    }
  }

  const grandTotalSeconds = result.instagram.totalDurationSeconds + result.youtube.totalDurationSeconds;

  res.status(200).json({
    platforms: {
      ...result,
      instagramPercentage: grandTotalSeconds > 0 ? Math.round((result.instagram.totalDurationSeconds / grandTotalSeconds) * 100) : 0,
      youtubePercentage: grandTotalSeconds > 0 ? Math.round((result.youtube.totalDurationSeconds / grandTotalSeconds) * 100) : 0,
    },
  });
});

/**
 * GET /api/v1/analytics/hourly
 * 24-hour distribution of active feed usage.
 */
router.get('/hourly', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const user = await User.findById(userId).select('timezone');
  const tz = user?.timezone || 'Asia/Kolkata';

  // Last 7 days sessions for hourly pattern
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sessions = await TrackingSession.find({
    userId,
    startedAt: { $gte: sevenDaysAgo },
  }).select('startedAt activeDurationSeconds platform').lean();

  const hourlyBuckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    hourLabel: `${hour}:00`,
    instagramSeconds: 0,
    youtubeSeconds: 0,
    totalSeconds: 0,
  }));

  for (const s of sessions) {
    try {
      const hourStr = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric',
        hour12: false,
      }).format(s.startedAt);
      const hour = parseInt(hourStr, 10) % 24;

      if (!isNaN(hour) && hourlyBuckets[hour]) {
        if (s.platform === 'instagram') {
          hourlyBuckets[hour].instagramSeconds += s.activeDurationSeconds;
        } else {
          hourlyBuckets[hour].youtubeSeconds += s.activeDurationSeconds;
        }
        hourlyBuckets[hour].totalSeconds += s.activeDurationSeconds;
      }
    } catch {
      // Ignore conversion edge case
    }
  }

  res.status(200).json({ hourly: hourlyBuckets });
});

/**
 * GET /api/v1/analytics/weekly-report
 * Weekly comparative summary.
 */
router.get('/weekly-report', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const user = await User.findById(userId).select('timezone dailyGoals');
  const tz = user?.timezone || 'Asia/Kolkata';

  const now = Date.now();
  const currentWeekStart = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const previousWeekStart = new Date(now - 14 * 24 * 60 * 60 * 1000);

  const [currentWeekSessions, previousWeekSessions] = await Promise.all([
    TrackingSession.find({ userId, startedAt: { $gte: currentWeekStart } }).lean(),
    TrackingSession.find({ userId, startedAt: { $gte: previousWeekStart, $lt: currentWeekStart } }).lean(),
  ]);

  const currentDuration = currentWeekSessions.reduce((acc, s) => acc + s.activeDurationSeconds, 0);
  const previousDuration = previousWeekSessions.reduce((acc, s) => acc + s.activeDurationSeconds, 0);

  const currentViews = currentWeekSessions.reduce((acc, s) => acc + s.estimatedVideoViews, 0);
  const previousViews = previousWeekSessions.reduce((acc, s) => acc + s.estimatedVideoViews, 0);

  let changePercentage = 0;
  if (previousDuration > 0) {
    changePercentage = Math.round(((currentDuration - previousDuration) / previousDuration) * 100);
  }

  res.status(200).json({
    currentWeek: {
      totalDurationSeconds: currentDuration,
      estimatedViews: currentViews,
      sessionCount: currentWeekSessions.length,
    },
    previousWeek: {
      totalDurationSeconds: previousDuration,
      estimatedViews: previousViews,
      sessionCount: previousWeekSessions.length,
    },
    changePercentage,
    trend: changePercentage > 0 ? 'INCREASED' : changePercentage < 0 ? 'DECREASED' : 'STABLE',
  });
});

/**
 * GET /api/v1/analytics/trigger-map
 * Retrieve Personal Doomscroll Trigger Map data, heatmap, and deterministic observations.
 */
router.get('/trigger-map', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
  const result = await TriggerAnalysisService.analyze(userId, isNaN(days) ? 30 : days);
  res.status(200).json(result);
});

/**
 * POST /api/v1/analytics/trigger-map/context
 * Submit optional check-in context (e.g. Boredom, Taking a break, Procrastination, Stress).
 */
router.post(
  '/trigger-map/context',
  authenticateUser,
  validateRequest({
    body: z.object({
      sessionId: z.string().optional(),
      context: z.string().min(1).max(100),
    }),
  }),
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { sessionId, context } = req.body;

    let targetSession;
    if (sessionId) {
      targetSession = await TrackingSession.findOne({ userId, sessionId });
    } else {
      targetSession = await TrackingSession.findOne({ userId }).sort({ startedAt: -1 });
    }

    if (!targetSession) {
      res.status(404).json({ error: 'No recent tracking session found to attach context.' });
      return;
    }

    targetSession.userContext = context;
    await targetSession.save();

    res.status(200).json({
      success: true,
      message: 'Check-in context recorded.',
      sessionId: targetSession.sessionId,
      userContext: targetSession.userContext,
    });
  }
);

/**
 * GET /api/v1/analytics/time-reclaimed
 * Retrieve Time Reclaimed Score comparing today & weekly usage against historical baseline.
 */
router.get('/time-reclaimed', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const windowDays = req.query.windowDays ? parseInt(req.query.windowDays as string, 10) : 14;
  const result = await TimeReclaimedService.calculate(userId, isNaN(windowDays) ? 14 : windowDays);
  res.status(200).json(result);
});

export default router;
