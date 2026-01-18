import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import {
  Transaction,
  TransactionSchema,
} from './entities/transaction.entity';
import { User, UserSchema } from '../user/schemas/user.schema';
import { Order, OrderSchema } from '../orders/schema/order.schema';
import { Product, ProductSchema } from '../product/schema/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule { }
