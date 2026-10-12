import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PREFIX: z.string().default('/api/v1'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/scrollsense'),
  JWT_SECRET: z.string().min(16).default('scrollsense_fallback_secret_key_at_least_16_chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:3000'),
  DEVICE_TOKEN_SALT: z.string().default('scrollsense_device_salt_2026'),
  AI_SERVICE_URL: z.string().default('http://localhost:8000'),
  AI_SERVICE_KEY: z.string().default('scrollsense_internal_ai_secret_key'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Environment configuration error');
}

export const env = parsed.data;
