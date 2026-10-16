import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { TrackingSession } from '../src/models/TrackingSession.js';
import { DailyStats } from '../src/models/DailyStats.js';

describe('Analytics API Tests', () => {
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
        email: 'analytics-user@scrollsense.io',
        password: 'Password123!',
        displayName: 'Analytics User',
        timezone: 'UTC',
      });
    userToken = regRes.body.token;
    userId = regRes.body.user.id;
  });

  it('returns clean zero-state overview when no sessions exist', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.today.totalDurationSeconds).toBe(0);
    expect(res.body.today.estimatedInstagramViews).toBe(0);
    expect(res.body.today.estimatedYouTubeViews).toBe(0);
    expect(res.body.today.sessionCount).toBe(0);
    expect(res.body.today.longestSessionSeconds).toBe(0);
    expect(res.body.today.averageSessionSeconds).toBe(0);
    expect(res.body.goal.dailyLimitSeconds).toBe(1800);
    expect(res.body.goal.progressPercentage).toBe(0);
  });

  it('returns aggregated overview metrics when user has active sessions', async () => {
    const now = new Date();
    await TrackingSession.create([
      {
        userId,
        deviceId: 'dev-1',
        sessionId: 's1',
        platform: 'instagram',
        feedType: 'instagram_reels',
        startedAt: now,
        activeDurationSeconds: 600, // 10 mins
        estimatedVideoViews: 12,
      },
      {
        userId,
        deviceId: 'dev-1',
        sessionId: 's2',
        platform: 'youtube',
        feedType: 'youtube_shorts',
        startedAt: now,
        activeDurationSeconds: 1200, // 20 mins
        estimatedVideoViews: 15,
      },
    ]);

    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.today.totalDurationSeconds).toBe(1800); // 10m + 20m = 30m
    expect(res.body.today.sessionCount).toBe(2);
    expect(res.body.today.longestSessionSeconds).toBe(1200);
    expect(res.body.today.averageSessionSeconds).toBe(900);
    expect(res.body.goal.progressPercentage).toBe(100);
  });

  it('returns continuous 7-day trend array including empty days', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/trends?days=7')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.trends.length).toBe(7);
    expect(res.body.trends[0].date).toBeDefined();
    expect(typeof res.body.trends[0].totalDurationSeconds).toBe('number');
  });

  it('calculates platform breakdown accurately', async () => {
    await TrackingSession.create([
      {
        userId,
        deviceId: 'dev-1',
        sessionId: 's-ig',
        platform: 'instagram',
        feedType: 'instagram_reels',
        startedAt: new Date(),
        activeDurationSeconds: 700,
        estimatedVideoViews: 10,
      },
      {
        userId,
        deviceId: 'dev-1',
        sessionId: 's-yt',
        platform: 'youtube',
        feedType: 'youtube_shorts',
        startedAt: new Date(),
        activeDurationSeconds: 300,
        estimatedVideoViews: 5,
      },
    ]);

    const res = await request(app)
      .get('/api/v1/analytics/platforms')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.platforms.instagram.totalDurationSeconds).toBe(700);
    expect(res.body.platforms.youtube.totalDurationSeconds).toBe(300);
    expect(res.body.platforms.instagramPercentage).toBe(70);
    expect(res.body.platforms.youtubePercentage).toBe(30);
  });
});
