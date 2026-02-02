import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Wallet } from './schema/wallet.schema';
import { EscrowTransaction } from './schema/escrow-transaction.schema';
import { CreateEscrowDto } from './dto/wallet.dto';
import { Order } from '../orders/schema/order.schema';
import { Cron, CronExpression } from '@nestjs/schedule';

// Number of days after order completion before funds are released
const ESCROW_RELEASE_DAYS = 5;

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<Wallet>,
    @InjectModel(EscrowTransaction.name) private escrowModel: Model<EscrowTransaction>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
  ) {}

  /**
   * Get or create a wallet for a user
   */
  async getOrCreateWallet(userId: string): Promise<Wallet> {
    let wallet = await this.walletModel.findOne({ user: userId }).exec();

    if (!wallet) {
      wallet = new this.walletModel({
        user: userId,
        availableBalance: 0,
        escrowBalance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0,
        status: 'active',
      });
      await wallet.save();
      this.logger.log(`Created new wallet for user ${userId}`);
    }

    return wallet;
  }

  /**
   * Get wallet balance for a seller
   */
  async getWalletBalance(userId: string): Promise<{
    statusCode: number;
    data: {
      availableBalance: number;
      escrowBalance: number;
      totalBalance: number;
      totalEarnings: number;
      totalWithdrawn: number;
      pendingReleases: Array<{
        amount: number;
        releaseDate: Date;
        orderId: string;
      }>;
    };
  }> {
    const wallet = await this.getOrCreateWallet(userId);

    // Get pending releases (escrow transactions that are pending_release)
    const pendingEscrows = await this.escrowModel
      .find({
        seller: userId,
        status: 'pending_release',
      })
      .populate('order', 'orderId')
      .sort({ releaseDate: 1 })
      .exec();

    const pendingReleases = pendingEscrows.map((escrow: any) => ({
      amount: escrow.netAmount,
      releaseDate: escrow.releaseDate,
      orderId: escrow.order?.orderId || 'N/A',
    }));

    return {
      statusCode: HttpStatus.OK,
      data: {
        availableBalance: wallet.availableBalance,
        escrowBalance: wallet.escrowBalance,
        totalBalance: wallet.availableBalance + wallet.escrowBalance,
        totalEarnings: wallet.totalEarnings,
        totalWithdrawn: wallet.totalWithdrawn,
        pendingReleases,
      },
    };
  }

  /**
   * Create an escrow transaction when a payment is made
   * This is called when an order is successfully paid
   */
  async createEscrowTransaction(createEscrowDto: CreateEscrowDto): Promise<EscrowTransaction> {
    const { orderId, sellerId, buyerId, amount, paymentReference, platformFeePercent = 0 } = createEscrowDto;

    // Calculate platform fee and net amount
    const platformFee = Math.round((amount * platformFeePercent) / 100);
    const netAmount = amount - platformFee;

    // Generate unique transaction ID
    const transactionId = `ESC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    try {
      // Create the escrow transaction
      const escrowTransaction = new this.escrowModel({
        transactionId,
        order: orderId,
        seller: sellerId,
        buyer: buyerId,
        amount,
        platformFee,
        netAmount,
        paymentReference,
        status: 'held',
      });

      await escrowTransaction.save();

      // Update seller's wallet escrow balance
      await this.walletModel.findOneAndUpdate(
        { user: sellerId },
        {
          $inc: { escrowBalance: netAmount },
          $set: { lastActivityAt: new Date() },
        },
        { upsert: true, new: true },
      );

      this.logger.log(
        `Escrow created: ${transactionId} - ₦${netAmount} for seller ${sellerId} (Order: ${orderId})`,
      );

      return escrowTransaction;
    } catch (error) {
      this.logger.error(`Error creating escrow transaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mark escrow as pending release when order is completed
   * This starts the 5-day countdown
   */
  async markOrderCompleted(orderId: string): Promise<void> {
    const escrowTransaction = await this.escrowModel.findOne({ order: orderId }).exec();

    if (!escrowTransaction) {
      this.logger.warn(`No escrow transaction found for order ${orderId}`);
      return;
    }

    if (escrowTransaction.status !== 'held') {
      this.logger.warn(`Escrow ${escrowTransaction.transactionId} is not in 'held' status`);
      return;
    }

    // Calculate release date (5 days from now)
    const releaseDate = new Date();
    releaseDate.setDate(releaseDate.getDate() + ESCROW_RELEASE_DAYS);

    escrowTransaction.status = 'pending_release';
    escrowTransaction.orderCompletedAt = new Date();
    escrowTransaction.releaseDate = releaseDate;
    await escrowTransaction.save();

    this.logger.log(
      `Escrow ${escrowTransaction.transactionId} marked for release on ${releaseDate.toISOString()}`,
    );
  }

  /**
   * Release funds from escrow to available balance
   * Called by the scheduled job or manually
   */
  async releaseEscrowFunds(escrowTransactionId: string): Promise<void> {
    const escrowTransaction = await this.escrowModel.findById(escrowTransactionId).exec();

    if (!escrowTransaction) {
      throw new NotFoundException('Escrow transaction not found');
    }

    if (escrowTransaction.status !== 'pending_release') {
      throw new BadRequestException(
        `Cannot release escrow in status: ${escrowTransaction.status}`,
      );
    }

    // Update escrow status
    escrowTransaction.status = 'released';
    escrowTransaction.releasedAt = new Date();
    await escrowTransaction.save();

    // Move funds from escrow to available balance
    await this.walletModel.findOneAndUpdate(
      { user: escrowTransaction.seller },
      {
        $inc: {
          escrowBalance: -escrowTransaction.netAmount,
          availableBalance: escrowTransaction.netAmount,
          totalEarnings: escrowTransaction.netAmount,
        },
        $set: { lastActivityAt: new Date() },
      },
    );

    this.logger.log(
      `Released ₦${escrowTransaction.netAmount} to seller ${escrowTransaction.seller} (Escrow: ${escrowTransaction.transactionId})`,
    );
  }

  /**
   * Refund escrow back to buyer (in case of dispute/cancellation)
   */
  async refundEscrow(orderId: string, reason?: string): Promise<void> {
    const escrowTransaction = await this.escrowModel.findOne({ order: orderId }).exec();

    if (!escrowTransaction) {
      throw new NotFoundException('Escrow transaction not found for this order');
    }

    if (['released', 'refunded'].includes(escrowTransaction.status)) {
      throw new BadRequestException(
        `Cannot refund escrow in status: ${escrowTransaction.status}`,
      );
    }

    // Update escrow status
    escrowTransaction.status = 'refunded';
    escrowTransaction.notes = reason || 'Order refunded';
    await escrowTransaction.save();

    // Remove funds from seller's escrow balance
    await this.walletModel.findOneAndUpdate(
      { user: escrowTransaction.seller },
      {
        $inc: { escrowBalance: -escrowTransaction.netAmount },
        $set: { lastActivityAt: new Date() },
      },
    );

    this.logger.log(
      `Refunded escrow ₦${escrowTransaction.netAmount} for order ${orderId} - Reason: ${reason || 'N/A'}`,
    );

    // Note: Actual refund to buyer via Paystack would need to be handled separately
  }

  /**
   * Get escrow transactions for a seller
   */
  async getSellerEscrowTransactions(
    sellerId: string,
    page: number = 1,
    limit: number = 20,
    status?: string,
  ): Promise<any> {
    const skip = (page - 1) * limit;
    const query: any = { seller: sellerId };

    if (status) {
      query.status = status;
    }

    const [transactions, total] = await Promise.all([
      this.escrowModel
        .find(query)
        .populate('order', 'orderId amount status')
        .populate('buyer', 'first_name last_name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.escrowModel.countDocuments(query).exec(),
    ]);

    const formattedTransactions = transactions.map((txn: any) => ({
      id: txn._id,
      transactionId: txn.transactionId,
      amount: txn.amount,
      platformFee: txn.platformFee,
      netAmount: txn.netAmount,
      status: txn.status,
      orderCompletedAt: txn.orderCompletedAt,
      releaseDate: txn.releaseDate,
      releasedAt: txn.releasedAt,
      createdAt: txn.createdAt,
      order: txn.order ? {
        orderId: txn.order.orderId,
        amount: txn.order.amount,
        status: txn.order.status,
      } : null,
      buyer: txn.buyer ? {
        name: `${txn.buyer.first_name || ''} ${txn.buyer.last_name || ''}`.trim(),
        email: txn.buyer.email,
      } : null,
    }));

    return {
      statusCode: HttpStatus.OK,
      data: formattedTransactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Scheduled job to release escrow funds
   * Runs every hour to check for escrows ready to be released
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledReleases(): Promise<void> {
    const now = new Date();

    this.logger.log('Running scheduled escrow release check...');

    // Find all escrows that are pending_release and past their release date
    const escrowsToRelease = await this.escrowModel
      .find({
        status: 'pending_release',
        releaseDate: { $lte: now },
      })
      .exec();

    if (escrowsToRelease.length === 0) {
      this.logger.log('No escrows ready for release');
      return;
    }

    this.logger.log(`Found ${escrowsToRelease.length} escrows ready for release`);

    for (const escrow of escrowsToRelease) {
      try {
        await this.releaseEscrowFunds(escrow._id.toString());
      } catch (error) {
        this.logger.error(
          `Failed to release escrow ${escrow.transactionId}: ${error.message}`,
        );
      }
    }

    this.logger.log('Scheduled escrow release check completed');
  }

  /**
   * Get wallet summary for dashboard
   */
  async getWalletSummary(sellerId: string, filter: string = 'all'): Promise<any> {
    const wallet = await this.getOrCreateWallet(sellerId);
    const dateRange = this.getDateRange(filter);

    // Get earnings breakdown by period
    const escrowStats = await this.escrowModel.aggregate([
      {
        $match: {
          seller: new mongoose.Types.ObjectId(sellerId),
          createdAt: { $gte: dateRange.start, $lte: dateRange.end },
        },
      },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$netAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Format the stats
    const statsMap: Record<string, { total: number; count: number }> = {};
    escrowStats.forEach((stat) => {
      statsMap[stat._id] = { total: stat.total, count: stat.count };
    });

    // Count pending releases and their total
    const pendingReleases = await this.escrowModel
      .find({
        seller: sellerId,
        status: 'pending_release',
      })
      .select('netAmount releaseDate')
      .sort({ releaseDate: 1 })
      .limit(5)
      .exec();

    const nextRelease = pendingReleases[0] || null;

    return {
      statusCode: HttpStatus.OK,
      data: {
        availableBalance: wallet.availableBalance,
        escrowBalance: wallet.escrowBalance,
        totalBalance: wallet.availableBalance + wallet.escrowBalance,
        totalEarnings: wallet.totalEarnings,
        totalWithdrawn: wallet.totalWithdrawn,
        periodStats: {
          held: statsMap['held'] || { total: 0, count: 0 },
          pendingRelease: statsMap['pending_release'] || { total: 0, count: 0 },
          released: statsMap['released'] || { total: 0, count: 0 },
          refunded: statsMap['refunded'] || { total: 0, count: 0 },
        },
        nextRelease: nextRelease ? {
          amount: nextRelease.netAmount,
          date: nextRelease.releaseDate,
        } : null,
        upcomingReleases: pendingReleases.map((p) => ({
          amount: p.netAmount,
          date: p.releaseDate,
        })),
      },
    };
  }

  private getDateRange(filter: string) {
    const now = new Date();
    let start: Date, end: Date;

    switch (filter) {
      case 'lastWeek':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = new Date();
        break;
      case 'lastMonth':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        end = new Date();
        break;
      case 'last3Months':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        end = new Date();
        break;
      default:
        start = new Date(0);
        end = new Date();
    }

    return { start, end };
  }
}
