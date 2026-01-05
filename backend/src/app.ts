import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.routes.js';
import { requestCorrelation } from './middleware/requestLogger.js';
import { responseLogger } from './middleware/responseLogger.js';
import { requestTrackerMiddleware } from './middleware/requestTracker.js';

const app = express();

// This ensures every request has a correlation ID
app.use(requestCorrelation);

// Track active requests for graceful shutdown
app.use(requestTrackerMiddleware);

// Intercepts response to log outgoing data
app.use(responseLogger);

// Security middleware
app.use(helmet());

// CORS
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    exposedHeaders: ['X-Correlation-ID'], // Allow client to read correlation ID
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Rate limiting
const generalApilimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS, // 15 minutes
  max: env.RATE_LIMIT_MAX_REQUESTS * 2, // 200 (was 100, doubled for safety)
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip auth routes (they have their own limiters)
  skip: (req) => req.path.startsWith('/v1/auth'),
});

app.use('/api', generalApilimiter);

// API routes
app.use(`/api/${env.API_VERSION}`, routes);

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
