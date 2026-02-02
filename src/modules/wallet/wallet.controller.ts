import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { walletTransactionsQuerySchema } from './dto/wallet.dto';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Get the current user's wallet balance
   */
  @Get('balance')
  async getBalance(@Request() req: any) {
    return this.walletService.getWalletBalance(req.user.userId);
  }

  /**
   * Get wallet summary with stats (for dashboard)
   */
  @Get('summary')
  async getWalletSummary(
    @Request() req: any,
    @Query('filter') filter?: string,
  ) {
    return this.walletService.getWalletSummary(req.user.userId, filter || 'all');
  }

  /**
   * Get escrow transactions for the current seller
   */
  @Get('escrow-transactions')
  async getEscrowTransactions(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const validatedQuery = walletTransactionsQuerySchema.parse({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
    });

    return this.walletService.getSellerEscrowTransactions(
      req.user.userId,
      validatedQuery.page,
      validatedQuery.limit,
      validatedQuery.status,
    );
  }

  /**
   * Manually trigger release check (admin/testing)
   */
  @Post('process-releases')
  @HttpCode(HttpStatus.OK)
  async processReleases() {
    await this.walletService.processScheduledReleases();
    return {
      statusCode: HttpStatus.OK,
      message: 'Release processing triggered',
    };
  }
}
