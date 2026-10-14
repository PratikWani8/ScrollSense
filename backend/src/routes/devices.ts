import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { Device } from '../models/Device.js';
import { DevicePairing } from '../models/DevicePairing.js';
import { authenticateUser, hashDeviceToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { pairingRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

function generatePairingCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Base32 unambiguous
  let result = 'SS-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const pairRequestSchema = z.object({
  deviceId: z.string().min(1),
  deviceName: z.string().optional().default('Chrome Desktop Extension'),
  extensionVersion: z.string().optional().default('1.0.0'),
});

const pairApproveSchema = z.object({
  pairingCode: z.string().min(4).trim(),
});

/**
 * POST /api/v1/devices/pair/request
 * Called by Chrome extension to initiate pairing.
 */
router.post(
  '/pair/request',
  pairingRateLimiter,
  validateRequest({ body: pairRequestSchema }),

  async (req: Request, res: Response): Promise<void> => {
    const { deviceId, deviceName, extensionVersion } = req.body;

    const pairingCode = generatePairingCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Remove any existing pending requests for this device
    await DevicePairing.deleteMany({ deviceId });

    const pairing = new DevicePairing({
      pairingCode,
      deviceId,
      deviceName,
      extensionVersion,
      status: 'PENDING',
      expiresAt,
    });
    await pairing.save();

    res.status(201).json({
      pairingCode,
      expiresAt,
      message: 'Pairing code generated. Enter this code on your ScrollSense dashboard to approve.',
    });
  }
);

/**
 * GET /api/v1/devices/pair/status/:code
 * Polled by Chrome extension to check if pairing code was approved.
 */
router.get('/pair/status/:code', pairingRateLimiter, async (req: Request, res: Response): Promise<void> => {
  const code = req.params.code.toUpperCase().trim();
  const pairing = await DevicePairing.findOne({ pairingCode: code });

  if (!pairing) {
    res.status(404).json({ error: 'Pairing request not found or expired.' });
    return;
  }

  if (pairing.expiresAt < new Date()) {
    pairing.status = 'EXPIRED';
    await pairing.save();
    res.status(410).json({ error: 'Pairing code has expired. Please request a new code.' });
    return;
  }

  if (pairing.status === 'APPROVED') {
    res.status(200).json({
      status: 'APPROVED',
      deviceToken: pairing.deviceToken,
      deviceId: pairing.deviceId,
      deviceName: pairing.deviceName,
    });
    return;
  }

  res.status(200).json({ status: 'PENDING' });
});

/**
 * POST /api/v1/devices/pair/approve
 * Called by authenticated dashboard user to approve a pairing code.
 */
router.post(
  '/pair/approve',
  pairingRateLimiter,
  authenticateUser,
  validateRequest({ body: pairApproveSchema }),
  async (req: Request, res: Response): Promise<void> => {
    const { pairingCode } = req.body;
    const formattedCode = pairingCode.toUpperCase().trim();

    const pairing = await DevicePairing.findOne({
      pairingCode: formattedCode,
      status: 'PENDING',
    });

    if (!pairing || pairing.expiresAt < new Date()) {
      res.status(404).json({
        error: 'Invalid or expired pairing code. Please generate a fresh code in the extension.',
      });
      return;
    }

    // Generate secure 256-bit device token
    const deviceToken = crypto.randomBytes(32).toString('hex');
    const deviceTokenHash = hashDeviceToken(deviceToken);

    // Bind to user in Device collection
    await Device.findOneAndUpdate(
      { userId: req.user!.userId, deviceId: pairing.deviceId },
      {
        userId: req.user!.userId,
        deviceId: pairing.deviceId,
        deviceName: pairing.deviceName,
        extensionVersion: pairing.extensionVersion,
        deviceTokenHash,
        lastSyncAt: new Date(),
        syncEnabled: true,
      },
      { upsert: true, new: true }
    );

    // Update pairing record
    pairing.status = 'APPROVED';
    pairing.userId = req.user!.userId as any;
    pairing.deviceToken = deviceToken;
    await pairing.save();

    res.status(200).json({
      message: `Device "${pairing.deviceName}" successfully paired and connected!`,
      deviceId: pairing.deviceId,
      deviceName: pairing.deviceName,
    });
  }
);

/**
 * GET /api/v1/devices
 * Lists paired devices for authenticated user.
 */
router.get('/', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const devices = await Device.find({ userId: req.user!.userId })
    .select('deviceId deviceName extensionVersion lastSyncAt syncEnabled createdAt')
    .sort({ createdAt: -1 });

  res.status(200).json({ devices });
});

/**
 * DELETE /api/v1/devices/:deviceId
 * Revokes / deletes a paired device.
 */
router.delete('/:deviceId', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const { deviceId } = req.params;

  const result = await Device.findOneAndDelete({
    userId: req.user!.userId,
    deviceId,
  });

  if (!result) {
    res.status(404).json({ error: 'Device not found.' });
    return;
  }

  res.status(200).json({ message: 'Device pairing revoked successfully.' });
});

export default router;
