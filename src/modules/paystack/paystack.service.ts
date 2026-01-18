import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { CreatePaystackDto } from './dto/create-paystack.dto';
import { UpdatePaystackDto } from './dto/update-paystack.dto';
import { Transaction } from '../transaction/entities/transaction.entity';
import { User } from '../user/schemas/user.schema';
import { Order } from '../orders/schema/order.schema';

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);

  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
  ) { }
  verifySignature(rawBody: string, signature: string, secret: string): boolean {
    const hash = crypto
      .createHmac('sha512', secret)
      .update(rawBody)
      .digest('hex');

    return hash === signature;
  }

  async handleEvent(event: any) {
    const { event: eventType, data } = event;

    switch (eventType) {
      case 'charge.success':
        return this.handleChargeSuccess(data);

      case 'transfer.success':
        return this.handleTransferSuccess(data);

      // Add more event types here
      default:
        console.log('Unhandled Paystack event:', eventType);
        break;
    }
  }

  private async handleChargeSuccess(data: any) {
    const email = data.customer.email;
    const amount = data.amount / 100; // Convert from kobo to naira
    const reference = data.reference;

    try {
      // Find the order associated with this payment
      const metadata = data.metadata;
      const orderId = metadata?.orderId;

      if (!orderId) {
        this.logger.warn(`No orderId in payment metadata for ${reference}`);
        return;
      }

      // Find user by email
      const user = await this.userModel.findOne({ email }).exec();
      if (!user) {
        this.logger.error(`User not found for email: ${email}`);
        return;
      }

      // Create a pending transaction (escrow)
      const transaction = new this.transactionModel({
        transactionId: reference,
        type: 'credit',
        amount,
        currency: 'NGN',
        description: `Payment for order ${orderId}`,
        status: 'pending', // Held in escrow until order completion
        category: 'payment',
        reference,
        user: user._id,
        order: orderId,
        metadata: data,
      });

      await transaction.save();

      // Update order status to paid/in_progress
      await this.orderModel.findByIdAndUpdate(orderId, {
        status: 'in_progress',
      });

      this.logger.log(
        `Charge successful: ${email}, ₦${amount}, Order: ${orderId}`,
      );
    } catch (error) {
      this.logger.error('Error handling charge success', error.stack);
    }
  }

  private async handleTransferSuccess(data: any) {
    const recipient = data.recipient;
    const amount = data.amount / 100;
    const reference = data.reference;

    try {
      // Find the withdrawal transaction and mark it as completed
      const transaction = await this.transactionModel
        .findOne({ reference })
        .exec();

      if (transaction) {
        transaction.status = 'completed';
        await transaction.save();

        this.logger.log(
          `Transfer successful to ${recipient.name || recipient}, ₦${amount}`,
        );
      } else {
        this.logger.warn(`Transaction not found for reference: ${reference}`);
      }
    } catch (error) {
      this.logger.error('Error handling transfer success', error.stack);
    }
  }
}
