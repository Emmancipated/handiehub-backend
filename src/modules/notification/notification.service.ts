import {
  Injectable,
  Logger,
  NotFoundException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import axios from 'axios';
import { Notification, NotificationType } from './schema/notification.schema';
import { User } from '../user/schemas/user.schema';
import {
  RegisterPushTokenDto,
  SendPushNotificationDto,
  UpdateNotificationPreferencesDto,
} from './dto/notification.dto';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;
}

interface ExpoPushTicket {
  id?: string;
  status: 'ok' | 'error';
  message?: string;
  details?: {
    error?: string;
  };
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  /**
   * Register a push token for a user
   */
  async registerPushToken(userId: string, dto: RegisterPushTokenDto): Promise<any> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if token already exists
      const existingTokenIndex = user.pushTokens?.findIndex(
        (t) => t.token === dto.token,
      );

      if (existingTokenIndex !== undefined && existingTokenIndex >= 0) {
        // Update existing token
        user.pushTokens[existingTokenIndex].lastUsedAt = new Date();
        if (dto.deviceId) {
          user.pushTokens[existingTokenIndex].deviceId = dto.deviceId;
        }
      } else {
        // Add new token
        if (!user.pushTokens) {
          user.pushTokens = [];
        }
        user.pushTokens.push({
          token: dto.token,
          platform: dto.platform || 'expo',
          deviceId: dto.deviceId || null,
          createdAt: new Date(),
          lastUsedAt: new Date(),
        });
      }

      await user.save();
      this.logger.log(`Push token registered for user ${userId}`);

