import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PaystackService } from './paystack.service';
import { CreatePaystackDto } from './dto/create-paystack.dto';
import { UpdatePaystackDto } from './dto/update-paystack.dto';

// @Controller('paystack')
@Controller('webhook')
export class PaystackController {
  constructor(private readonly paystackService: PaystackService) { }

  @Post('paystack')
  async handleWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('x-paystack-signature') signature: string,
  ) {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    const rawBody = (req as any).rawBody;
    console.log('Raw Body:', rawBody);

    if (!this.paystackService.verifySignature(rawBody, signature, secret)) {
      return res
        .status(HttpStatus.FORBIDDEN)
        .json({ status: false, message: 'Invalid signature' });
    }

    await this.paystackService.handleEvent(req.body);

    return res.status(HttpStatus.OK).json({ received: true });
  }
}
