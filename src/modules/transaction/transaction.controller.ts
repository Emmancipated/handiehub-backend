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
// @UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) { }

  @Post()
  create(@Body() createTransactionDto: CreateTransactionDto) {
    return this.transactionService.create(createTransactionDto);
  }

  @Get()
  findAll(@Request() req, @Query() filters: any) {
    const userId = req.user.userId;
    return this.transactionService.findAll(userId, filters);
  }

  @Get('wallet/balance')
  getBalance(@Request() req) {
    const userId = req.user.userId;
    return this.transactionService.getBalance(userId);
  }

  @Post('wallet/withdraw')
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
