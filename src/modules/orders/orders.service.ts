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
  ) {}
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

  findAll() {
    return `This action returns all orders`;
  }

  findOne(id: number) {
    return `This action returns a #${id} order`;
  }

  // update(id: number, updateOrderDto: UpdateOrderDto) {
  //   return `This action updates a #${id} order`;
  // }

  remove(id: number) {
    return `This action removes a #${id} order`;
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
