import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { createOrderchema, CreateOrderDto, createFailedOrderSchema, CreateFailedOrderDto } from './dto/create-order.dto';
import { ZodValidationPipe } from 'src/validators/schema-validator-pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  /**
   * Create a new order (requires authentication)
   */
  @UseGuards(JwtAuthGuard)
  @Post('/create')
  create(
    @Body(new ZodValidationPipe(createOrderchema))
    createOrderDto: CreateOrderDto,
    @Req() req: any,
  ) {
    // Override user from token
    const userId = req.user?.userId || req.user?.sub;
    return this.ordersService.create({
      ...createOrderDto,
      user: userId,
    });
  }

  /**
   * Record a failed payment attempt (for analytics, admin visibility only)
   * This does NOT deduct stock
   */
  @UseGuards(JwtAuthGuard)
  @Post('/failed')
  recordFailedOrder(
    @Body(new ZodValidationPipe(createFailedOrderSchema))
    createFailedOrderDto: CreateFailedOrderDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return this.ordersService.createFailedOrder({
      ...createFailedOrderDto,
      user: userId,
    });
  }

  /**
   * Get all failed orders (Admin only)
   */
  @UseGuards(JwtAuthGuard)
  @Get('/failed')
  getFailedOrders(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userRoles = req.user?.role || [];

    // Only admins can view failed orders
    if (!userRoles.includes('admin')) {
      throw new ForbiddenException('Only admins can access failed orders');
    }

    return this.ordersService.getFailedOrders(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  /**
   * Get orders for the authenticated user (buyer's orders)
   */
  @UseGuards(JwtAuthGuard)
  @Get('/my-orders')
  getMyOrders(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return this.ordersService.findAll({
      userId,
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  /**
   * Get orders for the authenticated seller (seller's orders)
   */
  @UseGuards(JwtAuthGuard)
  @Get('/seller-orders')
  getSellerOrders(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    const userRoles = req.user?.role || [];

    // Verify user is a handieman/seller
    if (!userRoles.includes('handieman') && !userRoles.includes('admin')) {
      throw new ForbiddenException('Only sellers can access seller orders');
    }

    return this.ordersService.findAll({
      handiemanId: userId,
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  /**
   * Get all orders (admin or with filters)
   */
  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('handiemanId') handiemanId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.findAll({
      userId,
      handiemanId,
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  /**
   * Get seller overview/dashboard stats
   */
  @UseGuards(JwtAuthGuard)
  @Get('/overview/stats')
  handieManOverviewAuth(
    @Req() req: any,
    @Query('filter') filter: string = 'all',
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return this.ordersService.getHandiemanOverview(userId, filter);
  }

  /**
   * Get seller overview by ID (for admin)
   */
  @Get('/overview/:id')
  handieManOverview(
    @Param('id') sellerId: string,
    @Query('filter') filter: string = 'all',
  ) {
    return this.ordersService.getHandiemanOverview(sellerId, filter);
  }

  /**
   * Get single order by ID
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  /**
   * Update order status
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateData: { status?: string; deliveryDate?: Date },
  ) {
    return this.ordersService.update(id, updateData);
  }

  /**
   * Delete/cancel order
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
