import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

// Initialize transporter once at module load
let transporter: nodemailer.Transporter;

const initializeTransporter = async () => {
  if (env.NODE_ENV === 'production') {
    // Production: Use real SMTP service
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  } else {
    // Development: Use Ethereal (fake SMTP for testing)
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      logger.info('Email service initialized with Ethereal test account');
      logger.info(`Preview URL: https://ethereal.email/messages`);
    } catch (error) {
      logger.error('Failed to create test email account:', error);
      throw error;
    }
  }
};

// Initialize on module load
initializeTransporter();

/**
 * Send email via configured transporter
 */
const sendEmail = async ({
  to,
  subject,
  html,
}: SendEmailParams): Promise<void> => {
  try {
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM || '"Codionix" <noreply@codionix.com>',
      to,
      subject,
      html,
    });

    if (env.NODE_ENV === 'development') {
      logger.info('Email sent (test mode)');
      logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    } else {
      logger.info(`Email sent to ${to}: ${info.messageId}`);
    }
  } catch (error) {
    logger.error('Email send failed:', error);
    throw error;
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
  to: string,
  resetToken: string
): Promise<void> => {
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
            color: white; 
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

  await sendEmail({
    to,
    subject: 'Reset Your Password - Codionix',
    html,
  });
};

/**
 * Send email verification email
 */
export const sendEmailVerification = async (
  to: string,
  verificationToken: string
): Promise<void> => {
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
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Verify Your Email</h1>
          <p>Welcome to Codionix! Please verify your email address to get started.</p>
          <a href="${verifyUrl}" class="button">Verify Email</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${verifyUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Codionix. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to,
    subject: 'Verify Your Email - Codionix',
    html,
  });
};
