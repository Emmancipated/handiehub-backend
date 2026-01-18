import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Order } from './schema/order.schema';
import mongoose, { Model, Error as MongooseError } from 'mongoose';
import { randomUUID } from 'crypto';
import { User } from '../user/schemas/user.schema';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(User.name) private userModel: Model<User>,

    // private verificationTokenService: VerificationService,
    // private emailService: EmailService,
    // private readonly verificationService: VerificationService,
  ) { }
  async create(
    createOrderDto: CreateOrderDto,
  ): Promise<{ statusCode: number; message: string }> {
    const {
      productId,
      // orderId,
      amount,
      status,
      deliveryDate,
      handieman,
      user,
    } = createOrderDto;
    const orderId = `HH-${randomUUID()}`;
    try {
      const existingOrderById = await this.orderModel
        .findOne({
          productId: productId,
        })
        .lean()
        .exec();
      if (existingOrderById) {
        throw new BadRequestException('Please try again');
      }

      // const createdUser = new this.userModel(createUserDto);
      const createdOrder = new this.orderModel({
        productId,
        amount,
        status,
        deliveryDate,
        handieman,
        user,
        orderId,
      });

      await createdOrder.save();
      if (createdOrder) {
        return {
          statusCode: HttpStatus.OK,
          message: `Your order with order number ${orderId} has been placed successfully`,
        };
      }
    } catch (error) {
      if (error instanceof MongooseError.ValidationError) {
        this.logger.error(
          `Product validation failed: ${JSON.stringify(error.errors)}`,
        );
        // Customize error response for the user
        const userFriendlyMessages = Object.values(error.errors).map((err) => {
          return this.formatValidationMessage(err.path);
        });
        throw new BadRequestException(userFriendlyMessages.join(', '));
      }
      // Log the error and throw a generic error message to the user
      this.logger.error(
        'Unexpected error during product creation',
        error.stack,
      );
      throw error;
    }
  }

  async findAll(filters?: {
    userId?: string;
    handiemanId?: string;
    status?: string;
  }): Promise<Order[]> {
    try {
      const query: any = {};

      if (filters?.userId) {
        query.user = filters.userId;
      }

      if (filters?.handiemanId) {
        query.handieman = filters.handiemanId;
      }

      if (filters?.status) {
        query.status = filters.status;
      }

      return await this.orderModel
        .find(query)
        .populate('user', 'first_name last_name email')
        .populate('handieman', 'first_name last_name email handiemanProfile')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error('Error fetching orders', error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<Order> {
    try {
      const order = await this.orderModel
        .findById(id)
        .populate('user', 'first_name last_name email')
        .populate('handieman', 'first_name last_name email handiemanProfile')
        .exec();

      if (!order) {
        throw new BadRequestException('Order not found');
      }

      return order;
    } catch (error) {
      this.logger.error('Error fetching order', error.stack);
      throw error;
    }
  }

  async update(
    id: string,
    updateData: { status?: string; deliveryDate?: Date },
  ): Promise<Order> {
    try {
      const order = await this.orderModel.findById(id);

      if (!order) {
        throw new BadRequestException('Order not found');
      }

      // Validate status transitions
      if (updateData.status) {
        const validTransitions = {
          pending: ['in_progress', 'cancelled'],
          in_progress: ['completed', 'cancelled'],
          completed: [],
          cancelled: [],
        };

        const currentStatus = order.status as keyof typeof validTransitions;
        const allowedStatuses = validTransitions[currentStatus] || [];

        if (!allowedStatuses.includes(updateData.status)) {
          throw new BadRequestException(
            `Cannot transition from ${order.status} to ${updateData.status}`,
          );
        }

        order.status = updateData.status;
      }

      if (updateData.deliveryDate) {
        order.deliveryDate = updateData.deliveryDate;
      }

      return await order.save();
    } catch (error) {
      this.logger.error('Error updating order', error.stack);
      throw error;
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      const order = await this.orderModel.findById(id);

      if (!order) {
        throw new BadRequestException('Order not found');
      }

      // Only allow deletion of pending or cancelled orders
      if (order.status !== 'pending' && order.status !== 'cancelled') {
        throw new BadRequestException(
          'Can only delete pending or cancelled orders',
        );
      }

      await this.orderModel.findByIdAndDelete(id);

      return { message: 'Order deleted successfully' };
    } catch (error) {
      this.logger.error('Error deleting order', error.stack);
      throw error;
    }
  }

  async getHandiemanOverview(sellerId: string, filter: string) {
    // Calculate date range based on the filter
    const dateRange = this.getDateRange(filter);

    const orders = await this.orderModel.aggregate([
      {
        $match: {
          handieman: new mongoose.Types.ObjectId(sellerId), // Filter by sellerId
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }, // Filter by date range
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$amount' },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          declinedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'declined'] }, 1, 0] },
          },
        },
      },
    ]);
    // Fetch recent orders (last 7 days)
    const recentOrdersDateRange = this.getDateRange('lastWeek');
    const recentOrders = await this.orderModel
      .find({
        handieman: new mongoose.Types.ObjectId(sellerId),
        createdAt: {
          $gte: recentOrdersDateRange.start,
          $lte: recentOrdersDateRange.end,
        },
      })
      .sort({ createdAt: -1 }); // Sort by most recent first

    // Combine results
    const result = orders[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      completedOrders: 0,
      pendingOrders: 0,
      declinedOrders: 0,
    };

    return {
      ...result,
      recentOrders, // Add recent orders to the response
    };
  }

  private getDateRange(filter: string) {
    const now = new Date();
    let start: Date, end: Date;

    switch (filter) {
      case 'lastWeek':
        start = new Date(now.setDate(now.getDate() - 7));
        end = new Date();
        break;
      case 'lastMonth':
        start = new Date(now.setMonth(now.getMonth() - 1));
        end = new Date();
        break;
      case 'last3Months':
        start = new Date(now.setMonth(now.getMonth() - 3));
        end = new Date();
        break;
      default: // All time
        start = new Date(0); // Unix epoch (January 1, 1970)
        end = new Date();
    }

    return { start, end };
  }

  private formatValidationMessage(field: string): string {
    switch (field) {
      case 'productId':
        return 'Invalid product ID.';
      case 'amount':
        return 'Is it free? Please input the price.';
      case 'deliveryDate':
        return 'Delivery date is required.';
      case 'handieman':
        return 'Handieman is required.';
      case 'user':
        return 'User is required.';
      case 'orderId':
        return 'Order ID is required.';
      default:
        return `${field} is required.`;
    }
  }
}
