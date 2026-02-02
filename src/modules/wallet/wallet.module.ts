import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { Wallet, WalletSchema } from './schema/wallet.schema';
import { EscrowTransaction, EscrowTransactionSchema } from './schema/escrow-transaction.schema';
import { Order, OrderSchema } from '../orders/schema/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: EscrowTransaction.name, schema: EscrowTransactionSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
