import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logExternalCall, logger } from '../utils/logger.js';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Initialize transporter SYNCHRONOUSLY
 */
const createTransporter = (): nodemailer.Transporter => {
  // Validate SMTP config exists
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn('SMTP credentials not configured', {
      operation: 'email.init',
      hasHost: !!env.SMTP_HOST,
      hasUser: !!env.SMTP_USER,
      hasPass: !!env.SMTP_PASS,
    });

    // Return mock transporter for development without SMTP
    return {
      sendMail: async (mailOptions: any) => {
        logger.info('Email not sent - no SMTP config', {
          operation: 'email.send',
          recipient: mailOptions.to,
          subject: mailOptions.subject,
          category: 'email',
        });
        return { messageId: 'mock-' + Date.now() };
      },
    } as any;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    // CRITICAL TIMEOUTS: Prevent hanging on SMTP issues
    connectionTimeout: 5000, // 5s max to connect
    greetingTimeout: 3000, // 3s max for server greeting
    socketTimeout: 10000, // 10s max for idle socket
  });
};

// Create transporter synchronously at module load
export const transporter = createTransporter();

// ===================================
// CORE EMAIL SENDER (BLOCKING)
// ===================================

/**
 * Send email synchronously (for queue processing)
 * THROWS on failure (queue will handle retry)
 */
export const sendEmailSync = async ({
  to,
  subject,
  html,
}: SendEmailParams): Promise<void> => {
  const startTime = Date.now();

  try {
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM || '"Codionix" <noreply@codionix.com>',
      to,
      subject,
      html,
    });

    const duration = Date.now() - startTime;

    logExternalCall('email', 'sendMail', duration, true, {
      recipient: to,
      subject,
      messageId: info.messageId,
      category: 'email',
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logExternalCall('email', 'sendMail', duration, false, {
      recipient: to,
      subject,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      category: 'email',
    });

    throw error;
  }
};