      return {
        statusCode: HttpStatus.OK,
        message: 'Push token registered successfully',
      };
    } catch (error) {
      this.logger.error('Error registering push token', error.stack);
      throw error;
    }
  }

  /**
   * Unregister a push token
   */
  async unregisterPushToken(userId: string, token: string): Promise<any> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      user.pushTokens = user.pushTokens?.filter((t) => t.token !== token) || [];
      await user.save();

      this.logger.log(`Push token unregistered for user ${userId}`);

      return {
        statusCode: HttpStatus.OK,
        message: 'Push token unregistered successfully',
      };
    } catch (error) {
      this.logger.error('Error unregistering push token', error.stack);
      throw error;
    }
  }

  /**
   * Send push notification to a user
   */
  async sendPushNotification(dto: SendPushNotificationDto): Promise<any> {
    try {
      const user = await this.userModel.findById(dto.userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if notifications are enabled
      if (!user.notificationsEnabled) {
        this.logger.log(`Notifications disabled for user ${dto.userId}`);
        return { statusCode: HttpStatus.OK, message: 'Notifications disabled for user' };
      }

      // Check notification preferences based on type
      const type = dto.type as NotificationType;
      if (type && user.notificationPreferences) {
        if (
          (type.includes('order') && !user.notificationPreferences.orders) ||
          (type.includes('review') && !user.notificationPreferences.reviews) ||
          (type === 'promotion' && !user.notificationPreferences.promotions) ||
          (type === 'new_message' && !user.notificationPreferences.messages)
        ) {
          this.logger.log(`Notification type ${type} disabled for user ${dto.userId}`);
          return { statusCode: HttpStatus.OK, message: 'Notification type disabled' };
        }
      }

      // Create notification record in database
      const notification = new this.notificationModel({
        user: new Types.ObjectId(dto.userId),
        title: dto.title,
        body: dto.body,
        type: dto.type || 'system',
        data: dto.data || {},
        imageUrl: dto.imageUrl,
        actionUrl: dto.actionUrl,
      });

      await notification.save();

      // Send push notification to all user's devices
      const tokens = user.pushTokens?.map((t) => t.token).filter(Boolean) || [];

      this.logger.log(`User ${dto.userId} has ${tokens.length} push token(s)`);

      if (tokens.length === 0) {
        this.logger.log(`No push tokens for user ${dto.userId}`);
        return {
          statusCode: HttpStatus.OK,
          message: 'Notification saved but no push tokens available',
          data: { notificationId: notification._id },
        };
      }

      // Send to Expo Push API
      const results = await this.sendToExpoPush(tokens, {
        title: dto.title,
        body: dto.body,
        data: {
          ...dto.data,
          notificationId: notification._id.toString(),
          type: dto.type,
          actionUrl: dto.actionUrl,
        },
      });

      // Update notification as sent
      notification.isPushSent = true;
      notification.pushSentAt = new Date();
      await notification.save();

      // Handle failed tokens (remove invalid ones)
      await this.handlePushResults(user._id.toString(), tokens, results);

      return {
        statusCode: HttpStatus.OK,
        message: 'Notification sent successfully',
        data: { notificationId: notification._id },
      };
    } catch (error) {
      this.logger.error('Error sending push notification', error.stack);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendBulkNotification(
    userIds: string[],
    title: string,
    body: string,
    type: NotificationType = 'system',
    data?: Record<string, any>,
  ): Promise<any> {
    const results = await Promise.allSettled(
      userIds.map((userId) =>
        this.sendPushNotification({
          userId,
          title,
          body,
          type,
          data,
        }),
      ),
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return {
      statusCode: HttpStatus.OK,
      message: `Bulk notification sent: ${successful} successful, ${failed} failed`,
      data: { successful, failed },
    };
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<any> {
    try {
      const skip = (page - 1) * limit;

      const [notifications, total, unreadCount] = await Promise.all([
        this.notificationModel
          .find({ user: new Types.ObjectId(userId) })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.notificationModel.countDocuments({ user: new Types.ObjectId(userId) }),
        this.notificationModel.countDocuments({
          user: new Types.ObjectId(userId),
          isRead: false,
        }),
      ]);

      return {
        statusCode: HttpStatus.OK,
        data: {
          notifications,
          unreadCount,
        },
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Error fetching notifications', error.stack);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<any> {
    try {
      const notification = await this.notificationModel.findOneAndUpdate(
        {
          _id: new Types.ObjectId(notificationId),
          user: new Types.ObjectId(userId),
        },
        {
          isRead: true,
          readAt: new Date(),
        },
        { new: true },
      );

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Notification marked as read',
      };
    } catch (error) {
      this.logger.error('Error marking notification as read', error.stack);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<any> {
    try {
      await this.notificationModel.updateMany(
        {
          user: new Types.ObjectId(userId),
          isRead: false,
        },
        {
          isRead: true,
          readAt: new Date(),
        },
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'All notifications marked as read',
      };
    } catch (error) {
      this.logger.error('Error marking all notifications as read', error.stack);
      throw error;
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<any> {
    try {
      const count = await this.notificationModel.countDocuments({
        user: new Types.ObjectId(userId),
        isRead: false,
      });

      return {
        statusCode: HttpStatus.OK,
        data: { count },
      };
    } catch (error) {
      this.logger.error('Error getting unread count', error.stack);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<any> {
    try {
      const updateData: any = {};

      if (dto.notificationsEnabled !== undefined) {
        updateData.notificationsEnabled = dto.notificationsEnabled;
      }

      if (dto.orders !== undefined) {
        updateData['notificationPreferences.orders'] = dto.orders;
      }
      if (dto.reviews !== undefined) {
        updateData['notificationPreferences.reviews'] = dto.reviews;
      }
      if (dto.promotions !== undefined) {
        updateData['notificationPreferences.promotions'] = dto.promotions;
      }
      if (dto.messages !== undefined) {
        updateData['notificationPreferences.messages'] = dto.messages;
      }

      const user = await this.userModel.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true },
      );

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Notification preferences updated',
        data: {
          notificationsEnabled: user.notificationsEnabled,
          preferences: user.notificationPreferences,
        },
      };
    } catch (error) {
      this.logger.error('Error updating notification preferences', error.stack);
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(userId: string): Promise<any> {
    try {
      const user = await this.userModel.findById(userId).select('notificationsEnabled notificationPreferences pushTokens');

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        statusCode: HttpStatus.OK,
        data: {
          notificationsEnabled: user.notificationsEnabled ?? true,
          preferences: user.notificationPreferences ?? {
            orders: true,
            reviews: true,
            promotions: true,
            messages: true,
          },
          hasDeviceToken: (user.pushTokens?.length || 0) > 0,
        },
      };
    } catch (error) {
      this.logger.error('Error getting notification preferences', error.stack);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<any> {
    try {
      const result = await this.notificationModel.deleteOne({
        _id: new Types.ObjectId(notificationId),
        user: new Types.ObjectId(userId),
      });

      if (result.deletedCount === 0) {
        throw new NotFoundException('Notification not found');
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Notification deleted',
      };
    } catch (error) {
      this.logger.error('Error deleting notification', error.stack);
      throw error;
    }
  }

  /**
   * Clear all notifications for a user
   */
  async clearAllNotifications(userId: string): Promise<any> {
    try {
      await this.notificationModel.deleteMany({
        user: new Types.ObjectId(userId),
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'All notifications cleared',
      };
    } catch (error) {
      this.logger.error('Error clearing notifications', error.stack);
      throw error;
    }
  }

  // ==================== Helper Methods ====================

  /**
   * Send messages to Expo Push API
   */
  private async sendToExpoPush(
    tokens: string[],
    message: { title: string; body: string; data?: Record<string, any> },
  ): Promise<ExpoPushTicket[]> {
    const messages: ExpoPushMessage[] = tokens.map((token) => ({
      to: token,
      title: message.title,
      body: message.body,
      data: message.data,
      sound: 'default',
      priority: 'high',
      channelId: 'default',
    }));

    this.logger.log(`Sending push to ${tokens.length} token(s): ${JSON.stringify(messages.map(m => ({ to: m.to.slice(0, 20) + '...', title: m.title })))}`);

    try {
      const response = await axios.post<{ data: ExpoPushTicket[] }>(
        this.EXPO_PUSH_URL,
        messages,
        {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Expo Push API response: ${JSON.stringify(response.data.data)}`);
      return response.data.data;
    } catch (error) {
      this.logger.error('Error sending to Expo Push API', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Handle push results and remove invalid tokens
   */
  private async handlePushResults(
    userId: string,
    tokens: string[],
    results: ExpoPushTicket[],
  ): Promise<void> {
    const invalidTokens: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'error') {
        const error = result.details?.error;
        if (
          error === 'DeviceNotRegistered' ||
          error === 'InvalidCredentials'
        ) {
          invalidTokens.push(tokens[index]);
          this.logger.warn(`Invalid token for user ${userId}: ${tokens[index]}`);
        }
      }
    });

    // Remove invalid tokens
    if (invalidTokens.length > 0) {
      await this.userModel.findByIdAndUpdate(userId, {
        $pull: {
          pushTokens: { token: { $in: invalidTokens } },
        },
      });
      this.logger.log(`Removed ${invalidTokens.length} invalid tokens for user ${userId}`);
    }
  }

  // ==================== Event-based notification helpers ====================

  /**
   * Send order notification
   */
  async sendOrderNotification(
    userId: string,
    type: NotificationType,
    orderData: { orderId: string; orderNumber: string; productName?: string; amount?: number },
  ): Promise<void> {
    const titles: Record<string, string> = {
      order_created: 'Order Placed Successfully',
      order_confirmed: 'Order Confirmed',
      order_shipped: 'Order Shipped',
      order_delivered: 'Order Delivered',
      order_completed: 'Order Completed',
      order_cancelled: 'Order Cancelled',
    };

    const bodies: Record<string, string> = {
      order_created: `Your order #${orderData.orderNumber} has been placed successfully.`,
      order_confirmed: `Your order #${orderData.orderNumber} has been confirmed by the seller.`,
      order_shipped: `Your order #${orderData.orderNumber} has been shipped.`,
      order_delivered: `Your order #${orderData.orderNumber} has been delivered.`,
      order_completed: `Your order #${orderData.orderNumber} is now complete. Please leave a review!`,
      order_cancelled: `Your order #${orderData.orderNumber} has been cancelled.`,
    };

    await this.sendPushNotification({
      userId,
      title: titles[type] || 'Order Update',
      body: bodies[type] || `Order #${orderData.orderNumber} status updated.`,
      type,
      data: orderData,
      actionUrl: `/order/${orderData.orderId}`,
    });
  }

  /**
   * Send review notification to seller
   */
  async sendReviewNotification(
    sellerId: string,
    reviewerName: string,
    productName: string,
    rating: number,
  ): Promise<void> {
    await this.sendPushNotification({
      userId: sellerId,
      title: 'New Review Received',
      body: `${reviewerName} left a ${rating}-star review on "${productName}"`,
      type: 'new_review',
      data: { productName, rating, reviewerName },
    });
  }

  /**
   * Send payment notification
   */
  async sendPaymentNotification(
    userId: string,
    type: 'payment_received' | 'payment_released',
    amount: number,
    orderId: string,
  ): Promise<void> {
    const title = type === 'payment_received' ? 'Payment Received' : 'Payment Released';
    const body =
      type === 'payment_received'
        ? `Payment of ₦${amount.toLocaleString()} received for your order.`
        : `₦${amount.toLocaleString()} has been released to your wallet.`;

    await this.sendPushNotification({
      userId,
      title,
      body,
      type,
      data: { amount, orderId },
    });
  }
}
