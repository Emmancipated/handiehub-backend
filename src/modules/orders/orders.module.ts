import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schema/order.schema';
import { UserModule } from '../user/user.module';
import { UserService } from '../user/user.service';
import { Product, ProductSchema } from '../product/schema/product.schema';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationModule } from '../notification/notification.module';
import { MessageModule } from '../message/message.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    UserModule,
    forwardRef(() => WalletModule),
    NotificationModule,
    MessageModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, UserService],
  exports: [MongooseModule, OrdersService],
})
export class OrdersModule {}
