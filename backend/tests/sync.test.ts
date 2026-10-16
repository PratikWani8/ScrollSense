import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Device } from '../src/models/Device.js';
import { TrackingSession } from '../src/models/TrackingSession.js';
import { TrackingEvent } from '../src/models/TrackingEvent.js';
import { DailyStats } from '../src/models/DailyStats.js';
import { hashDeviceToken } from '../src/middleware/auth.js';

describe('Tracking Session & Event Synchronization Tests', () => {
  const app = createApp();
  let userToken: string;
  let userId: string;
  let deviceToken: string;
  const rawDeviceToken = 'test_raw_device_token_secret_12345';

  beforeEach(async () => {
    await User.deleteMany({});
    await Device.deleteMany({});
    await TrackingSession.deleteMany({});
    await TrackingEvent.deleteMany({});
    await DailyStats.deleteMany({});

    // Register User
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'sync-user@scrollsense.io',
        password: 'Password123!',
        displayName: 'Sync User',
        timezone: 'Asia/Kolkata',
      });
    userToken = regRes.body.token;
    userId = regRes.body.user.id;

    // Seed paired Device
    deviceToken = rawDeviceToken;
    const deviceTokenHash = hashDeviceToken(rawDeviceToken);
    await Device.create({
      userId,
      deviceId: 'paired-device-1',
      deviceName: 'Test Browser',
      extensionVersion: '1.0.0',
      deviceTokenHash,
      syncEnabled: true,
    });
  });

  it('synchronizes a tracking session and updates daily totals', async () => {
    const startedAt = new Date().toISOString();
    const syncRes = await request(app)
      .post('/api/v1/sessions/sync')
      .set('X-Device-Token', deviceToken)
      .send({
        sessionId: 'sess-sync-test-1',
        platform: 'instagram',
        feedType: 'instagram_reels',
        startedAt,
        activeDurationSeconds: 120,
        estimatedVideoViews: 8,
        navigationEvents: 6,
        detectorVersion: '1.0.0',
        dataQuality: 'HIGH',
      });

    expect(syncRes.status).toBe(200);
    expect(syncRes.body.success).toBe(true);
    expect(syncRes.body.status).toBe('ACCEPTED');

    // Verify session stored in DB
    const session = await TrackingSession.findOne({ userId, sessionId: 'sess-sync-test-1' });
    expect(session).toBeDefined();
    expect(session?.activeDurationSeconds).toBe(120);
    expect(session?.estimatedVideoViews).toBe(8);

    // Verify DailyStats created and updated
    const stats = await DailyStats.findOne({ userId });
    expect(stats).toBeDefined();
    expect(stats?.instagramDurationSeconds).toBe(120);
    expect(stats?.estimatedInstagramViews).toBe(8);
  });

  it('enforces idempotency: syncing the same session twice does not duplicate records or inflate totals', async () => {
    const startedAt = new Date().toISOString();
    const payload = {
      sessionId: 'sess-idempotent-1',
      platform: 'youtube' as const,
      feedType: 'youtube_shorts' as const,
      startedAt,
      activeDurationSeconds: 60,
      estimatedVideoViews: 4,
      navigationEvents: 2,
    };

    // First sync
    await request(app)
      .post('/api/v1/sessions/sync')
      .set('X-Device-Token', deviceToken)
      .send(payload);

    // Re-syncing same session with updated duration
    const res2 = await request(app)
      .post('/api/v1/sessions/sync')
      .set('X-Device-Token', deviceToken)
      .send({
        ...payload,
        activeDurationSeconds: 90,
        estimatedVideoViews: 5,
      });

    expect(res2.status).toBe(200);

    // Count should be strictly 1
    const count = await TrackingSession.countDocuments({ userId, sessionId: 'sess-idempotent-1' });
    expect(count).toBe(1);

    // Updated stats should reflect 90 seconds, NOT 60 + 90 = 150
    const stats = await DailyStats.findOne({ userId });
    expect(stats?.youtubeDurationSeconds).toBe(90);
    expect(stats?.estimatedYouTubeViews).toBe(5);
  });

  it('ingests batch events idempotently without throwing on duplicate event IDs', async () => {
    const events = [
      {
        eventId: 'ev-unique-1',
        sessionId: 'sess-batch-1',
        platform: 'instagram',
        feedType: 'instagram_reels',
        candidateId: 'cand_hash_1',
        occurredAt: Date.now(),
        durationSeconds: 2.0,
      },
      {
        eventId: 'ev-unique-2',
        sessionId: 'sess-batch-1',
        platform: 'instagram',
        feedType: 'instagram_reels',
        candidateId: 'cand_hash_2',
        occurredAt: Date.now() + 5000,
        durationSeconds: 2.0,
      },
    ];

    // First batch
    const res1 = await request(app)
      .post('/api/v1/events/batch')
      .set('X-Device-Token', deviceToken)
      .send({ events });

    expect(res1.status).toBe(200);
    expect(res1.body.acceptedCount).toBe(2);

    // Second batch with 1 existing event + 1 new event
    const res2 = await request(app)
      .post('/api/v1/events/batch')
      .set('X-Device-Token', deviceToken)
      .send({
        events: [
          events[0], // Duplicate!
          {
            eventId: 'ev-unique-3',
            sessionId: 'sess-batch-1',
            platform: 'instagram',
            feedType: 'instagram_reels',
            candidateId: 'cand_hash_3',
            occurredAt: Date.now() + 10000,
            durationSeconds: 2.0,
          },
        ],
      });

    expect(res2.status).toBe(200);
    expect(res2.body.acceptedCount).toBe(1);
    expect(res2.body.duplicatesIgnored).toBe(1);

    const totalEventsInDb = await TrackingEvent.countDocuments({ userId });
    expect(totalEventsInDb).toBe(3);
  });

  it('enforces cross-user isolation when fetching sessions', async () => {
    // User A session
    await TrackingSession.create({
      userId,
      deviceId: 'device-a',
      sessionId: 'sess-a',
      platform: 'instagram',
      feedType: 'instagram_reels',
      startedAt: new Date(),
      activeDurationSeconds: 50,
      estimatedVideoViews: 2,
    });

    // Register User B
    const userBRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'user-b@scrollsense.io',
        password: 'Password123!',
        displayName: 'User B',
      });
    const tokenB = userBRes.body.token;

    // User B fetches their sessions
    const resB = await request(app)
      .get('/api/v1/sessions')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resB.status).toBe(200);
    expect(resB.body.sessions.length).toBe(0); // Cannot see User A's sessions!
  });
});
