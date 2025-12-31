import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { ConfigService } from '@nestjs/config';

// This would be your Paystack secret key from environment variables
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE_URL =
  process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
const mnogo = process.env.MONGODB_CONNECTION_STRING;

@Injectable()
export class TransactionService {
  constructor(private readonly configService: ConfigService) {}

  getVariable(env: string): string {
    const mySecret = this.configService.get<string>(env);

    return mySecret;
  }
  create(createTransactionDto: CreateTransactionDto) {
    return 'This action adds a new transaction';
  }

  findAll() {
    return `This action returns all transaction`;
  }

  findOne(id: number) {
    return `This action returns a #${id} transaction`;
  }

  update(id: number, updateTransactionDto: UpdateTransactionDto) {
    return `This action updates a #${id} transaction`;
  }

  remove(id: number) {
    return `This action removes a #${id} transaction`;
  }

  async initializePayment(
    email: string,
    amount: number,
    reference: string,
    callbackUrl: string,
  ): Promise<any> {
    const paystackSecret = this.getVariable('PAYSTACK_SECRET_KEY');
    try {
      // Validate required fields
      if (!email || !amount) {
        throw new BadRequestException('Email and amount are required');
      }

      const response = await fetch(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${paystackSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            amount: amount * 100, // Paystack expects amount in kobo (smallest currency unit)
            reference,
            callback_url: callbackUrl,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to initialize payment');
      }

      return data;
    } catch (error) {
      console.error('Error initializing payment:', error, error.message);
      console.error('Error prrocessig payment:', error.message);
      // throw new Error('Internal server error');
      throw new BadRequestException(error.message);

      // return { message: error.message };
    }
  }
}
