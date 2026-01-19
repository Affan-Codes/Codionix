import { z } from 'zod';

// ===================================
// VALIDATION SCHEMAS
// ===================================

/**
 * Send message schema
 */
export const sendMessageSchema = z.object({
  applicationId: z.uuid('Invalid application ID'),
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message cannot exceed 5000 characters')
    .trim()
    .transform((val) => {
      // Basic XSS prevention - strip HTML tags
      return val.replace(/<[^>]*>/g, '');
    }),
});

/**
 * List messages query schema
 */
export const listMessagesQuerySchema = z.object({
  applicationId: z.uuid('Invalid application ID'),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive())
    .default(1),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .pipe(z.number().int().positive().max(100))
    .default(50),
  includeDeleted: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .default(false),
});

/**
 * Mark message as read schema
 */
export const markReadSchema = z.object({
  messageId: z.uuid('Invalid message ID'),
});

/**
 * Delete message schema
 */
export const deleteMessageSchema = z.object({
  messageId: z.uuid('Invalid message ID'),
});

/**
 * Get unread count schema
 */
export const unreadCountSchema = z.object({
  applicationId: z.uuid('Invalid application ID').optional(),
});

/**
 * Application ID param schema
 */
export const applicationIdParamSchema = z.object({
  applicationId: z.uuid('Invalid application ID'),
});

// ===================================
// EXPORT TYPES
// ===================================

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;
export type DeleteMessageInput = z.infer<typeof deleteMessageSchema>;
export type UnreadCountInput = z.infer<typeof unreadCountSchema>;
export type ApplicationIdParam = z.infer<typeof applicationIdParamSchema>;