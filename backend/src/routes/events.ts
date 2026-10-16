import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { TrackingEvent } from '../models/TrackingEvent.js';
import { Device } from '../models/Device.js';
import { authenticateDevice } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { syncRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const singleEventSchema = z.object({
  eventId: z.string().min(1),
  sessionId: z.string().min(1),
  platform: z.enum(['instagram', 'youtube']),
  feedType: z.enum(['instagram_reels', 'youtube_shorts']),
  candidateId: z.string().min(1),
  occurredAt: z.union([z.number(), z.string().datetime()]),
  durationSeconds: z.number().min(0).default(2.0),
  detectorVersion: z.string().default('1.0.0'),
  confidence: z.number().min(0).max(1).default(1.0),
});

const batchEventsSchema = z.object({
  events: z.array(singleEventSchema).max(500),
});

/**
 * POST /api/v1/events/batch
 * Ingest batch of tracking events idempotently.
 */
router.post(
  '/batch',
  syncRateLimiter,
  authenticateDevice,
  validateRequest({ body: batchEventsSchema }),
  async (req: Request, res: Response): Promise<void> => {
    const { events } = req.body;
    const userId = req.device!.userId;
    const deviceId = req.device!.deviceId;

    if (events.length === 0) {
      res.status(200).json({ success: true, acceptedCount: 0, duplicatesIgnored: 0 });
      return;
    }

    let acceptedCount = 0;
    let duplicatesIgnored = 0;

    const bulkOps = events.map((ev: any) => {
      const occurredAt = typeof ev.occurredAt === 'number' ? new Date(ev.occurredAt) : new Date(ev.occurredAt);
      return {
        updateOne: {
          filter: { userId, eventId: ev.eventId },
          update: {
            $setOnInsert: {
              userId,
              deviceId,
              eventId: ev.eventId,
              sessionId: ev.sessionId,
              platform: ev.platform,
              feedType: ev.feedType,
              candidateId: ev.candidateId,
              occurredAt,
              durationSeconds: ev.durationSeconds,
              detectorVersion: ev.detectorVersion,
              confidence: ev.confidence,
            },
          },
          upsert: true,
        },
      };
    });

    const result = await TrackingEvent.bulkWrite(bulkOps, { ordered: false });
    acceptedCount = result.upsertedCount;
    duplicatesIgnored = events.length - acceptedCount;

    await Device.updateOne({ userId, deviceId }, { lastSyncAt: new Date() });

    res.status(200).json({
      success: true,
      acceptedCount,
      duplicatesIgnored,
    });
  }
);

export default router;
