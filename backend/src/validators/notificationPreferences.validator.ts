import { z } from 'zod';

/**
 * Validation schema for updating notification preferences
 */
export const updateNotificationPreferencesSchema = z.object({
  notifyOnApplicationReceived: z.boolean().optional(),
  notifyOnApplicationStatus: z.boolean().optional(),
  notifyOnDeadlineReminder: z.boolean().optional(),
  notifyOnWeeklyDigest: z.boolean().optional(),
  notifyOnNewMessage: z.boolean().optional(),
});

// Export type
export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
