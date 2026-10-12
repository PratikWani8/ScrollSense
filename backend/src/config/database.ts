import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true, // Ensure indexes are created in development & test
    });
    console.log(`[Database] MongoDB connected: ${conn.connection.host || 'local'}`);
    return conn;
  } catch (error) {
    console.error('[Database] MongoDB connection error:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
