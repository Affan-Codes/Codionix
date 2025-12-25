import 'dotenv/config';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import app from './app.js';
import { db } from './config/database.js';

const PORT = env.PORT;

// ===================================
// POOL MONITORING INTERVAL
// ===================================

let poolMonitoringInterval: NodeJS.Timeout | null = null;

/**
 * Monitor connection pool health
 * CRITICAL: Alerts you BEFORE pool exhaustion causes user-facing errors
 */
const startPoolMonitoring = () => {
  // Log pool stats every 60 seconds in production
  const interval = env.NODE_ENV === 'production' ? 60000 : 300000;

  poolMonitoringInterval = setInterval(() => {
    const stats = db.getPoolStats();

    // Warn if pool utilization is high
    const utilizationPercent = (stats.totalCount / stats.maxConnections) * 100;

    if (utilizationPercent >= 80) {
      logger.warn('⚠️  High database pool utilization', stats);
    } else if (utilizationPercent >= 90) {
      logger.error('🚨 CRITICAL: Database pool near exhaustion', stats);
    } else {
      logger.info('📊 Database pool status', stats);
    }

    // Warn if requests are waiting for connections
    if (stats.waitingCount > 0) {
      logger.warn(
        `⚠️  ${stats.waitingCount} requests waiting for database connections`,
        stats
      );
    }
  }, interval);

  logger.info('✅ Pool monitoring started', {
    interval: `${interval / 1000}s`,
  });
};

const stopPoolMonitoring = () => {
  if (poolMonitoringInterval) {
    clearInterval(poolMonitoringInterval);
    poolMonitoringInterval = null;
    logger.info('Pool monitoring stopped');
  }
};

// ===================================
// SERVER STARTUP
// ===================================

const startServer = async () => {
  try {
    // Connect to database with retry logic
    await db.connect();

    // Start pool monitoring
    startPoolMonitoring();

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`✅ Server running on http://localhost:${PORT}`);
      logger.info(`✅ Environment: ${env.NODE_ENV}`);
      logger.info(`✅ Health check: http://localhost:${PORT}/health`);
      logger.info(`✅ DB test: http://localhost:${PORT}/db-test`);
    });

    // ===================================
    // GRACEFUL SHUTDOWN
    // ===================================

    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} signal received: closing HTTP server`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Stop pool monitoring
          stopPoolMonitoring();

          // Close database connections
          // CRITICAL: Must happen AFTER server stops accepting requests
          await db.disconnect();

          logger.info('Graceful shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 15 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 15000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
