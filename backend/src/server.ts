import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';

async function bootstrap() {
  try {
    await connectDatabase(env.MONGODB_URI);
    const app = createApp();

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 ScrollSense Backend API running at http://localhost:${env.PORT}${env.API_PREFIX}`);
      console.log(`Environment: ${env.NODE_ENV}`);
    });

    // Graceful Shutdown Handler
    const shutdown = async (signal: string) => {
      console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
      server.close(async () => {
        console.log('[Server] HTTP connections drained and closed.');
        try {
          await disconnectDatabase();
          console.log('[Database] MongoDB connection closed.');
          process.exit(0);
        } catch (err) {
          console.error('[Database] Error closing MongoDB connection:', err);
          process.exit(1);
        }
      });

      // Force process exit if graceful shutdown takes longer than 10 seconds
      setTimeout(() => {
        console.error('[Server] Graceful shutdown timed out (10s). Forcing termination.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Fatal error during server bootstrap:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}

