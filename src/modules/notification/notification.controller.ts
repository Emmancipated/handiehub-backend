import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import {
  RegisterPushTokenDto,
  UnregisterPushTokenDto,
  UpdateNotificationPreferencesDto,
} from './dto/notification.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Register push token for the current user
   */
  @Post('token')
  registerPushToken(@Request() req: any, @Body() dto: RegisterPushTokenDto) {
    return this.notificationService.registerPushToken(req.user.userId, dto);
  }

  /**
   * Unregister push token
   */
  @Delete('token')
  unregisterPushToken(@Request() req: any, @Body() dto: UnregisterPushTokenDto) {
    return this.notificationService.unregisterPushToken(req.user.userId, dto.token);
  }

  /**
   * Get all notifications for current user
   */
  @Get()
  getNotifications(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.notificationService.getUserNotifications(
      req.user.userId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  /**
   * Get unread notification count
   */
  @Get('unread-count')
  getUnreadCount(@Request() req: any) {
    return this.notificationService.getUnreadCount(req.user.userId);
  }

  /**
   * Get notification preferences
   */
  @Get('preferences')
  getPreferences(@Request() req: any) {
    return this.notificationService.getNotificationPreferences(req.user.userId);
  }

  /**
   * Update notification preferences
   */
  @Patch('preferences')
  updatePreferences(
    @Request() req: any,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationService.updateNotificationPreferences(
      req.user.userId,
      dto,
    );
  }

  /**
   * Mark notification as read
   */
  @Patch(':id/read')
  markAsRead(@Request() req: any, @Param('id') notificationId: string) {
    return this.notificationService.markAsRead(req.user.userId, notificationId);
  }

  /**
   * Mark all notifications as read
   */
  @Patch('read-all')
  markAllAsRead(@Request() req: any) {
    return this.notificationService.markAllAsRead(req.user.userId);
  }

  /**
   * Delete a specific notification
   */
  @Delete(':id')
  deleteNotification(@Request() req: any, @Param('id') notificationId: string) {
    return this.notificationService.deleteNotification(req.user.userId, notificationId);
  }

  /**
   * Clear all notifications
   */
  @Delete()
  clearAllNotifications(@Request() req: any) {
    return this.notificationService.clearAllNotifications(req.user.userId);
  }
}
