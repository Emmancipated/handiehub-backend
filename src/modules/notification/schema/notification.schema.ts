import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';
import { User } from 'src/modules/user/schemas/user.schema';

export type NotificationDocument = HydratedDocument<Notification>;

export type NotificationType =
  | 'order_created'
  | 'order_confirmed'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_completed'
  | 'order_cancelled'
  | 'new_review'
  | 'review_response'
  | 'payment_received'
  | 'payment_released'
  | 'new_message'
  | 'promotion'
  | 'system';

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true })
  user: User;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({
    required: true,
    enum: [
      'order_created',
      'order_confirmed',
      'order_shipped',
      'order_delivered',
      'order_completed',
      'order_cancelled',
      'new_review',
      'review_response',
      'payment_received',
      'payment_released',
      'new_message',
      'promotion',
      'system',
    ],
  })
  type: NotificationType;

  @Prop({ type: Object, default: {} })
  data: Record<string, any>; // Additional data like orderId, productId, etc.

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: null })
  readAt: Date;

  @Prop({ default: false })
  isPushSent: boolean;

  @Prop({ default: null })
  pushSentAt: Date;

  @Prop({ type: String, default: null })
  imageUrl: string;

  @Prop({ type: String, default: null })
  actionUrl: string; // Deep link URL for navigation
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Indexes
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, isRead: 1 });
NotificationSchema.index({ type: 1 });
