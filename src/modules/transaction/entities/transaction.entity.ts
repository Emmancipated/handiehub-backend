import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';
import { User } from 'src/modules/user/schemas/user.schema';
import { Order } from 'src/modules/orders/schema/order.schema';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({ timestamps: true })
export class Transaction {
    @Prop({ required: true })
    transactionId: string;

    @Prop({
        required: true,
        enum: ['credit', 'debit'],
        type: String,
    })
    type: 'credit' | 'debit';

    @Prop({ required: true })
    amount: number;

    @Prop({ default: 'NGN' })
    currency: string;

    @Prop({ required: true })
    description: string;

    @Prop({
        required: true,
        enum: ['completed', 'pending', 'failed'],
        default: 'pending',
        type: String,
    })
    status: 'completed' | 'pending' | 'failed';

    @Prop({
        required: true,
        enum: ['payment', 'refund', 'withdrawal', 'deposit', 'service_fee'],
        type: String,
    })
    category: 'payment' | 'refund' | 'withdrawal' | 'deposit' | 'service_fee';

    @Prop({ required: true })
    reference: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    user: User;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null })
    order: Order;

    @Prop({ type: Object, default: {} })
    metadata: Record<string, any>;

    @Prop({ default: Date.now })
    createdAt: Date;

    @Prop({ default: Date.now })
    updatedAt: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
