import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { TrackingSession } from '../src/models/TrackingSession.js';
import { DailyStats } from '../src/models/DailyStats.js';

describe('Privacy, Data Export & Deletion Tests', () => {
  const app = createApp();
  let userToken: string;
  let userId: string;

  beforeEach(async () => {
    await User.deleteMany({});
    await TrackingSession.deleteMany({});
    await DailyStats.deleteMany({});

    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'privacy-user@scrollsense.io',
        password: 'Password123!',
        displayName: 'Privacy User',
      });
    userToken = regRes.body.token;
    userId = regRes.body.user.id;

    await TrackingSession.create({
      userId,
      deviceId: 'dev-priv',
      sessionId: 'sess-priv-1',
      platform: 'instagram',
      feedType: 'instagram_reels',
      startedAt: new Date(),
      activeDurationSeconds: 200,
      estimatedVideoViews: 4,
    });
  });

  it('exports user data completely as JSON without leaking passwordHash', async () => {
    const res = await request(app)
      .get('/api/v1/privacy/export')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.account.email).toBe('privacy-user@scrollsense.io');
    expect(res.body.account.passwordHash).toBeUndefined();
    expect(res.body.trackingSessions.length).toBe(1);
    expect(res.body.exportedAt).toBeDefined();
  });

  it('wipes tracking data while preserving user account on DELETE /api/v1/privacy/data', async () => {
    const wipeRes = await request(app)
      .delete('/api/v1/privacy/data')
      .set('Authorization', `Bearer ${userToken}`);

    expect(wipeRes.status).toBe(200);

    // Sessions wiped
    const sessions = await TrackingSession.find({ userId });
    expect(sessions.length).toBe(0);

    // Account remains active
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${userToken}`);
    expect(meRes.status).toBe(200);
  });

  it('permanently deletes account and all records on DELETE /api/v1/privacy/account', async () => {
    const deleteRes = await request(app)
      .delete('/api/v1/privacy/account')
      .set('Authorization', `Bearer ${userToken}`);

    expect(deleteRes.status).toBe(200);

    // User is gone
    const userInDb = await User.findById(userId);
    expect(userInDb).toBeNull();

    // Subsequent access with old token returns 401
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${userToken}`);
    expect(meRes.status).toBe(401);
  });

  it('manages data retention policy and prunes records accordingly', async () => {
    // 1. Get default retention policy (30 days)
    const getRes = await request(app)
      .get('/api/v1/privacy/retention')
      .set('Authorization', `Bearer ${userToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.retentionDays).toBe(30);
    expect(getRes.body.totalSessions).toBe(1);

    // 2. Insert an old session from 45 days ago
    const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    await TrackingSession.create({
      userId,
      deviceId: 'dev-old',
      sessionId: 'sess-old-45d',
      platform: 'youtube',
      feedType: 'youtube_shorts',
      startedAt: oldDate,
      activeDurationSeconds: 120,
    });

    const sessionsBefore = await TrackingSession.countDocuments({ userId });
    expect(sessionsBefore).toBe(2);

    // 3. Update retention policy to 14 days -> should prune the 45d old session
    const putRes = await request(app)
      .put('/api/v1/privacy/retention')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ retentionDays: 14 });

    expect(putRes.status).toBe(200);
    expect(putRes.body.retentionDays).toBe(14);
    expect(putRes.body.prunedRecords.sessions).toBe(1);

    // 4. Verify only the recent session remains
    const sessionsAfter = await TrackingSession.countDocuments({ userId });
    expect(sessionsAfter).toBe(1);

    // 5. Trigger manual cleanup -> 0 records pruned since all are fresh
    const cleanRes = await request(app)
      .post('/api/v1/privacy/cleanup')
      .set('Authorization', `Bearer ${userToken}`);

    expect(cleanRes.status).toBe(200);
    expect(cleanRes.body.prunedRecords.sessions).toBe(0);
  });
});

