import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { randomUUID } from 'crypto';
import { User } from '../user/schemas/user.schema';
import { Order } from '../orders/schema/order.schema';
import { Product } from '../product/schema/product.schema';
import axios from 'axios';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<Transaction>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) { }

  async create(
    createTransactionDto: CreateTransactionDto,
  ): Promise<TransactionDocument> {
    try {
      const transactionId = `TXN-${randomUUID()}`;

      const transaction = new this.transactionModel({
        ...createTransactionDto,
        transactionId,
        user: createTransactionDto.userId,
        order: createTransactionDto.orderId || null,
      });

      return await transaction.save();
    } catch (error) {
      this.logger.error('Error creating transaction', error.stack);
      throw error;
    }
  }

  async findAll(userId: string, filters?: any): Promise<Transaction[]> {
    try {
      const query: any = { user: userId };

      if (filters?.status) {
        query.status = filters.status;
      }

      if (filters?.category) {
        query.category = filters.category;
      }

      if (filters?.type) {
        query.type = filters.type;
      }

      return await this.transactionModel
        .find(query)
        .sort({ createdAt: -1 })
        .populate('order')
        .exec();
    } catch (error) {
      this.logger.error('Error fetching transactions', error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<Transaction> {
    try {
      const transaction = await this.transactionModel
        .findById(id)
        .populate('user')
        .populate('order')
        .exec();

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      return transaction;
    } catch (error) {
      this.logger.error('Error fetching transaction', error.stack);
      throw error;
    }
  }

  async update(
    id: string,
    updateTransactionDto: UpdateTransactionDto,
  ): Promise<Transaction> {
    try {
      const transaction = await this.transactionModel
        .findByIdAndUpdate(id, updateTransactionDto, { new: true })
        .exec();

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      return transaction;
    } catch (error) {
      this.logger.error('Error updating transaction', error.stack);
      throw error;
    }
  }

  async getBalance(userId: string): Promise<{
    available: number;
    pending: number;
    total: number;
    currency: string;
  }> {
    try {
      const transactions = await this.transactionModel
        .find({ user: userId, status: { $in: ['completed', 'pending'] } })
        .exec();

      let available = 0;
      let pending = 0;

      transactions.forEach((txn) => {
        const amount = txn.amount;
        const isCredit = txn.type === 'credit';

        if (txn.status === 'completed') {
          available += isCredit ? amount : -amount;
        } else if (txn.status === 'pending') {
          pending += isCredit ? amount : -amount;
        }
      });

      return {
        available: Math.max(0, available),
        pending: Math.max(0, pending),
        total: Math.max(0, available + pending),
        currency: 'NGN',
      };
    } catch (error) {
      this.logger.error('Error calculating balance', error.stack);
      throw error;
    }
  }

  async requestWithdrawal(
    userId: string,
    withdrawDto: WithdrawDto,
  ): Promise<{ statusCode: number; message: string; transaction: Transaction }> {
    try {
      // Check if user has sufficient balance
      const balance = await this.getBalance(userId);

      if (balance.available < withdrawDto.amount) {
        throw new BadRequestException('Insufficient balance');
      }

      // Create withdrawal transaction
      const transaction = await this.create({
        type: 'debit',
        amount: withdrawDto.amount,
        description: `Withdrawal to ${withdrawDto.accountName}`,
        category: 'withdrawal',
        reference: `WD-${randomUUID()}`,
        userId,
        metadata: {
          bankCode: withdrawDto.bankCode,
          accountNumber: withdrawDto.accountNumber,
          accountName: withdrawDto.accountName,
        },
      });

      // TODO: Integrate with Paystack transfer API
      // For now, mark as pending

      return {
        statusCode: HttpStatus.OK,
        message: 'Withdrawal request submitted successfully',
        transaction,
      };
    } catch (error) {
      this.logger.error('Error processing withdrawal', error.stack);
      throw error;
    }
  }

  async initializePayment(
    email: string,
    amount: number, // Legacy param, ignored if orderId/productId provided
    callbackUrl: string,
    metadata?: any,
    orderId?: string,
    productId?: string,
  ): Promise<any> {
    try {
      const paystackUrl = 'https://api.paystack.co/transaction/initialize';
      const secretKey = process.env.PAYSTACK_SECRET_KEY;

      if (!secretKey) {
        this.logger.error('PAYSTACK_SECRET_KEY is not defined');
        throw new Error('Payment configuration error');
      }

      let actualAmount = amount;
      let description = 'Payment';

      // 1. Determine Price from DB
      if (orderId) {
        const order = await this.orderModel.findById(orderId); // Assuming orderId is the _id
        if (!order) {
          // Fallback check if it's the string orderId field
          const orderByStringId = await this.orderModel.findOne({ orderId });
          if (!orderByStringId) throw new NotFoundException('Order not found');
          actualAmount = orderByStringId.amount;
          description = `Payment for Order ${orderByStringId.orderId}`;
        } else {
          actualAmount = order.amount;
          description = `Payment for Order ${order.orderId || orderId}`;
        }
      } else if (productId) {
        const product = await this.productModel.findById(productId);
        if (!product) throw new NotFoundException('Product not found');
        actualAmount = product.amount;
        description = `Payment for ${product.name}`;
      }

      this.logger.log(`Initializing payment for ${email}. Amount: ${actualAmount}`);

      // 2. Create Pending Transaction
      const transaction = await this.create({
        type: 'credit',
        amount: actualAmount,
        description,
        category: orderId ? 'order' : 'product',
        reference: `REF-${randomUUID()}`, // Temporary ref, will update with Paystack's if needed
        userId: metadata?.userId, // Ensure userId is passed in metadata
        orderId: orderId,
        metadata: { ...metadata, productId },
      } as any);


      // 3. Call Paystack
      const response = await axios.post(
        paystackUrl,
        {
          email,
          amount: actualAmount * 100, // Paystack expects amount in kobo
          callback_url: callbackUrl,
          metadata: { ...metadata, transactionId: (transaction as TransactionDocument)._id, orderId, productId },
          reference: transaction.transactionId // Use our Transaction ID as reference or let Paystack generate one. 
          // Better: Let Paystack generate reference, or key it to our transactionId. 
          // Attempting to use our transactionId as reference to simplify tracking.
        },
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // Update transaction with Paystack's reference if they return one different from what we sent
      // But if we sent unique reference, Paystack uses it.
      // If we didn't send reference, Paystack generates one.
      // Let's use the one from Paystack response to be sure.
      if (response.data?.data?.reference) {
        transaction.reference = response.data.data.reference;
        await transaction.save();
      }

      return response.data;
    } catch (error) {
      console.log("Payment did not work")
      this.logger.error('Error initializing payment', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.message || 'Payment initialization failed',
      );
    }
  }

  async verifyPayment(reference: string): Promise<any> {
    try {
      this.logger.log(`Verifying payment for reference: ${reference}`);
      const secretKey = process.env.PAYSTACK_SECRET_KEY;

      if (!secretKey) {
        this.logger.error('PAYSTACK_SECRET_KEY is not defined');
        throw new Error('Payment configuration error');
      }

      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        },
      );

      const data = response.data;

      if (data.status && data.data.status === 'success') {
        const paystackAmount = data.data.amount / 100; // Convert back to main currency unit

        // Find local transaction
        const transaction = await this.transactionModel.findOne({
          $or: [{ reference: reference }, { transactionId: reference }]
        });

        if (transaction) {
          // Validate Amount
          if (transaction.amount !== paystackAmount) {
            this.logger.error(`Amount mismatch! Expected ${transaction.amount}, got ${paystackAmount}`);
            // Potentially flag this transaction 
          } else {
            transaction.status = 'completed';
            await transaction.save();

            // GIVE VALUE
            if (transaction.order) {
              await this.orderModel.findByIdAndUpdate(transaction.order, { status: 'completed' });
              // Or 'paid', depending on your Order schema enum status
            }
          }
        }

        this.logger.log(`Payment verification successful for reference: ${reference}`);

        return {
          status: 'success',
          message: 'Payment verification successful',
          data: data.data,
        };
      } else {
        this.logger.warn(`Payment verification failed for reference: ${reference}`);
        return {
          status: 'failed',
          message: 'Payment verification failed',
          data: data.data,
        };
      }
    } catch (error) {
      this.logger.error(`Error verifying payment for reference ${reference}`, error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.message || 'Payment verification failed',
      );
    }
  }

  async releaseEscrow(orderId: string): Promise<void> {
    try {
      // Find pending transactions for this order
      const transactions = await this.transactionModel
        .find({
          order: orderId,
          status: 'pending',
          type: 'credit',
        })
        .exec();

      // Mark them as completed
      for (const txn of transactions) {
        txn.status = 'completed';
        await txn.save();
      }

      this.logger.log(`Released escrow for order ${orderId}`);
    } catch (error) {
      this.logger.error('Error releasing escrow', error.stack);
      throw error;
    }
  }
}
