import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { User } from 'src/modules/user/schemas/user.schema';

export type AddressDocument = HydratedDocument<Address>;

@Schema({ timestamps: true })
export class Address {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ required: true })
  label: string; // e.g., "Home", "Office", "Work"

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  state: string;

  @Prop({ default: 'Nigeria' })
  country: string;

  @Prop()
  postalCode: string;

  @Prop()
  additionalInfo: string; // Landmark, directions, etc.

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

// Indexes
AddressSchema.index({ user: 1 });
AddressSchema.index({ user: 1, isDefault: 1 });
