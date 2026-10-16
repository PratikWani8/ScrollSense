import { Router, Request, Response } from 'express';
import { User } from '../models/User.js';
import { Device } from '../models/Device.js';
import { TrackingSession } from '../models/TrackingSession.js';
import { TrackingEvent } from '../models/TrackingEvent.js';
import { DailyStats } from '../models/DailyStats.js';
import { DoomscrollEvent } from '../models/DoomscrollEvent.js';
import { Goal } from '../models/Goal.js';
import { AIReport } from '../models/AIReport.js';
import { authenticateUser } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/v1/privacy/export
 * Full GDPR/privacy data export for the authenticated user.
 */
router.get('/export', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  const [user, devices, sessions, events, dailyStats, goals, doomscrollEvents, aiReports] = await Promise.all([
    User.findById(userId).select('-passwordHash').lean(),
    Device.find({ userId }).select('-deviceTokenHash').lean(),
    TrackingSession.find({ userId }).lean(),
    TrackingEvent.find({ userId }).lean(),
    DailyStats.find({ userId }).lean(),
    Goal.find({ userId }).lean(),
    DoomscrollEvent.find({ userId }).lean(),
    AIReport.find({ userId }).lean(),
  ]);

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    account: user,
    devices,
    goals,
    dailyStats,
    trackingSessions: sessions,
    trackingEvents: events,
    doomscrollEvents,
    aiReports,
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="scrollsense-data-export-${userId}.json"`);
  res.status(200).json(exportPayload);
});

/**
 * DELETE /api/v1/privacy/data
 * Purges all tracking history for the authenticated user while keeping the account active.
 */
router.delete('/data', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  await Promise.all([
    TrackingSession.deleteMany({ userId }),
    TrackingEvent.deleteMany({ userId }),
    DailyStats.deleteMany({ userId }),
    DoomscrollEvent.deleteMany({ userId }),
    AIReport.deleteMany({ userId }),
  ]);

  res.status(200).json({
    message: 'All personal tracking sessions, events, and analytics history have been permanently deleted.',
  });
});

/**
 * DELETE /api/v1/privacy/account
 * Completely deletes the user account and all associated data.
 */
router.delete('/account', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  await Promise.all([
    User.findByIdAndDelete(userId),
    Device.deleteMany({ userId }),
    TrackingSession.deleteMany({ userId }),
    TrackingEvent.deleteMany({ userId }),
    DailyStats.deleteMany({ userId }),
    DoomscrollEvent.deleteMany({ userId }),
    Goal.deleteMany({ userId }),
    AIReport.deleteMany({ userId }),
  ]);

  res.status(200).json({
    message: 'Your account and all associated records have been permanently deleted.',
  });
});

/**
 * GET /api/v1/privacy/retention
 * Fetches user's current data retention policy and storage metrics.
 */
router.get('/retention', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const user = await User.findById(userId);

  const retentionDays = user?.preferences?.retentionDays ?? 30;
  const totalSessions = await TrackingSession.countDocuments({ userId });
  const oldestSession = await TrackingSession.findOne({ userId }).sort({ startedAt: 1 }).select('startedAt');

  res.status(200).json({
    retentionDays,
    totalSessions,
    oldestRecordDate: oldestSession ? oldestSession.startedAt : null,
  });
});

/**
 * PUT /api/v1/privacy/retention
 * Updates user retention policy and prunes data older than the new retention threshold.
 */
router.put('/retention', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { retentionDays } = req.body;

  if (typeof retentionDays !== 'number' || retentionDays < 7 || retentionDays > 365) {
    res.status(400).json({ error: 'retentionDays must be an integer between 7 and 365 days.' });
    return;
  }

  await User.findByIdAndUpdate(userId, {
    $set: { 'preferences.retentionDays': retentionDays },
  });

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const [deletedSessions, deletedEvents] = await Promise.all([
    TrackingSession.deleteMany({ userId, startedAt: { $lt: cutoff } }),
    TrackingEvent.deleteMany({ userId, occurredAt: { $lt: cutoff } }),
  ]);

  res.status(200).json({
    message: `Data retention policy updated to ${retentionDays} days.`,
    retentionDays,
    prunedRecords: {
      sessions: deletedSessions.deletedCount,
      events: deletedEvents.deletedCount,
    },
  });
});

/**
 * POST /api/v1/privacy/cleanup
 * Manually executes retention cleanup against the configured retentionDays threshold.
 */
router.post('/cleanup', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const user = await User.findById(userId);
  const retentionDays = user?.preferences?.retentionDays ?? 30;

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const [deletedSessions, deletedEvents] = await Promise.all([
    TrackingSession.deleteMany({ userId, startedAt: { $lt: cutoff } }),
    TrackingEvent.deleteMany({ userId, occurredAt: { $lt: cutoff } }),
  ]);

  res.status(200).json({
    message: `Pruning completed for records older than ${retentionDays} days.`,
    retentionDays,
    prunedRecords: {
      sessions: deletedSessions.deletedCount,
      events: deletedEvents.deletedCount,
    },
  });
});

export default router;
