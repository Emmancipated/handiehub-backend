import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ClientProfile, ClientProfileSchema } from './roles/client.schema';
import {
  HandiemanProfile,
  HandiemanProfileSchema,
} from './roles/handieman.schema';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ required: true, unique: true })
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
}

export const UserSchema = SchemaFactory.createForClass(User);
