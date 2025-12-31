import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { User } from 'src/modules/user/schemas/user.schema';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  @Prop()
  name: string;

  @Prop()
  orderId: string;

  @Prop()
  amount: number;

  @Prop({
    required: true,
    enum: ['pending', 'completed', 'deferred'],
    default: 'pending',
    type: String,
  })
  status: string;

  @Prop({
    required: true,
    type: Date,
  })
  deliveryDate: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  handieman: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
