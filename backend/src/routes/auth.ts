import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Goal } from '../models/Goal.js';
import { env } from '../config/env.js';
import { authenticateUser } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  displayName: z.string().min(2).max(50),
  timezone: z.string().optional().default('Asia/Kolkata'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /api/v1/auth/register
 */
router.post(
  '/register',
  authRateLimiter,
  validateRequest({ body: registerSchema }),
  async (req: Request, res: Response): Promise<void> => {
    const { email, password, displayName, timezone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      email,
      passwordHash,
      displayName,
      timezone,
    });
    await user.save();

    // Create default Goal record
    const defaultGoal = new Goal({
      userId: user._id,
      platform: 'all',
      dailyLimitSeconds: 1800, // 30 minutes
      reminderIntervalMinutes: 25,
      quietHours: { enabled: true, startHour: 23, endHour: 7 },
      enabled: true,
    });
    await defaultGoal.save();

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    res.status(201).json({
      message: 'Account successfully registered.',
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        timezone: user.timezone,
        preferences: user.preferences,
        dailyGoals: user.dailyGoals,
      },
    });
  }
);

/**
 * POST /api/v1/auth/login
 */
router.post(
  '/login',
  authRateLimiter,
  validateRequest({ body: loginSchema }),
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        timezone: user.timezone,
        preferences: user.preferences,
        dailyGoals: user.dailyGoals,
      },
    });
  }
);

/**
 * GET /api/v1/auth/me
 */
router.get('/me', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const user = await User.findById(req.user!.userId).select('-passwordHash');
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  res.status(200).json({
    user: {
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      timezone: user.timezone,
      preferences: user.preferences,
      dailyGoals: user.dailyGoals,
      quietHours: user.quietHours,
      createdAt: user.createdAt,
    },
  });
});

/**
 * POST /api/v1/auth/logout
 */
router.post('/logout', (req: Request, res: Response): void => {
  res.status(200).json({ message: 'Logged out successfully.' });
});

export default router;
