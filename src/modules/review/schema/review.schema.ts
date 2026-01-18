import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';
import { User } from 'src/modules/user/schemas/user.schema';
import { Order } from 'src/modules/orders/schema/order.schema';

export type ReviewDocument = HydratedDocument<Review>;

@Schema({ timestamps: true })
export class Review {
    @Prop({ required: true, min: 1, max: 5 })
    rating: number;

    @Prop({ required: true })
    comment: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    reviewer: User; // Person giving the review

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    reviewee: User; // Person being reviewed (handieman)

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true })
    order: Order;

    @Prop({ type: [String], default: [] })
    images: string[];

    @Prop({ default: true })
    isVisible: boolean;

    @Prop({ default: Date.now })
    createdAt: Date;

    @Prop({ default: Date.now })
    updatedAt: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
