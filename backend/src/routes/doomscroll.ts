import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DoomscrollEvent } from '../models/DoomscrollEvent.js';
import { DailyStats } from '../models/DailyStats.js';
import { TrackingSession } from '../models/TrackingSession.js';
import { User } from '../models/User.js';
import { Goal } from '../models/Goal.js';
import { authenticateUser } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { getDateStringInTimezone } from '../services/aggregation.js';
import { DoomscrollDetectionEngine } from '../services/doomscrollEngine.js';

const router = Router();

/**
 * GET /api/v1/doomscroll/breakdown
 * Computes live, explainable score breakdown for today using DoomscrollDetectionEngine.
 */
router.get('/breakdown', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const user = await User.findById(userId).select('timezone quietHours dailyGoals preferences');
  const tz = user?.timezone || 'Asia/Kolkata';
  const todayStr = getDateStringInTimezone(new Date(), tz);

  const [stats, goal, recentSessions, latestSession, activeEvent] = await Promise.all([
    DailyStats.findOne({ userId, date: todayStr }).lean(),
    Goal.findOne({ userId, platform: 'all' }).lean(),
    TrackingSession.countDocuments({
      userId,
      startedAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    }),
    TrackingSession.findOne({ userId }).sort({ startedAt: -1 }).lean(),
    DoomscrollEvent.findOne({
      userId,
      detectedAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) },
      reminderStatus: 'SHOWN',
    }).sort({ detectedAt: -1 }).lean(),
  ]);

  const dailyGoalMinutes = goal?.dailyLimitSeconds
    ? Math.round(goal.dailyLimitSeconds / 60)
    : user?.dailyGoals?.shortVideoMinutes || 30;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    hourCycle: 'h23',
  });
  const currentHour = Number(formatter.format(new Date()));

  // Historical 7-day average daily seconds
  const past7Days = await DailyStats.find({
    userId,
    date: { $lt: todayStr },
  })
    .sort({ date: -1 })
    .limit(7)
    .lean();

  const historical7DayAvgDailySeconds =
    past7Days.length > 0
      ? past7Days.reduce((acc, d) => acc + d.totalDurationSeconds, 0) / past7Days.length
      : undefined;

  const evaluation = DoomscrollDetectionEngine.evaluate(
    {
      continuousSessionSeconds: latestSession?.activeDurationSeconds || 0,
      dailyTotalSeconds: stats?.totalDurationSeconds || 0,
      dailyGoalSeconds: dailyGoalMinutes * 60,
      sessionsInLastHour: Math.max(1, recentSessions),
      navigationEventsInSession: latestSession?.navigationEvents || 0,
      currentHour,
      longSessionCountToday: stats?.longSessionCount || 0,
      historical7DayAvgDailySeconds,
      dataQuality: stats ? 'SUFFICIENT' : 'PARTIAL',
    },
    {
      quietHours: user?.quietHours || { enabled: false, startHour: 22, endHour: 7 },
    }
  );

  res.status(200).json({
    date: todayStr,
    timezone: tz,
    ...evaluation,
    activeReminder: activeEvent
      ? {
          eventId: activeEvent._id,
          detectedAt: activeEvent.detectedAt,
          ruleId: activeEvent.ruleId,
          severity: activeEvent.severity,
          reason: evaluation.interventionReason,
        }
      : null,
  });
});

/**
 * GET /api/v1/doomscroll/events
 * Paginated list of historical doomscroll events.
 */
router.get('/events', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 10);
  const skip = (page - 1) * limit;

  const [events, total] = await Promise.all([
    DoomscrollEvent.find({ userId })
      .sort({ detectedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    DoomscrollEvent.countDocuments({ userId }),
  ]);

  res.status(200).json({
    events,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * POST /api/v1/doomscroll/events/:id/status
 * Dismiss or snooze an active reminder.
 */
router.post(
  '/events/:id/status',
  authenticateUser,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const eventId = req.params.id;
    const { status } = req.body;

    if (!['SHOWN', 'DISMISSED', 'ACCEPTED'].includes(status)) {
      res.status(400).json({ error: 'Status must be SHOWN, DISMISSED, or ACCEPTED' });
      return;
    }

    const event = await DoomscrollEvent.findOneAndUpdate(
      { _id: eventId, userId },
      { reminderStatus: status },
      { new: true }
    );

    if (!event) {
      res.status(404).json({ error: 'Doomscroll event not found' });
      return;
    }

    res.status(200).json({
      message: `Reminder status updated to ${status}.`,
      event,
    });
  }
);

/**
 * GET /api/v1/doomscroll/summary
 */
router.get('/summary', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const user = await User.findById(userId).select('timezone quietHours');
  const tz = user?.timezone || 'Asia/Kolkata';
  const todayStr = getDateStringInTimezone(new Date(), tz);

  const stats = await DailyStats.findOne({ userId, date: todayStr }).lean();
  const score = stats?.doomscrollScore || 0;

  let classification = 'Within your goal';
  if (score >= 80) {
    classification = 'Goal exceeded';
  } else if (score >= 61) {
    classification = 'High-usage pattern';
  } else if (score >= 36) {
    classification = 'Consider a break';
  }

  res.status(200).json({
    date: todayStr,
    score,
    classification,
    totalDurationSeconds: stats?.totalDurationSeconds || 0,
    longSessionCount: stats?.longSessionCount || 0,
  });
});

/**
 * PUT /api/v1/doomscroll/settings
 */
router.put('/settings', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { breakRemindersEnabled, quietHours } = req.body;

  const updates: Record<string, any> = {};
  if (breakRemindersEnabled !== undefined) {
    updates['preferences.breakRemindersEnabled'] = Boolean(breakRemindersEnabled);
  }
  if (quietHours) {
    updates.quietHours = quietHours;
  }

  const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true }).select('preferences quietHours');

  res.status(200).json({
    message: 'Intervention preferences updated successfully.',
    preferences: updatedUser?.preferences,
    quietHours: updatedUser?.quietHours,
  });
});

export default router;
