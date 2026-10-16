import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { DailyStats } from '../src/models/DailyStats.js';
import { AIReport } from '../src/models/AIReport.js';

describe('AI Insights API Integration Tests', () => {
  const app = createApp();
  let userToken: string;
  let userId: string;

  let otherUserToken: string;
  let otherUserId: string;

  beforeEach(async () => {
    await User.deleteMany({});
    await DailyStats.deleteMany({});
    await AIReport.deleteMany({});

    // Register User 1
    const regRes = await request(app).post('/api/v1/auth/register').send({
      email: 'insights_user@example.com',
      password: 'Password123!',
      displayName: 'Insight Tester',
      timezone: 'UTC',
    });
    userToken = regRes.body.token;
    userId = regRes.body.user.id;

    // Register User 2 for isolation testing
    const regRes2 = await request(app).post('/api/v1/auth/register').send({
      email: 'other_user@example.com',
      password: 'Password123!',
      displayName: 'Other Tester',
      timezone: 'UTC',
    });
    otherUserToken = regRes2.body.token;
    otherUserId = regRes2.body.user.id;

    // Seed some DailyStats for User 1
    await DailyStats.create([
      {
        userId,
        date: '2026-10-08',
        totalDurationSeconds: 1800,
        instagramDurationSeconds: 1200,
        youtubeDurationSeconds: 600,
        estimatedInstagramViews: 12,
        estimatedYouTubeViews: 6,
        sessionCount: 2,
        doomscrollScore: 25,
      },
      {
        userId,
        date: '2026-10-09',
        totalDurationSeconds: 2400,
        instagramDurationSeconds: 1600,
        youtubeDurationSeconds: 800,
        estimatedInstagramViews: 18,
        estimatedYouTubeViews: 8,
        sessionCount: 3,
        doomscrollScore: 35,
      },
    ]);
  });

  it('generates a structured behavioral report and persists it to MongoDB', async () => {
    const res = await request(app)
      .post('/api/v1/insights/generate')
      .set('Authorization', `Bearer ${userToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.reportId).toBeDefined();
    expect(res.body.summary).toBeDefined();
    expect(Array.isArray(res.body.observations)).toBe(true);
    expect(Array.isArray(res.body.positiveChanges)).toBe(true);
    expect(Array.isArray(res.body.areasToImprove)).toBe(true);
    expect(Array.isArray(res.body.recommendations)).toBe(true);
    expect(res.body.suggestedGoal).toBeDefined();

    // Verify stored in DB
    const report = await AIReport.findOne({ userId, reportId: res.body.reportId });
    expect(report).toBeDefined();
    expect(report?.summary).toBe(res.body.summary);
  });

  it('lists past reports and retrieves the latest generated report', async () => {
    // Generate report
    const genRes = await request(app)
      .post('/api/v1/insights/generate')
      .set('Authorization', `Bearer ${userToken}`)
      .send();

    expect(genRes.status).toBe(200);

    // List reports
    const listRes = await request(app)
      .get('/api/v1/insights')
      .set('Authorization', `Bearer ${userToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.reports.length).toBe(1);
    expect(listRes.body.pagination.total).toBe(1);

    // Latest report
    const latestRes = await request(app)
      .get('/api/v1/insights/latest')
      .set('Authorization', `Bearer ${userToken}`);

    expect(latestRes.status).toBe(200);
    expect(latestRes.body.report.reportId).toBe(genRes.body.reportId);
  });

  it('enforces cross-user isolation: user cannot fetch another user’s report', async () => {
    const genRes = await request(app)
      .post('/api/v1/insights/generate')
      .set('Authorization', `Bearer ${userToken}`)
      .send();

    const reportId = genRes.body.reportId;

    // User 1 fetches own report: 200
    const ownRes = await request(app)
      .get(`/api/v1/insights/${reportId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(ownRes.status).toBe(200);

    // User 2 attempts to fetch User 1's report: 404
    const foreignRes = await request(app)
      .get(`/api/v1/insights/${reportId}`)
      .set('Authorization', `Bearer ${otherUserToken}`);
    expect(foreignRes.status).toBe(404);
  });
});
