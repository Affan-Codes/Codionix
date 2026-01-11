/**
 * Email Configuration
 * Centralized email preferences and notification settings
 */

export const EMAIL_CONFIG = {
  // Notification types
  NOTIFICATIONS: {
    WELCOME: 'welcome',
    APPLICATION_RECEIVED: 'application_received',
    APPLICATION_STATUS: 'application_status',
    DEADLINE_REMINDER: 'deadline_reminder',
    WEEKLY_DIGEST: 'weekly_digest',
  },

  // Timing rules (in milliseconds)
  TIMING: {
    // Send welcome email immediately after verification
    WELCOME_DELAY: 0,

    // Send application alert within 2 minutes
    APPLICATION_ALERT_DELAY: 2 * 60 * 1000,

    // Send deadline reminders
    DEADLINE_REMINDERS: [
      { days: 7, label: '7 days before' },
      { days: 3, label: '3 days before' },
      { days: 1, label: '1 day before' },
    ],

    // Weekly digest: Sunday 9 AM
    WEEKLY_DIGEST_DAY: 0, // 0 = Sunday
    WEEKLY_DIGEST_HOUR: 9,
  },

  // Email sending limits (anti-spam)
  LIMITS: {
    // Max emails per user per day
    MAX_PER_USER_PER_DAY: 10,

    // Max same notification type per user per day
    MAX_SAME_TYPE_PER_DAY: 3,

    // Cooldown between similar notifications (1 hour)
    NOTIFICATION_COOLDOWN_MS: 60 * 60 * 1000,
  },

  // Feature flags
  FEATURES: {
    WELCOME_EMAIL: true,
    APPLICATION_ALERTS: true,
    STATUS_UPDATES: true,
    DEADLINE_REMINDERS: true,
    WEEKLY_DIGEST: false, // Disabled for now
  },
} as const;

export type NotificationType = keyof typeof EMAIL_CONFIG.NOTIFICATIONS;
