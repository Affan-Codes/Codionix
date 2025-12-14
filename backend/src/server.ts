import 'dotenv/config';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import app from './app.js';
import { db } from './config/database.js';

const PORT = env.PORT;

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await db.connect();

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`✅ Server running on http://localhost:${PORT}`);
      logger.info(`✅ Environment: ${env.NODE_ENV}`);
      logger.info(`✅ Health check: http://localhost:${PORT}/health`);
      logger.info(`✅ DB test: http://localhost:${PORT}/db-test`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} signal received: closing HTTP server`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await db.disconnect();
          logger.info('Database connection closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
