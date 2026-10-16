import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { TrackingSession } from '../src/models/TrackingSession.js';
import { DailyStats } from '../src/models/DailyStats.js';
import { getDateStringInTimezone } from '../src/services/aggregation.js';

describe('Advanced Digital Wellbeing Features Tests', () => {
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
        email: 'wellbeing-user@scrollsense.io',
        password: 'Password123!',
        displayName: 'Wellbeing Tester',
        timezone: 'UTC',
      });
    userToken = regRes.body.token;
    userId = regRes.body.user.id;
  });

  describe('Feature 1: Intent-Aware Scrolling', () => {
    it('records and updates an intention for an existing session', async () => {
      const now = new Date();
      await TrackingSession.create({
        userId,
        deviceId: 'dev-1',
        sessionId: 'sess-intent-1',
        platform: 'youtube',
        feedType: 'youtube_shorts',
        startedAt: now,
        activeDurationSeconds: 400, // 6m 40s
      });

      const res = await request(app)
        .post('/api/v1/sessions/sess-intent-1/intention')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'Entertainment',
          plannedDurationSeconds: 600, // 10 mins planned
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.intention.type).toBe('Entertainment');
      expect(res.body.intention.plannedDurationSeconds).toBe(600);
      expect(res.body.intention.completedWithinPlan).toBe(true);
      expect(res.body.intention.isExceeded).toBe(false);
    });

    it('identifies when a session exceeds its planned duration', async () => {
      const now = new Date();
      await TrackingSession.create({
        userId,
        deviceId: 'dev-1',
        sessionId: 'sess-intent-exceeded',
        platform: 'instagram',
        feedType: 'instagram_reels',
        startedAt: now,
        activeDurationSeconds: 900, // 15 mins actual
      });

      const res = await request(app)
        .post('/api/v1/sessions/sess-intent-exceeded/intention')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'Taking a Short Break',
          plannedDurationSeconds: 300, // 5 mins planned
        });

      expect(res.status).toBe(200);
      expect(res.body.intention.isExceeded).toBe(true);
      expect(res.body.intention.completedWithinPlan).toBe(false);
    });

    it('calculates intention adherence statistics and history accurately', async () => {
      const now = new Date();
      // Session 1: completed within plan (planned 600, actual 400)
      await TrackingSession.create({
        userId,
        deviceId: 'dev-1',
        sessionId: 's-adhere-1',
        platform: 'youtube',
        feedType: 'youtube_shorts',
        startedAt: new Date(now.getTime() - 3600000),
        activeDurationSeconds: 400,
        intention: {
          type: 'Learning',
          plannedDurationSeconds: 600,
          isExceeded: false,
          completedWithinPlan: true,
          reminderSent: false,
        },
      });

      // Session 2: exceeded plan (planned 300, actual 500)
      await TrackingSession.create({
        userId,
        deviceId: 'dev-1',
        sessionId: 's-adhere-2',
        platform: 'instagram',
        feedType: 'instagram_reels',
        startedAt: now,
        activeDurationSeconds: 500,
        intention: {
          type: 'Taking a Short Break',
          plannedDurationSeconds: 300,
          isExceeded: true,
          completedWithinPlan: false,
          reminderSent: true,
        },
      });

      const res = await request(app)
        .get('/api/v1/sessions/intentions/adherence')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalSessionsWithIntention).toBe(2);
      expect(res.body.completedWithinPlan).toBe(1);
      expect(res.body.exceededCount).toBe(1);
      expect(res.body.adherencePercentage).toBe(50);
      expect(res.body.history).toHaveLength(2);
    });

    it('retrieves current or most recent intention state', async () => {
      const now = new Date();
      await TrackingSession.create({
        userId,
        deviceId: 'dev-1',
        sessionId: 's-curr-1',
        platform: 'youtube',
        feedType: 'youtube_shorts',
        startedAt: now,
        activeDurationSeconds: 150,
        intention: {
          type: 'Finding Something Specific',
          plannedDurationSeconds: 300,
          isExceeded: false,
          completedWithinPlan: true,
          reminderSent: false,
        },
      });

      const res = await request(app)
        .get('/api/v1/sessions/intentions/current')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.currentIntention).not.toBeNull();
      expect(res.body.currentIntention.type).toBe('Finding Something Specific');
      expect(res.body.currentIntention.plannedDurationSeconds).toBe(300);
      expect(res.body.currentIntention.remainingSeconds).toBe(150);
    });
  });

  describe('Feature 2: Personal Doomscroll Trigger Map', () => {
    it('returns insufficientData when fewer than minimum required sessions exist', async () => {
      // Create only 2 sessions (< 5 required)
      await TrackingSession.create([
        {
          userId,
          deviceId: 'dev-1',
          sessionId: 't-1',
          platform: 'instagram',
          feedType: 'instagram_reels',
          startedAt: new Date(),
          activeDurationSeconds: 300,
        },
        {
          userId,
          deviceId: 'dev-1',
          sessionId: 't-2',
          platform: 'youtube',
          feedType: 'youtube_shorts',
          startedAt: new Date(),
          activeDurationSeconds: 400,
        },
      ]);

      const res = await request(app)
        .get('/api/v1/analytics/trigger-map')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.sufficientData).toBe(false);
      expect(res.body.totalSessionsAnalyzed).toBe(2);
      expect(res.body.minSessionsRequired).toBe(5);
      expect(res.body.heatmap).toHaveLength(28); // 7 days x 4 blocks
    });

    it('computes heatmap distribution and behavioral observations when sufficient sessions exist', async () => {
      const now = new Date();
      // Create 6 sessions occurring in the evening (8 PM = hour 20)
      const sessions = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        d.setUTCHours(20, 0, 0, 0); // 8 PM UTC
        sessions.push({
          userId,
          deviceId: 'dev-1',
          sessionId: `t-suff-${i}`,
          platform: 'instagram' as const,
          feedType: 'instagram_reels' as const,
          startedAt: d,
          activeDurationSeconds: 1800, // 30m each
          userContext: i % 2 === 0 ? 'Boredom' : 'Procrastination',
        });
      }
      await TrackingSession.create(sessions);

      const res = await request(app)
        .get('/api/v1/analytics/trigger-map')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.sufficientData).toBe(true);
      expect(res.body.totalSessionsAnalyzed).toBe(6);
      expect(res.body.timeBlockSummaries.EVENING.sessionCount).toBe(6);
      expect(res.body.timeBlockSummaries.EVENING.medianDurationSeconds).toBe(1800);
      expect(res.body.contextDistribution.length).toBeGreaterThan(0);
      expect(res.body.observations).toBeInstanceOf(Array);
    });

    it('records optional check-in context for a session', async () => {
      const now = new Date();
      await TrackingSession.create({
        userId,
        deviceId: 'dev-1',
        sessionId: 't-ctx-1',
        platform: 'instagram',
        feedType: 'instagram_reels',
        startedAt: now,
        activeDurationSeconds: 600,
      });

      const res = await request(app)
        .post('/api/v1/analytics/trigger-map/context')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          sessionId: 't-ctx-1',
          context: 'Procrastination',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.userContext).toBe('Procrastination');
    });
  });

  describe('Feature 3: Time Reclaimed Score', () => {
    it('returns insufficientBaseline when fewer than 2 complete days of history exist', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/time-reclaimed')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.sufficientBaseline).toBe(false);
      expect(res.body.todayStatus).toBe('INSUFFICIENT_BASELINE');
      expect(res.body.minBaselineDaysRequired).toBe(2);
    });

    it('calculates positive reclaimed time when today usage is below baseline', async () => {
      const now = new Date();
      const tz = 'UTC';

      // Create 3 complete baseline days (120m daily average)
      for (let i = 1; i <= 3; i++) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = getDateStringInTimezone(d, tz);
        await DailyStats.create({
          userId,
          date: dateStr,
          timezone: tz,
          totalDurationSeconds: 7200, // 120 mins
          sessionCount: 4,
        });
      }

      // Today's usage: 50 minutes (3000s) -> 70m below baseline
      const todayStr = getDateStringInTimezone(now, tz);
      await DailyStats.create({
        userId,
        date: todayStr,
        timezone: tz,
        totalDurationSeconds: 3000,
        sessionCount: 2,
      });

      const res = await request(app)
        .get('/api/v1/analytics/time-reclaimed')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.sufficientBaseline).toBe(true);
      expect(res.body.baselineDailyAverageSeconds).toBe(7200);
      expect(res.body.todayActualSeconds).toBe(3000);
      expect(res.body.todayTimeReclaimedSeconds).toBe(4200); // 70 mins reclaimed
      expect(res.body.todayStatus).toBe('BELOW_BASELINE');
      expect(res.body.todayHeadlineText).toContain('70 minutes below');
    });

    it('calculates negative reclaimed time when today usage is above baseline', async () => {
      const now = new Date();
      const tz = 'UTC';

      // 2 baseline days (60m daily average)
      for (let i = 1; i <= 2; i++) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = getDateStringInTimezone(d, tz);
        await DailyStats.create({
          userId,
          date: dateStr,
          timezone: tz,
          totalDurationSeconds: 3600, // 60 mins
          sessionCount: 2,
        });
      }

      // Today's usage: 95 minutes (5700s) -> 35m above baseline
      const todayStr = getDateStringInTimezone(now, tz);
      await DailyStats.create({
        userId,
        date: todayStr,
        timezone: tz,
        totalDurationSeconds: 5700,
        sessionCount: 3,
      });

      const res = await request(app)
        .get('/api/v1/analytics/time-reclaimed')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.sufficientBaseline).toBe(true);
      expect(res.body.todayStatus).toBe('ABOVE_BASELINE');
      expect(res.body.todayTimeReclaimedSeconds).toBe(-2100); // -35 mins
      expect(res.body.todayHeadlineText).toContain('35 minutes above');
    });
  });
});
