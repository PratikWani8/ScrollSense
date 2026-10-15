import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { User } from '../models/User.js';
import { DailyStats } from '../models/DailyStats.js';
import { TrackingSession } from '../models/TrackingSession.js';
import { Goal } from '../models/Goal.js';
import { AIReport } from '../models/AIReport.js';
import { authenticateUser } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { getDateStringInTimezone } from '../services/aggregation.js';
import crypto from 'crypto';

const router = Router();

/**
 * Fallback generator in Node.js to ensure the user never gets a 500 error
 * if the AI service is temporarily offline or experiencing cold start.
 */
function generateLocalFallbackReport(payload: any) {
  const currentDays = payload.currentPeriodDays || [];
  const totalSec = currentDays.reduce((acc: number, d: any) => acc + (d.totalDurationSeconds || 0), 0);
  const totalMin = Math.round(totalSec / 60);
  const totalViews = currentDays.reduce((acc: number, d: any) => acc + (d.estimatedInstagramViews || 0) + (d.estimatedYouTubeViews || 0), 0);
  const avgDailyMin = Math.round(totalMin / Math.max(1, currentDays.length));
  const goalMin = payload.dailyGoalMinutes || 30;
  const prolongedCount = payload.prolongedSessionsCount || 0;

  const reportId = `rep_${crypto.randomBytes(6).toString('hex')}`;
  const nowIso = new Date().toISOString();

  let summary = `Your daily short-video browsing averaged ${avgDailyMin}m across the evaluation window (~${totalViews} estimated views).`;
  if (totalSec < 300) {
    return {
      reportId,
      summary: 'Insufficient browsing telemetry accumulated to establish behavioral patterns.',
      observations: [
        'Less than 5 minutes of total feed engagement recorded so far.',
        'At least 2 active days of tracking are needed for confident trend analysis.',
      ],
      positiveChanges: ['Extension synchronization verified and ready.'],
      areasToImprove: ['Continue browsing normally to establish a 7-day usage baseline.'],
      recommendations: [
        `Keep your daily target at ${goalMin}m while gathering baseline data.`,
        'Browse normally; insights will update as sessions are recorded.',
      ],
      suggestedGoal: {
        dailyLimitMinutes: goalMin,
        reasoning: 'Retaining baseline target while collecting usage data.',
      },
      confidenceNotes: [
        'Marked as INSUFFICIENT data quality due to minimal activity duration.',
      ],
      dataSufficiency: 'INSUFFICIENT',
      generatedAt: nowIso,
      modelVersion: 'scrollsense-fallback-v1.0',
      provider: 'fallback',
    };
  }

  const observations = [
    `Accumulated ${totalMin} total active minutes (~${totalViews} estimated views) over ${currentDays.length} days.`,
    `Platform focus: ${payload.platformTotals?.instagram?.durationSeconds >= (payload.platformTotals?.youtube?.durationSeconds || 0) ? 'Instagram Reels primary' : 'YouTube Shorts primary'}.`,
  ];

  const positiveChanges = [];
  if (avgDailyMin <= goalMin) {
    positiveChanges.push(`Maintained an average daily duration (${avgDailyMin}m) within your ${goalMin}m goal.`);
  } else {
    positiveChanges.push('Consistent session telemetry recorded without tracking gaps.');
  }

  const areasToImprove = [];
  if (prolongedCount > 0) {
    areas_to_improve: areasToImprove.push(`Recorded ${prolongedCount} session(s) exceeding 25 continuous minutes.`);
  }
  if (avgDailyMin > goalMin) {
    areasToImprove.push(`Daily average (${avgDailyMin}m) is above your target limit of ${goalMin}m.`);
  }
  if (areasToImprove.length === 0) {
    areasToImprove.push('Maintain current balanced usage levels.');
  }

  return {
    reportId,
    summary,
    observations,
    positiveChanges,
    areasToImprove,
    recommendations: [
      'Take a brief screen break after 20 minutes to interrupt automatic scrolling loops.',
      'Consider reserving the final 15 minutes before bedtime as a screen-free wind-down window.',
    ],
    suggestedGoal: {
      dailyLimitMinutes: avgDailyMin > goalMin * 1.3 ? Math.round((avgDailyMin + goalMin) / 2) : goalMin,
      reasoning: 'Empirical step-down target tailored to current consumption cadence.',
    },
    confidenceNotes: [
      'Metrics derived from client-side viewport and active tab tracking.',
      'Heuristic views require >= 2.0s dwell time.',
    ],
    dataSufficiency: currentDays.length >= 3 ? 'SUFFICIENT' : 'MODERATE',
    generatedAt: nowIso,
    modelVersion: 'scrollsense-fallback-v1.0',
    provider: 'fallback',
  };
}

/**
 * POST /api/v1/insights/generate
 * Generates an explainable behavioral habit report for authenticated user.
 */
