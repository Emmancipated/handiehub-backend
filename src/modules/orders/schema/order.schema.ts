import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { User } from 'src/modules/user/schemas/user.schema';
import { Product } from 'src/modules/product/schema/product.schema';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  @Prop()
  name: string;

  @Prop({ unique: true })
  orderId: string;

  @Prop()
  amount: number;

  @Prop({
    required: true,
    min: 1,
    default: 1,
    type: Number,
  })
  quantity: number;

  // Product order statuses: new, confirmed, shipped, delivered, returned, arbitration, cancelled, refunded
  // Service order statuses: new, accepted, scheduled, in_progress, completed, arbitration, cancelled, refunded
  @Prop({
    required: true,
    enum: [
      'pending',           // Initial state before payment
      'new',               // Payment received, awaiting seller action
      'confirmed',         // Seller confirmed the order (products)
      'accepted',          // Seller accepted the service request (services)
      'scheduled',         // Service has been scheduled (services)
      'shipped',           // Product has been shipped
      'in_progress',       // Service is being performed
      'delivered',         // Product delivered to customer
      'completed',         // Service completed / Order fulfilled
      'returned',          // Product returned by customer
      'arbitration',       // Dispute raised, under review
      'cancelled',         // Order cancelled
      'refunded',          // Payment refunded
      'payment_failed',    // Payment attempt failed (for tracking)
    ],
    default: 'pending',
    type: String,
  })
  status: string;

  @Prop({
    enum: ['pending', 'paid', 'failed', 'refunded', 'partial_refund'],
    default: 'pending',
    type: String,
  })
  paymentStatus: string;

  @Prop()
  failureReason: string;

  @Prop()
  trackingNumber: string;

  @Prop()
  shippingCarrier: string;

  @Prop()
  scheduledDate: Date;

  @Prop()
  statusNote: string; // Seller can add notes when updating status

  @Prop()
  paymentReference: string;

  @Prop({
    required: true,
    type: Date,
  })
  deliveryDate: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Product' })
  product: Product;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  handieman: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
