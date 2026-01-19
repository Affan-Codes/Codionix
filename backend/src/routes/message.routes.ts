import { Router } from 'express';
import * as messageController from '../controllers/message.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateQuery, validateParams } from '../middleware/validate.js';
import {
  listMessagesQuerySchema,
  markReadSchema,
  deleteMessageSchema,
  unreadCountSchema,
} from '../validators/message.validator.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// ===================================
// RATE LIMITERS
// ===================================

/**
 * Message HTTP endpoints rate limiter
 * Separate from Socket.io rate limits
 */
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===================================
// ROUTES
// ===================================

/**
 * @route   GET /api/v1/messages
 * @desc    List messages in an application (with pagination)
 * @access  Protected (participants only)
 * @query   applicationId, page, limit, includeDeleted
 */
router.get(
  '/',
  authenticate,
  messageLimiter,
  validateQuery(listMessagesQuerySchema),
  messageController.listMessages
);

/**
 * @route   GET /api/v1/messages/unread-count
 * @desc    Get unread message count (all or for specific application)
 * @access  Protected
 * @query   applicationId (optional)
 */
router.get(
  '/unread-count',
  authenticate,
  messageLimiter,
  validateQuery(unreadCountSchema),
  messageController.getUnreadCount
);

/**
 * @route   PATCH /api/v1/messages/:messageId/read
 * @desc    Mark message as read
 * @access  Protected (recipient only)
 */
router.patch(
  '/:messageId/read',
  authenticate,
  messageLimiter,
  validateParams(markReadSchema),
  messageController.markMessageAsRead
);

/**
 * @route   DELETE /api/v1/messages/:messageId
 * @desc    Delete message (soft delete)
 * @access  Protected (sender only)
 */
router.delete(
  '/:messageId',
  authenticate,
  messageLimiter,
  validateParams(deleteMessageSchema),
  messageController.deleteMessage
);

export default router;
