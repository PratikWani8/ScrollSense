import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { TrackingSession } from '../models/TrackingSession.js';
import { TrackingEvent } from '../models/TrackingEvent.js';
import { Device } from '../models/Device.js';
import { authenticateDevice, authenticateUser } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { updateDailyStatsForSession } from '../services/aggregation.js';
import { syncRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const intentionSchema = z.object({
  type: z.enum([
    'Learning',
    'Entertainment',
    'Finding Something Specific',
    'Taking a Short Break',
    'Other / Personal Goal',
  ]),
  plannedDurationSeconds: z.number().min(0),
  isExceeded: z.boolean().default(false),
  completedWithinPlan: z.boolean().default(false),
  reminderSent: z.boolean().default(false),
  setAt: z.union([z.number(), z.string().datetime()]).optional(),
});

const syncSessionSchema = z.object({
  sessionId: z.string().min(1),
  platform: z.enum(['instagram', 'youtube']),
  feedType: z.enum(['instagram_reels', 'youtube_shorts']),
  startedAt: z.union([z.number(), z.string().datetime()]),
  endedAt: z.union([z.number(), z.string().datetime()]).optional(),
  activeDurationSeconds: z.number().min(0),
  estimatedVideoViews: z.number().min(0),
  navigationEvents: z.number().min(0).default(0),
  detectorVersion: z.string().default('1.0.0'),
  dataQuality: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('HIGH'),
  intention: intentionSchema.optional(),
  userContext: z.string().max(100).optional(),
});

const listSessionsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(15),
  platform: z.enum(['all', 'instagram', 'youtube']).default('all'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * POST /api/v1/sessions/sync
 * Authenticated device syncs an active or completed session.
 */
router.post(
  '/sync',
  syncRateLimiter,
  authenticateDevice,
  validateRequest({ body: syncSessionSchema }),
  async (req: Request, res: Response): Promise<void> => {
    const data = req.body;
    const userId = req.device!.userId;
    const deviceId = req.device!.deviceId;

    const startedAt = typeof data.startedAt === 'number' ? new Date(data.startedAt) : new Date(data.startedAt);
    const endedAt = data.endedAt
      ? typeof data.endedAt === 'number'
        ? new Date(data.endedAt)
        : new Date(data.endedAt)
      : undefined;

    const updateDoc: any = {
      userId,
      deviceId,
      sessionId: data.sessionId,
      platform: data.platform,
      feedType: data.feedType,
      startedAt,
      endedAt,
      activeDurationSeconds: data.activeDurationSeconds,
      estimatedVideoViews: data.estimatedVideoViews,
      navigationEvents: data.navigationEvents,
      detectorVersion: data.detectorVersion,
      dataQuality: data.dataQuality,
    };

    if (data.intention) {
      updateDoc.intention = {
        ...data.intention,
        setAt: data.intention.setAt
          ? typeof data.intention.setAt === 'number'
            ? new Date(data.intention.setAt)
            : new Date(data.intention.setAt)
          : new Date(),
        isExceeded: data.activeDurationSeconds > data.intention.plannedDurationSeconds,
        completedWithinPlan: data.activeDurationSeconds <= data.intention.plannedDurationSeconds,
      };
    }

    if (data.userContext) {
      updateDoc.userContext = data.userContext;
    }

    // Idempotent upsert by userId + sessionId
    const session = await TrackingSession.findOneAndUpdate(
      { userId, sessionId: data.sessionId },
      updateDoc,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Reconcile DailyStats
    await updateDailyStatsForSession(userId, {
      platform: data.platform,
      startedAt,
      activeDurationSeconds: data.activeDurationSeconds,
      estimatedVideoViews: data.estimatedVideoViews,
      navigationEvents: data.navigationEvents,
    });

    // Update Device lastSyncAt
    await Device.updateOne({ userId, deviceId }, { lastSyncAt: new Date() });

    res.status(200).json({
      success: true,
      sessionId: session.sessionId,
      status: 'ACCEPTED',
    });
  }
);

/**
 * GET /api/v1/sessions
 * Authenticated user fetches paginated session history with filtering.
 */
router.get(
  '/',
  authenticateUser,
  validateRequest({ query: listSessionsQuerySchema }),
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { page, limit, platform, startDate, endDate } = req.query as any;

    const filter: Record<string, any> = { userId };

    if (platform && platform !== 'all') {
      filter.platform = platform;
    }

    if (startDate || endDate) {
      filter.startedAt = {};
      if (startDate) {
        filter.startedAt.$gte = new Date(`${startDate}T00:00:00Z`);
      }
      if (endDate) {
        filter.startedAt.$lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      TrackingSession.find(filter)
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TrackingSession.countDocuments(filter),
    ]);

    res.status(200).json({
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);

/**
 * GET /api/v1/sessions/:sessionId
 * Fetch single session details along with its individual events.
 */
router.get('/:sessionId', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { sessionId } = req.params;

  const session = await TrackingSession.findOne({ userId, sessionId }).lean();
  if (!session) {
    res.status(404).json({ error: 'Tracking session not found.' });
    return;
  }

  const events = await TrackingEvent.find({ userId, sessionId })
    .sort({ occurredAt: 1 })
    .select('eventId occurredAt durationSeconds confidence candidateId')
    .lean();

  res.status(200).json({
    session,
    events,
  });
});

/**
 * GET /api/v1/sessions/intentions/current
 * Fetch current or most recent active session's intention.
 */
router.get('/intentions/current', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  const session = await TrackingSession.findOne({ userId, 'intention.type': { $exists: true } })
    .sort({ startedAt: -1 })
    .lean();

  if (!session || !session.intention) {
    res.status(200).json({ currentIntention: null });
    return;
  }

  const isActive = !session.endedAt;
  const remainingSeconds = Math.max(0, session.intention.plannedDurationSeconds - session.activeDurationSeconds);
  const isExceeded = session.activeDurationSeconds > session.intention.plannedDurationSeconds;

  res.status(200).json({
    currentIntention: {
      sessionId: session.sessionId,
      type: session.intention.type,
      plannedDurationSeconds: session.intention.plannedDurationSeconds,
      activeDurationSeconds: session.activeDurationSeconds,
      remainingSeconds,
      isExceeded,
      isActive,
      startedAt: session.startedAt,
    },
  });
});

/**
 * GET /api/v1/sessions/intentions/adherence
 * Retrieve intention adherence statistics and history.
 */
router.get('/intentions/adherence', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  const sessions = await TrackingSession.find({
    userId,
    'intention.type': { $exists: true },
    activeDurationSeconds: { $gt: 0 },
  })
    .sort({ startedAt: -1 })
    .limit(50)
    .lean();

  const totalSessionsWithIntention = sessions.length;
  let completedWithinPlan = 0;
  let exceededCount = 0;
  let totalPlannedSecs = 0;
  let totalActualSecs = 0;

  const history = sessions.map((s) => {
    const planned = s.intention!.plannedDurationSeconds;
    const actual = s.activeDurationSeconds;
    const isExceeded = actual > planned;
    const deviationSeconds = actual - planned;
    if (isExceeded) {
      exceededCount++;
    } else {
      completedWithinPlan++;
    }
    totalPlannedSecs += planned;
    totalActualSecs += actual;

    return {
      sessionId: s.sessionId,
      platform: s.platform,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      intentionType: s.intention!.type,
      plannedDurationSeconds: planned,
      activeDurationSeconds: actual,
      deviationSeconds,
      isExceeded,
      completedWithinPlan: !isExceeded,
    };
  });

  const adherencePercentage =
    totalSessionsWithIntention > 0
      ? Math.round((completedWithinPlan / totalSessionsWithIntention) * 100)
      : 100;

  res.status(200).json({
    totalSessionsWithIntention,
    completedWithinPlan,
    exceededCount,
    adherencePercentage,
    averagePlannedMinutes:
      totalSessionsWithIntention > 0 ? Math.round(totalPlannedSecs / totalSessionsWithIntention / 60) : 0,
    averageActualMinutes:
      totalSessionsWithIntention > 0 ? Math.round(totalActualSecs / totalSessionsWithIntention / 60) : 0,
    history,
  });
});

/**
 * POST /api/v1/sessions/:sessionId/intention
 * Set or update intention on a specific session.
 */
router.post(
  '/:sessionId/intention',
  authenticateUser,
  validateRequest({
    body: z.object({
      type: z.enum([
        'Learning',
        'Entertainment',
        'Finding Something Specific',
        'Taking a Short Break',
        'Other / Personal Goal',
      ]),
      plannedDurationSeconds: z.number().min(30).max(7200),
    }),
  }),
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { sessionId } = req.params;
    const { type, plannedDurationSeconds } = req.body;

    const session = await TrackingSession.findOne({ userId, sessionId });
    if (!session) {
      res.status(404).json({ error: 'Tracking session not found.' });
      return;
    }

    session.intention = {
      type,
      plannedDurationSeconds,
      isExceeded: session.activeDurationSeconds > plannedDurationSeconds,
      completedWithinPlan: session.activeDurationSeconds <= plannedDurationSeconds,
      reminderSent: false,
      setAt: new Date(),
    };

    await session.save();

    res.status(200).json({
      success: true,
      message: 'Intention recorded for session.',
      intention: session.intention,
    });
  }
);

/**
 * POST /api/v1/sessions/:sessionId/context
 * Submit optional user context (e.g. Boredom, Taking a break, Procrastination, Stress).
 */
router.post(
  '/:sessionId/context',
  authenticateUser,
  validateRequest({
    body: z.object({
      context: z.string().min(1).max(100),
    }),
  }),
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { sessionId } = req.params;
    const { context } = req.body;

    const session = await TrackingSession.findOne({ userId, sessionId });
    if (!session) {
      res.status(404).json({ error: 'Tracking session not found.' });
      return;
    }

    session.userContext = context;
    await session.save();

    res.status(200).json({
      success: true,
      message: 'Context saved for session.',
      userContext: session.userContext,
    });
  }
);

export default router;
