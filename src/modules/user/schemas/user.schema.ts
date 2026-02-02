import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ClientProfile, ClientProfileSchema } from './roles/client.schema';
import {
  HandiemanProfile,
  HandiemanProfileSchema,
} from './roles/handieman.schema';
import { randomUUID } from 'crypto';

export type UserDocument = HydratedDocument<User>;

// Push token sub-schema
@Schema({ _id: false })
export class PushToken {
  @Prop({ required: true })
  token: string;

  @Prop({ required: true, enum: ['expo', 'fcm', 'apns'] })
  platform: string;

  @Prop({ default: null })
  deviceId: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  lastUsedAt: Date;
}

export const PushTokenSchema = SchemaFactory.createForClass(PushToken);

@Schema()
export class User {
  @Prop({
    type: String,
    default: () => randomUUID(),
    unique: true,
    index: true
  })
  id: string;

  @Prop({ required: true })
  first_name: string;

  @Prop({ required: true })
  last_name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, default: false })
  email_verified: boolean;

  @Prop({ default: 'inactive' })
  accountStatus: 'active' | 'inactive';

  @Prop({ nullable: true })
  emailVerifiedAt: Date;

  @Prop({ default: null })
  verificationToken: string;

  @Prop({ default: null })
  otp: string;

  @Prop({ default: null })
  otpExpiresAt: Date;

  @Prop({ default: null })
  expiresAt: Date;

  @Prop({ default: null })
  createdAt: Date;

  @Prop({ default: null })
  lastLogin: Date;

  @Prop({ required: true })
  registrationDate: Date;

  @Prop({
    required: true,
    enum: ['user', 'handieman', 'admin'],
    default: [],
    type: [String],
  })
  role: string[];

  @Prop({ type: ClientProfileSchema, default: null })
  clientProfile: ClientProfile;

  @Prop({ type: HandiemanProfileSchema, default: null })
  handiemanProfile: HandiemanProfile;

  // Push notification tokens
  @Prop({ type: [PushTokenSchema], default: [] })
  pushTokens: PushToken[];

  // Notification preferences
  @Prop({ default: true })
  notificationsEnabled: boolean;

  @Prop({
    type: Object,
    default: {
      orders: true,
      reviews: true,
      promotions: true,
      messages: true,
    },
  })
  notificationPreferences: {
    orders: boolean;
    reviews: boolean;
    promotions: boolean;
    messages: boolean;
  };
}

export const UserSchema = SchemaFactory.createForClass(User);
