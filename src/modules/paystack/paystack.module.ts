import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaystackService } from './paystack.service';
import { PaystackController } from './paystack.controller';
import {
  Transaction,
  TransactionSchema,
} from '../transaction/entities/transaction.entity';
import { User, UserSchema } from '../user/schemas/user.schema';
import { Order, OrderSchema } from '../orders/schema/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [PaystackController],
  providers: [PaystackService],
  exports: [PaystackService],
})
export class PaystackModule { }
