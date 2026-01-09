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

// ===================================
// NON-BLOCKING EMAIL SENDER
// ===================================

const sendEmailAsync = async ({
  to,
  subject,
  html,
}: SendEmailParams): Promise<void> => {
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
    }
  });
};

// ===================================
// EMAIL TEMPLATES
// ===================================

/**
 * Send password reset email (Non-blocking)
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
 * Send email verification email (Non-blocking)
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

/**
 * Send application status change email (BLOCKING for queue)
 */
export const sendApplicationStatusEmail = async (
  to: string,
  recipientName: string,
  projectTitle: string,
  status: 'ACCEPTED' | 'REJECTED' | 'UNDER_REVIEW',
  rejectionReason?: string
): Promise<void> => {
  const statusConfig = {
    ACCEPTED: {
      emoji: '🎉',
      color: '#16a34a',
      title: 'Congratulations! Your Application Was Accepted',
      message: `Great news! Your application for "${projectTitle}" has been accepted.`,
      cta: 'The project owner will contact you soon with next steps.',
    },
    REJECTED: {
      emoji: '💭',
      color: '#dc2626',
      title: 'Application Update',
      message: `Thank you for your interest in "${projectTitle}". Unfortunately, your application was not selected at this time.`,
      cta: 'Keep exploring other opportunities on Codionix!',
    },
    UNDER_REVIEW: {
      emoji: '👀',
      color: '#2563eb',
      title: 'Your Application is Under Review',
      message: `The project owner is reviewing your application for "${projectTitle}".`,
      cta: "We'll notify you once a decision is made.",
    },
  };

  const config = statusConfig[status];
  const dashboardUrl = `${env.FRONTEND_URL}/applications`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px; background-color: ${config.color}; color: white; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: ${config.color}; 
            color: white; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
          }
          .feedback-box {
            background-color: #fef2f2;
            border-left: 4px solid #dc2626;
            padding: 15px;
            margin: 20px 0;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">${config.emoji} ${config.title}</h1>
          </div>
          
          <div class="content">
            <p>Hi ${recipientName},</p>
            
            <p>${config.message}</p>
            
            ${
              status === 'REJECTED' && rejectionReason
                ? `
              <div class="feedback-box">
                <p style="margin: 0 0 10px 0;"><strong>Feedback from the project owner:</strong></p>
                <p style="margin: 0;">${rejectionReason}</p>
              </div>
            `
                : ''
            }
            
            <p>${config.cta}</p>
            
            <div style="text-align: center;">
              <a href="${dashboardUrl}" class="button">View My Applications</a>
            </div>
            
            ${
              status === 'REJECTED'
                ? `
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                💡 <strong>Keep going!</strong> Every application is a learning opportunity. 
                Review the feedback, update your profile, and apply to other projects.
              </p>
            `
                : ''
            }
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Codionix. All rights reserved.</p>
            <p>You received this email because your application status changed.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmailSync({
    to,
    subject: `${config.emoji} Application Update: ${projectTitle}`,
    html,
  });
};
