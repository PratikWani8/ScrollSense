import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 auth requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: {
    error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
});

export const pairingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 pairing code attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: {
    error: 'Too many device pairing attempts. Please wait 15 minutes before trying again.',
  },
});

export const syncRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute per device/IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: {
    error: 'Sync rate limit exceeded. Please throttle background requests.',
  },
});

export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});

