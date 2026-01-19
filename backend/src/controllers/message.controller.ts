import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import * as messagingService from '../services/messaging.service.js';
import {
  listMessagesQuerySchema,
  markReadSchema,
  deleteMessageSchema,
  unreadCountSchema,
} from '../validators/message.validator.js';

/**
 * List messages in an application
 * GET /api/v1/messages
 */
export const listMessages = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const query = listMessagesQuerySchema.parse(req.query);

    const result = await messagingService.listMessages(userId, query);

    ApiResponse.success(res, result);
  }
);

/**
 * Mark message as read
 * PATCH /api/v1/messages/:messageId/read
 */
export const markMessageAsRead = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { messageId } = markReadSchema.parse(req.params);

    const message = await messagingService.markMessageAsRead(userId, messageId);

    ApiResponse.success(res, message);
  }
);

/**
 * Delete message
 * DELETE /api/v1/messages/:messageId
 */
export const deleteMessage = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { messageId } = deleteMessageSchema.parse(req.params);

    await messagingService.deleteMessage(userId, messageId);

    ApiResponse.success(res, { message: 'Message deleted successfully' });
  }
);

/**
 * Get unread message count
 * GET /api/v1/messages/unread-count
 */
export const getUnreadCount = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { applicationId } = unreadCountSchema.parse(req.query);

    const result = await messagingService.getUnreadCount(userId, applicationId);

    ApiResponse.success(res, result);
  }
);
