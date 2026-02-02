import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { User } from 'src/modules/user/schemas/user.schema';
import { Order } from 'src/modules/orders/schema/order.schema';

export type EscrowTransactionDocument = HydratedDocument<EscrowTransaction>;

@Schema({ timestamps: true })
export class EscrowTransaction {
  @Prop({ type: String, required: true, unique: true })
  transactionId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true })
  order: Order;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  seller: User; // The handieman who will receive the funds

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  buyer: User; // The customer who made the payment

  @Prop({ type: Number, required: true })
  amount: number;

  // Platform fee (if any) - can be implemented later
  @Prop({ type: Number, default: 0 })
  platformFee: number;

  // Net amount to be released to seller
  @Prop({ type: Number, required: true })
  netAmount: number;

  @Prop({ type: String })
  paymentReference: string;

  // Status of the escrow transaction
  @Prop({
    type: String,
    enum: [
      'held',           // Funds are in escrow
      'pending_release', // Order completed, waiting for 5-day release
      'released',       // Funds released to seller wallet
      'refunded',       // Funds returned to buyer
      'disputed',       // Under dispute/arbitration
    ],
    default: 'held',
  })
  status: string;

  // When the order was completed (starts the 5-day countdown)
  @Prop({ type: Date })
  orderCompletedAt: Date;

  // When the funds will be/were released
  @Prop({ type: Date })
  releaseDate: Date;

  // When the funds were actually released
  @Prop({ type: Date })
  releasedAt: Date;

  // Notes/reason for status changes
  @Prop({ type: String })
  notes: string;
}

export const EscrowTransactionSchema = SchemaFactory.createForClass(EscrowTransaction);

// Indexes for efficient queries
EscrowTransactionSchema.index({ seller: 1, status: 1 });
EscrowTransactionSchema.index({ order: 1 });
EscrowTransactionSchema.index({ status: 1, releaseDate: 1 }); // For scheduled release job
EscrowTransactionSchema.index({ transactionId: 1 });
