import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Device } from '../models/Device.js';

export interface AuthenticatedUserPayload {
  userId: string;
  email: string;
}

export interface AuthenticatedDevicePayload {
  deviceId: string;
  userId: string;
  deviceName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUserPayload;
      device?: AuthenticatedDevicePayload;
    }
  }
}

/**
 * Hash raw device token using salt.
 */
export function hashDeviceToken(token: string): string {
  return crypto.createHmac('sha256', env.DEVICE_TOKEN_SALT).update(token).digest('hex');
}

/**
 * Middleware: Authenticates web user via JWT Bearer token.
 */
export async function authenticateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authentication required. Missing or invalid Bearer token.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; email: string };
    const userExists = await User.findById(decoded.userId).select('_id email');
    if (!userExists) {
      res.status(401).json({ error: 'User account not found or has been removed.' });
      return;
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

/**
 * Middleware: Authenticates extension device via X-Device-Token header.
 */
export async function authenticateDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
  const deviceToken = req.headers['x-device-token'] as string;
  if (!deviceToken) {
    res.status(401).json({
      error: 'Device authentication required. Missing X-Device-Token header.',
    });
    return;
  }

  try {
    const tokenHash = hashDeviceToken(deviceToken);
    const device = await Device.findOne({
      deviceTokenHash: tokenHash,
      syncEnabled: true,
    });

    if (!device) {
      res.status(401).json({
        error: 'Invalid or revoked device token. Re-pairing is required.',
      });
      return;
    }

    req.device = {
      deviceId: device.deviceId,
      userId: device.userId.toString(),
      deviceName: device.deviceName,
    };

    // Also populate req.user for shared query helpers
    req.user = {
      userId: device.userId.toString(),
      email: '',
    };

    next();
  } catch (err) {
    res.status(500).json({ error: 'Device authentication failed.' });
  }
}
