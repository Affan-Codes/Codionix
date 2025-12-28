import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().default('5000').transform(Number),
  API_VERSION: z.string().default('v1'),

  // Database
  DATABASE_URL: z.string().min(1, 'Database URL is required'),

  // Database Connection Pool
  DB_POOL_MAX: z
    .string()
    .default('20')
    .transform(Number)
    .refine((val) => val > 0 && val <= 100, {
      message: 'DB_POOL_MAX must be between 1 and 100',
    }),
  DB_POOL_MIN: z
    .string()
    .default('2')
    .transform(Number)
    .refine((val) => val >= 0, {
      message: 'DB_POOL_MIN must be >= 0',
    }),
  DB_IDLE_TIMEOUT_MS: z
    .string()
    .default('30000')
    .transform(Number)
    .refine((val) => val >= 1000, {
      message: 'DB_IDLE_TIMEOUT_MS must be at least 1000ms',
    }),
  DB_CONNECTION_TIMEOUT_MS: z
    .string()
    .default('10000')
    .transform(Number)
    .refine((val) => val >= 1000, {
      message: 'DB_CONNECTION_TIMEOUT_MS must be at least 1000ms',
    }),

  // Database Query Timeouts
  DB_QUERY_TIMEOUT_MS: z
    .string()
    .default('10000')
    .transform(Number)
    .refine((val) => val >= 1000 && val <= 60000, {
      message: 'DB_QUERY_TIMEOUT_MS must be between 1000ms and 60000ms',
    }),
  DB_TRANSACTION_TIMEOUT_MS: z
    .string()
    .default('15000')
    .transform(Number)
    .refine((val) => val >= 1000 && val <= 60000, {
      message: 'DB_TRANSACTION_TIMEOUT_MS must be between 1000ms and 60000ms',
    }),
  DB_SLOW_QUERY_THRESHOLD_MS: z
    .string()
    .default('1000')
    .transform(Number)
    .refine((val) => val >= 100, {
      message: 'DB_SLOW_QUERY_THRESHOLD_MS must be at least 100ms',
    }),

  // JWT
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT Access Secret must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT Refresh Secret must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Frontend
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Email (SMTP)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 587)),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

// Validate and export
const parseEnv = () => {
  try {
    const parsed = envSchema.parse(process.env);

    // CRITICAL VALIDATION: Ensure min <= max
    if (parsed.DB_POOL_MIN > parsed.DB_POOL_MAX) {
      console.error(
        '❌ Invalid pool configuration: DB_POOL_MIN cannot exceed DB_POOL_MAX'
      );
      console.error(`  DB_POOL_MIN: ${parsed.DB_POOL_MIN}`);
      console.error(`  DB_POOL_MAX: ${parsed.DB_POOL_MAX}`);
      process.exit(1);
    }

    return parsed;
  } catch (error) {
    console.error('❌ Invalid environment variables:');
    if (error instanceof z.ZodError) {
      error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      });
    }
    process.exit(1);
  }
};

export const env = parseEnv();