router.post('/generate', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const user = await User.findById(userId).select('timezone dailyGoals quietHours').lean();
  const tz = user?.timezone || 'Asia/Kolkata';
  const todayStr = getDateStringInTimezone(new Date(), tz);

  // 1. Fetch Goal
  const goal = await Goal.findOne({ userId, platform: 'all' }).lean();
  const dailyGoalMinutes = goal?.dailyLimitSeconds
    ? Math.round(goal.dailyLimitSeconds / 60)
    : user?.dailyGoals?.shortVideoMinutes || 30;

  // 2. Fetch past 14 days of DailyStats
  const allStats = await DailyStats.find({ userId })
    .sort({ date: -1 })
    .limit(14)
    .lean();

  const currentPeriodDays = allStats.slice(0, 7).reverse().map((d) => ({
    date: d.date,
    totalDurationSeconds: d.totalDurationSeconds || 0,
    instagramDurationSeconds: d.instagramDurationSeconds || 0,
    youtubeDurationSeconds: d.youtubeDurationSeconds || 0,
    estimatedInstagramViews: d.estimatedInstagramViews || 0,
    estimatedYouTubeViews: d.estimatedYouTubeViews || 0,
    sessionCount: d.sessionCount || 0,
    doomscrollScore: d.doomscrollScore || 0,
  }));

  const previousPeriodDays = allStats.slice(7, 14).reverse().map((d) => ({
    date: d.date,
    totalDurationSeconds: d.totalDurationSeconds || 0,
    instagramDurationSeconds: d.instagramDurationSeconds || 0,
    youtubeDurationSeconds: d.youtubeDurationSeconds || 0,
    estimatedInstagramViews: d.estimatedInstagramViews || 0,
    estimatedYouTubeViews: d.estimatedYouTubeViews || 0,
    sessionCount: d.sessionCount || 0,
    doomscrollScore: d.doomscrollScore || 0,
  }));

  // 3. Platform totals across current period
  let igDuration = 0, ytDuration = 0, igViews = 0, ytViews = 0, igSessions = 0, ytSessions = 0;
  for (const day of currentPeriodDays) {
    igDuration += day.instagramDurationSeconds;
    ytDuration += day.youtubeDurationSeconds;
    igViews += day.estimatedInstagramViews;
    ytViews += day.estimatedYouTubeViews;
  }

  // 4. Prolonged sessions count in the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const prolongedCount = await TrackingSession.countDocuments({
    userId,
    startedAt: { $gte: sevenDaysAgo },
    activeDurationSeconds: { $gte: 25 * 60 },
  });

  const payload = {
    userId: userId.toString(),
    timezone: tz,
    currentPeriodDays,
    previousPeriodDays,
    platformTotals: {
      instagram: {
        durationSeconds: igDuration,
        estimatedViews: igViews,
        sessionCount: igSessions,
      },
      youtube: {
        durationSeconds: ytDuration,
        estimatedViews: ytViews,
        sessionCount: ytSessions,
      },
    },
    dailyGoalMinutes,
    quietHours: user?.quietHours,
    prolongedSessionsCount: prolongedCount,
    dataQuality: currentPeriodDays.length >= 2 ? 'SUFFICIENT' : 'PARTIAL',
  };

  // 5. Query Python AI Service (with automatic local fallback)
  let reportData: any;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const aiRes = await fetch(`${env.AI_SERVICE_URL}/api/v1/insights/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': env.AI_SERVICE_KEY,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (aiRes.ok) {
      reportData = await aiRes.json();
    } else {
      console.warn(`[AI Service] Returned ${aiRes.status}; invoking local fallback.`);
      reportData = generateLocalFallbackReport(payload);
    }
  } catch (err: any) {
    console.warn(`[AI Service] Unreachable or timed out: ${err.message}. Using local fallback.`);
    reportData = generateLocalFallbackReport(payload);
  }

  // 6. Persist report in MongoDB
  const periodStart = currentPeriodDays.length > 0 ? currentPeriodDays[0].date : todayStr;
  const periodEnd = currentPeriodDays.length > 0 ? currentPeriodDays[currentPeriodDays.length - 1].date : todayStr;

  const savedReport = await AIReport.create({
    userId,
    reportId: reportData.reportId,
    periodStart,
    periodEnd,
    summary: reportData.summary,
    observations: reportData.observations,
    positiveChanges: reportData.positiveChanges,
    areasToImprove: reportData.areasToImprove,
    recommendations: reportData.recommendations,
    suggestedGoal: reportData.suggestedGoal,
    confidenceNotes: reportData.confidenceNotes,
    dataSufficiency: reportData.dataSufficiency,
    modelVersion: reportData.modelVersion,
    provider: reportData.provider,
  });

  res.status(200).json(savedReport);
});

/**
 * GET /api/v1/insights
 * Paginated historical reports for the authenticated user.
 */
router.get('/', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = Math.min(20, parseInt(req.query.limit as string, 10) || 5);
  const skip = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    AIReport.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AIReport.countDocuments({ userId }),
  ]);

  res.status(200).json({
    reports,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * GET /api/v1/insights/latest
 * Fetch the user's most recently generated insight report.
 */
router.get('/latest', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const report = await AIReport.findOne({ userId }).sort({ createdAt: -1 }).lean();

  if (!report) {
    res.status(404).json({ error: 'No generated insight reports found' });
    return;
  }

  res.status(200).json({ report });
});

/**
 * GET /api/v1/insights/:reportId
 * Fetch specific report by reportId.
 */
router.get('/:reportId', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const report = await AIReport.findOne({ userId, reportId: req.params.reportId }).lean();

  if (!report) {
    res.status(404).json({ error: 'Insight report not found' });
    return;
  }

  res.status(200).json({ report });
});

export default router;
