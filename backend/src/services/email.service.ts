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
const transporter = createTransporter();

// ===================================
// NON-BLOCKING EMAIL SENDER
// ===================================

/**
 * Send email in background (non-blocking)
 * CRITICAL: Uses setImmediate() to defer execution
 *
 * @returns void - Caller doesn't wait for result
 */
const sendEmailAsync = async ({
  to,
  subject,
  html,
}: SendEmailParams): Promise<void> => {
  // Defer to next tick of event loop
  setImmediate(async () => {
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

      // DO NOT throw - this is fire-and-forget
      // Email failure should not crash the app
      // User can click "resend verification" if needed
    }
  });
};

// ===================================
// PUBLIC API
// ===================================

/**
 * Send password reset email
 * Non-blocking - returns immediately
 */
export const sendPasswordResetEmail = (
  to: string,
  resetToken: string
): void => {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #2563eb; 
            color: #ffffff; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Reset Your Password</h1>
          <p>You requested to reset your password for your Codionix account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Codionix. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  sendEmailAsync({
    to,
    subject: 'Reset Your Password - Codionix',
    html,
  });
};

/**
 * Send email verification email
 * Non-blocking - returns immediately
 */
export const sendEmailVerification = (
  to: string,
  verificationToken: string
): void => {
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #16a34a; 
            color: white; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
          .warning { 
            background-color: #fef3c7; 
            border-left: 4px solid #f59e0b; 
            padding: 12px; 
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Welcome to Codionix! 🎉</h1>
          <p>Thank you for registering. Please verify your email address to unlock all features:</p>
          
          <ul>
            <li>Apply to projects and internships</li>
            <li>Create and manage your own projects</li>
            <li>Receive application notifications</li>
          </ul>

          <a href="${verifyUrl}" class="button">Verify Email Address</a>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-size: 12px;">${verifyUrl}</p>
          
          <div class="warning">
            <strong>⏰ This link expires in 24 hours.</strong>
            <br>
            If you didn't create an account, you can safely ignore this email.
          </div>

          <div class="footer">
            <p>Need help? Contact us at support@codionix.com</p>
            <p>© ${new Date().getFullYear()} Codionix. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  sendEmailAsync({
    to,
    subject: 'Welcome to Codionix - Verify Your Email',
    html,
  });
};
