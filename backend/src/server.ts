import 'dotenv/config';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import app from './app.js';
import { db } from './config/database.js';
import * as requestTracker from './middleware/requestTracker.js';
import {
  startEmailQueue,
  stopEmailQueue,
} from './services/emailQueue.service.js';

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

    // Start email queue
    startEmailQueue();

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`✅ Server running on http://localhost:${PORT}`);
      logger.info(`✅ Environment: ${env.NODE_ENV}`);
      logger.info(`✅ Health check: http://localhost:${PORT}/health`);
      logger.info(`✅ DB test: http://localhost:${PORT}/db-test`);
    });

    // ===================================
    // GRACEFUL SHUTDOWN WITH CONNECTION DRAINING
    // ===================================

    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} signal received: starting graceful shutdown`, {
        category: 'shutdown',
      });

      const shutdownStartTime = Date.now();

      server.close(() => {
        logger.info('HTTP server stopped accepting new connections', {
          category: 'shutdown',
        });
      });

      // New requests will get 503 "Service Unavailable"
      requestTracker.startShutdown();

      try {
        const activeRequests = requestTracker.getActiveCount();

        if (activeRequests > 0) {
          logger.info('Draining active requests...', {
            activeRequests,
            category: 'shutdown',
          });

          // Wait up to 30 seconds for requests to finish
          await requestTracker.waitForDrain(30000);
        }

        await stopEmailQueue();

        stopPoolMonitoring();

        await db.disconnect();

        const shutdownDuration = Date.now() - shutdownStartTime;

        logger.info('Graceful shutdown complete', {
          shutdownDuration: `${shutdownDuration}ms`,
          category: 'shutdown',
        });

        process.exit(0);
      } catch (error) {
        const shutdownDuration = Date.now() - shutdownStartTime;

        logger.error('Error during shutdown', {
          error: error instanceof Error ? error.message : 'Unknown error',
          shutdownDuration: `${shutdownDuration}ms`,
          category: 'shutdown',
        });

        // Force stop email queue
        await stopEmailQueue();

        // Force cleanup
        stopPoolMonitoring();

        try {
          await db.disconnect();
        } catch (dbError) {
          logger.error('Failed to disconnect database during error recovery', {
            error: dbError instanceof Error ? dbError.message : 'Unknown error',
          });
        }

        process.exit(1);
      }
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
