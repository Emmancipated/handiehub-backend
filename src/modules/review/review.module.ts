import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { Review, ReviewSchema } from './schema/review.schema';
import { Order, OrderSchema } from '../orders/schema/order.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Review.name, schema: ReviewSchema },
            { name: Order.name, schema: OrderSchema },
        ]),
    ],
    controllers: [ReviewController],
    providers: [ReviewService],
    exports: [ReviewService],
})
export class ReviewModule { }
