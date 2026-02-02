import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) { }

  @Post()
  create(@Body() createTransactionDto: CreateTransactionDto) {
    return this.transactionService.create(createTransactionDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req, @Query() filters: any) {
    const userId = req.user.userId;
    return this.transactionService.findAll(userId, filters);
  }

  /**
   * Get user's wallet info (balance + recent transactions + stats)
   */
  @Get('wallet')
  @UseGuards(JwtAuthGuard)
  getUserWallet(@Request() req) {
    const userId = req.user.userId;
    return this.transactionService.getUserWalletInfo(userId);
  }

  @Get('wallet/balance')
  @UseGuards(JwtAuthGuard)
  getBalance(@Request() req) {
    const userId = req.user.userId;
    return this.transactionService.getBalance(userId);
  }

  /**
   * Get paginated transactions for user
   */
  @Get('wallet/history')
  @UseGuards(JwtAuthGuard)
  getTransactionHistory(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('type') type?: string,
  ) {
    const userId = req.user.userId;
    return this.transactionService.getUserTransactionsPaginated(
      userId,
      parseInt(page, 10),
      parseInt(limit, 10),
      { status, category, type },
    );
  }

  @Post('wallet/withdraw')
  @UseGuards(JwtAuthGuard)
  requestWithdrawal(@Request() req, @Body() withdrawDto: WithdrawDto) {
    const userId = req.user.userId;
    return this.transactionService.requestWithdrawal(userId, withdrawDto);
  }

  @Get('balance/:userId')
  async getBalanceByUserId(@Param('userId') userId: string) {
    return this.transactionService.getBalance(userId);
  }

  @Post('initialize-payment')
  async initializePayment(
    @Body('email') email: string,
    @Body('amount') amount: number,
    @Body('callbackUrl') callbackUrl: string,
    @Body('metadata') metadata?: any,
    @Body('orderId') orderId?: string,
    @Body('productId') productId?: string,
  ) {
    return this.transactionService.initializePayment(
      email,
      amount,
      callbackUrl,
      metadata,
      orderId,
      productId,
    );
  }

  @Get('verify-payment')
  async verifyPayment(@Query('trxref') trxref: string) {
    return this.transactionService.verifyPayment(trxref);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionService.findOne(id);
  }
}
