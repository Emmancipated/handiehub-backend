import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { User } from 'src/modules/user/schemas/user.schema';

export type WalletDocument = HydratedDocument<Wallet>;

@Schema({ timestamps: true })
export class Wallet {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true })
  user: User;

  // Available balance - money that can be withdrawn
  @Prop({ type: Number, default: 0 })
  availableBalance: number;

  // Escrow balance - money held pending order completion + 5 days
  @Prop({ type: Number, default: 0 })
  escrowBalance: number;

  // Total lifetime earnings
  @Prop({ type: Number, default: 0 })
  totalEarnings: number;

  // Total amount withdrawn
  @Prop({ type: Number, default: 0 })
  totalWithdrawn: number;

  // Currency (for future multi-currency support)
  @Prop({ type: String, default: 'NGN' })
  currency: string;

  // Wallet status
  @Prop({ 
    type: String, 
    enum: ['active', 'suspended', 'frozen'],
    default: 'active'
  })
  status: string;

  // Last activity timestamp
  @Prop({ type: Date })
  lastActivityAt: Date;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);

// Index for faster lookups
WalletSchema.index({ user: 1 });
