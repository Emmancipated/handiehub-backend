import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as crypto from 'crypto';
import { CreatePaystackDto } from './dto/create-paystack.dto';
import { UpdatePaystackDto } from './dto/update-paystack.dto';

@Injectable()
export class PaystackService {
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
    const amount = data.amount;
    // TODO: Add your logic to store payment, notify user, etc.
    // console.log(`Charge successful: ${email}, ₦${amount / 100}`);
  }

  private async handleTransferSuccess(data: any) {
    const recipient = data.recipient;
    const amount = data.amount;
    // TODO: Update your system for successful payout
    // console.log(
    //   `Transfer successful to ${recipient.name || recipient}, ₦${amount / 100}`,
    // );
  }
}
