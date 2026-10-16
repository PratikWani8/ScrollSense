import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Goal } from '../models/Goal.js';
import { User } from '../models/User.js';
import { authenticateUser } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';

const router = Router();

const updateGoalSchema = z.object({
  dailyLimitSeconds: z.number().min(60).max(86400),
  reminderIntervalMinutes: z.number().min(5).max(180),
  quietHours: z.object({
    enabled: z.boolean(),
    startHour: z.number().min(0).max(23),
    endHour: z.number().min(0).max(23),
  }),
  enabled: z.boolean().default(true),
});

/**
 * GET /api/v1/goals
 */
router.get('/', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  let goal = await Goal.findOne({ userId, platform: 'all' });

  if (!goal) {
    goal = new Goal({
      userId,
      platform: 'all',
      dailyLimitSeconds: 1800,
      reminderIntervalMinutes: 25,
      quietHours: { enabled: true, startHour: 23, endHour: 7 },
      enabled: true,
    });
    await goal.save();
  }

  res.status(200).json({ goal });
});

/**
 * PUT /api/v1/goals
 */
router.put(
  '/',
  authenticateUser,
  validateRequest({ body: updateGoalSchema }),
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { dailyLimitSeconds, reminderIntervalMinutes, quietHours, enabled } = req.body;

    const goal = await Goal.findOneAndUpdate(
      { userId, platform: 'all' },
      {
        dailyLimitSeconds,
        reminderIntervalMinutes,
        quietHours,
        enabled,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Also sync User dailyGoals & quietHours
    await User.findByIdAndUpdate(userId, {
      'dailyGoals.shortVideoMinutes': Math.round(dailyLimitSeconds / 60),
      quietHours,
    });

    res.status(200).json({
      message: 'Goal preferences updated successfully.',
      goal,
    });
  }
);

export default router;
